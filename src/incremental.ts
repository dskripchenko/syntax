/**
 * Highlighting text that is being edited: the tokenizer's state is kept at
 * the start of every line, and after an edit the text is tokenized again from
 * a little before it only until a line where the state is what it was — from
 * there on nothing has changed. The tokens are those of the whole text
 * tokenized at once, line by line.
 *
 * The text is read a line at a time (`TextSource`), so the host keeps it as
 * it likes; only a window of lines is ever joined into a string. A line's
 * state is taken at the first match boundary at or after its start — a token
 * over many lines (a block comment) gives its lines the state where it ends —
 * and is kept relative to the line, so the lines after an edit keep theirs.
 */
import { grammarOf, run, START, type Before, type Token, type TokenType } from './engine'

/** The text, as lines without their line breaks. */
export interface TextSource {
  readonly lineCount: number
  lineText(index: number): string
}

export interface IncrementalHighlighterOptions {
  /** Lines with their tokens kept, the rest tokenized again when asked (5000). */
  tokenCache?: number
}

/** The state at a line's start: where the next match boundary is, and the tokenizer's state there. */
interface Entry {
  /** The boundary: this many lines down, at this column. */
  d: number
  c: number
  stack: string
  before: Before
  tokens?: Token[]
}

/** An edit not yet tokenized again: from `restart` on the states may be wrong; from `end` on they are the old ones. */
interface Dirty {
  restart: number
  end: number
}

/** Lines beyond the last one needed, so a match near the window's end sees what follows. */
const MARGIN = 64

const BLANK = /^[ \t]*$/

/** Lines tokenized at once for `tokens`; further than that, a guess now and the truth in idle time. */
const SYNC = 20_000
/** The longest window `tokens` reads at once waiting for a match to end. */
const SYNC_WINDOW = 4096

const sameEntry = (a: Entry, b: Entry): boolean =>
  a.d === b.d &&
  a.c === b.c &&
  a.stack === b.stack &&
  a.before.type === b.before.type &&
  a.before.text === b.before.text

export class IncrementalHighlighter {
  private entries: (Entry | undefined)[] = []
  /** entries[0, trusted) hold for the text as it is, each with its boundary before the first edit. */
  private trusted = 0
  private dirty: Dirty[] = []
  private readonly stacks = new Map<string, string>()
  /** The entries holding tokens, the oldest first. */
  private readonly cached = new Set<Entry>()
  private readonly cacheSize: number
  private language: string | null

  constructor(
    private readonly source: TextSource,
    language: string,
    options: IncrementalHighlighterOptions = {},
  ) {
    this.cacheSize = Math.max(1, options.tokenCache ?? 5000)
    this.language = grammarOf(language) ? language : null
    this.reset()
  }

  /** Starts over: another language, or a text replaced as a whole. */
  reset(language?: string): void {
    if (language !== undefined) this.language = grammarOf(language) ? language : null
    this.entries = new Array<Entry | undefined>(this.source.lineCount)
    this.entries[0] = this.startEntry()
    this.trusted = 1
    this.dirty = []
    this.cached.clear()
  }

  /** Lines from the start whose tokens are known without tokenizing anything before them. */
  get ready(): number {
    return this.language ? this.trusted : this.source.lineCount
  }

  /** Whether every line is tokenized. */
  get done(): boolean {
    return this.ready >= this.source.lineCount && this.dirty.length === 0
  }

  /**
   * The text changed: lines `from` to `oldEnd` (excluded) of the text as it
   * was are now lines `from` to `newEnd`. Call it after the source has
   * changed; several edits may come before the next tokenizing.
   */
  edit(from: number, oldEnd: number, newEnd: number): void {
    const delta = newEnd - oldEnd
    const fresh = Array.from({ length: newEnd - from }, (): Entry | undefined => undefined)
    this.entries.splice(from, oldEnd - from, ...fresh)
    this.entries.length = this.source.lineCount
    if (from === 0) this.entries[0] = this.startEntry()
    const top = this.language ? grammarOf(this.language)?.restartAtTop : undefined
    let restart = this.restartFor(from)
    if (top)
      for (let i = from; i < newEnd && restart > 0; i++)
        if (top.test(this.source.lineText(i))) restart = 0
    let region: Dirty = { restart, end: newEnd }
    // The line tokenized again from keeps its state, not its tokens (they may look ahead).
    delete this.entries[region.restart]?.tokens
    const kept: Dirty[] = []
    for (const d of this.dirty) {
      if (d.end < region.restart) kept.push(d)
      else if (d.restart >= oldEnd) kept.push({ restart: d.restart + delta, end: d.end + delta })
      else
        region = {
          restart: Math.min(region.restart, d.restart),
          end: Math.max(region.end, d.end >= oldEnd ? d.end + delta : newEnd),
        }
    }
    kept.push(region)
    this.dirty = kept.sort((a, b) => a.restart - b.restart)
    this.trusted = Math.min(this.trusted, region.restart + 1)
  }

  /** Tokenizes on for about `lines` lines (in idle time); true when every line is done. */
  work(lines = 2000): boolean {
    if (!this.language) return true
    if (this.trusted < this.source.lineCount) this.advance(this.trusted + lines)
    else this.dirty = []
    return this.done
  }

  /** Tokens of lines `from` to `to` (excluded), tokenizing what comes before them first. */
  tokens(from: number, to: number): Token[][] {
    const count = this.source.lineCount
    from = Math.max(0, from)
    to = Math.min(count, to)
    if (from >= to) return []
    if (!this.language) {
      const out: Token[][] = []
      for (let i = from; i < to; i++) {
        const text = this.source.lineText(i)
        out.push(text === '' ? [] : [{ type: 'plain', text }])
      }
      return out
    }
    const need = Math.min(count, to + 1)
    if (need - this.trusted <= SYNC) this.advance(need, SYNC_WINDOW)
    if (this.trusted < need) return this.provisional(from, to)
    if (this.entries.slice(from, to).some((e) => !e!.tokens)) this.collect(from, to)
    return this.entries.slice(from, to).map((e) => e!.tokens!)
  }

  /** Whether the tokens of lines up to `to` (excluded) are final: `tokens` gives a guess for lines further than that. */
  settled(to: number): boolean {
    return this.ready >= Math.min(this.source.lineCount, to + 1)
  }

  // ---------------------------------------------------------------------------

  private startEntry(): Entry {
    return { d: 0, c: 0, stack: this.intern(START.stack), before: START.before }
  }

  private intern(stack: readonly string[]): string {
    const key = stack.join('\u0000')
    let s = this.stacks.get(key)
    if (s === undefined) {
      s = key
      this.stacks.set(key, s)
    }
    return s
  }

  /**
   * The line to tokenize again from for an edit at `line`: before it, with
   * its boundary on a line before the edit, and after an empty line (a match
   * may look ahead within a paragraph, as Markdown's emphasis does).
   */
  private restartFor(line: number): number {
    let p = line - 1
    // Beyond what is tokenized: from the last line that is.
    if (p >= this.trusted && this.entries[p] === undefined) p = this.trusted - 1
    while (p > 0 && (this.entries[p] === undefined || p + this.entries[p]!.d >= line)) p--
    const floor = Math.max(0, p - 200)
    while (p > floor && !BLANK.test(this.source.lineText(p - 1))) p--
    return Math.max(0, p)
  }

  /** Makes `trusted` at least `until` (or the end of the text), with windows up to `maxSize` lines. */
  private advance(until: number, maxSize = Infinity): void {
    const count = this.source.lineCount
    until = Math.min(until, count)
    let size = Math.max(256, until - this.trusted + MARGIN)
    while (this.trusted < until) {
      const before = this.trusted
      const finished = this.pass(until, size)
      if (this.trusted === before && !finished) {
        if (size * 2 > maxSize) return
        size *= 2
      }
    }
  }

  /**
   * Tokens for lines not reached yet (far down a file just opened, or inside
   * a token whose end is far off): from the last known state when it is near,
   * else from the start state at the first line. Not kept; `work` settles them.
   */
  private provisional(from: number, to: number): Token[][] {
    const p = this.trusted - 1
    const near = p + this.entries[p]!.d <= from && from - p <= SYNC
    const start = near ? this.entries[p]! : this.startEntry()
    const first = near ? p + start.d : from
    return this.runTokens(first, start, from, to, Math.min(this.source.lineCount, to + MARGIN), to)
  }

  /**
   * One run from the last trusted line over a window of `size` lines: sets
   * the states of the lines it passes, and stops at `until`, where the states
   * are again what they were, or at the window's end. True when it ended the text.
   */
  private pass(until: number, size: number): boolean {
    const count = this.source.lineCount
    const p = this.trusted - 1
    const start = this.entries[p]!
    const first = p + start.d
    const last = Math.min(count, first + size)
    const lines: string[] = []
    for (let i = first; i < last; i++) lines.push(this.source.lineText(i))
    const complete = last >= count
    // A line break before the window: `^` and look-behinds see a line's start, not the text's.
    const lead = first > 0 ? 1 : 0
    let code = (lead ? '\n' : '') + lines.join('\n')
    if (!complete) code += '\n'
    const starts: number[] = []
    let offset = lead
    for (const l of lines) {
      starts.push(offset)
      offset += l.length + 1
    }
    // The lines still to be given a state, and where the window's own line index stands.
    let next = p + 1
    let row = 0
    let converged = false
    // The last line whose state is safe to keep should the window run out: before its last empty line.
    let safeEnd = code.length
    if (!complete) {
      for (let k = lines.length - 1; k > 0; k--)
        if (BLANK.test(lines[k]!)) {
          safeEnd = starts[k]!
          break
        }
      const fallback = starts[Math.max(0, lines.length - MARGIN)]!
      if (safeEnd === code.length || safeEnd < fallback / 2) safeEnd = fallback
    }

    let lastBefore: Before | null = null
    let flatBefore: Before = start.before
    const assign = (pos: number, stack: readonly string[], b: Before): boolean => {
      while (row + 1 < lines.length && starts[row + 1]! <= pos) row++
      const boundaryLine = first + row
      const col = pos - starts[row]!
      const key = this.intern(stack)
      if (b !== lastBefore) {
        lastBefore = b
        // A longer text would be a slice keeping the whole window alive: a copy of its own.
        flatBefore = b.text.length > 12 ? { type: b.type, text: (' ' + b.text).slice(1) } : b
      }
      // Lines whose start is at or before this boundary take its state.
      while (
        next < count &&
        (next < first || (next - first < lines.length && starts[next - first]! <= pos))
      ) {
        const entry: Entry = { d: boundaryLine - next, c: col, stack: key, before: flatBefore }
        if (this.converges(next, entry)) {
          converged = true
          return true
        }
        this.entries[next] = entry
        next++
        this.trusted = Math.max(this.trusted, next)
      }
      return false
    }

    const end = run(
      code,
      this.language!,
      0,
      { pos: starts[0]! + start.c, stack: start.stack.split('\u0000'), before: start.before },
      () => {},
      (pos, snapshot) => {
        if (pos > safeEnd && !complete) return true
        const s = snapshot()
        if (assign(pos, s.stack, s.before)) return true
        // Far enough: the rest in another pass.
        return next >= until && next > p + 1
      },
    )
    if (converged) return true
    if (complete && end.pos >= code.length) {
      // The end of the text: the lines left take the state there.
      row = lines.length - 1
      while (next < count) {
        const entry: Entry = {
          d: first + row - next,
          c: code.length - starts[row]!,
          stack: this.intern(end.stack),
          before: end.before,
        }
        this.entries[next] = entry
        next++
      }
      this.trusted = count
      this.dirty = []
      return true
    }
    return false
  }

  /**
   * Whether line `line`, given `entry`, is past an edit and back to its old
   * state — then the old states that follow hold, up to the next edit.
   */
  private converges(line: number, entry: Entry): boolean {
    for (;;) {
      const d = this.dirty[0]
      if (!d || line < d.end) return false
      const old = this.entries[line]
      // On a line with a boundary of its own: the lines below start after it, inside nothing the edit touched.
      if (old && entry.d === 0 && sameEntry(old, entry)) {
        this.dirty.shift()
        // This line's own tokens may still differ before its boundary.
        this.entries[line] = entry
        const following = this.dirty[0]
        this.trusted = this.knownUntil(
          line + 1,
          following ? following.restart + 1 : this.source.lineCount,
        )
        return true
      }
      // Run on into the next edit: one edit with this one now.
      const following = this.dirty[1]
      if (!following || line < following.restart) return false
      this.dirty.shift()
    }
  }

  /** The old states from `line` on, as far as they go up to `limit`. */
  private knownUntil(line: number, limit: number): number {
    let i = line
    while (i < limit && this.entries[i] !== undefined) i++
    return i
  }

  /** Tokenizes lines `from` to `to` again for their tokens; their states are known. */
  private collect(from: number, to: number): void {
    // A state from which line `from` is tokenized whole: its boundary at or before that line's start.
    let p = from
    while (
      p > 0 &&
      (p + this.entries[p]!.d > from || (p + this.entries[p]!.d === from && this.entries[p]!.c > 0))
    )
      p--
    const start = this.entries[p]!
    const count = this.source.lineCount
    // The window holds the last line's whole match: up to the boundary its next line's state names.
    const tail = to < count ? to + this.entries[to]!.d + 1 : count
    const out = this.runTokens(p + start.d, start, from, to, Math.min(count, tail + MARGIN), to)
    for (let i = from; i < to; i++) {
      const e = this.entries[i]!
      this.cached.delete(e)
      this.cached.add(e)
      e.tokens = out[i - from]
    }
    // The oldest go first; the lines just asked for stay.
    const keep = Math.max(this.cacheSize, to - from)
    for (const e of this.cached) {
      if (this.cached.size <= keep) break
      this.cached.delete(e)
      delete e.tokens
    }
  }

  /** Tokens of lines `from` to `to`, tokenizing lines `first` to `last` from `start` (its boundary on line `first`) until line `stop` begins. */
  private runTokens(
    first: number,
    start: Entry,
    from: number,
    to: number,
    last: number,
    stop: number,
  ): Token[][] {
    const count = this.source.lineCount
    const lines: string[] = []
    for (let i = first; i < last; i++) lines.push(this.source.lineText(i))
    const lead = first > 0 ? 1 : 0
    let code = (lead ? '\n' : '') + lines.join('\n')
    if (last < count) code += '\n'
    const out: Token[][] = Array.from({ length: to - from }, () => [])
    let line = first
    let stopAt = Infinity
    if (stop < count) {
      stopAt = lead
      for (let i = first; i < stop; i++) stopAt += lines[i - first]!.length + 1
    }
    run(
      code,
      this.language!,
      0,
      { pos: lead + start.c, stack: start.stack.split('\u0000'), before: start.before },
      (type: TokenType, text: string) => {
        const parts = text.split('\n')
        for (let i = 0; i < parts.length; i++) {
          if (i > 0) line++
          const part = parts[i]!
          if (part === '' || line < from || line >= to) continue
          const row = out[line - from]!
          const prev = row[row.length - 1]
          if (prev && prev.type === type) prev.text += part
          else row.push({ type, text: part })
        }
      },
      (pos) => pos >= stopAt,
    )
    return out
  }
}

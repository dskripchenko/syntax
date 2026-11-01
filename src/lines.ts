/**
 * Highlighting a big file a window at a time: only the lines asked for are
 * tokenized, from the nearest checkpoint before them — states kept every few
 * hundred lines as the tokenizer passes. Scrolling through a file costs what
 * it shows; a jump to its end tokenizes it once, and never again.
 */
import { grammarOf, run, START, type Token, type TokenizerState, type TokenType } from './engine'
import { span } from './html'

export interface LineHighlighterOptions {
  /** Lines between checkpoints (500). */
  checkpointEvery?: number
}

export class LineHighlighter {
  /** Offsets of the lines' starts. */
  private readonly starts: number[]
  private readonly every: number
  /** checkpoints[k]: the state at the first match boundary at or after line k × every. */
  private readonly checkpoints: (TokenizerState | undefined)[] = [START]
  private readonly language: string | null

  constructor(
    private readonly code: string,
    language: string,
    options: LineHighlighterOptions = {},
  ) {
    this.language = grammarOf(language) ? language : null
    this.every = Math.max(1, options.checkpointEvery ?? 500)
    const starts = [0]
    for (let i = code.indexOf('\n'); i >= 0; i = code.indexOf('\n', i + 1)) starts.push(i + 1)
    // A final line break ends the last line; it does not start another.
    if (starts.length > 1 && starts[starts.length - 1] === code.length) starts.pop()
    this.starts = starts
  }

  get lineCount(): number {
    return this.starts.length
  }

  /** The text of a line (0-based), without its line break. */
  line(index: number): string {
    const end = index + 1 < this.starts.length ? this.starts[index + 1]! - 1 : this.code.length
    const text = this.code.slice(this.starts[index], end)
    return text.endsWith('\r') ? text.slice(0, -1) : text
  }

  /** Tokens of lines `from` to `to` (0-based, `to` excluded); a token over several lines is cut at their ends. */
  tokens(from: number, to: number): Token[][] {
    from = Math.max(0, from)
    to = Math.min(this.lineCount, to)
    if (from >= to) return []
    const out: Token[][] = Array.from({ length: to - from }, () => [])
    if (!this.language) {
      for (let i = from; i < to; i++) {
        const text = this.line(i)
        if (text !== '') out[i - from]!.push({ type: 'plain', text })
      }
      return out
    }
    // The nearest checkpoint known at or before the first line's start.
    let k = Math.min(Math.floor(from / this.every), this.checkpoints.length - 1)
    while (k > 0 && (this.checkpoints[k] === undefined || this.checkpoints[k]!.pos > this.starts[from]!)) k--
    const state = this.checkpoints[k]!
    let line = this.lineAt(state.pos)
    const end = to < this.lineCount ? this.starts[to]! : this.code.length
    let next = (Math.floor(line / this.every) + 1) * this.every
    run(
      this.code,
      this.language,
      0,
      state,
      (type: TokenType, text: string) => {
        const parts = text.split('\n')
        parts.forEach((part, i) => {
          if (i > 0) line++
          if (part !== '' && line >= from && line < to) {
            const row = out[line - from]!
            const last = row[row.length - 1]
            if (last && last.type === type) last.text += part
            else row.push({ type, text: part })
          }
        })
      },
      (pos, snapshot) => {
        // Passing a checkpoint's line: keep the state there for later windows.
        while (next < this.lineCount && pos >= this.starts[next]!) {
          const index = next / this.every
          if (this.checkpoints[index] === undefined) this.checkpoints[index] = snapshot()
          next += this.every
        }
        return pos >= end
      },
    )
    // A Windows line break: the '\r' belongs to the break, not to the line.
    for (const row of out) {
      const last = row[row.length - 1]
      if (last?.text.endsWith('\r')) {
        last.text = last.text.slice(0, -1)
        if (last.text === '') row.pop()
      }
    }
    return out
  }

  /** Lines `from` to `to` as HTML, each complete in itself; `maxLength` cuts a long line (minified code) at that many characters. */
  html(from: number, to: number, maxLength = Infinity): string[] {
    return this.tokens(from, to).map((row) => {
      let left = maxLength
      let html = ''
      for (const t of row) {
        if (left <= 0) break
        html += span(t.text.length > left ? { type: t.type, text: t.text.slice(0, left) } : t)
        left -= t.text.length
      }
      return html
    })
  }

  private lineAt(offset: number): number {
    let lo = 0
    let hi = this.starts.length - 1
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1
      if (this.starts[mid]! <= offset) lo = mid
      else hi = mid - 1
    }
    return lo
  }
}

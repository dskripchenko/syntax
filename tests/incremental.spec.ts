import { describe, expect, it } from 'vitest'
import { IncrementalHighlighter, tokenizeLines, type TextSource } from '../src'
import { samples } from './helpers'

function random(seed: number): () => number {
  return () => {
    seed = (seed * 1103515245 + 12345) % 2147483648
    return seed / 2147483648
  }
}

/** Lines that can be edited, read as a `TextSource`. */
class Lines implements TextSource {
  lines: string[]
  constructor(text: string) {
    this.lines = text.split('\n')
  }
  get lineCount(): number {
    return this.lines.length
  }
  lineText(i: number): string {
    return this.lines[i]!
  }
  get text(): string {
    return this.lines.join('\n')
  }
  /** Replaces `from`..`to` (offsets) with `insert`; the edit as lines. */
  replace(from: number, to: number, insert: string): [number, number, number] {
    const text = this.text
    const lineOf = (pos: number) => text.slice(0, pos).split('\n').length - 1
    const a = lineOf(from)
    const b = lineOf(to) + 1
    this.lines = (text.slice(0, from) + insert + text.slice(to)).split('\n')
    return [
      a,
      b,
      b + (insert.split('\n').length - 1) - (text.slice(from, to).split('\n').length - 1),
    ]
  }
}

/** Pieces that open and close what spans lines in one language or another. */
const PIECES = [
  '/*',
  '*/',
  '"',
  "'",
  '`',
  '"""',
  "'''",
  '\n',
  '\n\n',
  '<!--',
  '-->',
  '<script>',
  '</script>',
  '```',
  '```js\n',
  '~~~',
  '#',
  '//',
  '{',
  '}',
  '(',
  ')',
  '[',
  ']',
  '<<<EOT\n',
  '\nEOT;\n',
  '<<EOF\n',
  '\nEOF\n',
  '=begin\n',
  '\n=end\n',
  '--[[',
  ']]',
  '<#',
  '#>',
  '*',
  '**',
  '_',
  '---\n',
  '|\n  ',
  '$',
  '\\',
  'r#"',
  '"#',
  'x',
  'word ',
  '  ',
  '<?php ',
  '?>',
  '<',
  '>',
  '=\n',
]

function check(h: IncrementalHighlighter, src: Lines, language: string, note: string): void {
  const whole = tokenizeLines(src.text, language)
  const got = h.tokens(0, src.lineCount)
  const bad = whole.findIndex((row, i) => JSON.stringify(row) !== JSON.stringify(got[i]))
  if (bad >= 0) {
    const context = src.lines.slice(Math.max(0, bad - 3), bad + 2).join('\n')
    expect(got[bad], `${note}; line ${bad}:\n${context}`).toEqual(whole[bad])
  }
  expect(got.length).toBe(whole.length)
}

describe('IncrementalHighlighter: after any edits, the tokens of the whole text tokenized at once', () => {
  for (const s of samples()) {
    it(`${s.file}: random edits, windows in between`, () => {
      const next = random(s.text.length + Number(process.env.SEED ?? 7))
      const src = new Lines(s.text)
      const h = new IncrementalHighlighter(src, s.language, { tokenCache: 50 })
      check(h, src, s.language, 'at the start')
      for (let n = 0; n < Number(process.env.EDITS ?? 60); n++) {
        const edits = 1 + Math.floor(next() * 3)
        const log: string[] = []
        if (process.env.DEBUG) log.push(JSON.stringify(src.text))
        for (let k = 0; k < edits; k++) {
          const length = src.text.length
          const from = Math.floor(next() * (length + 1))
          const to = Math.min(length, from + (next() < 0.5 ? 0 : Math.floor(next() * 20)))
          const insert = next() < 0.2 ? '' : PIECES[Math.floor(next() * PIECES.length)]!
          log.push(`${from}-${to} ${JSON.stringify(insert)}`)
          h.edit(...src.replace(from, to, insert))
        }
        const note = `edit ${n}: ${log.join(', ')}`
        const roll = next()
        if (roll < 0.4) {
          // A window somewhere first, the whole after.
          const a = Math.floor(next() * src.lineCount)
          const whole = tokenizeLines(src.text, s.language)
          expect(h.tokens(a, a + 10), note).toEqual(whole.slice(a, a + 10))
        } else if (roll < 0.6) {
          while (!h.work(7));
        }
        if (process.env.EVERY || n % 5 === 4 || roll < 0.6) check(h, src, s.language, note)
      }
      check(h, src, s.language, 'at the end')
    })
  }
})

describe('IncrementalHighlighter: texts longer than a window', () => {
  for (const s of samples().filter((x) =>
    /\.(js|md|php|py|html|sh|yaml|rb|lua|rs|sql|xml|tex|ps1)$/.test(x.file),
  )) {
    it(`${s.file} ×20: random edits, the windows end inside the text`, () => {
      const next = random(s.text.length + Number(process.env.SEED ?? 3))
      const src = new Lines(Array.from({ length: 20 }, () => s.text).join('\n'))
      const h = new IncrementalHighlighter(src, s.language, { tokenCache: 200 })
      for (let n = 0; n < Number(process.env.EDITS ?? 60) / 3; n++) {
        const length = src.text.length
        const from = Math.floor(next() * (length + 1))
        const to = Math.min(length, from + (next() < 0.5 ? 0 : Math.floor(next() * 20)))
        const insert = next() < 0.2 ? '' : PIECES[Math.floor(next() * PIECES.length)]!
        h.edit(...src.replace(from, to, insert))
        const a = Math.floor(next() * src.lineCount)
        if (next() < 0.5) h.tokens(a, a + 30)
        else h.work(100)
        if (n % 4 === 3)
          check(h, src, s.language, `edit ${n}: ${from}-${to} ${JSON.stringify(insert)}`)
      }
      check(h, src, s.language, 'at the end')
    })
  }
})

describe('IncrementalHighlighter: the work an edit costs', () => {
  /** A source that counts the lines read. */
  function counted(lines: string[]): TextSource & { reads: number } {
    return {
      reads: 0,
      get lineCount() {
        return lines.length
      },
      lineText(i: number) {
        this.reads++
        return lines[i]!
      },
    }
  }
  const program = (n: number) =>
    Array.from({ length: n }, (_, i) =>
      i % 10 === 9 ? '' : `  const v${i} = f("s${i}", ${i}) // note`,
    )

  it('an edit in the middle of a long file: a few lines tokenized again, not the rest', () => {
    const lines = program(100_000)
    const src = counted(lines)
    const h = new IncrementalHighlighter(src, 'javascript')
    while (!h.work(20_000));
    h.tokens(50_000, 50_040)
    src.reads = 0
    lines[50_010] = '  const changed = 1'
    h.edit(50_010, 50_011, 50_011)
    const rows = h.tokens(50_000, 50_040)
    expect(rows[10]!.map((t) => t.text).join('')).toBe('  const changed = 1')
    expect(src.reads).toBeLessThan(2000)
    expect(h.done).toBe(true)
  })

  it('a comment opened at the top: the lines in view at once, the rest in idle time; closed again, back at once', () => {
    const lines = program(100_000)
    const src = counted(lines)
    const h = new IncrementalHighlighter(src, 'javascript')
    h.tokens(0, 40)
    lines.splice(1, 0, '/*')
    h.edit(1, 1, 2)
    src.reads = 0
    const rows = h.tokens(0, 40)
    expect(rows[5]!.every((t) => t.type === 'comment')).toBe(true)
    expect(src.reads).toBeLessThan(10_000)
    expect(h.done).toBe(false)
    expect(h.settled(40)).toBe(false)
    // A match runs to the end of the text: read whole once.
    while (!h.work(5000));
    expect(h.settled(40)).toBe(true)
    expect(h.tokens(99_990, 100_001).every((r) => r.every((t) => t.type === 'comment'))).toBe(true)
    lines.splice(1, 1)
    h.edit(1, 2, 1)
    src.reads = 0
    expect(h.tokens(0, 40)[5]!.some((t) => t.type === 'keyword')).toBe(true)
    while (!h.work(5000));
    expect(h.tokens(99_990, 100_000)[1]!.some((t) => t.type === 'keyword')).toBe(true)
  })

  it('a language not known: plain lines, nothing to wait for', () => {
    const h = new IncrementalHighlighter(counted(['a', '', 'b']), 'no-such-language')
    expect(h.tokens(0, 3)).toEqual([
      [{ type: 'plain', text: 'a' }],
      [],
      [{ type: 'plain', text: 'b' }],
    ])
    expect(h.done).toBe(true)
  })

  it('reset: another language, from the top', () => {
    const lines = ['let x = 1']
    const h = new IncrementalHighlighter(counted(lines), 'text')
    expect(h.tokens(0, 1)[0]).toEqual([{ type: 'plain', text: 'let x = 1' }])
    h.reset('javascript')
    expect(h.tokens(0, 1)[0]![0]).toEqual({ type: 'keyword', text: 'let' })
  })
})

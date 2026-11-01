import { describe, expect, it } from 'vitest'
import { highlightLines, LineHighlighter } from '../src'
import { samples } from './helpers'

/** A fixed sequence of numbers, so a failure repeats. */
function random(seed: number): () => number {
  return () => {
    seed = (seed * 1103515245 + 12345) % 2147483648
    return seed / 2147483648
  }
}

describe('LineHighlighter: any window of lines as the whole file highlights it', () => {
  for (const s of samples()) {
    it(`${s.file}: windows in any order, checkpoints every few lines`, () => {
      const whole = highlightLines(s.text, s.language)
      const h = new LineHighlighter(s.text, s.language, { checkpointEvery: 3 })
      expect(h.lineCount).toBe(s.text.replace(/\n$/, '').split('\n').length)
      const next = random(s.text.length)
      for (let n = 0; n < 40; n++) {
        const from = Math.floor(next() * h.lineCount)
        const to = Math.min(h.lineCount, from + 1 + Math.floor(next() * 12))
        expect(h.html(from, to), `${from}..${to}`).toEqual(whole.slice(from, to))
      }
      // From the start to the end at once, after the checkpoints are set.
      expect(h.html(0, h.lineCount)).toEqual(whole.slice(0, h.lineCount))
    })
  }

  it('a token over many lines: a window inside it is still in its colour', () => {
    const code = `${'x = 1\n'.repeat(5)}/*\n${'inside\n'.repeat(20)}*/\ny = 2\n`
    const h = new LineHighlighter(code, 'js', { checkpointEvery: 2 })
    expect(h.html(12, 13)).toEqual(['<span class="sx-comment">inside</span>'])
    expect(h.html(27, 28)[0]).toContain('y')
  })

  it("Windows line breaks: the '\\r' belongs to the break", () => {
    const h = new LineHighlighter('a = "x"\r\nb = 2\r\n', 'js')
    expect(h.lineCount).toBe(2)
    expect(h.line(0)).toBe('a = "x"')
    expect(h.tokens(0, 2).map((row) => row.map((t) => t.text).join(''))).toEqual(['a = "x"', 'b = 2'])
  })

  it('a long line cut; an unknown language plain; out of range empty', () => {
    const h = new LineHighlighter(`[${'1,'.repeat(5000)}1]`, 'json')
    expect(h.html(0, 1, 10)[0]!.replace(/<[^>]+>/g, '')).toBe('[1,1,1,1,1')
    const plain = new LineHighlighter('<b>\nx', 'nothing-known')
    expect(plain.html(0, 2)).toEqual(['&lt;b&gt;', 'x'])
    expect(plain.html(5, 9)).toEqual([])
  })

  it('a big file: a window near the end, then near it again, without going through it all twice', () => {
    const code = Array.from({ length: 200_000 }, (_, i) => `const v${i} = "${i}" // line ${i}`).join('\n')
    const h = new LineHighlighter(code, 'js')
    let t = performance.now()
    expect(h.html(199_990, 200_000)).toHaveLength(10)
    const first = performance.now() - t
    t = performance.now()
    h.html(150_000, 150_050)
    h.html(199_000, 199_050)
    const later = performance.now() - t
    expect(later).toBeLessThan(Math.max(first / 5, 20))
  })
})

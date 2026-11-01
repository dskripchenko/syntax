import { describe, expect, it } from 'vitest'
import { highlight, highlightLines, languages, tokenize } from '../src'
import { samples } from './helpers'

describe('every language keeps the text and stays linear', () => {
  const all = samples()

  it('a sample file for every language', () => {
    const covered = new Set(all.map((s) => s.language))
    expect(languages().map((l) => l.id).filter((id) => !covered.has(id))).toEqual([])
    expect(all.filter((s) => s.language === 'unknown').map((s) => s.file)).toEqual([])
  })

  for (const s of all) {
    it(`${s.file} (${s.language}): the tokens join to the text; no empty token; lines line up`, () => {
      const tokens = tokenize(s.text, s.language)
      expect(tokens.map((t) => t.text).join('')).toBe(s.text)
      expect(tokens.every((t) => t.text.length > 0)).toBe(true)
      // Something is highlighted beyond plain text.
      expect(tokens.some((t) => t.type !== 'plain')).toBe(true)
      expect(highlightLines(s.text, s.language)).toHaveLength(s.text.split(/\r?\n/).length)
      // The HTML is the text escaped, wrapped in spans.
      const html = highlight(s.text, s.language)
      const text = html.replace(/<\/?span[^>]*>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&amp;/g, '&')
      expect(text).toBe(s.text)
    })
  }

  // Inputs that make naive patterns backtrack or nest without end: each must finish fast.
  const nasty = [
    '/'.repeat(20000),
    '"'.repeat(20000),
    "'".repeat(20000),
    '`${'.repeat(5000),
    '{'.repeat(20000),
    '<'.repeat(20000),
    '<a b="'.repeat(4000),
    '/*'.repeat(10000),
    '#'.repeat(20000),
    ' : '.repeat(10000),
    'a'.repeat(50000),
    '- '.repeat(10000) + 'x: y',
    '```\n'.repeat(5000),
    '\\'.repeat(20000),
    'x = 1 / 2 / 3 '.repeat(5000),
  ]
  for (const lang of languages().map((l) => l.id)) {
    it(`${lang}: pathological inputs finish fast and keep their text`, () => {
      for (const input of nasty) {
        const start = performance.now()
        const tokens = tokenize(input, lang)
        const ms = performance.now() - start
        expect(tokens.map((t) => t.text).join('')).toBe(input)
        expect(ms, `${lang} on ${JSON.stringify(input.slice(0, 12))}…`).toBeLessThan(1500)
      }
    })
  }

  it('a language not known: the text, escaped', () => {
    expect(highlight('<b> & "x"', 'nope')).toBe('&lt;b&gt; &amp; &quot;x&quot;')
    expect(tokenize('', 'typescript')).toEqual([])
  })
})

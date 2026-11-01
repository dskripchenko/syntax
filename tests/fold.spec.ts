import { describe, expect, it } from 'vitest'
import { foldRanges } from '../src'
import { sample } from './helpers'

const folds = (code: string, language: string) => foldRanges(code, language).map((r) => `${r.start}-${r.end}`)

describe('folding', () => {
  it('brackets: what is between folds, the closing line stays; brackets in strings and comments fold nothing', () => {
    const code = 'function a() {\n  if (x) {\n    y("{")\n  } else {\n    z()\n  }\n}\n'
    expect(folds(code, 'javascript')).toEqual(['1-6', '2-3', '4-5'])
    expect(folds('{\n  "a": [\n    1,\n    2\n  ]\n}', 'json')).toEqual(['1-5', '2-4'])
    // Two lines: nothing to hide.
    expect(folds('{\n}', 'json')).toEqual([])
  })
  it('a multi-line comment folds', () => {
    expect(folds('/**\n * Doc\n */\nconst a = 1', 'typescript')).toEqual(['1-3'])
  })
  it('indentation: YAML and Python', () => {
    expect(folds('a:\n  b: 1\n  c:\n    d: 2\ne: 3\n', 'yaml')).toEqual(['1-4', '3-4'])
    expect(folds('def f():\n    x = 1\n\n    return x\nprint(f())\n', 'python')).toEqual(['1-4'])
  })
  it('tags: an element written over lines; void HTML elements do not open', () => {
    expect(folds('<a>\n  <b>\n    text\n  </b>\n  <c/>\n</a>', 'xml')).toEqual(['1-5', '2-3'])
    expect(folds('<div>\n  <br>\n  <img src=x>\n  text\n</div>', 'html')).toEqual(['1-4'])
  })
  it('Markdown: sections by heading level, fenced blocks', () => {
    const md = '# A\ntext\n## B\nmore\n```\ncode\n```\n# C\nend\n'
    expect(folds(md, 'markdown')).toEqual(['1-7', '3-7', '5-7', '8-9'])
  })
  it('every sample folds without error, inside its lines', () => {
    for (const [file, language] of [['sample.ts', 'typescript'], ['sample.py', 'python'], ['sample.json', 'json'], ['sample.xml', 'xml'], ['sample.html', 'html'], ['sample.md', 'markdown'], ['sample.yaml', 'yaml'], ['sample.rs', 'rust']] as const) {
      const text = sample(file)
      const lines = text.split('\n').length
      const ranges = foldRanges(text, language)
      expect(ranges.length, file).toBeGreaterThan(0)
      for (const r of ranges) expect(r.start >= 1 && r.end <= lines && r.end > r.start, `${file} ${r.start}-${r.end}`).toBe(true)
    }
  })
})

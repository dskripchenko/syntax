import { describe, expect, it } from 'vitest'
import { canValidate, validate } from '../src'
import { sample } from './helpers'

const where = (text: string, language: string) => validate(text, language).map((d) => `${d.severity} ${d.line}:${d.column} ${d.message}`)

describe('validation: the samples are valid', () => {
  for (const [file, language] of [
    ['sample.json', 'json'],
    ['sample.yaml', 'yaml'],
    ['sample.xml', 'xml'],
    ['sample.toml', 'toml'],
    ['sample.ini', 'ini'],
    ['sample.env', 'dotenv'],
    ['sample.csv', 'csv'],
    ['tsconfig.json', 'jsonc'],
    ['events.jsonl', 'jsonl'],
  ] as const) {
    it(`${file}: nothing to report`, () => expect(validate(sample(file), language)).toEqual([]))
  }
  it('languages not checked give nothing; which are checked', () => {
    expect(validate('anything {', 'typescript')).toEqual([])
    expect(['json', 'jsonc', 'jsonl', 'yaml', 'xml', 'toml', 'csv', 'tsv', 'ini', 'dotenv', 'yml'].every(canValidate)).toBe(true)
    expect(canValidate('python')).toBe(false)
  })
})

describe('JSON', () => {
  it('the place and the reason', () => {
    expect(where('{\n  "a": 1,\n  "b": 2,\n}', 'json')).toEqual(["error 4:1 expected a string key"])
    expect(where('{"a": tru}', 'json')).toEqual(["error 1:7 unexpected token, expected 'true'"])
    expect(where('{"a": "x\n"}', 'json')[0]).toMatch(/^error 1:\d+ unterminated string/)
    expect(where('{"a": 1, "a": 2}', 'json')).toEqual(["warning 1:10 duplicate key 'a'"])
  })
  it('with comments and trailing commas (tsconfig.json): fine; the columns stay', () => {
    const tsconfig = '{\n  // options\n  "compilerOptions": { "strict": true, /* yes */ },\n  "include": ["src",],\n}\n'
    expect(validate(tsconfig, 'jsonc')).toEqual([])
    expect(where('{\n  // x\n  "a": nope\n}', 'jsonc')).toEqual(["error 3:8 unexpected token, expected 'null'"])
    // Not in strict JSON.
    expect(validate(tsconfig, 'json').length).toBe(1)
  })
  it('JSON Lines: each line on its own', () => {
    expect(where('{"a":1}\n{"b":2}\n\n{"c":}\n', 'jsonl')).toEqual(["error 4:6 unexpected character '}'"])
  })
})

describe('YAML', () => {
  it('the place and the reason; documents one by one; directives before ---', () => {
    expect(where('a: 1\n  b: 2\n', 'yaml')[0]).toMatch(/^error 2:/)
    expect(where('a: "open\n', 'yaml')[0]).toMatch(/^error 1:4 unterminated/)
    expect(where('a: 1\na: 2\n', 'yaml')).toEqual(["warning 2:1 duplicate key 'a'"])
    expect(validate('a: 1\n---\nb: 2\n---\nc: [1, 2\n', 'yaml').map((d) => d.line)).toEqual([5])
    expect(validate('%YAML 1.2\n---\na: 1\n', 'yaml')).toEqual([])
    // YAML the checker does not read is passed over, not reported.
    expect(validate('? [a, b]\n: c\n', 'yaml')).toEqual([])
  })
})

describe('XML', () => {
  it('tags closed in order, one root, attributes, entities, comments', () => {
    expect(where('<a><b></a>', 'xml')).toEqual(['error 1:7 </a> does not close <b> (line 1)'])
    expect(where('<a>\n  <b>\n</a>', 'xml')[0]).toBe('error 3:1 </a> does not close <b> (line 2)')
    expect(where('<a/><b/>', 'xml')).toEqual(['error 1:5 a second root element: XML has one'])
    expect(where('<a x="1" x="2"/>', 'xml')).toEqual(["error 1:10 attribute 'x' given twice"])
    expect(where('<a x=1/>', 'xml')).toEqual(["error 1:6 the value of 'x' must be quoted"])
    expect(where('<a>Tom & Jerry</a>', 'xml')).toEqual(["error 1:8 a bare '&': write &amp;"])
    expect(where('<a>&nbsp;</a>', 'xml')).toEqual(['error 1:4 unknown entity &nbsp;'])
    expect(where('<a><!-- a -- b --></a>', 'xml')).toEqual(["error 1:11 '--' inside a comment"])
    expect(where('<a>\n<b>', 'xml')).toEqual(['error 2:1 <b> is not closed', 'error 1:1 <a> is not closed'])
    expect(where('<!DOCTYPE a [<!ENTITY me "x">]><a>&me;</a>', 'xml')).toEqual([])
    expect(where(' <?xml version="1.0"?><a/>', 'xml')).toEqual(['error 1:2 the XML declaration must come first'])
  })
})

describe('TOML, CSV, INI, .env', () => {
  it('TOML: values, strings, tables and keys defined once', () => {
    expect(where('a = 1\na = 2\n', 'toml')).toEqual(["error 2:1 key 'a' defined twice"])
    expect(where('[t]\nx = 1\n[t]\n', 'toml')).toEqual(['error 3:1 table [t] defined twice'])
    expect(where('a = "open\n', 'toml')).toEqual(['error 1:5 unterminated string'])
    expect(where('a = yes\n', 'toml')).toEqual(["error 1:5 'yes' is not a TOML value"])
    expect(where('a = [1, 2\nb = 3\n', 'toml')[0]).toMatch(/^error 2:1 expected ',' or ']'/)
    expect(where('a = 1 b\n', 'toml')).toEqual(["error 1:7 unexpected 'b' after the value"])
    expect(validate('[[bin]]\nname = "a"\n[[bin]]\nname = "b"\n', 'toml')).toEqual([])
  })
  it('CSV: quotes and the number of fields', () => {
    expect(where('a,b\n1,2\n3\n', 'csv')).toEqual(['warning 3:1 1 fields, the first row has 2'])
    expect(where('a,b\n"x,1\n', 'csv')).toEqual(['error 2:1 unterminated quoted field'])
    expect(where('a;b;c\n1;2;3\n', 'csv')).toEqual([])
    expect(where('a\tb\n1\t2\t3\n', 'tsv')).toEqual(['warning 2:1 3 fields, the first row has 2'])
    expect(where('# made by a tool\na,b\n1,2\n# end\n', 'csv')).toEqual([])
  })
  it('INI and .env', () => {
    expect(where('[a\nx=1\n', 'ini')).toEqual(['error 1:1 a section header is not closed'])
    expect(where('[a]\nx=1\nx=2\n[b]\nx=3\n', 'ini')).toEqual(["warning 3:1 'x' given twice in [a]"])
    expect(where('engine-strict\nlist[] = 1\nlist[] = 2\n', 'ini')).toEqual([])
    expect(where('A=1\nnot a pair\nA=2\nB="open\n', 'dotenv')).toEqual(['error 2:1 expected KEY=value', "warning 3:1 'A' given twice", 'error 4:3 unterminated quoted value'])
  })
})

import { parseYaml } from '../src/validate/yaml/parse'
import { YamlError } from '../src/validate/yaml/errors'

const value = (text: string): unknown => parseYaml(text).value

/** Asserts a YamlError at the given 1-based place. */
function expectError(text: string, line: number, column: number, message?: RegExp): void {
  let error: unknown
  try {
    parseYaml(text)
  } catch (e) {
    error = e
  }
  expect(error).toBeInstanceOf(YamlError)
  const e = error as YamlError
  if (message) expect(e.message).toMatch(message)
  expect({ line: e.line, column: e.column }).toEqual({ line, column })
}

describe('parseYaml: block collections', () => {
  it('parses nested mappings by indentation', () => {
    expect(value('a: 1\nb:\n  c: x\n  d:\n    e: true\nf: end\n')).toEqual({
      a: 1,
      b: { c: 'x', d: { e: true } },
      f: 'end',
    })
  })

  it('parses sequences, indented and at the key indentation', () => {
    expect(value('a:\n  - 1\n  - 2\nb:\n- x\n- y\nc: z')).toEqual({
      a: [1, 2],
      b: ['x', 'y'],
      c: 'z',
    })
  })

  it('parses compact nested mappings and sequences in sequence items', () => {
    const text = [
      '- name: a',
      '  tags:',
      '  - x',
      '  - y',
      '- name: b',
      '  nested:',
      '    k: v',
      '- - 1',
      '  - 2',
      '-',
      '  late: map',
      '- ',
      '-   spaced: true',
      '    also: 1',
    ].join('\n')
    expect(value(text)).toEqual([
      { name: 'a', tags: ['x', 'y'] },
      { name: 'b', nested: { k: 'v' } },
      [1, 2],
      { late: 'map' },
      null,
      { spaced: true, also: 1 },
    ])
  })

  it('treats empty values as null', () => {
    expect(value('a:\nb: \nc:   # comment\nd:\n  - x')).toEqual({
      a: null,
      b: null,
      c: null,
      d: ['x'],
    })
  })

  it('parses a root scalar, an empty document and a root sequence', () => {
    expect(value('hello')).toBe('hello')
    expect(value('')).toBe(null)
    expect(value('# only a comment\n')).toBe(null)
    expect(value('- a\n- b\n')).toEqual(['a', 'b'])
  })

  it('accepts tabs as separation but not as indentation', () => {
    expect(value('a:\t1\nb:\t\t"x"')).toEqual({ a: 1, b: 'x' })
    expectError('a:\n\tb: 1', 2, 1, /tabs/)
  })

  it('supports explicit keys', () => {
    expect(value('? a\n: 1\n? b\nc: 2')).toEqual({ a: 1, b: null, c: 2 })
    expect(value('- ? x\n  : y')).toEqual([{ x: 'y' }])
    expectError('? [a, b]\n: 1', 1, 1, /complex/)
    expectError('- [a, b]: c', 1, 3, /flow collections as mapping keys/)
  })

  it('converts non-string keys with String()', () => {
    expect(value('200: ok\ntrue: t\n~: n\n1.50: f\n0x10: h')).toEqual({
      '200': 'ok',
      true: 't',
      null: 'n',
      '1.5': 'f',
      '16': 'h',
    })
  })

  it('keeps __proto__ as a plain own key', () => {
    const v = value('__proto__: {polluted: true}\nx: 1') as Record<string, unknown>
    expect(Object.getPrototypeOf(v)).toBe(Object.prototype)
    expect(Object.keys(v)).toEqual(['__proto__', 'x'])
    expect(({} as Record<string, unknown>).polluted).toBeUndefined()
  })
})

describe('parseYaml: flow collections', () => {
  it('parses nested, multi-line flow collections', () => {
    expect(value('a: [1, [2, 3], {b: c, d: [e]}]\nf: {g: 1, h: }\n')).toEqual({
      a: [1, [2, 3], { b: 'c', d: ['e'] }],
      f: { g: 1, h: null },
    })
    const text = 'a: [\n  one,   # first\n  two\n    words,\n  {x: 1,\n   y: 2},\n]\n'
    expect(value(text)).toEqual({ a: ['one', 'two words', { x: 1, y: 2 }] })
  })

  it('handles JSON-like input, trailing commas, single pairs and keys without values', () => {
    expect(value('{"a":1, "b": [true, null, "x"],}')).toEqual({ a: 1, b: [true, null, 'x'] })
    expect(value('[a: 1, b]')).toEqual([{ a: 1 }, 'b'])
    expect(value('{a, b: 2}')).toEqual({ a: null, b: 2 })
    expect(value('{url: http://x.y/z?q=1, t: a:b}')).toEqual({ url: 'http://x.y/z?q=1', t: 'a:b' })
  })

  it('reports unterminated and malformed flow collections', () => {
    expectError('a: [1, 2', 1, 4, /unterminated flow sequence/)
    expectError('a: {x: 1', 1, 4, /unterminated flow mapping/)
    expectError('a: [1, 2 }', 1, 10, /','/)
    expect(value('a: [1 2]')).toEqual({ a: ['1 2'] })
    expectError('a: [1, , 2]', 1, 8, /','/)
  })
})

describe('parseYaml: scalars', () => {
  it('folds multi-line plain scalars', () => {
    expect(value('a: one\n  two\n\n  three\n   four\nb: x')).toEqual({
      a: 'one two\nthree four',
      b: 'x',
    })
    expect(value('- a\n  b # c\n- d')).toEqual(['a b', 'd'])
  })

  it('keeps # without preceding space and colons without following space', () => {
    expect(value('a: b#c\nd: http://e:8080/f\ng: x:y')).toEqual({
      a: 'b#c',
      d: 'http://e:8080/f',
      g: 'x:y',
    })
  })

  it('parses single-quoted scalars', () => {
    expect(value("a: 'it''s'\nb: ''\nc: 'x # y: z'\nd: 'one\n  two\n\n  three'")).toEqual({
      a: "it's",
      b: '',
      c: 'x # y: z',
      d: 'one two\nthree',
    })
  })

  it('parses double-quoted escapes and folding', () => {
    const v = value(
      [
        'a: "tab\\there\\nnl \\"q\\" \\\\ \\/ \\x41\\u00e9\\U0001F600 \\0\\a\\b\\v\\f\\r\\e\\N\\_\\L\\P"',
        'b: "folded   ',
        '   line\\',
        '   joined \\',
        '  ',
        '  end"',
        'c: "trailing\\t   \n  kept"',
      ].join('\n'),
    ) as Record<string, string>
    expect(v.a).toBe(
      'tab\there\nnl "q" \\ / A\u00e9\u{1F600} \0\x07\b\v\f\r\x1b\x85\xa0\u2028\u2029',
    )
    expect(v.b).toBe('folded linejoined \nend')
    expect(v.c).toBe('trailing\t kept')
  })

  it('rejects bad escapes and unterminated quotes', () => {
    expectError('a: "\\q"', 1, 5, /invalid escape/)
    expectError('a: "\\u12"', 1, 5, /invalid escape/)
    expectError('a: "abc', 1, 4, /unterminated/)
    expectError("a: 'abc\n", 1, 4, /unterminated/)
  })

  it('parses literal block scalars with chomping', () => {
    expect(value('a: |\n  one\n   two\n\n  three\n\n\nb: x')).toEqual({
      a: 'one\n two\n\nthree\n',
      b: 'x',
    })
    expect(value('a: |-\n  one\n\n')).toEqual({ a: 'one' })
    expect(value('a: |+\n  one\n\n\nb: 1')).toEqual({ a: 'one\n\n\n', b: 1 })
    expect(value('a: |\nb: 1')).toEqual({ a: '', b: 1 })
    expect(value('a: |+\n\n\nb: 1')).toEqual({ a: '\n\n', b: 1 })
    expect(value('a: | # comment\n  # not a comment\n')).toEqual({ a: '# not a comment\n' })
    // Only blank lines: the indentation is that of the longest one.
    expect(value('- |+\n  \n\n- x')).toEqual(['\n\n', 'x'])
    // Spaces beyond the indentation are text.
    expect(value('a: |-\n  x\n   \n  y')).toEqual({ a: 'x\n \ny' })
  })

  it('parses folded block scalars', () => {
    const text =
      'a: >\n  one\n  two\n\n  three\n    more\n    indented\n  back\n\n\nb: >-\n  x\n  y\n'
    expect(value(text)).toEqual({ a: 'one two\nthree\n  more\n  indented\nback\n', b: 'x y' })
  })

  it('honours an explicit indentation indicator', () => {
    expect(value('a: |2\n    lead\n  base\n')).toEqual({ a: '  lead\nbase\n' })
    expect(value('- |1-\n   x\n- y')).toEqual(['  x', 'y'])
    expect(value('a: >-2\n   lead\n  next')).toEqual({ a: ' lead\nnext' })
    // At the root the indicator counts from column 0, as libyaml does.
    expect(value('|1-\n\n 12-')).toBe('\n12-')
  })

  it('resolves the core schema', () => {
    expect(
      value(
        'n1: null\nn2: ~\nn3: NULL\nn4:\nb1: true\nb2: False\nb3: TRUE\nb4: yes\n' +
          'i1: 42\ni2: -7\ni3: 0x1F\ni4: 0o17\ni5: +3\ni6: 012\n' +
          'f1: 1.5\nf2: -.5\nf3: 1e3\nf4: .inf\nf5: -.Inf\nf6: 6.02E+23\n' +
          's1: 1.2.3\ns2: 0b101\ns3: 1_000\ns4: True!\ns5: nulls\ns6: 0x\ns7: .\n',
      ),
    ).toEqual({
      n1: null,
      n2: null,
      n3: null,
      n4: null,
      b1: true,
      b2: false,
      b3: true,
      b4: 'yes',
      i1: 42,
      i2: -7,
      i3: 31,
      i4: 15,
      i5: 3,
      i6: 12,
      f1: 1.5,
      f2: -0.5,
      f3: 1000,
      f4: Infinity,
      f5: -Infinity,
      f6: 6.02e23,
      s1: '1.2.3',
      s2: '0b101',
      s3: '1_000',
      s4: 'True!',
      s5: 'nulls',
      s6: '0x',
      s7: '.',
    })
    expect(Number.isNaN(value('.nan'))).toBe(true)
    expect(value('"true"')).toBe('true')
    expect(value("'1'")).toBe('1')
    expect(value('|\n  12\n')).toBe('12\n')
  })
})

describe('parseYaml: tags', () => {
  it('applies the core tags and ignores the rest', () => {
    expect(
      value(
        'a: !!str 123\nb: !!int "42"\nc: !!float 1\nd: !!bool "true"\ne: !!null ""\n' +
          'f: !custom 5\ng: !!str\nh: !<tag:yaml.org,2002:str> true\ni: ! 12\nj: !!map {x: 1}\nk: !!str null',
      ),
    ).toEqual({
      a: '123',
      b: 42,
      c: 1,
      d: true,
      e: null,
      f: 5,
      g: '',
      h: 'true',
      i: '12',
      j: { x: 1 },
      k: 'null',
    })
  })

  it('rejects a value its tag cannot convert', () => {
    expectError('a: !!int abc', 1, 4, /!!int/)
    expectError('a: !!bool yes', 1, 4, /!!bool/)
  })
})

describe('parseYaml: anchors, aliases, merge', () => {
  it('shares the anchored value', () => {
    const v = value('a: &x\n  k: 1\nb: *x\nc: &s str\nd: *s\ne: [&f 1, *f]') as Record<
      string,
      unknown
    >
    expect(v.b).toBe(v.a)
    expect(v).toEqual({ a: { k: 1 }, b: { k: 1 }, c: 'str', d: 'str', e: [1, 1] })
  })

  it('anchors on sequence items and compact mappings', () => {
    expect(value('- &item\n  name: x\n- *item')).toEqual([{ name: 'x' }, { name: 'x' }])
    expect(value('- &k key: v\n- *k')).toEqual([{ key: 'v' }, 'key'])
  })

  it('rejects an alias to an unknown anchor (and so recursion)', () => {
    expectError('a: *nope', 1, 4, /unknown anchor 'nope'/)
    expectError('a: &r [1, *r]', 1, 11, /unknown anchor/)
  })

  it('merges a map or a list of maps; explicit keys win', () => {
    const text = [
      'base: &b {x: 1, y: 2}',
      'more: &m {y: 20, z: 30}',
      'one:',
      '  <<: *b',
      '  y: 9',
      'two:',
      '  w: 0',
      '  <<: [*b, *m]',
      'three: {<<: *m, z: 3}',
      'four:',
      '  x: first',
      '  <<: *b',
    ].join('\n')
    const v = value(text) as Record<string, Record<string, unknown>>
    expect(v.one).toEqual({ x: 1, y: 9 })
    expect(v.two).toEqual({ w: 0, x: 1, y: 2, z: 30 })
    expect(v.three).toEqual({ y: 20, z: 3 })
    expect(v.four).toEqual({ x: 'first', y: 2 })
    expect(v.base).toEqual({ x: 1, y: 2 })
  })

  it('treats a quoted << as an ordinary key and rejects bad merge values', () => {
    expect(value("'<<': 1")).toEqual({ '<<': 1 })
    expectError('a:\n  <<: 5', 2, 3, /merge/)
  })
})

describe('parseYaml: documents and comments', () => {
  it('accepts --- and ... markers and directives', () => {
    expect(value('---\na: 1\n...\n')).toEqual({ a: 1 })
    expect(value('--- # doc\n- x\n')).toEqual(['x'])
    expect(value('%YAML 1.2\n---\nfoo')).toBe('foo')
    expect(value('--- |\n  text\n')).toBe('text\n')
    expect(value('a: "---"\nb: x---')).toEqual({ a: '---', b: 'x---' })
  })

  it('rejects a second document', () => {
    expectError('a: 1\n---\nb: 2', 2, 1, /multiple documents/)
    expectError('a: 1\n...\n---\nb: 2', 3, 1, /multiple documents/)
    expectError('a: 1\n...\nb: 2', 3, 1, /after the document/)
  })

  it('ignores comments everywhere they may stand', () => {
    const text =
      '# head\na: 1 # one\n  # indented comment\nb:   # empty\n  - x # item\n  # between\n  - y\n# tail'
    expect(value(text)).toEqual({ a: 1, b: ['x', 'y'] })
  })

  it('normalizes CRLF and a BOM', () => {
    const p = parseYaml('\ufeffa: 1\r\nb: |\r\n  x\r\n  y\r\n')
    expect(p.value).toEqual({ a: 1, b: 'x\ny\n' })
    expect(p.positions.get('/b')).toEqual({ line: 2, column: 1 })
  })
})

describe('parseYaml: errors', () => {
  it('reports duplicate keys at the second key', () => {
    expectError('a: 1\nb: 2\na: 3', 3, 1, /duplicate key 'a'/)
    expectError('x: {a: 1, a: 2}', 1, 11, /duplicate/)
  })

  it('reports bad indentation and stray content', () => {
    expectError('a:\n  b: 1\n   c: 2', 3, 5, /mapping values/)
    expectError('a:\n  b:\n    c: 1\n   d: 2', 4, 4, /indentation/)
    expectError('a: b: c', 1, 5, /mapping values/)
    expectError('a: "x" y', 1, 8, /unexpected content/)
    expectError('- a\nb: 1', 2, 1, /unexpected content/)
    expectError('a:\n  b: 1\n - c', 3, 2, /indentation/)
    expect(value('a: 1\n  - b')).toEqual({ a: '1 - b' })
    expectError('key without colon\nb: 1', 2, 2, /mapping values/)
    expectError('a: - b', 1, 4, /sequence/)
    expectError('a: @x', 1, 4, /unexpected character/)
  })

  it('reports invalid block scalar headers', () => {
    expectError('a: |x\n  t', 1, 5, /block scalar header/)
    expectError('a: |0\n  t', 1, 5, /block scalar header/)
  })
})

describe('parseYaml: positions', () => {
  it('maps pointers to keys for members and to content for items', () => {
    const text = [
      'openapi: 3.1.0', //   1
      'paths:', //           2
      '  /pets/{id}:', //    3
      '    get:', //         4
      '      tags: [a, b]', // 5
      '      params:', //    6
      '        - name: id', // 7
      '          in: path', // 8
      '        -   plain', // 9
      '        -', //        10
      '          deep: 1', // 11
      'a~b: {x: [1, 2]}', // 12
    ].join('\n')
    const { positions } = parseYaml(text)
    expect(positions.get('')).toEqual({ line: 1, column: 1 })
    expect(positions.get('/openapi')).toEqual({ line: 1, column: 1 })
    expect(positions.get('/paths')).toEqual({ line: 2, column: 1 })
    expect(positions.get('/paths/~1pets~1{id}')).toEqual({ line: 3, column: 3 })
    expect(positions.get('/paths/~1pets~1{id}/get/tags')).toEqual({ line: 5, column: 7 })
    expect(positions.get('/paths/~1pets~1{id}/get/tags/1')).toEqual({ line: 5, column: 17 })
    expect(positions.get('/paths/~1pets~1{id}/get/params/0')).toEqual({ line: 7, column: 11 })
    expect(positions.get('/paths/~1pets~1{id}/get/params/0/in')).toEqual({ line: 8, column: 11 })
    expect(positions.get('/paths/~1pets~1{id}/get/params/1')).toEqual({ line: 9, column: 13 })
    expect(positions.get('/paths/~1pets~1{id}/get/params/2')).toEqual({ line: 11, column: 11 })
    expect(positions.get('/a~0b')).toEqual({ line: 12, column: 1 })
    expect(positions.get('/a~0b/x')).toEqual({ line: 12, column: 7 })
    expect(positions.get('/a~0b/x/1')).toEqual({ line: 12, column: 14 })
  })

  it('points merged members at the << key and aliases at the alias', () => {
    const { positions } = parseYaml('b: &b {x: 1}\nc:\n  <<: *b\nd: *b')
    expect(positions.get('/c/x')).toEqual({ line: 3, column: 3 })
    expect(positions.get('/d')).toEqual({ line: 4, column: 1 })
    expect(positions.has('/c/<<')).toBe(false)
  })
})

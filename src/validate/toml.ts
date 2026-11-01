/**
 * Whether TOML is valid: keys and values written as TOML writes them, strings
 * closed, arrays and inline tables closed, no key or table defined twice.
 * Dates and numbers are checked by their shape.
 */
import type { Diagnostic } from './index'

const BARE = /[A-Za-z0-9_-]+/y
const DATE = /\d{4}-\d\d-\d\d(?:[Tt ]\d\d:\d\d(?::\d\d(?:\.\d+)?)?(?:[Zz]|[+-]\d\d:\d\d)?)?|\d\d:\d\d:\d\d(?:\.\d+)?/y
const NUMBER = /[+-]?(?:inf|nan|0x[\da-fA-F](?:_?[\da-fA-F])*|0o[0-7](?:_?[0-7])*|0b[01](?:_?[01])*|(?:0|[1-9](?:_?\d)*)(?:\.\d(?:_?\d)*)?(?:[eE][+-]?\d(?:_?\d)*)?)(?![\w.])/y

export function validateToml(text: string): Diagnostic[] {
  const out: Diagnostic[] = []
  const starts = [0]
  for (let i = 0; i < text.length; i++) if (text.charCodeAt(i) === 10) starts.push(i + 1)
  const at = (offset: number) => {
    let lo = 0
    let hi = starts.length - 1
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1
      if (starts[mid]! <= offset) lo = mid
      else hi = mid - 1
    }
    return { line: lo + 1, column: offset - starts[lo]! + 1 }
  }
  class Fail extends Error {
    constructor(readonly offset: number, message: string) {
      super(message)
    }
  }
  const fail = (offset: number, message: string): never => {
    throw new Fail(offset, message)
  }

  let p = 0
  const space = () => {
    while (p < text.length && (text[p] === ' ' || text[p] === '\t')) p++
  }
  const comment = () => {
    if (text[p] === '#') while (p < text.length && text[p] !== '\n') p++
  }
  const endOfLine = () => {
    space()
    comment()
    if (p < text.length && text[p] !== '\n' && text[p] !== '\r') fail(p, `unexpected '${text[p]}' after the value`)
  }
  // Inside arrays: white space, line breaks and comments.
  const blank = () => {
    for (;;) {
      space()
      if (text[p] === '#') comment()
      else if (text[p] === '\n' || text[p] === '\r') p++
      else return
    }
  }

  const key = (): string[] => {
    const parts: string[] = []
    for (;;) {
      space()
      const c = text[p]
      if (c === '"' || c === "'") parts.push(string(false))
      else {
        BARE.lastIndex = p
        const m = BARE.exec(text)
        if (!m) fail(p, c === undefined || c === '\n' ? 'a key is expected' : `'${c}' cannot start a key`)
        parts.push(m![0])
        p += m![0].length
      }
      space()
      if (text[p] !== '.') return parts
      p++
    }
  }

  const string = (multilineAllowed = true): string => {
    const q = text[p]!
    const triple = text.startsWith(q.repeat(3), p)
    if (triple) {
      if (!multilineAllowed) fail(p, 'a key cannot be a multi-line string')
      const end = text.indexOf(q.repeat(3), p + 3)
      if (end < 0) fail(p, 'unterminated multi-line string')
      let close = end + 3
      while (text[close] === q && close - end < 5) close++
      const s = text.slice(p + 3, close - 3)
      p = close
      return s
    }
    const start = p
    p++
    let s = ''
    while (p < text.length && text[p] !== q) {
      if (text[p] === '\n') fail(start, 'unterminated string')
      if (q === '"' && text[p] === '\\') {
        const e = text[p + 1] ?? ''
        if ('btnfr"\\e'.includes(e)) p += 2
        else if (e === 'u' && /^[\da-fA-F]{4}$/.test(text.slice(p + 2, p + 6))) p += 6
        else if (e === 'U' && /^[\da-fA-F]{8}$/.test(text.slice(p + 2, p + 10))) p += 10
        else if (e === 'x' && /^[\da-fA-F]{2}$/.test(text.slice(p + 2, p + 4))) p += 4
        else fail(p, `invalid escape '\\${e}'`)
        continue
      }
      s += text[p]
      p++
    }
    if (p >= text.length) fail(start, 'unterminated string')
    p++
    return s
  }

  const value = (): void => {
    space()
    const c = text[p]
    if (c === '"' || c === "'") return void string()
    if (c === '[') {
      p++
      blank()
      while (text[p] !== ']') {
        if (p >= text.length) fail(p, 'unterminated array')
        value()
        blank()
        if (text[p] === ',') {
          p++
          blank()
        } else if (text[p] !== ']') fail(p, "expected ',' or ']' in an array")
      }
      p++
      return
    }
    if (c === '{') {
      p++
      space()
      const seen = new Set<string>()
      if (text[p] === '}') return void p++
      for (;;) {
        const k = key().join('.')
        if (seen.has(k)) fail(p, `key '${k}' given twice in an inline table`)
        seen.add(k)
        space()
        if (text[p] !== '=') fail(p, "expected '=' after a key")
        p++
        value()
        space()
        if (text[p] === ',') {
          p++
          continue
        }
        if (text[p] === '}') return void p++
        fail(p, "expected ',' or '}' in an inline table")
      }
    }
    if (text.startsWith('true', p) && !/[\w-]/.test(text[p + 4] ?? '')) return void (p += 4)
    if (text.startsWith('false', p) && !/[\w-]/.test(text[p + 5] ?? '')) return void (p += 5)
    DATE.lastIndex = p
    const d = DATE.exec(text)
    if (d) return void (p += d[0].length)
    NUMBER.lastIndex = p
    const n = NUMBER.exec(text)
    if (n) return void (p += n[0].length)
    fail(p, c === undefined || c === '\n' ? 'a value is expected' : `'${text.slice(p).split(/[\s,\]}#]/)[0]}' is not a TOML value`)
  }

  // Keys defined, by their full dotted path; tables defined by a header.
  const defined = new Set<string>()
  const headers = new Set<string>()
  const arrays = new Set<string>()
  let table = ''
  while (p < text.length) {
    try {
      blank()
      if (p >= text.length) break
      const lineStart = p
      if (text[p] === '[') {
        const isArray = text[p + 1] === '['
        p += isArray ? 2 : 1
        const name = key().join('.')
        if (text[p] !== ']' || (isArray && text[p + 1] !== ']')) fail(p, isArray ? "expected ']]'" : "expected ']'")
        p += isArray ? 2 : 1
        if (isArray) {
          if (headers.has(name)) fail(lineStart, `[[${name}]]: '${name}' is already a table`)
          arrays.add(name)
          // Each [[x]] starts a fresh element: its keys are new again.
          for (const k of [...defined]) if (k.startsWith(`${name}.`)) defined.delete(k)
        } else {
          if (headers.has(name) || defined.has(name)) fail(lineStart, `table [${name}] defined twice`)
          if (arrays.has(name)) fail(lineStart, `[${name}]: '${name}' is an array of tables`)
          headers.add(name)
        }
        table = name
        endOfLine()
        continue
      }
      const k = key()
      const full = [table, ...k].filter(Boolean).join('.')
      if (defined.has(full) || headers.has(full)) fail(lineStart, `key '${k.join('.')}' defined twice`)
      defined.add(full)
      space()
      if (text[p] !== '=') fail(p, "expected '=' after a key")
      p++
      value()
      endOfLine()
    } catch (e) {
      if (!(e instanceof Fail)) throw e
      out.push({ ...at(e.offset), message: e.message, severity: 'error' })
      if (out.length >= 50) break
      // Go on from the next line.
      const next = text.indexOf('\n', Math.max(p, e.offset))
      if (next < 0) break
      p = next + 1
    }
  }
  return out
}

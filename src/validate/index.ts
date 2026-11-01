/**
 * Validation of data formats: where the text is not what its format allows,
 * with the line and column and a message. Errors break the format; warnings
 * are allowed by it but are almost always mistakes (a key given twice, a CSV
 * row with another number of fields).
 *
 * Silence is not a proof: a construct a checker does not read (YAML's complex
 * keys, for one) is passed over rather than reported.
 */
import { grammarOf } from '../engine'
import { JsonError, parseJson } from './json'
import { YamlError } from './yaml/errors'
import { parseYaml } from './yaml/parse'
import { validateToml } from './toml'
import { validateXml } from './xml'

export interface Diagnostic {
  /** 1-based. */
  line: number
  column: number
  message: string
  severity: 'error' | 'warning'
}

/** The formats `validate` checks, by language id. */
export const VALIDATED = ['json', 'jsonc', 'yaml', 'xml', 'toml', 'csv', 'ini', 'dotenv'] as const

export function canValidate(language: string): boolean {
  const id = grammarOf(language)?.id ?? language
  return (VALIDATED as readonly string[]).includes(id) || ['jsonl', 'ndjson', 'tsv'].includes(language)
}

/** What is wrong with the text as its format, in the order found; at most 50. Empty for a language not checked. */
export function validate(text: string, language: string): Diagnostic[] {
  const id = language.toLowerCase()
  switch (id) {
    case 'jsonl':
    case 'ndjson':
      return jsonLines(text)
    case 'tsv':
      return validateCsv(text, '\t')
  }
  switch (grammarOf(id)?.id ?? id) {
    case 'json':
      return json(text, id === 'json5' || id === 'jsonc')
    case 'jsonc':
      return json(text, true)
    case 'yaml':
      return yaml(text)
    case 'xml':
      return validateXml(text)
    case 'toml':
      return validateToml(text)
    case 'csv':
      return validateCsv(text)
    case 'ini':
      return validateIni(text)
    case 'dotenv':
      return validateEnv(text)
    default:
      return []
  }
}

/**
 * JSON; with comments and trailing commas allowed (`jsonc`: tsconfig.json,
 * VS Code's settings), they are blanked out first — columns stay where they were.
 */
function json(text: string, comments: boolean): Diagnostic[] {
  const source = comments ? blankComments(text) : text
  try {
    parseJson(source)
    return []
  } catch (e) {
    if (!(e instanceof JsonError)) throw e
    return [{ line: e.line, column: e.column, message: e.reason, severity: /^duplicate key/.test(e.reason) ? 'warning' : 'error' }]
  }
}

/** Comments and commas before a closing bracket, replaced by spaces (line breaks kept). */
export function blankComments(text: string): string {
  let out = ''
  let i = 0
  while (i < text.length) {
    const c = text[i]!
    if (c === '"') {
      const start = i
      i++
      while (i < text.length && text[i] !== '"' && text[i] !== '\n') i += text[i] === '\\' ? 2 : 1
      i++
      out += text.slice(start, i)
    } else if (c === '/' && text[i + 1] === '/') {
      while (i < text.length && text[i] !== '\n') {
        out += ' '
        i++
      }
    } else if (c === '/' && text[i + 1] === '*') {
      const end = text.indexOf('*/', i + 2)
      const stop = end < 0 ? text.length : end + 2
      out += text.slice(i, stop).replace(/[^\n]/g, ' ')
      i = stop
    } else if (c === ',') {
      // A trailing comma: only white space and comments before the bracket.
      let k = i + 1
      for (;;) {
        while (k < text.length && /\s/.test(text[k]!)) k++
        if (text.startsWith('//', k)) while (k < text.length && text[k] !== '\n') k++
        else if (text.startsWith('/*', k)) k = text.indexOf('*/', k + 2) < 0 ? text.length : text.indexOf('*/', k + 2) + 2
        else break
      }
      out += text[k] === '}' || text[k] === ']' ? ' ' : ','
      i++
    } else {
      out += c
      i++
    }
  }
  return out
}

/** JSON Lines: every non-empty line one JSON value. */
function jsonLines(text: string): Diagnostic[] {
  const out: Diagnostic[] = []
  text.split(/\r?\n/).forEach((line, i) => {
    if (line.trim() === '' || out.length >= 50) return
    for (const d of json(line, false)) out.push({ ...d, line: i + 1 })
  })
  return out
}

/**
 * YAML, document by document (`---` between them). Constructs the parser does
 * not read — complex keys, collections as keys, empty keys — end the check
 * quietly: they are YAML, not mistakes.
 */
function yaml(text: string): Diagnostic[] {
  const lines = text.split('\n')
  const docs: { from: number; text: string }[] = []
  let from = 0
  for (let i = 1; i <= lines.length; i++) {
    if (i === lines.length || /^---(?:\s|$)/.test(lines[i]!)) {
      // Directives (%YAML, %TAG) and comments before a '---' belong to the document it starts.
      if (i < lines.length && lines.slice(from, i).every((l) => /^\s*(?:%|#|$)/.test(l))) continue
      docs.push({ from, text: lines.slice(from, i).join('\n') })
      from = i
    }
  }
  const out: Diagnostic[] = []
  for (const doc of docs) {
    if (doc.text.trim() === '' || doc.text.trim() === '---') continue
    try {
      parseYaml(doc.text)
    } catch (e) {
      if (!(e instanceof YamlError)) throw e
      if (/not supported/.test(e.reason)) continue
      out.push({ line: e.line + doc.from, column: e.column, message: e.reason, severity: /^duplicate key/.test(e.reason) ? 'warning' : 'error' })
    }
  }
  return out
}

/**
 * CSV: quotes closed and not stray, every row as many fields as the first;
 * the separator found from the first line (`,` `;` tab `|`) unless given;
 * lines starting with `#` taken as comments.
 */
export function validateCsv(text: string, separator?: string): Diagnostic[] {
  const out: Diagnostic[] = []
  const firstLine = text.slice(0, text.indexOf('\n') < 0 ? text.length : text.indexOf('\n'))
  const sep = separator ?? [',', ';', '\t', '|'].map((s) => [s, firstLine.split(s).length] as const).sort((a, b) => b[1] - a[1])[0]![0]
  let expected = -1
  let line = 1
  let fields = 1
  let rowStart = 1
  let i = 0
  let fieldStart = true
  while (i <= text.length && out.length < 50) {
    const c = text[i]
    // A line starting with '#' is a comment: not CSV, but common in files written by tools.
    if (c === '#' && fields === 1 && fieldStart && (i === 0 || text[i - 1] === '\n')) {
      while (i < text.length && text[i] !== '\n') i++
      if (i >= text.length) break
      line++
      rowStart = line
      i++
      continue
    }
    if (c === '"' && fieldStart) {
      const open = { line, column: 0 }
      i++
      for (;;) {
        if (i >= text.length) return [...out, { line: open.line, column: 1, message: 'unterminated quoted field', severity: 'error' }]
        if (text[i] === '"') {
          if (text[i + 1] === '"') i += 2
          else break
        } else {
          if (text[i] === '\n') line++
          i++
        }
      }
      i++
      fieldStart = false
      if (i < text.length && text[i] !== sep && text[i] !== '\n' && text[i] !== '\r') out.push({ line, column: 1, message: 'text after a closing quote', severity: 'error' })
      continue
    }
    if (c === sep) {
      fields++
      fieldStart = true
    } else if (c === '\n' || c === undefined) {
      const empty = fields === 1 && text.slice(text.lastIndexOf('\n', i - 1) + 1, i).trim() === ''
      if (!empty) {
        if (expected < 0) expected = fields
        else if (fields !== expected) out.push({ line: rowStart, column: 1, message: `${fields} fields, the first row has ${expected}`, severity: 'warning' })
      }
      if (c === undefined) break
      line++
      rowStart = line
      fields = 1
      fieldStart = true
    } else if (c === '"' && !fieldStart) {
      out.push({ line, column: 1, message: 'a quote inside an unquoted field', severity: 'warning' })
    } else if (c !== '\r' && c !== ' ') fieldStart = false
    i++
  }
  return out
}

/** INI: sections closed, every other line a key with a value or a comment; a key given twice in a section. */
export function validateIni(text: string): Diagnostic[] {
  const out: Diagnostic[] = []
  let section = ''
  const seen = new Set<string>()
  text.split(/\r?\n/).forEach((raw, i) => {
    const line = raw.trim()
    if (line === '' || /^[;#!]/.test(line) || out.length >= 50) return
    if (line.startsWith('[')) {
      if (!/^\[[^\]]*\]\s*(?:[;#].*)?$/.test(line)) out.push({ line: i + 1, column: raw.indexOf('[') + 1, message: 'a section header is not closed', severity: 'error' })
      section = line.slice(1, line.indexOf(']') < 0 ? undefined : line.indexOf(']')).trim()
      return
    }
    const m = /^([^=:]+?)\s*[=:]/.exec(line)
    // A key alone means "on" (.npmrc's `engine-strict`, git's `bare`).
    if (!m && /^[\w.@/:-]+$/.test(line)) return
    if (!m) {
      out.push({ line: i + 1, column: raw.search(/\S/) + 1, message: "neither a section, a key with '=' nor a comment", severity: 'warning' })
      return
    }
    const key = `${section}\u0000${m[1]!.trim()}`
    // `key[] = …` collects values (PHP, systemd): not a repeat.
    if (seen.has(key) && !m[1]!.trim().endsWith('[]')) out.push({ line: i + 1, column: raw.search(/\S/) + 1, message: `'${m[1]!.trim()}' given twice${section ? ` in [${section}]` : ''}`, severity: 'warning' })
    seen.add(key)
  })
  return out
}

/** .env: `KEY=value` lines and comments; quotes closed; a key given twice. */
export function validateEnv(text: string): Diagnostic[] {
  const out: Diagnostic[] = []
  const seen = new Set<string>()
  const lines = text.split(/\r?\n/)
  for (let i = 0; i < lines.length && out.length < 50; i++) {
    const raw = lines[i]!
    const line = raw.trim()
    if (line === '' || line.startsWith('#')) continue
    const m = /^(?:export\s+)?([A-Za-z_][\w.]*)\s*=\s*(.*)$/.exec(line)
    if (!m) {
      out.push({ line: i + 1, column: raw.search(/\S/) + 1, message: "expected KEY=value", severity: 'error' })
      continue
    }
    if (seen.has(m[1]!)) out.push({ line: i + 1, column: raw.search(/\S/) + 1, message: `'${m[1]}' given twice`, severity: 'warning' })
    seen.add(m[1]!)
    const v = m[2]!
    const q = v[0]
    if (q === '"' || q === "'") {
      // A quoted value may run over lines; it must be closed.
      let rest = v.slice(1)
      let k = i
      while (!new RegExp(`(?<!\\\\)${q}`).test(rest) && k + 1 < lines.length) rest += '\n' + lines[++k]
      if (!new RegExp(`(?<!\\\\)${q}`).test(rest)) out.push({ line: i + 1, column: raw.indexOf(q) + 1, message: 'unterminated quoted value', severity: 'error' })
      i = k
    }
  }
  return out
}

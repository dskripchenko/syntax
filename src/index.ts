/**
 * @dskripchenko/syntax — syntax highlighting for programming languages, data
 * formats and the files around code, with no runtime dependencies and no DOM.
 *
 *     import { highlight, languageOf } from '@dskripchenko/syntax'
 *     const html = highlight(code, languageOf('main.rs') ?? 'text')
 *
 * The output is HTML of `<span class="sx-keyword">` and so on, every piece of
 * the text escaped; the colours are CSS custom properties (`THEME_CSS`).
 */
import { allGrammars, grammarOf, register, tokenize, type Token } from './engine'
import { CODE } from './languages/code'
import { FORMATS } from './languages/formats'
import { span } from './html'

export type { Grammar, Rule, Token, TokenType, Before, Embedded } from './engine'
export { tokenize, register } from './engine'
export { THEME_CSS, TOKEN_TYPES } from './theme'
export { validate, canValidate, VALIDATED, type Diagnostic } from './validate'
export { foldRanges, type FoldRange } from './fold'
export { escapeHtml } from './html'
export { LineHighlighter } from './lines'
export { IncrementalHighlighter, type TextSource, type IncrementalHighlighterOptions } from './incremental'
export { logEntries, logLevelOf, LOG_LEVELS, type LogEntry, type LogLevel } from './log'

for (const g of [...CODE, ...FORMATS]) register(g)

export interface LanguageInfo {
  id: string
  name: string
  aliases: string[]
  extensions: string[]
  filenames: string[]
}

/** The languages known, by id. */
export function languages(): LanguageInfo[] {
  return allGrammars().map((g) => ({ id: g.id, name: g.name, aliases: g.aliases ?? [], extensions: g.extensions ?? [], filenames: g.filenames ?? [] }))
}

/** Whether a language (an id or an alias) is known. */
export function isSupported(language: string): boolean {
  return grammarOf(language) !== undefined
}

/** The language's id for an id or an alias (`yml` → `yaml`); null when it is not known. */
export function resolveLanguage(language: string): string | null {
  return grammarOf(language)?.id ?? null
}

const baseName = (path: string): string => path.split(/[\\/]/).pop() ?? path

/**
 * The language of a file: by its whole name (`Dockerfile`, `.env.local`), its
 * extension (`.tsx`), or — for a file without one — the interpreter its first
 * line names (`#!/usr/bin/env python3`). Null when nothing says.
 */
export function languageOf(fileName: string, firstLine = ''): string | null {
  const name = baseName(fileName)
  const lower = name.toLowerCase()
  const grammars = allGrammars()
  const byName = grammars.find((g) => g.filenames?.some((f) => f.toLowerCase() === lower))
  if (byName) return byName.id
  if (/^(?:tsconfig|jsconfig)\..+\.json$/i.test(name)) return 'jsonc'
  // The longest extension that fits: `.d.ts` before `.ts`, `.env.local` by the filenames above.
  let best: { id: string; length: number } | null = null
  for (const g of grammars) {
    for (const ext of g.extensions ?? []) {
      if (lower.endsWith(ext.toLowerCase()) && lower.length > ext.length && (!best || ext.length > best.length)) best = { id: g.id, length: ext.length }
    }
  }
  if (best) return best.id
  if (/^Dockerfile\./i.test(name) || /\.Dockerfile$/i.test(name)) return 'dockerfile'
  if (/^\.env(\.|$)/.test(lower)) return 'dotenv'
  const bang = /^#!\s*(\S+)(?:\s+(\S+))?/.exec(firstLine)
  if (bang) {
    const program = bang[1]!.endsWith('/env') ? (bang[2] ?? '') : bang[1]!
    const hit = grammars.find((g) => g.shebang?.test(baseName(program)))
    if (hit) return hit.id
  }
  return null
}


/** The text as HTML: a span per token (plain text bare), everything escaped. A language not known gives the text escaped. */
export function highlight(code: string, language: string): string {
  return tokenize(code, language).map(span).join('')
}

/**
 * The text as HTML line by line — for line numbers, or for drawing only the
 * lines in view: a token spanning lines is cut at each line's end, so every
 * line is markup complete in itself. The line breaks are not included.
 */
export function highlightLines(code: string, language: string): string[] {
  const lines: string[] = ['']
  for (const t of tokenize(code, language)) {
    const parts = t.text.split(/\r?\n/)
    parts.forEach((part, i) => {
      if (i > 0) lines.push('')
      if (part !== '') lines[lines.length - 1] += span({ type: t.type, text: part })
    })
  }
  return lines
}

/** Tokens line by line, for a host that draws them itself. */
export function tokenizeLines(code: string, language: string): Token[][] {
  const lines: Token[][] = [[]]
  for (const t of tokenize(code, language)) {
    const parts = t.text.split(/\r?\n/)
    parts.forEach((part, i) => {
      if (i > 0) lines.push([])
      if (part !== '') lines[lines.length - 1]!.push({ type: t.type, text: part })
    })
  }
  return lines
}


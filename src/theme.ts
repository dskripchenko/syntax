/**
 * The colours: a CSS custom property per token type, light by default, dark
 * for `[data-theme="dark"]` (on any ancestor) and for a dark system when the
 * page sets no theme. A page restyles everything with a few declarations.
 */
import type { TokenType } from './engine'

export const TOKEN_TYPES: readonly TokenType[] = [
  'keyword', 'string', 'number', 'comment', 'function', 'type', 'variable', 'constant', 'operator', 'punctuation',
  'property', 'tag', 'attribute', 'regex', 'meta', 'escape', 'heading', 'emphasis', 'strong', 'link',
  'inserted', 'deleted', 'date', 'error', 'warning', 'info', 'debug',
]

const LIGHT: Record<string, string> = {
  keyword: '#8250df', string: '#0a3069', number: '#0550ae', comment: '#6e7781', function: '#8a3a00', type: '#953800',
  variable: '#953800', constant: '#0550ae', operator: '#cf222e', punctuation: '#57606a', property: '#0550ae', tag: '#116329',
  attribute: '#0550ae', regex: '#116329', meta: '#6639ba', escape: '#cf222e', heading: '#0550ae', emphasis: 'inherit', strong: 'inherit',
  link: '#0969da', inserted: '#116329', deleted: '#82071e', date: '#6639ba', error: '#cf222e', warning: '#9a6700', info: '#0969da', debug: '#6e7781',
}
const DARK: Record<string, string> = {
  keyword: '#d2a8ff', string: '#a5d6ff', number: '#79c0ff', comment: '#8b949e', function: '#ffa657', type: '#ffa657',
  variable: '#ffa657', constant: '#79c0ff', operator: '#ff7b72', punctuation: '#8b949e', property: '#79c0ff', tag: '#7ee787',
  attribute: '#79c0ff', regex: '#7ee787', meta: '#d2a8ff', escape: '#ff7b72', heading: '#79c0ff', emphasis: 'inherit', strong: 'inherit',
  link: '#58a6ff', inserted: '#7ee787', deleted: '#ffa198', date: '#d2a8ff', error: '#ff7b72', warning: '#e3b341', info: '#58a6ff', debug: '#8b949e',
}

const vars = (palette: Record<string, string>) => TOKEN_TYPES.map((t) => `--sx-${t}: ${palette[t]};`).join(' ')

export const THEME_CSS = [
  `:root { ${vars(LIGHT)} }`,
  `@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { ${vars(DARK)} } }`,
  `[data-theme="dark"] { ${vars(DARK)} }`,
  `[data-theme="light"] { ${vars(LIGHT)} }`,
  ...TOKEN_TYPES.map((t) => `.sx-${t} { color: var(--sx-${t}); }`),
  '.sx-comment { font-style: italic; }',
  '.sx-strong, .sx-heading, .sx-error { font-weight: 600; }',
  '.sx-emphasis { font-style: italic; }',
  '.sx-link { text-decoration: underline; text-underline-offset: 2px; }',
  '.sx-inserted { background: color-mix(in srgb, var(--sx-inserted) 12%, transparent); }',
  '.sx-deleted { background: color-mix(in srgb, var(--sx-deleted) 12%, transparent); }',
].join('\n')

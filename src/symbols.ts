/**
 * The symbols of a text — functions, classes, methods, types, constants;
 * a document's headings, a config's sections and keys — with the lines they
 * span, nested as they are written. No parser: declaration patterns per
 * language over the text with its comments and strings blanked out (by the
 * tokenizer), so a declaration in a comment or a string is never one.
 * Ranges come from the brackets, the indentation or the headings.
 */
import { grammarOf, tokenize } from './engine'

export type SymbolKind =
  | 'class'
  | 'interface'
  | 'struct'
  | 'enum'
  | 'trait'
  | 'type'
  | 'function'
  | 'method'
  | 'constructor'
  | 'property'
  | 'constant'
  | 'variable'
  | 'module'
  | 'namespace'
  | 'heading'
  | 'key'
  | 'section'
  | 'selector'
  | 'target'
  | 'table'

export interface SymbolNode {
  name: string
  kind: SymbolKind
  /** 1-based; the line of the declaration and the last line of its body. */
  line: number
  column: number
  endLine: number
  children: SymbolNode[]
}

/** How a symbol's body is found: by brackets after it, by indentation below it, or it has none. */
type Body = 'braces' | 'indent' | 'none'

interface Pattern {
  re: RegExp
  kind: SymbolKind | ((m: RegExpExecArray) => SymbolKind)
  /** The capture group holding the name (1), or a function making it. */
  name?: number | ((m: RegExpExecArray) => string)
  body?: Body
  /** Only inside a symbol of these kinds (a method in a class). */
  inside?: SymbolKind[]
  /** Only outside any symbol (a top-level constant). */
  topLevel?: boolean
  /** A call followed by a block looks the same (`if (x) {`): keywords are never its name. */
  guard?: boolean
}

const ID = '[A-Za-z_$][\\w$]*'
/** Words that look like a call followed by a block, never a method. */
const NOT_METHOD = new Set(['if', 'for', 'while', 'switch', 'catch', 'function', 'return', 'with', 'foreach', 'elseif', 'else', 'do', 'try', 'using', 'lock', 'fixed', 'synchronized', 'when', 'match', 'new', 'sizeof', 'typeof', 'defer', 'go', 'select', 'case'])

const JS: Pattern[] = [
  { re: new RegExp(`^[ \\t]*(?:export\\s+(?:default\\s+)?)?(?:declare\\s+)?(?:abstract\\s+)?class\\s+(${ID})`, 'gm'), kind: 'class', body: 'braces' },
  { re: new RegExp(`^[ \\t]*(?:export\\s+(?:default\\s+)?)?(?:declare\\s+)?interface\\s+(${ID})`, 'gm'), kind: 'interface', body: 'braces' },
  { re: new RegExp(`^[ \\t]*(?:export\\s+)?(?:declare\\s+)?(?:const\\s+)?enum\\s+(${ID})`, 'gm'), kind: 'enum', body: 'braces' },
  { re: new RegExp(`^[ \\t]*(?:export\\s+)?(?:declare\\s+)?(?:namespace|module)\\s+(${ID}(?:\\.${ID})*)`, 'gm'), kind: 'namespace', body: 'braces' },
  { re: new RegExp(`^[ \\t]*(?:export\\s+)?(?:declare\\s+)?type\\s+(${ID})\\s*(?:<[^=]*>)?\\s*=`, 'gm'), kind: 'type', body: 'none' },
  { re: new RegExp(`^[ \\t]*(?:export\\s+(?:default\\s+)?)?(?:declare\\s+)?(?:async\\s+)?function\\s*\\*?\\s*(${ID})`, 'gm'), kind: 'function', body: 'braces' },
  {
    re: new RegExp(`^[ \\t]*(?:export\\s+)?(?:const|let|var)\\s+(${ID})\\s*(?::[^=\\n]+)?=\\s*(?:async\\s+)?(?:function\\b|\\([^)]*\\)\\s*(?::[^=\\n]+)?=>|${ID}\\s*=>)`, 'gm'),
    kind: 'function',
    body: 'braces',
  },
  { re: /^(?:export\s+)?const\s+([A-Z][A-Z0-9_]*)\s*(?::[^=\n]+)?=/gm, kind: 'constant', body: 'none', topLevel: true },
  {
    re: new RegExp(`^[ \\t]*(?:(?:public|private|protected|static|readonly|async|abstract|override|declare|get|set)\\s+)*\\*?\\s*(#?${ID})\\s*(?:<[^>\\n]*>)?\\s*\\([^)]*\\)\\s*(?::[^{;\\n]+)?\\{`, 'gm'),
    kind: (m) => (m[1] === 'constructor' ? 'constructor' : 'method'),
    body: 'braces',
    inside: ['class'],
  },
  {
    re: new RegExp(`^[ \\t]*(?:(?:public|private|protected|static|readonly|declare|override)\\s+)*(#?${ID})\\s*[?!]?\\s*(?::[^=;\\n]+)?(?:=[^;\\n]*)?;?[ \\t]*$`, 'gm'),
    kind: 'property',
    body: 'none',
    inside: ['class', 'interface'],
  },
]

const PYTHON: Pattern[] = [
  { re: /^[ \t]*class\s+([A-Za-z_]\w*)/gm, kind: 'class', body: 'indent' },
  { re: /^[ \t]*(?:async\s+)?def\s+([A-Za-z_]\w*)/gm, kind: 'function', body: 'indent' },
  { re: /^([A-Z][A-Z0-9_]*)\s*(?::[^=\n]+)?=/gm, kind: 'constant', body: 'none', topLevel: true },
]

const GO: Pattern[] = [
  { re: /^func\s+\([^)]*\)\s*([A-Za-z_]\w*)/gm, kind: 'method', body: 'braces' },
  { re: /^func\s+([A-Za-z_]\w*)/gm, kind: 'function', body: 'braces' },
  { re: /^[ \t]*type\s+([A-Za-z_]\w*)\s+struct\b/gm, kind: 'struct', body: 'braces' },
  { re: /^[ \t]*type\s+([A-Za-z_]\w*)\s+interface\b/gm, kind: 'interface', body: 'braces' },
  { re: /^[ \t]*type\s+([A-Za-z_]\w*)\s+(?!struct\b|interface\b)/gm, kind: 'type', body: 'none' },
  { re: /^const\s+([A-Za-z_]\w*)/gm, kind: 'constant', body: 'none' },
  { re: /^var\s+([A-Za-z_]\w*)/gm, kind: 'variable', body: 'none' },
]

const RUST: Pattern[] = [
  { re: /^[ \t]*(?:pub(?:\([^)]*\))?\s+)?(?:const\s+|async\s+|unsafe\s+|extern\s+"[^"]*"\s+)*fn\s+([A-Za-z_]\w*)/gm, kind: 'function', body: 'braces' },
  { re: /^[ \t]*(?:pub(?:\([^)]*\))?\s+)?struct\s+([A-Za-z_]\w*)/gm, kind: 'struct', body: 'braces' },
  { re: /^[ \t]*(?:pub(?:\([^)]*\))?\s+)?enum\s+([A-Za-z_]\w*)/gm, kind: 'enum', body: 'braces' },
  { re: /^[ \t]*(?:pub(?:\([^)]*\))?\s+)?(?:unsafe\s+)?trait\s+([A-Za-z_]\w*)/gm, kind: 'trait', body: 'braces' },
  { re: /^[ \t]*(?:unsafe\s+)?impl(?:<[^>]*>)?\s+([^{\n]+?)\s*(?:where\b[^{]*)?\{/gm, kind: 'class', name: (m) => `impl ${m[1]!.trim()}`, body: 'braces' },
  { re: /^[ \t]*(?:pub(?:\([^)]*\))?\s+)?mod\s+([A-Za-z_]\w*)/gm, kind: 'module', body: 'braces' },
  { re: /^[ \t]*(?:pub(?:\([^)]*\))?\s+)?(?:const|static)\s+(?:mut\s+)?([A-Za-z_]\w*)/gm, kind: 'constant', body: 'none' },
  { re: /^[ \t]*(?:pub(?:\([^)]*\))?\s+)?type\s+([A-Za-z_]\w*)/gm, kind: 'type', body: 'none' },
  { re: /^[ \t]*macro_rules!\s*([A-Za-z_]\w*)/gm, kind: 'function', body: 'braces' },
]

const MODS = '(?:(?:public|private|protected|internal|static|final|abstract|sealed|partial|virtual|override|async|readonly|open|data|inline|suspend|operator|synchronized|native|default|unsafe|extern|new|const|fileprivate|mutating|required|convenience|lateinit|inner|value|annotation|companion)\\s+)*'

const JAVA_LIKE: Pattern[] = [
  { re: new RegExp(`^[ \\t]*(?:@\\w+(?:\\([^)]*\\))?\\s+)*${MODS}(?:class|record)\\s+(\\w+)`, 'gm'), kind: 'class', body: 'braces' },
  { re: new RegExp(`^[ \\t]*(?:@\\w+(?:\\([^)]*\\))?\\s+)*${MODS}(?:@?interface|protocol)\\s+(\\w+)`, 'gm'), kind: 'interface', body: 'braces' },
  { re: new RegExp(`^[ \\t]*${MODS}enum\\s+(?:class\\s+)?(\\w+)`, 'gm'), kind: 'enum', body: 'braces' },
  { re: new RegExp(`^[ \\t]*${MODS}struct\\s+(\\w+)`, 'gm'), kind: 'struct', body: 'braces' },
  { re: new RegExp(`^[ \\t]*${MODS}object\\s+(\\w+)`, 'gm'), kind: 'class', body: 'braces' },
  { re: /^[ \t]*extension\s+([\w.]+)/gm, kind: 'class', name: (m) => `extension ${m[1]}`, body: 'braces' },
  { re: /^[ \t]*namespace\s+([\w.]+)/gm, kind: 'namespace', body: 'braces' },
  { re: /^[ \t]*package\s+([\w.]+)/gm, kind: 'namespace', body: 'none' },
  // Kotlin, Swift: `fun`, `func`.
  { re: new RegExp(`^[ \\t]*${MODS}(?:fun|func)\\s+(?:<[^>]*>\\s*)?(?:[\\w.]+\\.)?(\\w+)`, 'gm'), kind: 'function', body: 'braces' },
  // Java, C#: a type, a name, parameters, a body.
  {
    re: new RegExp(`^[ \\t]*(?:@\\w+(?:\\([^)]*\\))?\\s+)*${MODS}(?:<[^>]+>\\s+)?[\\w<>\\[\\],.?]+(?:\\s+[\\w<>\\[\\],.?]+)?\\s+(\\w+)\\s*\\([^;{]*\\)\\s*(?:throws\\s+[\\w., ]+)?(?:where\\s+[^{]+)?\\s*(?:\\{|=>|$)`, 'gm'),
    kind: 'method',
    body: 'braces',
    inside: ['class', 'interface', 'struct', 'enum'],
  },
  // A constructor: the class's name and parameters.
  { re: new RegExp(`^[ \\t]*${MODS}(\\w+)\\s*\\([^;{]*\\)\\s*(?::\\s*(?:base|this)\\([^)]*\\)\\s*)?\\{`, 'gm'), kind: 'constructor', body: 'braces', inside: ['class', 'struct'] },
]

const C_LIKE: Pattern[] = [
  { re: /^[ \t]*namespace\s+([\w:]+)/gm, kind: 'namespace', body: 'braces' },
  { re: /^[ \t]*(?:template\s*<[^>]*>\s*)?(?:class|struct)\s+(?:\w+\s+)?(\w+)(?=[^;]*\{)/gm, kind: (m) => (/^\s*(?:template[^\n]*)?\s*class/.test(m[0]) ? 'class' : 'struct'), body: 'braces' },
  { re: /^[ \t]*(?:typedef\s+)?enum\s+(?:class\s+)?(\w+)/gm, kind: 'enum', body: 'braces' },
  { re: /^#define\s+(\w+)/gm, kind: 'constant', body: 'none' },
  {
    re: /^(?:[\w:*&<>,]+[ \t]+[*&]*)+((?:\w+::)*~?\w+)\s*\([^;{]*\)\s*(?:const\s*)?(?:noexcept\s*)?(?:override\s*)?\{?\s*$/gm,
    kind: 'function',
    body: 'braces',
    guard: true,
  },
  { re: /^[ \t]+(?:virtual\s+|static\s+|inline\s+)*(?:[\w:*&<>,]+[ \t]+[*&]*)+(~?\w+)\s*\([^;{]*\)\s*(?:const\s*)?(?:override\s*)?\{/gm, kind: 'method', body: 'braces', inside: ['class', 'struct'] },
]

const PHP: Pattern[] = [
  { re: /^[ \t]*namespace\s+([\w\\]+)/gm, kind: 'namespace', body: 'none' },
  { re: /^[ \t]*(?:final\s+|abstract\s+|readonly\s+)*class\s+(\w+)/gm, kind: 'class', body: 'braces' },
  { re: /^[ \t]*interface\s+(\w+)/gm, kind: 'interface', body: 'braces' },
  { re: /^[ \t]*trait\s+(\w+)/gm, kind: 'trait', body: 'braces' },
  { re: /^[ \t]*enum\s+(\w+)/gm, kind: 'enum', body: 'braces' },
  { re: /^[ \t]*(?:(?:public|private|protected|static|final|abstract)\s+)*function\s+&?(\w+)/gm, kind: (m) => (m[1] === '__construct' ? 'constructor' : 'function'), body: 'braces' },
  { re: /^[ \t]*(?:(?:public|private|protected|final)\s+)*const\s+(\w+)/gm, kind: 'constant', body: 'none' },
  { re: /^[ \t]*(?:public|private|protected|var)\s+(?:static\s+|readonly\s+)*(?:\??[\w\\|]+\s+)?\$(\w+)/gm, kind: 'property', body: 'none', inside: ['class', 'trait'] },
]

const RUBY: Pattern[] = [
  { re: /^[ \t]*class\s+([\w:]+)/gm, kind: 'class', body: 'indent' },
  { re: /^[ \t]*module\s+([\w:]+)/gm, kind: 'module', body: 'indent' },
  { re: /^[ \t]*def\s+((?:self\.)?[\w?!=]+)/gm, kind: 'function', body: 'indent' },
  { re: /^[ \t]*([A-Z][A-Z0-9_]*)\s*=/gm, kind: 'constant', body: 'none' },
]

const LUA: Pattern[] = [
  { re: /^[ \t]*(?:local\s+)?function\s+([\w.:]+)/gm, kind: 'function', body: 'indent' },
  { re: /^[ \t]*(?:local\s+)?([\w.]+)\s*=\s*function\b/gm, kind: 'function', body: 'indent' },
]

const SHELL: Pattern[] = [
  { re: /^[ \t]*(?:function\s+)?([\w.:-]+)\s*\(\)\s*\{?/gm, kind: 'function', body: 'braces' },
  { re: /^[ \t]*function\s+([\w.:-]+)\s*\{/gm, kind: 'function', body: 'braces' },
]

const POWERSHELL: Pattern[] = [
  { re: /^[ \t]*(?:function|filter)\s+([\w-]+)/gim, kind: 'function', body: 'braces' },
  { re: /^[ \t]*class\s+(\w+)/gim, kind: 'class', body: 'braces' },
]

const SQL: Pattern[] = [
  {
    re: /^[ \t]*create\s+(?:or\s+replace\s+)?(?:temporary\s+|temp\s+|materialized\s+|unique\s+)*(table|view|function|procedure|index|trigger|type|sequence|schema)\s+(?:if\s+not\s+exists\s+)?([\w."`[\]]+)/gim,
    kind: (m) => ({ table: 'table', view: 'table', function: 'function', procedure: 'function', type: 'type', schema: 'namespace' })[m[1]!.toLowerCase()] as SymbolKind ?? 'variable',
    name: 2,
    body: 'none',
  },
]

const CSS: Pattern[] = [
  { re: /^[ \t]*(@media[^{\n]*|@supports[^{\n]*|@layer[^{\n]*|@container[^{\n]*)\{/gm, kind: 'namespace', name: (m) => m[1]!.trim(), body: 'braces' },
  { re: /^[ \t]*([^@\s{};][^{};]*?)\s*\{/gm, kind: 'selector', name: (m) => m[1]!.replace(/\s+/g, ' ').trim(), body: 'braces' },
]

const DOCKERFILE: Pattern[] = [{ re: /^FROM\s+\S+(?:\s+AS\s+(\S+))?/gim, kind: 'module', name: (m) => m[1] ?? m[0].replace(/^FROM\s+/i, '').trim(), body: 'none' }]

const MAKEFILE: Pattern[] = [{ re: /^([\w./%-][\w./% -]*?)\s*::?(?!=)/gm, kind: 'target', body: 'none' }]

const GRAPHQL: Pattern[] = [
  { re: /^[ \t]*(?:extend\s+)?(type|interface|enum|input|union|scalar)\s+(\w+)/gm, kind: (m) => (m[1] === 'interface' ? 'interface' : m[1] === 'enum' ? 'enum' : 'type'), name: 2, body: 'braces' },
  { re: /^[ \t]*(query|mutation|subscription|fragment)\s+(\w+)/gm, kind: 'function', name: 2, body: 'braces' },
]

const PROTOBUF: Pattern[] = [
  { re: /^[ \t]*message\s+(\w+)/gm, kind: 'struct', body: 'braces' },
  { re: /^[ \t]*service\s+(\w+)/gm, kind: 'interface', body: 'braces' },
  { re: /^[ \t]*enum\s+(\w+)/gm, kind: 'enum', body: 'braces' },
  { re: /^[ \t]*rpc\s+(\w+)/gm, kind: 'method', body: 'braces' },
]

const SECTIONS: Pattern[] = [{ re: /^[ \t]*\[\[?([^\]\n]+)\]\]?/gm, kind: 'section', body: 'none' }]

const PATTERNS: Record<string, Pattern[]> = {
  javascript: JS,
  typescript: JS,
  python: PYTHON,
  go: GO,
  rust: RUST,
  java: JAVA_LIKE,
  kotlin: JAVA_LIKE,
  csharp: JAVA_LIKE,
  swift: JAVA_LIKE,
  c: C_LIKE,
  cpp: C_LIKE,
  php: PHP,
  ruby: RUBY,
  lua: LUA,
  bash: SHELL,
  powershell: POWERSHELL,
  sql: SQL,
  css: CSS,
  dockerfile: DOCKERFILE,
  makefile: MAKEFILE,
  graphql: GRAPHQL,
  protobuf: PROTOBUF,
  toml: SECTIONS,
  ini: SECTIONS,
}

/** The text with what the tokenizer calls a comment or a string blanked out (line breaks kept). */
function masked(code: string, language: string): string {
  let out = ''
  for (const t of tokenize(code, language)) {
    out += t.type === 'comment' || t.type === 'string' || t.type === 'regex' ? t.text.replace(/[^\n]/g, ' ') : t.text
  }
  return out
}

/** The offsets of the lines' starts. */
function lineStarts(text: string): number[] {
  const starts = [0]
  for (let i = text.indexOf('\n'); i >= 0; i = text.indexOf('\n', i + 1)) starts.push(i + 1)
  return starts
}

function lineOf(starts: number[], offset: number): number {
  let lo = 0
  let hi = starts.length - 1
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1
    if (starts[mid]! <= offset) lo = mid
    else hi = mid - 1
  }
  return lo
}

/** The line of the bracket closing the block a declaration opens (its own line when it opens none). */
function bracesEnd(text: string, from: number, starts: number[]): number {
  const limit = Math.min(text.length, from + 2000)
  let i = from
  let parens = 0
  for (; i < limit; i++) {
    const ch = text[i]
    if (ch === '(' || ch === '[') parens++
    else if (ch === ')' || ch === ']') parens--
    else if (parens <= 0 && (ch === ';' || ch === '}')) return lineOf(starts, from)
    else if (parens <= 0 && ch === '{') break
    // The line ends with no block begun: one on the next line (a brace on its own line) or none.
    else if (parens <= 0 && ch === '\n') {
      const next = /\s*/y
      next.lastIndex = i
      next.exec(text)
      if (text[next.lastIndex] !== '{') return lineOf(starts, from)
    }
  }
  if (i >= limit) return lineOf(starts, from)
  let depth = 0
  for (; i < text.length; i++) {
    const ch = text[i]
    if (ch === '{') depth++
    else if (ch === '}' && --depth === 0) return lineOf(starts, i)
  }
  return starts.length - 1
}

/** The last line indented deeper than the declaration's (blank lines inside count, trailing ones do not). */
function indentEnd(lines: string[], line: number): number {
  const indent = (l: string) => l.length - l.trimStart().length
  const own = indent(lines[line]!)
  let last = line
  for (let i = line + 1; i < lines.length; i++) {
    const l = lines[i]!
    if (l.trim() === '') continue
    if (indent(l) <= own) {
      // Ruby's and Lua's `end` at the declaration's indent closes it.
      if (/^\s*end\b/.test(l) && indent(l) === own) last = i
      break
    }
    last = i
  }
  return last
}

/** Nests symbols by their ranges: one inside another's lines is its child. */
function nest(flat: SymbolNode[]): SymbolNode[] {
  const sorted = [...flat].sort((a, b) => a.line - b.line || b.endLine - a.endLine || a.column - b.column)
  const roots: SymbolNode[] = []
  const stack: SymbolNode[] = []
  const holds = (outer: SymbolNode, inner: SymbolNode) =>
    outer.line <= inner.line && inner.endLine <= outer.endLine && (outer.line < inner.line || outer.column < inner.column)
  for (const s of sorted) {
    while (stack.length && !holds(stack[stack.length - 1]!, s)) stack.pop()
    if (stack.length) stack[stack.length - 1]!.children.push(s)
    else roots.push(s)
    stack.push(s)
  }
  return roots
}

function byPatterns(code: string, language: string, patterns: Pattern[]): SymbolNode[] {
  const text = masked(code, language)
  const starts = lineStarts(text)
  const lines = text.split('\n')
  const flat: SymbolNode[] = []
  const seen = new Set<string>()
  // Containers first (they decide where methods may be), then the rest.
  const ordered = [...patterns.filter((p) => !p.inside), ...patterns.filter((p) => p.inside)]
  for (const p of ordered) {
    p.re.lastIndex = 0
    for (let m = p.re.exec(text); m; m = p.re.exec(text)) {
      if (m[0] === '') {
        p.re.lastIndex++
        continue
      }
      const name = typeof p.name === 'function' ? p.name(m) : (m[p.name ?? 1] ?? '').trim()
      if (!name || ((p.guard || p.inside) && NOT_METHOD.has(name))) continue
      const found = m[0].indexOf(name, m[0].search(/\S/))
      const nameAt = m.index + (found >= 0 ? found : m[0].search(/\S/))
      const line = lineOf(starts, nameAt)
      const key = `${line}:${name}`
      if (seen.has(key)) continue
      const body = p.body ?? 'none'
      const endLine = body === 'braces' ? bracesEnd(text, m.index + m[0].length - (m[0].endsWith('{') ? 1 : 0), starts) : body === 'indent' ? indentEnd(lines, line) : line
      const kind = typeof p.kind === 'function' ? p.kind(m) : p.kind
      // The symbols already found holding this line (theirs are 1-based).
      const at = line + 1
      const holder = flat.filter((s) => s.line < at && s.endLine >= at)
      const inner = holder.sort((a, b) => b.line - a.line)[0]
      if (p.inside && (!inner || !p.inside.includes(inner.kind))) continue
      // A method or property only directly in its container, not in a method's body.
      if (p.inside && holder.some((s) => s.line > inner!.line && (s.kind === 'method' || s.kind === 'function' || s.kind === 'constructor'))) continue
      if (p.topLevel && holder.length) continue
      seen.add(key)
      flat.push({ name, kind, line: line + 1, column: nameAt - starts[line]! + 1, endLine: Math.max(line, endLine) + 1, children: [] })
    }
  }
  // A function in a class (Python's `def`, PHP's `function`) is its method.
  for (const s of flat) {
    if (s.kind !== 'function') continue
    const owner = flat
      .filter((c) => c !== s && c.line < s.line && c.endLine >= s.endLine)
      .sort((a, b) => b.line - a.line)[0]
    if (owner && ['class', 'struct', 'trait', 'interface', 'enum', 'module'].includes(owner.kind)) s.kind = s.name === '__init__' || s.name === 'initialize' ? 'constructor' : 'method'
  }
  return nest(flat)
}

function markdown(code: string): SymbolNode[] {
  const lines = code.replace(/\s+$/, '').split(/\r?\n/)
  const flat: (SymbolNode & { level: number })[] = []
  let fence: string | null = null
  lines.forEach((l, i) => {
    const f = /^ {0,3}(`{3,}|~{3,})/.exec(l)
    if (fence) {
      if (f && l.trim().startsWith(fence)) fence = null
      return
    }
    if (f) {
      fence = f[1]!
      return
    }
    const h = /^ {0,3}(#{1,6})\s+(.+?)\s*#*\s*$/.exec(l)
    if (h) flat.push({ name: h[2]!, kind: 'heading', line: i + 1, column: h[0].indexOf(h[2]!) + 1, endLine: lines.length, children: [], level: h[1]!.length })
  })
  // A heading's section ends where the next heading of its level or higher begins.
  flat.forEach((h, k) => {
    const next = flat.slice(k + 1).find((o) => o.level <= h.level)
    h.endLine = next ? next.line - 1 : lines.length
  })
  return nest(
    flat.map((h) => ({ name: h.name, kind: h.kind, line: h.line, column: h.column, endLine: h.endLine, children: h.children })),
  )
}

/** A config's keys by indentation (YAML), two levels deep. */
function yaml(code: string): SymbolNode[] {
  const lines = code.split(/\r?\n/)
  const flat: SymbolNode[] = []
  const tops: number[] = []
  lines.forEach((l, i) => {
    const m = /^( *)(?:- +)?("(?:[^"\\]|\\.)*"|'[^']*'|[^\s#'"{[\]][^:#]*?):(?:\s|$)/.exec(l)
    if (!m) return
    const indent = m[1]!.length
    if (indent === 0) tops.push(indent)
    const nested = indent > 0 && indent <= 4
    if (indent !== 0 && !nested) return
    flat.push({ name: m[2]!.replace(/^["']|["']$/g, ''), kind: 'key', line: i + 1, column: indent + 1, endLine: indentEnd(lines, i) + 1, children: [] })
  })
  return nest(flat)
}

/** A JSON document's keys, two levels deep, ranges by brackets; nested by the brackets, not by lines. */
function json(code: string): SymbolNode[] {
  const text = code
  const starts = lineStarts(text)
  const roots: SymbolNode[] = []
  // The key whose value is the object being read, at each depth.
  const owners: (SymbolNode | null)[] = []
  let pendingKey: SymbolNode | null = null
  const re = /"((?:[^"\\]|\\.)*)"\s*:|[{}[\]]|"(?:[^"\\]|\\.)*"|\/\/[^\n]*|\/\*[\s\S]*?\*\//g
  for (let m = re.exec(text); m; m = re.exec(text)) {
    const t = m[0]
    if (t.startsWith('//') || t.startsWith('/*')) continue
    if (t === '{' || t === '[') {
      owners.push(pendingKey)
      pendingKey = null
    } else if (t === '}' || t === ']') owners.pop()
    else if (m[1] !== undefined) {
      const depth = owners.length
      pendingKey = null
      if (depth < 1 || depth > 2) continue
      const line = lineOf(starts, m.index)
      const ws = /\s*/y
      ws.lastIndex = m.index + t.length
      ws.exec(text)
      const open = text[ws.lastIndex]
      const endLine = open === '{' || open === '[' ? jsonEnd(text, ws.lastIndex, starts) : line
      const node: SymbolNode = { name: m[1], kind: 'key', line: line + 1, column: m.index - starts[line]! + 2, endLine: endLine + 1, children: [] }
      const owner = owners[owners.length - 1]
      if (depth === 1) roots.push(node)
      else if (owner) owner.children.push(node)
      if (open === '{') pendingKey = node
    } else pendingKey = null
  }
  return roots
}

function jsonEnd(text: string, from: number, starts: number[]): number {
  let depth = 0
  const re = /"(?:[^"\\]|\\.)*"|[{}[\]]/g
  re.lastIndex = from
  for (let m = re.exec(text); m; m = re.exec(text)) {
    if (m[0] === '{' || m[0] === '[') depth++
    else if (m[0] === '}' || m[0] === ']') {
      if (--depth === 0) return lineOf(starts, m.index)
    }
  }
  return starts.length - 1
}

/**
 * The symbols of a text in a language (an id or an alias), nested, in the
 * order they are written; an empty list for a language without them.
 */
export function symbols(code: string, language: string): SymbolNode[] {
  const id = grammarOf(language)?.id ?? language.toLowerCase()
  if (id === 'markdown') return markdown(code)
  if (id === 'yaml') return yaml(code)
  if (id === 'json' || id === 'jsonc') return json(code)
  const patterns = PATTERNS[id]
  return patterns ? byPatterns(code, id, patterns) : []
}

/** The symbols holding a line (1-based), outermost first: a breadcrumb's path. */
export function symbolPath(nodes: readonly SymbolNode[], line: number): SymbolNode[] {
  const out: SymbolNode[] = []
  let level: readonly SymbolNode[] = nodes
  for (;;) {
    const hit = level.find((s) => s.line <= line && s.endLine >= line)
    if (!hit) return out
    out.push(hit)
    level = hit.children
  }
}

/** Every symbol, depth first, with the names of those holding it (`Class.method`). */
export function flattenSymbols(nodes: readonly SymbolNode[], parents: string[] = []): (SymbolNode & { container: string })[] {
  const out: (SymbolNode & { container: string })[] = []
  for (const s of nodes) {
    out.push({ ...s, container: parents.join('.') })
    out.push(...flattenSymbols(s.children, [...parents, s.name]))
  }
  return out
}

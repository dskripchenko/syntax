/**
 * What a reader can fold: ranges of lines, each starting at the line that
 * names it (an opening bracket, a tag, a key, a heading) and ending at the
 * last line it holds — a closing bracket's or tag's line stays out. Brackets and tags come from the tokens, so a bracket in
 * a string or a comment folds nothing; indentation folds what has no
 * brackets (YAML, Python); headings fold Markdown's sections.
 */
import { grammarOf, tokenize } from './engine'

export interface FoldRange {
  /** 1-based, inclusive: the first line stays visible, the rest folds away. */
  start: number
  end: number
}

const BY_INDENT = new Set(['yaml', 'python', 'makefile', 'graphql', 'ini', 'toml', 'log', 'dotenv', 'csv', 'diff'])
const BY_TAGS = new Set(['xml', 'html'])

export function foldRanges(code: string, language: string): FoldRange[] {
  const id = grammarOf(language)?.id ?? language
  const ranges =
    id === 'markdown'
      ? byHeadings(code)
      : BY_TAGS.has(id)
        ? [...byTags(code, id), ...multiLineComments(code, id)]
        : BY_INDENT.has(id)
          ? id === 'yaml' || id === 'python'
            ? [...byIndent(code), ...(id === 'python' ? byBrackets(code, id) : [])]
            : []
          : [...byBrackets(code, id), ...multiLineComments(code, id)]
  // One range per starting line (the widest), in order.
  const best = new Map<number, number>()
  for (const r of ranges) if (r.end > r.start && (best.get(r.start) ?? 0) < r.end) best.set(r.start, r.end)
  return [...best].map(([start, end]) => ({ start, end })).sort((a, b) => a.start - b.start)
}

const PAIRS: Record<string, string> = { '}': '{', ']': '[', ')': '(' }

function byBrackets(code: string, language: string): FoldRange[] {
  const out: FoldRange[] = []
  const stack: { ch: string; line: number }[] = []
  let line = 1
  for (const t of tokenize(code, language)) {
    const structural = t.type === 'punctuation' || t.type === 'operator' || t.type === 'plain'
    for (const ch of t.text) {
      if (ch === '\n') line++
      else if (!structural) continue
      else if (ch === '{' || ch === '[' || ch === '(') stack.push({ ch, line })
      else if (PAIRS[ch]) {
        // A stray closing bracket closes nothing; a mismatched one closes back to its pair.
        const k = stack.map((s) => s.ch).lastIndexOf(PAIRS[ch]!)
        if (k < 0) continue
        const open = stack[k]!
        stack.length = k
        // The lines between fold away; the closing one stays (it may hold `} else {`).
        if (line - 1 > open.line) out.push({ start: open.line, end: line - 1 })
      }
    }
  }
  return out
}

function multiLineComments(code: string, language: string): FoldRange[] {
  const out: FoldRange[] = []
  let line = 1
  for (const t of tokenize(code, language)) {
    const breaks = t.text.split('\n').length - 1
    if (t.type === 'comment' && breaks > 0) out.push({ start: line, end: line + breaks - (t.text.endsWith('\n') ? 1 : 0) })
    line += breaks
  }
  return out
}

/** A line, and the following lines indented deeper (blank lines in between belong to it). */
function byIndent(code: string): FoldRange[] {
  const lines = code.split(/\r?\n/)
  const indent = lines.map((l) => (l.trim() === '' || /^\s*#/.test(l) ? -1 : l.search(/\S/)))
  const out: FoldRange[] = []
  for (let i = 0; i < lines.length; i++) {
    if (indent[i]! < 0) continue
    let last = i
    for (let k = i + 1; k < lines.length; k++) {
      if (indent[k]! < 0) continue
      if (indent[k]! <= indent[i]!) break
      last = k
    }
    if (last > i) out.push({ start: i + 1, end: last + 1 })
  }
  return out
}

/** An element written over several lines: from its opening tag's line to its closing tag's. */
function byTags(code: string, language: string): FoldRange[] {
  const out: FoldRange[] = []
  const stack: { name: string; line: number }[] = []
  let line = 1
  let pending: { closing: boolean; line: number } | null = null
  let name: { text: string; closing: boolean; line: number } | null = null
  for (const t of tokenize(code, language)) {
    if (t.type === 'punctuation' && (t.text === '<' || t.text === '</')) pending = { closing: t.text === '</', line }
    else if (t.type === 'tag' && pending) {
      name = { text: t.text.toLowerCase(), closing: pending.closing, line: pending.line }
      pending = null
      if (name.closing) {
        const k = stack.map((s) => s.name).lastIndexOf(name.text)
        if (k >= 0) {
          const open = stack[k]!
          stack.length = k
          if (line - 1 > open.line) out.push({ start: open.line, end: line - 1 })
        }
        name = null
      }
    } else if (t.type === 'punctuation' && name && (t.text === '>' || t.text === '/>')) {
      if (t.text === '>' && !VOID.has(name.text)) stack.push({ name: name.text, line: name.line })
      name = null
    }
    line += t.text.split('\n').length - 1
  }
  return out
}

/** HTML's elements that never close. */
const VOID = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr'])

/** A heading and what follows until a heading of its level or higher; a fenced block on its own. */
function byHeadings(code: string): FoldRange[] {
  const lines = code.split(/\r?\n/)
  const out: FoldRange[] = []
  const open: { level: number; line: number }[] = []
  let fence: { mark: string; line: number } | null = null
  let lastText = 0
  const close = (level: number) => {
    while (open.length && open[open.length - 1]!.level >= level) {
      const h = open.pop()!
      if (lastText > h.line) out.push({ start: h.line, end: lastText })
    }
  }
  lines.forEach((l, i) => {
    const n = i + 1
    const f = /^(`{3,}|~{3,})/.exec(l)
    if (fence) {
      if (f && l.trim().startsWith(fence.mark)) {
        out.push({ start: fence.line, end: n })
        fence = null
      }
      lastText = n
      return
    }
    if (f) {
      fence = { mark: f[1]!, line: n }
      lastText = n
      return
    }
    const h = /^(#{1,6})\s/.exec(l)
    if (h) {
      close(h[1]!.length)
      open.push({ level: h[1]!.length, line: n })
    }
    if (l.trim() !== '') lastText = n
  })
  close(0)
  return out
}

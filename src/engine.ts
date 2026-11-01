/**
 * The tokenizer every grammar runs on: rules tried in order at each position
 * (sticky regular expressions), a stack of states for what nests — a string's
 * interpolation inside code inside a string — and grammars embedded in one
 * another (a script in HTML, a fenced block in Markdown).
 *
 * Two promises hold for every input: the tokens' texts joined give the input
 * back exactly, and the work is linear in its length — a position no rule
 * matches is taken as one character of plain text, and a rule that matches
 * nothing must change the state, or it is passed over.
 */

export type TokenType =
  | 'plain'
  | 'keyword'
  | 'string'
  | 'number'
  | 'comment'
  | 'function'
  | 'type'
  | 'variable'
  | 'constant'
  | 'operator'
  | 'punctuation'
  | 'property'
  | 'tag'
  | 'attribute'
  | 'regex'
  | 'meta'
  | 'escape'
  | 'heading'
  | 'emphasis'
  | 'strong'
  | 'link'
  | 'inserted'
  | 'deleted'
  | 'date'
  | 'error'
  | 'warning'
  | 'info'
  | 'debug'

export interface Token {
  type: TokenType
  text: string
}

/** What a rule may look at: the last token that was not white space or a comment. */
export interface Before {
  type: TokenType | null
  text: string
}

export interface Rule {
  match: RegExp
  /** The token's type; or one type per capture group (text outside the groups is plain). */
  token?: TokenType | ((match: RegExpExecArray) => TokenType)
  groups?: (TokenType | Embedded)[]
  /** Only when the token before allows it (a regular expression after an operator, not after a name). */
  when?: (before: Before) => boolean
  /** Enter a state; leave the current one (`pop`: how many); or replace it. */
  push?: string
  pop?: number
  next?: string
  /** Tokenize the match with another grammar: its id, or one read from the match (a fenced block's language). */
  embed?: string | ((match: RegExpExecArray) => string | null)
}

/** A capture group handed to another grammar (a fenced block's body), or of a type when there is none. */
export interface Embedded {
  embed: string | ((match: RegExpExecArray) => string | null)
  token: TokenType
}

export interface Grammar {
  id: string
  name: string
  /** Other names it answers to (`js`, `yml`). */
  aliases?: string[]
  /** File extensions, with the dot, and whole file names (`Dockerfile`). */
  extensions?: string[]
  filenames?: string[]
  /** An interpreter named on the first line (`#!/usr/bin/env python3`). */
  shebang?: RegExp
  states: Record<string, Rule[]>
}

interface Compiled {
  grammar: Grammar
  states: Record<string, { rule: Rule; re: RegExp }[]>
}

const compiled = new Map<string, Compiled>()
const registry = new Map<string, Grammar>()

export function register(grammar: Grammar): void {
  registry.set(grammar.id, grammar)
  for (const alias of grammar.aliases ?? []) registry.set(alias, grammar)
  compiled.delete(grammar.id)
}

export function grammarOf(language: string): Grammar | undefined {
  return registry.get(language.toLowerCase())
}

export function allGrammars(): Grammar[] {
  return [...new Set(registry.values())]
}

function compile(grammar: Grammar): Compiled {
  let c = compiled.get(grammar.id)
  if (c) return c
  const states: Compiled['states'] = {}
  for (const [name, rules] of Object.entries(grammar.states)) {
    states[name] = rules.map((rule) => {
      const flags = rule.match.flags.replace(/[gyd]/g, '')
      // Groups are placed by their indices (the `d` flag), not searched for.
      return { rule, re: new RegExp(rule.match.source, `${flags}y${rule.groups ? 'd' : ''}`) }
    })
  }
  c = { grammar, states }
  compiled.set(grammar.id, c)
  return c
}


/** How deep embedded grammars may go (a Markdown block in Markdown in …). */
const MAX_EMBED = 4

/** The text as tokens of a language; a language not known gives one plain token. */
export function tokenize(code: string, language: string, depth = 0): Token[] {
  const grammar = grammarOf(language)
  if (!grammar || code === '') return code === '' ? [] : [{ type: 'plain', text: code }]
  const { states } = compile(grammar)
  const out: Token[] = []
  const stack: string[] = ['root']
  let before: Before = { type: null, text: '' }

  const emit = (type: TokenType, text: string): void => {
    if (text === '') return
    const last = out[out.length - 1]
    if (last && last.type === type) last.text += text
    else out.push({ type, text })
    // A name counts (plain, but a value: `b / 2` divides); white space and comments do not.
    if (type !== 'comment' && text.trim() !== '') before = { type, text }
  }

  let pos = 0
  // A rule that matches nothing may change the state, but not twice in a row at one place.
  let emptyAt = -1
  let emptyCount = 0
  while (pos < code.length) {
    const rules = states[stack[stack.length - 1]!] ?? states.root!
    let matched = false
    for (const { rule, re } of rules) {
      re.lastIndex = pos
      const m = re.exec(code)
      if (!m) continue
      const text = m[0]
      if (text === '') {
        if (rule.push === undefined && rule.pop === undefined && rule.next === undefined) continue
        if (emptyAt === pos && ++emptyCount > 8) continue
        if (emptyAt !== pos) {
          emptyAt = pos
          emptyCount = 1
        }
      }
      if (rule.when && !rule.when(before)) continue
      matched = true
      const embedded = (spec: Embedded['embed'], part: string, fallback: TokenType): void => {
        const id = typeof spec === 'function' ? spec(m) : spec
        if (id && depth < MAX_EMBED && grammarOf(id)) for (const t of tokenize(part, id, depth + 1)) emit(t.type, t.text)
        else emit(fallback, part)
      }
      if (rule.embed !== undefined) {
        embedded(rule.embed, text, typeof rule.token === 'string' ? rule.token : 'plain')
      } else if (rule.groups) {
        const indices = (m as RegExpExecArray & { indices?: ([number, number] | undefined)[] }).indices ?? []
        let cursor = m.index
        for (let g = 1; g < m.length; g++) {
          const span = indices[g]
          // Nested or out-of-order groups are not split again: the outer one wins.
          if (!span || span[0] === span[1] || span[0] < cursor) continue
          emit('plain', code.slice(cursor, span[0]))
          const kind = rule.groups[g - 1] ?? 'plain'
          if (typeof kind === 'string') emit(kind, code.slice(span[0], span[1]))
          else embedded(kind.embed, code.slice(span[0], span[1]), kind.token)
          cursor = span[1]
        }
        emit('plain', code.slice(cursor, m.index + text.length))
      } else {
        const type = typeof rule.token === 'function' ? rule.token(m) : (rule.token ?? 'plain')
        emit(type, text)
      }
      if (rule.pop) for (let i = 0; i < rule.pop && stack.length > 1; i++) stack.pop()
      if (rule.next) stack[stack.length - 1] = rule.next
      if (rule.push) stack.push(rule.push)
      pos += text.length
      break
    }
    if (!matched) {
      emit('plain', code[pos]!)
      pos++
    }
  }
  return out
}

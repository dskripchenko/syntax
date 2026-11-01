/** Pieces several grammars share. */
import type { Before, Rule, TokenType } from '../engine'

/** A list of words as one expression: `\b(?:if|else|…)\b`. */
export const words = (list: string, flags = ''): RegExp => new RegExp(`\\b(?:${list.trim().split(/\s+/).join('|')})\\b`, flags)

export const WS: Rule = { match: /\s+/, token: 'plain' }
export const LINE_COMMENT = (start: string): Rule => ({ match: new RegExp(`${start}.*`), token: 'comment' })
export const BLOCK_COMMENT: Rule = { match: /\/\*[\s\S]*?(?:\*\/|$)/, token: 'comment' }
export const DQ: Rule = { match: /"(?:\\[\s\S]|[^"\\\n])*"?/, token: 'string' }
export const SQ: Rule = { match: /'(?:\\[\s\S]|[^'\\\n])*'?/, token: 'string' }
export const NUMBER: Rule = { match: /\b(?:0[xX][\da-fA-F_]+|0[bB][01_]+|0[oO][0-7_]+|\d[\d_]*(?:\.[\d_]+)?(?:[eE][+-]?\d+)?)[a-zA-Z]*\b|\B\.\d+(?:[eE][+-]?\d+)?\b/, token: 'number' }
export const FUNCTION: Rule = { match: /[A-Za-z_$][\w$]*(?=\s*\()/, token: 'function' }
/** A name in CapitalCase: a type, a class, an interface. */
export const TYPE_NAME: Rule = { match: /\b[A-Z][A-Za-z0-9_]*\b/, token: 'type' }
export const IDENT: Rule = { match: /[A-Za-z_$][\w$]*/, token: 'plain' }
export const OPERATOR: Rule = { match: /[+\-*/%=!<>&|^~?:]+/, token: 'operator' }
export const PUNCT: Rule = { match: /[{}()[\];,.@\\]/, token: 'punctuation' }

/** Where an expression may start: after an operator, an opening bracket, a keyword, or at the start. */
export const startsExpression = (b: Before): boolean =>
  b.type === null || b.type === 'operator' || b.type === 'keyword' || (b.type === 'punctuation' && !/[)\]}]$/.test(b.text))

export interface CLike {
  keywords: string
  types?: string
  constants?: string
  /** `//` and `/* *\/` comments; `#` lines are the preprocessor's. */
  preprocessor?: boolean
  extra?: Rule[]
  strings?: Rule[]
}

/** The family of C: Java, C#, Kotlin, Swift, Go, C and C++, Dart and others differ in words more than in shape. */
export function cLike(o: CLike): Record<string, Rule[]> {
  const root: Rule[] = [
    WS,
    LINE_COMMENT('//'),
    BLOCK_COMMENT,
    ...(o.preprocessor ? [{ match: /^[ \t]*#\s*[a-z]+(?:\\\n|.)*/m, token: 'meta' as TokenType }] : []),
    ...(o.extra ?? []),
    ...(o.strings ?? [DQ, { match: /'(?:\\.|[^'\\\n]){1,8}'/, token: 'string' as TokenType }]),
    { match: /@[A-Za-z_][\w.]*/, token: 'meta' },
    NUMBER,
    { match: words(o.constants ?? 'true false null'), token: 'constant' },
    { match: words(o.keywords), token: 'keyword' },
    ...(o.types ? [{ match: words(o.types), token: 'type' as TokenType }] : []),
    FUNCTION,
    TYPE_NAME,
    IDENT,
    OPERATOR,
    PUNCT,
  ]
  return { root }
}

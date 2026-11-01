import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { languageOf, tokenize, type TokenType } from '../src'

export const FIXTURES = join(import.meta.dirname, 'fixtures')

/** Every sample file with its language, as the file name tells it. */
export function samples(): { file: string; language: string; text: string }[] {
  return readdirSync(FIXTURES).map((file) => {
    const text = readFileSync(join(FIXTURES, file), 'utf8')
    return { file, language: languageOf(file, text.split('\n')[0]) ?? 'unknown', text }
  })
}

export const sample = (file: string): string => readFileSync(join(FIXTURES, file), 'utf8')

/** The type of the first token whose text is (or contains, with `within`) the fragment. */
export function typeOf(code: string, language: string, fragment: string, within = false): TokenType | undefined {
  return tokenize(code, language).find((t) => (within ? t.text.includes(fragment) : t.text.trim() === fragment))?.type
}

/** The non-plain tokens as `type:text`, for exact checks of a short piece. */
export function marks(code: string, language: string): string[] {
  return tokenize(code, language)
    .filter((t) => t.type !== 'plain')
    .map((t) => `${t.type}:${t.text}`)
}

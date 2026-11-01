// Every file of a folder tree that has a language, through the tokenizer: the
// text must come back exactly, and the time must stay linear. Not part of CI —
// it reads whatever is on the machine (`pnpm corpus [dir]`, built first).
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { languageOf, tokenize } from '../dist/index.mjs'

const root = process.argv[2] ?? join(import.meta.dirname, '..', '..')
const SKIP = new Set(['node_modules', '.git', 'dist', 'vendor', 'build', 'coverage', '.next', 'target', '.venv', 'storage', 'public'])
const files = []
const walk = (dir) => {
  let names
  try {
    names = readdirSync(dir)
  } catch {
    return
  }
  for (const name of names) {
    if (SKIP.has(name)) continue
    const path = join(dir, name)
    let st
    try {
      st = statSync(path)
    } catch {
      continue
    }
    if (st.isDirectory()) walk(path)
    else if (st.size > 0 && st.size < 2_000_000) files.push(path)
  }
}
walk(root)

const byLanguage = new Map()
const broken = []
const slow = []
let bytes = 0
let ms = 0
for (const path of files) {
  let text
  try {
    text = readFileSync(path, 'utf8')
  } catch {
    continue
  }
  if (text.includes('\u0000')) continue
  const language = languageOf(path, text.slice(0, 200).split('\n')[0])
  if (!language) continue
  const start = performance.now()
  const tokens = tokenize(text, language)
  const took = performance.now() - start
  bytes += text.length
  ms += took
  byLanguage.set(language, (byLanguage.get(language) ?? 0) + 1)
  if (tokens.map((t) => t.text).join('') !== text) broken.push(path)
  // More than 20 ms per 100 KB is not linear any more.
  if (took > 20 + (text.length / 100_000) * 20) slow.push([path, Math.round(took), text.length])
}
console.log(`files: ${[...byLanguage.values()].reduce((a, b) => a + b, 0)} in ${byLanguage.size} languages`)
console.log([...byLanguage].sort((a, b) => b[1] - a[1]).map(([l, n]) => `${l} ${n}`).join(', '))
console.log(`throughput: ${(bytes / 1024 / 1024).toFixed(1)} MB in ${Math.round(ms)} ms (${((bytes / 1024 / 1024) / (ms / 1000)).toFixed(1)} MB/s)`)
console.log(`text not kept: ${broken.length}`)
for (const p of broken.slice(0, 20)) console.log('  ', p)
console.log(`slow: ${slow.length}`)
for (const s of slow.sort((a, b) => b[1] - a[1]).slice(0, 20)) console.log('  ', s.join(' '))
process.exit(broken.length || slow.length ? 1 : 0)

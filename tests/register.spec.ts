import { describe, expect, it } from 'vitest'
import { highlight, languageOf, register, resolveLanguage } from '../src'

describe('a language of your own', () => {
  it('the example from the docs registers, is found by file name and highlights', () => {
    register({
      id: 'nginx',
      name: 'nginx',
      extensions: ['.nginx'],
      filenames: ['nginx.conf'],
      states: {
        root: [
          { match: /#.*/, token: 'comment' },
          { match: /"(?:\\.|[^"\\])*"/, token: 'string' },
          { match: /\$[A-Za-z_]\w*/, token: 'variable' },
          { match: /^[ \t]*[a-z_]+/m, token: 'keyword' },
          { match: /[{};]/, token: 'punctuation' },
        ],
      },
    })
    expect(languageOf('/etc/nginx/nginx.conf')).toBe('nginx')
    expect(resolveLanguage('nginx')).toBe('nginx')
    expect(highlight('server { listen $port; } # main', 'nginx')).toBe(
      '<span class="sx-keyword">server</span> <span class="sx-punctuation">{</span> listen <span class="sx-variable">$port</span><span class="sx-punctuation">;</span> <span class="sx-punctuation">}</span> <span class="sx-comment"># main</span>',
    )
  })

  it('languages by file: names, longest extensions, the #! line', () => {
    expect(languageOf('src/app.d.ts')).toBe('typescript')
    expect(languageOf('Dockerfile')).toBe('dockerfile')
    expect(languageOf('Dockerfile.prod')).toBe('dockerfile')
    expect(languageOf('.env.local')).toBe('dotenv')
    expect(languageOf('.env.staging')).toBe('dotenv')
    expect(languageOf('Makefile')).toBe('makefile')
    expect(languageOf('C:\\work\\Main.KT')).toBe('kotlin')
    expect(languageOf('deploy', '#!/usr/bin/env bash')).toBe('bash')
    expect(languageOf('tool', '#!/usr/bin/python3')).toBe('python')
    expect(languageOf('notes.txt')).toBeNull()
    expect(resolveLanguage('yml')).toBe('yaml')
  })
})

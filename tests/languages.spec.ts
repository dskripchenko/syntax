import { describe, expect, it } from 'vitest'
import { tokenize } from '../src'
import { marks, sample, typeOf } from './helpers'

describe('programming languages', () => {
  it('TypeScript: keywords, types, decorators, private fields, regex vs division, templates in templates', () => {
    const ts = sample('sample.ts')
    expect(typeOf(ts, 'typescript', 'interface')).toBe('keyword')
    expect(typeOf(ts, 'typescript', 'string')).toBe('type')
    expect(typeOf(ts, 'typescript', '@Injectable')).toBe('meta')
    expect(typeOf(ts, 'typescript', '#cache')).toBe('variable')
    expect(typeOf(ts, 'typescript', '/^ord_[a-z0-9]{8}$/i')).toBe('regex')
    expect(typeOf(ts, 'typescript', '// a division, not a regex')).toBe('comment')
    expect(tokenize('a = b / 2 / c', 'typescript').some((t) => t.type === 'regex')).toBe(false)
    // `${…}` holds code; a template inside it is a string again; the outer one closes after.
    expect(marks('`a ${x ? `b ${"c"}` : 1} d`', 'typescript')).toEqual([
      'string:`a ', 'punctuation:${', 'operator:?', 'string:`b ', 'punctuation:${', 'string:"c"', 'punctuation:}', 'string:`',
      'operator::', 'number:1', 'punctuation:}', 'string: d`',
    ])
    expect(typeOf(ts, 'typescript', '10n')).toBe('number')
    expect(typeOf(ts, 'typescript', 'satisfies')).toBe('keyword')
    expect(typeOf(ts, 'typescript', '#!/usr/bin/env node')).toBe('meta')
    expect(typeOf(ts, 'typescript', 'readFile')).toBe('plain')
    expect(typeOf('readFile(x)', 'typescript', 'readFile')).toBe('function')
  })

  it('JavaScript: regex literals where an expression starts, division elsewhere', () => {
    const js = sample('sample.js')
    expect(typeOf(js, 'javascript', '/^\\/orders\\/(\\d+)$/')).toBe('regex')
    expect(typeOf(js, 'javascript', '/^\\/users\\/[^/]+$/g')).toBe('regex')
    expect(tokenize('const half = total / 2 / count', 'javascript').filter((t) => t.type === 'regex')).toEqual([])
    expect(typeOf(js, 'javascript', 'default')).toBe('keyword')
  })

  it('Python: f-strings hold expressions, escaped braces are text; decorators, triple quotes, prefixes', () => {
    const py = sample('sample.py')
    expect(typeOf(py, 'python', '@dataclass')).toBe('meta')
    expect(typeOf(py, 'python', '"""Reports: f-strings with expressions, decorators, raw and byte strings."""')).toBe('string')
    expect(marks('f"a {x + 1} {{b}}"', 'python')).toEqual(['string:f"a ', 'punctuation:{', 'operator:+', 'number:1', 'punctuation:}', 'string: ', 'escape:{{', 'string:b', 'escape:}}', 'string:"'])
    expect(typeOf(py, 'python', 'r"^(\\d+)\\s*-\\s*(\\w+)$"')).toBe('string')
    expect(typeOf(py, 'python', 'None')).toBe('constant')
    expect(typeOf(py, 'python', 'self')).toBe('variable')
    expect(typeOf(py, 'python', "'''multi\nline '''")).toBe('string')
    expect(typeOf(py, 'python', '# nested braces in the format spec')).toBe('comment')
  })

  it('Go, Rust, Java, Kotlin, C#, Swift, C, C++: their strings, comments and words', () => {
    const go = sample('sample.go')
    expect(typeOf(go, 'go', '`a raw string with "quotes" and \\n`')).toBe('string')
    expect(typeOf(go, 'go', "'λ'")).toBe('string')
    expect(typeOf(go, 'go', 'iota')).toBe('constant')
    expect(typeOf(go, 'go', 'float64')).toBe('type')

    const rs = sample('sample.rs')
    expect(typeOf(rs, 'rust', "'a")).toBe('type')
    expect(typeOf(rs, 'rust', `'"'`)).toBe('string')
    expect(typeOf(rs, 'rust', "'\\n'")).toBe('string')
    expect(typeOf(rs, 'rust', 'r#"a "raw" string"#')).toBe('string')
    expect(typeOf(rs, 'rust', '#[derive(Debug, Clone)]')).toBe('meta')
    expect(typeOf(rs, 'rust', 'println!')).toBe('function')
    expect(typeOf(rs, 'rust', '0usize')).toBe('number')
    // Block comments nest in Rust.
    expect(typeOf(rs, 'rust', '/* block /* nested */ comment */')).toBe('comment')

    const java = sample('sample.java')
    expect(typeOf(java, 'java', 'SELECT id, total', true)).toBe('string')
    expect(typeOf(java, 'java', '@Service')).toBe('meta')
    expect(typeOf(java, 'java', 'record')).toBe('keyword')

    const kt = sample('sample.kt')
    expect(typeOf(kt, 'kotlin', 'fun')).toBe('keyword')
    expect(typeOf(kt, 'kotlin', 'Hello, ${user.name}!', true)).toBe('string')

    const cs = sample('sample.cs')
    expect(typeOf(cs, 'csharp', '#nullable enable')).toBe('meta')
    expect(typeOf(cs, 'csharp', '@"C:\\shop\\prices.csv"')).toBe('string')
    expect(typeOf(cs, 'csharp', '$"{Amount:0.00} {Currency}"')).toBe('string')
    expect(typeOf(cs, 'csharp', 'async')).toBe('keyword')

    const swift = sample('sample.swift')
    expect(typeOf(swift, 'swift', 'guard')).toBe('keyword')
    expect(typeOf(swift, 'swift', 'Points:', true)).toBe('string')

    const cc = sample('sample.c')
    expect(typeOf(cc, 'c', '#include <stdio.h>')).toBe('meta')
    expect(typeOf(cc, 'c', '#define MAX(a, b) ((a) > (b) ? (a) : \\\n                   (b))')).toBe('meta')
    expect(typeOf(cc, 'c', "'A'")).toBe('string')
    const cpp = sample('sample.cpp')
    expect(typeOf(cpp, 'cpp', 'R"json({"a": "b"})json"')).toBe('string')
    expect(typeOf(cpp, 'cpp', 'nullptr')).toBe('constant')
    expect(typeOf(cpp, 'cpp', 'template')).toBe('keyword')
  })

  it('PHP: the page around the code, variables, heredoc, attributes', () => {
    const php = sample('sample.php')
    expect(typeOf(php, 'php', '<?php')).toBe('meta')
    expect(typeOf(php, 'php', 'title')).toBe('tag')
    expect(typeOf(php, 'php', '$order')).toBe('variable')
    expect(typeOf(php, 'php', "#[Route('/orders/{id}')]")).toBe('meta')
    expect(typeOf(php, 'php', 'SELECT * FROM orders', true)).toBe('string')
    expect(typeOf(php, 'php', '// a comment')).toBe('comment')
  })

  it('PHP: a fragment without `<?` is code; a page without code stays HTML once a tag opens', () => {
    expect(marks('$x = strlen("a"); // n', 'php')).toEqual(['variable:$x', 'operator:=', 'function:strlen', 'punctuation:(', 'string:"a"', 'punctuation:);', 'comment:// n'])
    expect(typeOf('<p>hi</p><?= $a ?>', 'php', 'p')).toBe('tag')
    expect(typeOf('<p>hi</p><?= $a ?>', 'php', '$a')).toBe('variable')
  })

  it("CSS: calc()'s minus is an operator; -webkit- values are words", () => {
    expect(marks('a { width: calc(100% - 2px); display: -webkit-box }', 'css').filter((m) => !m.startsWith('punctuation'))).toEqual(['tag:a', 'property:width', 'function:calc', 'number:100%', 'operator:-', 'number:2px', 'property:display', 'constant:-webkit-box'])
  })

  it('aliases a highlighter of documentation uses', () => {
    expect(typeOf("select 1 -- c", 'pgsql', 'select')).toBe('keyword')
    expect(typeOf('<a href="x">', 'markup', 'a')).toBe('tag')
  })

  it('Ruby, Lua, Shell, PowerShell, SQL', () => {
    const rb = sample('sample.rb')
    expect(typeOf(rb, 'ruby', '=begin\nA block comment.\n=end')).toBe('comment')
    expect(typeOf(rb, 'ruby', ':price')).toBe('constant')
    expect(typeOf(rb, 'ruby', '@@count')).toBe('variable')
    expect(typeOf(rb, 'ruby', '/orders/i')).toBe('regex')
    expect(typeOf(rb, 'ruby', 'SELECT * FROM orders', true)).toBe('string')

    const lua = sample('sample.lua')
    expect(typeOf(lua, 'lua', 'with a long comment', true)).toBe('comment')
    expect(typeOf(lua, 'lua', '[[\nlong string]]')).toBe('string')
    expect(typeOf(lua, 'lua', 'local')).toBe('keyword')

    const sh = sample('sample.sh')
    expect(typeOf(sh, 'bash', '${1:-staging}')).toBe('variable')
    expect(typeOf(sh, 'bash', '# Deploys the build.')).toBe('comment')
    expect(typeOf(sh, 'bash', 'fi')).toBe('keyword')
    expect(typeOf(sh, 'bash', 'Done at $(date)', true)).toBe('string')
    expect(typeOf(sh, 'bash', '--delete')).toBe('attribute')
    // A `#` inside a word is not a comment.
    expect(tokenize('echo a#b ${#arr[@]}', 'bash').some((t) => t.type === 'comment')).toBe(false)

    const ps = sample('sample.ps1')
    expect(typeOf(ps, 'powershell', 'Get-ChildItem')).toBe('function')
    expect(typeOf(ps, 'powershell', '$limit')).toBe('variable')
    expect(typeOf(ps, 'powershell', '-Recurse')).toBe('attribute')

    const sql = sample('sample.sql')
    expect(typeOf(sql, 'sql', 'WITH')).toBe('keyword')
    expect(typeOf(sql, 'sql', "'it''s'")).toBe('string')
    expect(typeOf(sql, 'sql', '$1')).toBe('variable')
    expect(typeOf(sql, 'sql', 'numeric')).toBe('type')
    expect(typeOf(sql, 'sql', 'SUM')).toBe('function')
  })
})

describe('formats', () => {
  it('JSON: keys apart from values', () => {
    const json = sample('sample.json')
    expect(typeOf(json, 'json', '"name"')).toBe('property')
    expect(typeOf(json, 'json', '"@scope/app"')).toBe('string')
    expect(typeOf(json, 'json', '-2.5')).toBe('number')
    expect(typeOf(json, 'json', 'null')).toBe('constant')
    expect(typeOf(json, 'json', '"a \\"quoted\\" string"')).toBe('string')
  })

  it('YAML: keys, anchors, tags, block scalars as text, dates, documents', () => {
    const y = sample('sample.yaml')
    expect(typeOf(y, 'yaml', 'name')).toBe('property')
    expect(typeOf(y, 'yaml', '&base')).toBe('variable')
    expect(typeOf(y, 'yaml', '*base')).toBe('variable')
    expect(typeOf(y, 'yaml', '!!str')).toBe('meta')
    expect(typeOf(y, 'yaml', '2026-11-01')).toBe('date')
    expect(typeOf(y, 'yaml', '---')).toBe('meta')
    // The block scalar's lines are text, even with a colon in them.
    expect(typeOf(y, 'yaml', 'description: with a colon', true)).toBe('string')
    expect(typeOf(y, 'yaml', 'true')).toBe('constant')
    expect(typeOf(y, 'yaml', "'quoted, item'")).toBe('string')
    expect(typeOf('a: {b: 1, c: x}', 'yaml', 'c')).toBe('property')
  })

  it('XML and HTML: tags, attributes, entities, CDATA; script and style in their own languages', () => {
    const x = sample('sample.xml')
    expect(typeOf(x, 'xml', '<?xml version="1.0" encoding="UTF-8"?>')).toBe('meta')
    expect(typeOf(x, 'xml', 'x:body')).toBe('tag')
    expect(typeOf(x, 'xml', 'priority')).toBe('attribute')
    expect(typeOf(x, 'xml', '&amp;')).toBe('escape')
    expect(typeOf(x, 'xml', '<![CDATA[ <b>raw</b> & text ]]>')).toBe('string')
    const h = sample('sample.html')
    expect(typeOf(h, 'html', 'margin')).toBe('property')
    expect(typeOf(h, 'html', 'const')).toBe('keyword')
    expect(typeOf(h, 'html', '`yes`')).toBe('string')
    expect(typeOf(h, 'html', '&mdash;')).toBe('escape')
    expect(typeOf(h, 'html', 'data-id')).toBe('attribute')
  })

  it('CSS: selectors, properties, values, at-rules', () => {
    const css = sample('sample.css')
    expect(typeOf(css, 'css', '.card')).toBe('type')
    expect(typeOf(css, 'css', 'color')).toBe('property')
    expect(typeOf(css, 'css', '#0969da')).toBe('number')
    expect(typeOf(css, 'css', '!important')).toBe('keyword')
    expect(typeOf(css, 'css', '@media')).toBe('keyword')
    expect(typeOf(css, 'css', 'var')).toBe('function')
    expect(typeOf(css, 'css', '--accent')).toBe('property')
    expect(typeOf(css, 'css', '::after', true)).toBe('attribute')
  })

  it('TOML, INI, .env, CSV', () => {
    const toml = sample('sample.toml')
    expect(typeOf(toml, 'toml', '[package]')).toBe('type')
    expect(typeOf(toml, 'toml', '[[bin]]')).toBe('type')
    expect(typeOf(toml, 'toml', 'edition')).toBe('property')
    expect(typeOf(toml, 'toml', '"quoted key"')).toBe('property')
    expect(typeOf(toml, 'toml', '2026-11-01T10:00:00Z')).toBe('date')
    expect(typeOf(toml, 'toml', '0x1F')).toBe('number')
    expect(typeOf('a = true', 'toml', 'true')).toBe('constant')
    const ini = sample('sample.ini')
    expect(typeOf(ini, 'ini', '[database]')).toBe('type')
    expect(typeOf(ini, 'ini', 'host')).toBe('property')
    expect(typeOf(ini, 'ini', '# also a comment')).toBe('comment')
    const env = sample('sample.env')
    expect(typeOf(env, 'dotenv', 'APP_NAME')).toBe('property')
    expect(typeOf(env, 'dotenv', 'export DB_PORT')).toBe('property')
    expect(typeOf(env, 'dotenv', '${DB_HOST}')).toBe('variable')
    const csv = sample('sample.csv')
    expect(typeOf(csv, 'csv', '"A ""quoted"" name"')).toBe('string')
    expect(typeOf(csv, 'csv', '4.50')).toBe('number')
  })

  it('Markdown: links in parts, a badge (an image in a link) whole, references, addresses', () => {
    expect(marks('A [link](https://e.com/a "Title") here.', 'markdown')).toEqual(['punctuation:[', 'string:link', 'punctuation:](', 'link:https://e.com/a', 'string:"Title"', 'punctuation:)'])
    expect(marks('[![tests](https://img/x.svg)](https://ci/y)', 'markdown')).toEqual([
      'punctuation:[![', 'string:tests', 'punctuation:](', 'link:https://img/x.svg', 'punctuation:)](', 'link:https://ci/y', 'punctuation:)',
    ])
    expect(marks('See [the docs][docs] and [^1].', 'markdown')).toEqual(['punctuation:[', 'string:the docs', 'punctuation:][', 'variable:docs', 'punctuation:]', 'meta:[^1]'])
    expect(marks('[docs]: https://e.com/d "D"', 'markdown')).toEqual(['variable:[docs]', 'punctuation::', 'link:https://e.com/d', 'string: "D"'])
    expect(marks('Go to https://e.com/x, or <mailto:a@b.c>.', 'markdown')).toEqual(['link:https://e.com/x', 'link:<mailto:a@b.c>'])
    // Internal links: the note, its heading, a text of its own; a picture by name.
    expect(marks('See [[Road map#Next|what is next]] and ![[cat.png]].', 'markdown')).toEqual([
      'punctuation:[[', 'link:Road map', 'variable:#Next', 'punctuation:|', 'string:what is next', 'punctuation:]]', 'punctuation:![[', 'link:cat.png', 'punctuation:]]',
    ])
    // Square brackets that are not a link stay text.
    expect(marks('array[0] and [x]', 'markdown')).toEqual([])
  })

  it('Markdown: the quoted text, a heading’s marker, strike-through, tables, tasks, HTML, front matter', () => {
    expect(marks('> quoted **strong**\nafter', 'markdown')).toEqual(['punctuation:> ', 'comment:quoted ', 'strong:**strong**'])
    expect(marks('## Title', 'markdown')).toEqual(['punctuation:##', 'heading: Title'])
    // A line that starts with inline code in four backticks is not a fence.
    expect(marks('```` ```js ```` and **bold**', 'markdown')).toEqual(['string:```` ```js ````', 'strong:**bold**'])
    expect(marks('~~gone~~ and snake_case_name', 'markdown')).toEqual(['deleted:~~gone~~'])
    expect(marks('| a | b |\n|---|:---:|\n| 1 | 2 |', 'markdown').filter((m) => m !== 'punctuation:|')).toEqual(['punctuation:|---|:---:|'])
    expect(marks('- [x] done', 'markdown')).toEqual(['punctuation:-', 'keyword:[x]'])
    expect(marks('Text <kbd>Ctrl</kbd> text', 'markdown')).toContain('tag:kbd')
    expect(marks('---\ntitle: Hi\n---\n# H', 'markdown').slice(0, 3)).toEqual(['meta:---\n', 'property:title', 'punctuation::'])
  })

  it('Markdown: TeX math in its dollars (prices stay text), ==highlights==', () => {
    expect(marks('Euler $e^{i\\pi}$, a price $5 and $10.', 'markdown')).toEqual([
      // The group's closing brace and the closing dollar: one run of punctuation.
      'punctuation:$', 'operator:^', 'punctuation:{', 'keyword:\\pi', 'punctuation:}$',
    ])
    expect(marks('$$\n\\frac{1}{2}\n$$', 'markdown')).toEqual(['punctuation:$$', 'keyword:\\frac', 'punctuation:{', 'number:1', 'punctuation:}{', 'number:2', 'punctuation:}', 'punctuation:$$'])
    expect(marks('A ==marked== word, a == b', 'markdown')).toEqual(['warning:==marked=='])
    expect(marks('```math\nx^2\n```', 'markdown')).toEqual(['meta:```math\n', 'operator:^', 'number:2', 'meta:```'])
  })

  it('Markdown: #tags, not C#, #123 or a heading', () => {
    expect(marks('Do #todo and #work/urgent, #задача; C# and #123.', 'markdown')).toEqual(['type:#todo', 'type:#work/urgent', 'type:#задача'])
    expect(marks('#todo first', 'markdown')).toEqual(['type:#todo'])
    expect(marks('# Title', 'markdown')).toEqual(['punctuation:#', 'heading: Title'])
  })

  it('LaTeX: commands, environments, comments, math shifts, escapes', () => {
    const tex = sample('sample.tex')
    expect(typeOf(tex, 'latex', '\\documentclass')).toBe('keyword')
    expect(typeOf(tex, 'latex', '% for align')).toBe('comment')
    expect(typeOf(tex, 'latex', 'align')).toBe('type')
    expect(typeOf(tex, 'latex', '\\%')).toBe('escape')
    expect(typeOf(tex, 'latex', '0.004')).toBe('number')
  })

  it('Markdown: headings, emphasis, links, a fenced block in its language', () => {
    const md = sample('sample.md')
    expect(typeOf(md, 'markdown', 'Handbook', true)).toBe('heading')
    expect(typeOf(md, 'markdown', '**bold**')).toBe('strong')
    expect(typeOf(md, 'markdown', 'link')).toBe('string')
    expect(typeOf(md, 'markdown', 'https://example.com')).toBe('link')
    expect(typeOf(md, 'markdown', 'def')).toBe('keyword')
    expect(typeOf(md, 'markdown', '"hi"')).toBe('string')
    expect(typeOf(md, 'markdown', 'plain block')).toBe('string')
    expect(typeOf(md, 'markdown', '```python')).toBe('meta')
  })

  it('diff, logs, Dockerfile, Makefile, GraphQL, protobuf, HTTP', () => {
    const d = sample('sample.diff')
    expect(typeOf(d, 'diff', '+const b = 3')).toBe('inserted')
    expect(typeOf(d, 'diff', '-const b = 2')).toBe('deleted')
    expect(typeOf(d, 'diff', '@@ -1,3 +1,3 @@')).toBe('meta')

    const log = sample('sample.log')
    expect(typeOf(log, 'log', '2026-11-01T10:15:30.123Z')).toBe('date')
    expect(typeOf(log, 'log', 'ERROR')).toBe('error')
    expect(typeOf(log, 'log', 'PaymentException')).toBe('error')
    expect(typeOf(log, 'log', 'WARN')).toBe('warning')
    expect(typeOf(log, 'log', 'INFO')).toBe('info')
    expect(typeOf(log, 'log', 'DEBUG')).toBe('debug')
    expect(typeOf(log, 'log', 'at com.shop.Payments.charge(Payments.java:42)', true)).toBe('comment')
    expect(typeOf(log, 'log', '192.168.1.5')).toBe('number')
    expect(typeOf(log, 'log', '01/Nov/2026:10:15:34 +0000')).toBe('date')
    expect(typeOf(log, 'log', 'user')).toBe('property')

    const df = sample('Dockerfile')
    expect(typeOf(df, 'dockerfile', 'FROM')).toBe('keyword')
    expect(typeOf(df, 'dockerfile', '--chown=node:node')).toBe('attribute')
    expect(typeOf(df, 'dockerfile', '${PORT}')).toBe('variable')
    const mk = sample('Makefile')
    expect(typeOf(mk, 'makefile', 'clean')).toBe('function')
    expect(typeOf(mk, 'makefile', '$(CC)')).toBe('variable')
    expect(typeOf(mk, 'makefile', 'CFLAGS')).toBe('property')

    const gql = sample('sample.graphql')
    expect(typeOf(gql, 'graphql', 'query')).toBe('keyword')
    expect(typeOf(gql, 'graphql', '$id')).toBe('variable')
    expect(typeOf(gql, 'graphql', '@cached')).toBe('meta')
    expect(typeOf(gql, 'graphql', 'Order')).toBe('type')
    const proto = sample('sample.proto')
    expect(typeOf(proto, 'protobuf', 'message')).toBe('keyword')
    expect(typeOf(proto, 'protobuf', 'int64')).toBe('type')
    const http = sample('sample.http')
    expect(typeOf(http, 'http', 'POST')).toBe('keyword')
    expect(typeOf(http, 'http', 'Content-Type')).toBe('property')
    expect(typeOf(http, 'http', '"sku"')).toBe('property')
  })

  it('what spans lines reads the same in a part of the text: unclosed runs to the end, Markdown stays in its paragraph', () => {
    expect(typeOf('<?php\n$a = <<<EOT\nnot closed\n$b', 'php', 'not closed', true)).toBe('string')
    expect(typeOf('cat <<EOF\nnever closed', 'shell', 'never closed', true)).toBe('string')
    expect(typeOf('let s = r#"raw\nstill', 'rust', 'still', true)).toBe('string')
    expect(typeOf('a *b\n\nc* d', 'markdown', '*b', true)).not.toBe('emphasis')
    expect(typeOf('a *b\nc* d', 'markdown', '*b', true)).toBe('emphasis')
    expect(typeOf('$x = 1; ?>\n<p>', 'php', '$x')).toBe('variable')
    expect(typeOf('#!/usr/bin/env php\n<?php echo 1;', 'php', 'echo')).toBe('keyword')
  })
})

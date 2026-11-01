# @dskripchenko/syntax

[![CI](https://github.com/dskripchenko/syntax/actions/workflows/ci.yml/badge.svg)](https://github.com/dskripchenko/syntax/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/@dskripchenko/syntax.svg)](https://www.npmjs.com/package/@dskripchenko/syntax)
[![license](https://img.shields.io/npm/l/@dskripchenko/syntax.svg)](LICENSE)

Syntax highlighting for programming languages, data formats and the files
around code — with **no runtime dependencies** and **no DOM**. A string goes
in, HTML (or tokens) comes out: in a browser, in server-side rendering, in a
Node script.

```ts
import { foldRanges, highlight, highlightLines, languageOf, LineHighlighter, logEntries, THEME_CSS, validate } from '@dskripchenko/syntax'

const language = languageOf('server.rs') ?? 'text' // by name, extension or `#!` line
element.innerHTML = highlight(code, language) // <span class="sx-keyword">fn</span> …

// Line by line: for line numbers, or for drawing only the lines in view.
const lines = highlightLines(code, language)

// The colours: CSS custom properties, light and dark.
style.textContent = THEME_CSS

// What is wrong with a data file, and what can be folded.
validate('{"a": 1,}', 'json') // [{ line: 1, column: 9, message: 'expected a string key', severity: 'error' }]
foldRanges(code, language) // [{ start: 3, end: 10 }, …]

// A 100 MB log: only the lines in view are highlighted.
new LineHighlighter(text, 'log').html(1000, 1040)
logEntries(text) // [{ start: 2, end: 9, level: 'error' }, …]
```

**Programming languages:** JavaScript, TypeScript, Python, Go, Rust, Java,
Kotlin, C#, Swift, C, C++, PHP, Ruby, Lua, Shell, PowerShell, SQL.

**Formats and the files around code:** JSON (with comments, JSON Lines),
YAML, XML (SVG, plists, project files), HTML (with its scripts and styles),
CSS (SCSS, Less), TOML, INI, `.env`, CSV/TSV, Markdown (fenced blocks in their
language), diff, logs (levels, times, stack traces), Dockerfile, Makefile,
GraphQL, Protocol Buffers, HTTP.

**Validation** with the line, column and a message for JSON (strict, with
comments, JSON Lines), YAML, XML, TOML, CSV/TSV, INI and `.env`; **folding**
by brackets, tags, indentation or headings; **big files** highlighted a
window at a time; **logs** read as entries with their level.

## What it promises

- **The text comes back exactly.** The tokens' texts joined give the input,
  byte for byte, whatever the input is.
- **Linear time.** No pattern can backtrack without end and nothing nests
  without bound: the test suite throws pathological input (thousands of
  quotes, slashes, open brackets) at every language. On real code it runs at
  about 20 MB/s.
- **Escaped output.** `highlight()` escapes every piece of the text; HTML in
  the code is shown as text.
- **Small.** One module of about 32 KB gzipped (before your bundler minifies
  it), every language and checker included.

For code it is a highlighter, not a compiler: it reads the shape of the code
— words, strings, comments, numbers, names — closely enough for reading, and
reports no syntax errors in it; data formats are validated.

## Documentation

| | | | | |
|---|---|---|---|---|
| Getting started: API, languages, theming, your own grammar | [en](docs/en/getting-started.md) | [ru](docs/ru/getting-started.md) | [de](docs/de/getting-started.md) | [zh](docs/zh/getting-started.md) |

## Install

```bash
npm install @dskripchenko/syntax
```

## License

[MIT](LICENSE)

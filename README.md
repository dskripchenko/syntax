# @dskripchenko/syntax

[![CI](https://github.com/dskripchenko/syntax/actions/workflows/ci.yml/badge.svg)](https://github.com/dskripchenko/syntax/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/@dskripchenko/syntax.svg)](https://www.npmjs.com/package/@dskripchenko/syntax)
[![license](https://img.shields.io/npm/l/@dskripchenko/syntax.svg)](LICENSE)

Syntax highlighting for programming languages, data formats and the files
around code — with **no runtime dependencies** and **no DOM**. A string goes
in, HTML (or tokens) comes out: in a browser, in server-side rendering, in a
Node script.

```ts
import { highlight, highlightLines, languageOf, THEME_CSS } from '@dskripchenko/syntax'

const language = languageOf('server.rs') ?? 'text' // by name, extension or `#!` line
element.innerHTML = highlight(code, language) // <span class="sx-keyword">fn</span> …

// Line by line: for line numbers, or for drawing only the lines in view.
const lines = highlightLines(code, language)

// The colours: CSS custom properties, light and dark.
style.textContent = THEME_CSS
```

**Programming languages:** JavaScript, TypeScript, Python, Go, Rust, Java,
Kotlin, C#, Swift, C, C++, PHP, Ruby, Lua, Shell, PowerShell, SQL.

**Formats and the files around code:** JSON (with comments, JSON Lines),
YAML, XML (SVG, plists, project files), HTML (with its scripts and styles),
CSS (SCSS, Less), TOML, INI, `.env`, CSV/TSV, Markdown (fenced blocks in their
language), diff, logs (levels, times, stack traces), Dockerfile, Makefile,
GraphQL, Protocol Buffers, HTTP.

## What it promises

- **The text comes back exactly.** The tokens' texts joined give the input,
  byte for byte, whatever the input is.
- **Linear time.** No pattern can backtrack without end and nothing nests
  without bound: the test suite throws pathological input (thousands of
  quotes, slashes, open brackets) at every language. On real code it runs at
  about 20 MB/s.
- **Escaped output.** `highlight()` escapes every piece of the text; HTML in
  the code is shown as text.
- **Small.** One module of about 14 KB gzipped (before your bundler minifies
  it), every language included.

It is a highlighter, not a compiler: it reads the shape of the code — words,
strings, comments, numbers, names — closely enough for reading, and it does
not report syntax errors.

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

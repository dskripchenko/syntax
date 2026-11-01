# Getting started

```bash
npm install @dskripchenko/syntax
```

```ts
import { highlight, languageOf, THEME_CSS } from '@dskripchenko/syntax'

const style = document.createElement('style')
style.textContent = THEME_CSS
document.head.append(style)

const pre = document.querySelector('pre')!
pre.innerHTML = highlight(source, languageOf('config.yaml') ?? 'text')
```

## API

| | |
|---|---|
| `highlight(code, language)` | The text as HTML: `<span class="sx-{type}">` per token, plain text bare, everything escaped. A language not known gives the text escaped. |
| `highlightLines(code, language)` | The same, one string per line (the breaks left out). A token spanning lines is cut at each line's end, so every line is markup complete in itself — for line numbers, or for drawing only the lines in view. |
| `tokenize(code, language)` | The tokens, `{ type, text }[]`; their texts joined give the input back. |
| `tokenizeLines(code, language)` | The tokens line by line, for a host that draws them itself. |
| `languageOf(fileName, firstLine?)` | The language of a file: its whole name (`Dockerfile`, `.env.local`), its longest extension (`.d.ts`), else the interpreter of a `#!` first line. `null` when nothing says. |
| `languages()` | Every language: `{ id, name, aliases, extensions, filenames }`. |
| `isSupported(language)`, `resolveLanguage(language)` | Whether an id or alias is known; the id it stands for (`yml` → `yaml`). |
| `THEME_CSS`, `TOKEN_TYPES` | The stylesheet (custom properties and a class per token type), and the types. |
| `register(grammar)` | Adds a language, or replaces one (see below). |

## Token types

`keyword`, `string`, `number`, `comment`, `function`, `type`, `variable`,
`constant`, `operator`, `punctuation`, `property` (a key in JSON, YAML, TOML,
a CSS property), `tag` and `attribute` (markup), `regex`, `meta` (decorators,
annotations, the preprocessor, directives), `escape`, `heading`, `emphasis`,
`strong`, `link` (Markdown), `inserted` and `deleted` (diff), `date`, and the
log levels `error`, `warning`, `info`, `debug`. Plain text has no span.

## Theming

`THEME_CSS` sets one custom property per type — `--sx-keyword`,
`--sx-string`, … — light by default; dark for `[data-theme="dark"]` on any
ancestor, and for a dark system when the page sets no theme. Restyle with a
few declarations:

```css
.my-code { --sx-keyword: #c678dd; --sx-string: #98c379; }
```

## Languages

| Id | Name | Aliases | Files |
|---|---|---|---|
| `javascript` | JavaScript | `js`, `jsx`, `mjs`, `cjs`, `node` | `.js` `.mjs` `.cjs` `.jsx` |
| `typescript` | TypeScript | `ts`, `tsx`, `mts`, `cts` | `.ts` `.mts` `.cts` `.tsx` |
| `python` | Python | `py`, `py3`, `python3` | `.py` `.pyw` `.pyi` |
| `go` | Go | `golang` | `.go` |
| `rust` | Rust | `rs` | `.rs` |
| `java` | Java |  | `.java` |
| `kotlin` | Kotlin | `kt`, `kts` | `.kt` `.kts` |
| `csharp` | C# | `cs`, `c#` | `.cs` `.csx` |
| `swift` | Swift |  | `.swift` |
| `c` | C | `h` | `.c` `.h` |
| `cpp` | C++ | `c++`, `cc`, `hpp`, `cxx` | `.cpp` `.cc` `.cxx` `.hpp` `.hh` `.hxx` |
| `php` | PHP |  | `.php` `.phtml` `.php8` |
| `ruby` | Ruby | `rb` | `.rb` `.rake` `.gemspec` `.ru` `Gemfile` `Rakefile` `Vagrantfile` |
| `lua` | Lua |  | `.lua` |
| `bash` | Shell | `sh`, `shell`, `zsh`, `console` | `.sh` `.bash` `.zsh` `.ksh` `.bashrc` `.zshrc` `.profile` |
| `powershell` | PowerShell | `ps`, `ps1`, `pwsh` | `.ps1` `.psm1` `.psd1` |
| `sql` | SQL | `mysql`, `postgresql`, `postgres`, `sqlite`, `plsql` | `.sql` |
| `json` | JSON | `jsonc`, `json5`, `jsonl`, `ndjson`, `geojson` | `.json` `.jsonc` `.json5` `.jsonl` `.ndjson` `.geojson` `.webmanifest` `.har` `.babelrc` `.eslintrc` `.prettierrc` |
| `yaml` | YAML | `yml` | `.yaml` `.yml` `.clang-format` `pnpm-lock.yaml` |
| `xml` | XML | `svg`, `xsl`, `xslt`, `plist`, `rss`, `atom`, `wsdl`, `xsd` | `.xml` `.svg` `.xsl` `.xslt` `.xsd` `.wsdl` `.plist` `.rss` |
| `html` | HTML | `htm`, `xhtml`, `vue`, `svelte` | `.html` `.htm` `.xhtml` `.vue` `.svelte` |
| `css` | CSS | `scss`, `sass`, `less`, `postcss`, `stylus` | `.css` `.scss` `.less` `.pcss` |
| `toml` | TOML |  | `.toml` `Cargo.lock` `Pipfile` `poetry.lock` |
| `ini` | INI | `cfg`, `conf`, `properties`, `editorconfig`, `gitconfig` | `.ini` `.cfg` `.conf` `.properties` `.desktop` `.service` `.editorconfig` `.gitconfig` `.editorconfig` `.gitconfig` `.npmrc` |
| `dotenv` | .env | `env` | `.env` `.env` `.env.example` `.env.local` |
| `csv` | CSV | `tsv` | `.csv` `.tsv` `.tab` |
| `markdown` | Markdown | `md`, `mdx` | `.md` `.markdown` `.mdown` `.mkd` `.mdx` |
| `diff` | Diff | `patch`, `udiff` | `.diff` `.patch` |
| `log` | Log | `logs` | `.log` `.out` `.err` |
| `dockerfile` | Dockerfile | `docker`, `containerfile` | `.dockerfile` `Dockerfile` `Containerfile` |
| `makefile` | Makefile | `make`, `mk` | `.mk` `.make` `Makefile` `makefile` `GNUmakefile` |
| `graphql` | GraphQL | `gql` | `.graphql` `.gql` `.graphqls` |
| `protobuf` | Protocol Buffers | `proto` | `.proto` |
| `http` | HTTP | `rest` | `.http` `.rest` |

## Validation

```ts
import { validate } from '@dskripchenko/syntax'

validate('{\n  "a": 1,\n}', 'json')
// [{ line: 3, column: 1, message: 'expected a string key', severity: 'error' }]
```

`validate(text, language)` tells where a data file is not what its format
allows — line, column, message — in the order found, at most 50. **Errors**
break the format; **warnings** are allowed by it but almost always mistakes.

| Language | Checked |
|---|---|
| `json` | strict JSON (RFC 8259); a key given twice is a warning |
| `jsonc` | the same with comments and trailing commas (tsconfig.json, VS Code's settings, JSON5 files); positions stay those of the text |
| `jsonl` | every non-empty line one JSON value |
| `yaml` | YAML 1.2, document by document (`---`); directives, anchors, tags, block scalars. Constructs it does not read — complex keys, collections as keys — end the check quietly rather than being reported |
| `xml` | well-formedness: one root, tags closed in order, attributes once each and quoted, entities (and those a DTD declares), comments, the declaration first. Not a DTD or schema |
| `toml` | strings, numbers, dates, arrays, inline tables; keys and tables defined once |
| `csv`, `tsv` | quotes closed; every row as many fields as the first (a warning); the separator found from the first line; `#` lines taken as comments |
| `ini` | sections closed; key lines; a key given twice in a section (a warning; `key[]` collects) |
| `dotenv` | `KEY=value` lines; quotes closed; a key given twice |

`canValidate(language)` says whether a language is checked; for the others
`validate` gives nothing. Silence is not a proof of validity.

## Folding

`foldRanges(text, language)` gives what a reader can fold: ranges of lines
`{ start, end }`, 1-based. The first line stays visible (it names the range:
an opening bracket, a tag, a key, a heading); the lines after it, up to `end`,
fold away — a closing bracket's or tag's line stays, so `} else {` is never
hidden.

- **Brackets** `{ [ (` for code and JSON — read from the tokens, so a bracket
  in a string or a comment folds nothing; multi-line comments fold too.
- **Tags** for XML and HTML (HTML's void elements, `<br>`, open nothing).
- **Indentation** for YAML and Python.
- **Headings** for Markdown: a section up to the next heading of its level or
  higher; a fenced block on its own.

## Big files

```ts
import { LineHighlighter } from '@dskripchenko/syntax'

const h = new LineHighlighter(text, 'log')
h.lineCount        // 449 473
h.html(1000, 1040) // the 40 lines in view, as HTML, each complete
```

`LineHighlighter` highlights a window of lines without tokenizing the whole
file: it goes from the nearest *checkpoint* — the tokenizer's state kept every
500 lines as it passes — to the end of the window. Scrolling costs what is
shown; the first jump to the end of a 100 MB log takes about half a second,
and every later window near it a few milliseconds. The lines are the same as
`highlightLines` gives for the whole text (a comment opened 300 lines above is
still a comment). `html(from, to, maxLength)` cuts a long line — minified code
— at `maxLength` characters; `tokens(from, to)` gives the tokens instead;
`line(i)` the text.

## Logs

```ts
import { logEntries, logLevelOf } from '@dskripchenko/syntax'

logEntries(text)
// [{ start: 1, end: 1, level: 'info' }, { start: 2, end: 9, level: 'error' }, …]
```

`logEntries` reads a log as entries: when the log starts with a timestamp (or
most of its lines do), an entry is a timestamped line and the lines up to the
next one — a stack trace, a dumped object, a multi-line SQL error stay with
the line that reported them; otherwise every line is an entry, except the
ones that continue it (indented, `at …`, `Caused by`, `#0 …`).

The level, `error`, `warning`, `info` or `debug` (or `null`), is taken from the
entry's first line by `logLevelOf`: a level word in capitals (`ERROR`,
`local.WARNING:`, `FAIL`), a field (`level=warn`, `"level":"error"`), a
bracketed one (`[crit]`), or an access log's status (5xx an error, 4xx a
warning). The first of them counts: `INFO retrying after an ERROR` is info.

## A language of your own

A grammar is states of rules, tried in order at each position; a rule's
pattern is matched right there (it is made sticky). A rule may enter a state
(`push`), leave it (`pop`), replace it (`next`), split its match into typed
capture groups (`groups`), look at the token before (`when`), or hand its
text to another grammar (`embed`).

```ts
import { register } from '@dskripchenko/syntax'

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
```

Two rules keep a grammar linear: a word that a guarded rule (`name(?=:)`)
does not take must be taken whole by a later one, never re-read from its
next letter; and a rule that matches nothing must change the state.

## What it does not do

It reads the shape of the code, not its meaning: it does not report syntax
errors, and a few constructs are approximations — JSX is read as JavaScript,
string interpolation is code only in JavaScript, TypeScript and Python
f-strings, and whether `/` starts a regular expression is decided by the token
before it.

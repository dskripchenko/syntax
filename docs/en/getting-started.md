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

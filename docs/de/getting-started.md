# Erste Schritte

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
| `highlight(code, language)` | Der Text als HTML: `<span class="sx-{type}">` je Token, schlichter Text ohne Hülle, alles maskiert. Eine unbekannte Sprache ergibt den maskierten Text. |
| `highlightLines(code, language)` | Dasselbe zeilenweise (ohne Umbrüche). Ein Token über mehrere Zeilen wird an jedem Zeilenende geschnitten, jede Zeile ist also vollständiges Markup — für Zeilennummern oder um nur sichtbare Zeilen zu zeichnen. |
| `tokenize(code, language)` | Die Tokens `{ type, text }[]`; ihre Texte aneinander ergeben die Eingabe. |
| `tokenizeLines(code, language)` | Die Tokens zeilenweise, für eine Anwendung, die selbst zeichnet. |
| `languageOf(fileName, firstLine?)` | Die Sprache einer Datei: nach ganzem Namen (`Dockerfile`, `.env.local`), nach der längsten Endung (`.d.ts`), sonst nach dem Interpreter einer `#!`-Zeile. `null`, wenn nichts darauf hinweist. |
| `languages()` | Alle Sprachen: `{ id, name, aliases, extensions, filenames }`. |
| `isSupported(language)`, `resolveLanguage(language)` | Ob eine Id oder ein Alias bekannt ist; welche Id dahinter steht (`yml` → `yaml`). |
| `THEME_CSS`, `TOKEN_TYPES` | Das Stylesheet (Custom Properties und eine Klasse je Tokentyp) und die Typen. |
| `register(grammar)` | Fügt eine Sprache hinzu oder ersetzt eine (siehe unten). |

## Tokentypen

`keyword`, `string`, `number`, `comment`, `function`, `type`, `variable`,
`constant`, `operator`, `punctuation`, `property` (ein Schlüssel in JSON,
YAML, TOML, eine CSS-Eigenschaft), `tag` und `attribute` (Markup), `regex`,
`meta` (Dekoratoren, Annotationen, Präprozessor, Direktiven), `escape`,
`heading`, `emphasis`, `strong`, `link` (Markdown), `inserted` und `deleted`
(diff), `date` und die Log-Stufen `error`, `warning`, `info`, `debug`.
Schlichter Text hat keine Hülle.

## Gestaltung

`THEME_CSS` setzt je Typ eine Custom Property — `--sx-keyword`,
`--sx-string`, … — standardmäßig hell; dunkel bei `[data-theme="dark"]` an
einem Vorfahren und bei einem dunklen System, wenn die Seite kein Theme setzt.
Umgestalten mit wenigen Deklarationen:

```css
.my-code { --sx-keyword: #c678dd; --sx-string: #98c379; }
```

## Sprachen

| Id | Name | Aliasse | Dateien |
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

## Eine eigene Sprache

Eine Grammatik besteht aus Zuständen mit Regeln, die an jeder Stelle der
Reihe nach probiert werden; das Muster einer Regel passt genau dort (es wird
„sticky“). Eine Regel kann einen Zustand betreten (`push`), verlassen (`pop`),
ersetzen (`next`), ihren Treffer in typisierte Gruppen teilen (`groups`), auf
das vorige Token schauen (`when`) oder ihren Text einer anderen Grammatik
geben (`embed`).

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

Zwei Regeln halten eine Grammatik linear: Ein Wort, das eine Regel mit
Bedingung (`name(?=:)`) nicht nimmt, muss eine spätere ganz nehmen, statt es
ab dem nächsten Buchstaben neu zu lesen; und eine Regel, die nichts trifft,
muss den Zustand wechseln.

## Was es nicht tut

Es liest die Form des Codes, nicht seine Bedeutung: Syntaxfehler meldet es
nicht, und einige Konstrukte sind Näherungen — JSX wird als JavaScript
gelesen, Interpolation in Strings ist nur in JavaScript, TypeScript und
Python-f-Strings Code, und ob `/` einen regulären Ausdruck beginnt, entscheidet
das Token davor.

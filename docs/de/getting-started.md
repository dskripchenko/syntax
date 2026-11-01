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

## Prüfung

```ts
import { validate } from '@dskripchenko/syntax'

validate('{\n  "a": 1,\n}', 'json')
// [{ line: 3, column: 1, message: 'expected a string key', severity: 'error' }]
```

`validate(text, language)` sagt, wo eine Datendatei nicht dem entspricht, was
ihr Format erlaubt — Zeile, Spalte, Meldung — in der Reihenfolge des Fundes,
höchstens 50. **Fehler** brechen das Format; **Warnungen** erlaubt es, aber sie
sind fast immer Versehen.

| Sprache | Geprüft |
|---|---|
| `json` | striktes JSON (RFC 8259); ein doppelter Schlüssel ist eine Warnung |
| `jsonc` | dasselbe mit Kommentaren und nachgestellten Kommas (tsconfig.json, VS-Code-Einstellungen, JSON5-Dateien); die Positionen bleiben die des Textes |
| `jsonl` | jede nicht leere Zeile ein JSON-Wert |
| `yaml` | YAML 1.2, Dokument für Dokument (`---`); Direktiven, Anker, Tags, Blockskalare. Konstrukte, die es nicht liest — komplexe Schlüssel, Sammlungen als Schlüssel —, beenden die Prüfung still, statt gemeldet zu werden |
| `xml` | Wohlgeformtheit: eine Wurzel, Tags in Reihenfolge geschlossen, Attribute je einmal und in Anführungszeichen, Entitäten (und die einer DTD), Kommentare, die Deklaration zuerst. Keine DTD- oder Schemaprüfung |
| `toml` | Strings, Zahlen, Daten, Arrays, Inline-Tabellen; Schlüssel und Tabellen je einmal definiert |
| `csv`, `tsv` | Anführungszeichen geschlossen; jede Zeile so viele Felder wie die erste (Warnung); das Trennzeichen aus der ersten Zeile; `#`-Zeilen als Kommentare |
| `ini` | Abschnitte geschlossen; Schlüsselzeilen; ein doppelter Schlüssel im Abschnitt (Warnung; `key[]` sammelt) |
| `dotenv` | `KEY=value`-Zeilen; Anführungszeichen geschlossen; ein doppelter Schlüssel |

`canValidate(language)` sagt, ob eine Sprache geprüft wird; für die anderen
liefert `validate` nichts. Schweigen ist kein Beweis der Gültigkeit.

## Falten

`foldRanges(text, language)` liefert, was ein Leser falten kann: Zeilenbereiche
`{ start, end }`, ab 1. Die erste Zeile bleibt sichtbar (sie benennt den
Bereich: eine öffnende Klammer, ein Tag, ein Schlüssel, eine Überschrift); die
Zeilen danach bis `end` falten sich weg — die Zeile einer schließenden Klammer
oder eines Tags bleibt, `} else {` wird also nie versteckt.

- **Klammern** `{ [ (` für Code und JSON — aus den Tokens gelesen, eine Klammer
  in einem String oder Kommentar faltet also nichts; mehrzeilige Kommentare
  falten auch.
- **Tags** für XML und HTML (die leeren Elemente von HTML, `<br>`, öffnen
  nichts).
- **Einrückung** für YAML und Python.
- **Überschriften** für Markdown: ein Abschnitt bis zur nächsten Überschrift
  seiner Ebene oder höher; ein Codeblock für sich.

## Große Dateien

```ts
import { LineHighlighter } from '@dskripchenko/syntax'

const h = new LineHighlighter(text, 'log')
h.lineCount        // 449 473
h.html(1000, 1040) // die 40 sichtbaren Zeilen als HTML, jede vollständig
```

`LineHighlighter` hebt ein Fenster von Zeilen hervor, ohne die ganze Datei zu
zerlegen: er geht vom nächsten *Kontrollpunkt* — dem Zustand des Tokenizers,
alle 500 Zeilen im Vorbeigehen gespeichert — bis zum Ende des Fensters.
Scrollen kostet, was gezeigt wird; der erste Sprung ans Ende eines 100-MB-Logs
dauert etwa eine halbe Sekunde, jedes spätere Fenster in der Nähe wenige
Millisekunden. Die Zeilen sind dieselben, die `highlightLines` für den ganzen
Text liefert (ein 300 Zeilen weiter oben geöffneter Kommentar bleibt einer).
`html(from, to, maxLength)` schneidet eine lange Zeile — minifizierten Code —
nach `maxLength` Zeichen ab; `tokens(from, to)` liefert die Tokens; `line(i)`
den Text.

## Logs

```ts
import { logEntries, logLevelOf } from '@dskripchenko/syntax'

logEntries(text)
// [{ start: 1, end: 1, level: 'info' }, { start: 2, end: 9, level: 'error' }, …]
```

`logEntries` liest ein Log als Einträge: Beginnt das Log mit einem Zeitstempel
(oder tragen die meisten Zeilen einen), ist ein Eintrag eine Zeile mit
Zeitstempel und die Zeilen bis zur nächsten — ein Stacktrace, ein
ausgegebenes Objekt, ein mehrzeiliger SQL-Fehler bleiben bei der Zeile, die
sie gemeldet hat; sonst ist jede Zeile ein Eintrag, außer denen, die sie
fortsetzen (eingerückt, `at …`, `Caused by`, `#0 …`).

Die Stufe — `error`, `warning`, `info` oder `debug` (oder `null`) — nimmt
`logLevelOf` aus der ersten Zeile des Eintrags: ein Stufenwort in
Großbuchstaben (`ERROR`, `local.WARNING:`, `FAIL`), ein Feld (`level=warn`,
`"level":"error"`), eine eingeklammerte (`[crit]`) oder der Status eines
Zugriffslogs (5xx ein Fehler, 4xx eine Warnung). Das erste davon zählt:
`INFO retrying after an ERROR` ist info.

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

# Начало работы

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
| `highlight(code, language)` | Текст как HTML: `<span class="sx-{type}">` на токен, обычный текст без обёртки, всё экранировано. Неизвестный язык — просто экранированный текст. |
| `highlightLines(code, language)` | То же построчно (без переводов строк). Токен на несколько строк разрезается по концам строк, так что каждая строка — законченная разметка: для номеров строк или чтобы рисовать только видимые строки. |
| `tokenize(code, language)` | Токены `{ type, text }[]`; их тексты подряд дают исходный текст. |
| `tokenizeLines(code, language)` | Токены построчно — для программы, которая рисует сама. |
| `languageOf(fileName, firstLine?)` | Язык файла: по полному имени (`Dockerfile`, `.env.local`), по самому длинному расширению (`.d.ts`), иначе по интерпретатору из первой строки `#!`. `null`, если ничего не подсказывает. |
| `languages()` | Все языки: `{ id, name, aliases, extensions, filenames }`. |
| `isSupported(language)`, `resolveLanguage(language)` | Известен ли id или псевдоним; какой id за ним (`yml` → `yaml`). |
| `THEME_CSS`, `TOKEN_TYPES` | Таблица стилей (переменные и класс на тип токена) и сами типы. |
| `register(grammar)` | Добавляет язык или заменяет существующий (см. ниже). |

## Типы токенов

`keyword`, `string`, `number`, `comment`, `function`, `type`, `variable`,
`constant`, `operator`, `punctuation`, `property` (ключ в JSON, YAML, TOML,
свойство CSS), `tag` и `attribute` (разметка), `regex`, `meta` (декораторы,
аннотации, препроцессор, директивы), `escape`, `heading`, `emphasis`,
`strong`, `link` (Markdown), `inserted` и `deleted` (diff), `date` и уровни
логов `error`, `warning`, `info`, `debug`. У обычного текста обёртки нет.

## Оформление

`THEME_CSS` задаёт по переменной на тип — `--sx-keyword`, `--sx-string`, … —
светлые по умолчанию; тёмные при `[data-theme="dark"]` у любого предка и при
тёмной системе, если страница тему не задала. Переоформить — несколько
объявлений:

```css
.my-code { --sx-keyword: #c678dd; --sx-string: #98c379; }
```

## Языки

| Id | Название | Псевдонимы | Файлы |
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

## Проверка

```ts
import { validate } from '@dskripchenko/syntax'

validate('{\n  "a": 1,\n}', 'json')
// [{ line: 3, column: 1, message: 'expected a string key', severity: 'error' }]
```

`validate(text, language)` говорит, где файл данных не соответствует своему
формату, — строка, колонка, сообщение — в порядке обнаружения, не больше 50.
**Ошибки** нарушают формат; **предупреждения** формат допускает, но почти
всегда это промах.

| Язык | Что проверяется |
|---|---|
| `json` | строгий JSON (RFC 8259); повтор ключа — предупреждение |
| `jsonc` | то же с комментариями и висячими запятыми (tsconfig.json, настройки VS Code, файлы JSON5); позиции остаются позициями текста |
| `jsonl` | каждая непустая строка — одно значение JSON |
| `yaml` | YAML 1.2 по документам (`---`); директивы, якоря, теги, блочные скаляры. Конструкции, которые он не читает (сложные ключи, коллекции в роли ключа), тихо завершают проверку, а не считаются ошибкой |
| `xml` | правильность: один корень, теги закрыты по порядку, атрибуты по одному разу и в кавычках, сущности (и объявленные в DTD), комментарии, объявление первым. Не проверка по DTD или схеме |
| `toml` | строки, числа, даты, массивы, встроенные таблицы; ключи и таблицы определены по одному разу |
| `csv`, `tsv` | кавычки закрыты; в каждой строке столько полей, сколько в первой (предупреждение); разделитель — по первой строке; строки с `#` — комментарии |
| `ini` | секции закрыты; строки ключей; повтор ключа в секции (предупреждение; `key[]` собирает значения) |
| `dotenv` | строки `KEY=value`; кавычки закрыты; повтор ключа |

`canValidate(language)` — проверяется ли язык; для остальных `validate`
ничего не возвращает. Молчание — не доказательство правильности.

## Сворачивание

`foldRanges(text, language)` даёт то, что читатель может свернуть: диапазоны
строк `{ start, end }`, с единицы. Первая строка остаётся видна (она называет
диапазон: открывающая скобка, тег, ключ, заголовок); строки после неё до `end`
сворачиваются — строка закрывающей скобки или тега остаётся, так что
`} else {` не прячется.

- **Скобки** `{ [ (` для кода и JSON — по токенам, так что скобка в строке или
  комментарии ничего не сворачивает; многострочные комментарии тоже
  сворачиваются.
- **Теги** для XML и HTML (пустые элементы HTML вроде `<br>` ничего не
  открывают).
- **Отступы** для YAML и Python.
- **Заголовки** для Markdown: раздел до следующего заголовка того же уровня
  или выше; блок кода отдельно.

## Свой язык

Грамматика — состояния из правил, которые пробуются по порядку в каждой
позиции; шаблон правила сопоставляется ровно в этом месте (он становится
«липким»). Правило может войти в состояние (`push`), выйти из него (`pop`),
заменить его (`next`), разбить совпадение на группы с типами (`groups`),
посмотреть на предыдущий токен (`when`) или отдать текст другой грамматике
(`embed`).

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

Два правила держат грамматику линейной: слово, которое не взяло правило с
условием (`name(?=:)`), должно целиком взять следующее правило, а не
перечитывать его со следующей буквы; правило, совпавшее с пустой строкой,
обязано сменить состояние.

## Чего он не делает

Он читает форму кода, а не смысл: синтаксические ошибки не сообщает, и
некоторые конструкции — приближения: JSX читается как JavaScript,
интерполяция в строках разбирается как код только в JavaScript, TypeScript и
f-строках Python, а начинает ли `/` регулярное выражение, решается по
предыдущему токену.

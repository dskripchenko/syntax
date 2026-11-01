# 快速开始

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
| `highlight(code, language)` | 将文本转为 HTML：每个 token 一个 `<span class="sx-{type}">`，普通文本不包裹，全部转义。未知语言得到转义后的文本。 |
| `highlightLines(code, language)` | 同上，按行返回（不含换行符）。跨行的 token 在每行末尾切开，每一行都是完整的标记——用于行号，或只绘制可见行。 |
| `tokenize(code, language)` | token 列表 `{ type, text }[]`；把它们的文本连起来就是原输入。 |
| `tokenizeLines(code, language)` | 按行分组的 token，供自行绘制的宿主使用。 |
| `languageOf(fileName, firstLine?)` | 文件的语言：按完整文件名（`Dockerfile`、`.env.local`）、最长扩展名（`.d.ts`），否则按首行 `#!` 中的解释器。无法判断时为 `null`。 |
| `languages()` | 所有语言：`{ id, name, aliases, extensions, filenames }`。 |
| `isSupported(language)`、`resolveLanguage(language)` | id 或别名是否已知；对应的 id（`yml` → `yaml`）。 |
| `THEME_CSS`、`TOKEN_TYPES` | 样式表（每种 token 类型一个 CSS 变量和类）以及类型列表。 |
| `register(grammar)` | 添加或替换一种语言（见下文）。 |

## Token 类型

`keyword`、`string`、`number`、`comment`、`function`、`type`、`variable`、`constant`、`operator`、`punctuation`、
`property`（JSON、YAML、TOML 中的键，CSS 属性）、`tag` 和 `attribute`（标记）、`regex`、`meta`（装饰器、注解、预处理器、指令）、
`escape`、`heading`、`emphasis`、`strong`、`link`（Markdown）、`inserted` 和 `deleted`（diff）、`date`，以及日志级别
`error`、`warning`、`info`、`debug`。普通文本不包裹。

## 主题

`THEME_CSS` 为每种类型设置一个 CSS 变量——`--sx-keyword`、`--sx-string`……——默认浅色；任一祖先有
`[data-theme="dark"]` 时，或页面未设主题而系统为深色时使用深色。只需几条声明即可改样式：

```css
.my-code { --sx-keyword: #c678dd; --sx-string: #98c379; }
```

## 语言

| Id | 名称 | 别名 | 文件 |
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

## 校验

```ts
import { validate } from '@dskripchenko/syntax'

validate('{\n  "a": 1,\n}', 'json')
// [{ line: 3, column: 1, message: 'expected a string key', severity: 'error' }]
```

`validate(text, language)` 指出数据文件中不符合其格式之处——行、列、消息——按发现顺序，最多 50 条。
**错误**破坏格式；**警告**为格式所允许，但几乎总是失误。

| 语言 | 检查内容 |
|---|---|
| `json` | 严格 JSON（RFC 8259）；重复的键为警告 |
| `jsonc` | 同上，但允许注释和尾随逗号（tsconfig.json、VS Code 设置、JSON5 文件）；位置仍为原文本中的位置 |
| `jsonl` | 每个非空行是一个 JSON 值 |
| `yaml` | YAML 1.2，逐个文档（`---`）检查；指令、锚点、标签、块标量。它不读取的结构——复杂键、作为键的集合——会静默结束检查，而不是报告为错误 |
| `xml` | 格式良好性：单一根元素、标签按顺序闭合、属性各出现一次且带引号、实体（包括 DTD 声明的）、注释、声明位于开头。不做 DTD 或 schema 校验 |
| `toml` | 字符串、数字、日期、数组、内联表；键和表各只定义一次 |
| `csv`、`tsv` | 引号闭合；每行字段数与首行相同（警告）；分隔符由首行判断；以 `#` 开头的行视为注释 |
| `ini` | 节闭合；键行；节内重复的键（警告；`key[]` 用于收集多个值） |
| `dotenv` | `KEY=value` 行；引号闭合；重复的键 |

`canValidate(language)` 表示该语言是否会被检查；其他语言 `validate` 不返回任何内容。没有报告并不证明文件有效。

## 折叠

`foldRanges(text, language)` 给出读者可以折叠的部分：行范围 `{ start, end }`，从 1 开始。首行保持可见
（它命名这个范围：左括号、标签、键、标题）；其后直到 `end` 的行被折叠——右括号或闭合标签所在的行保留，
因此 `} else {` 永远不会被隐藏。

- 代码和 JSON 按**括号** `{ [ (` 折叠——从 token 中读取，因此字符串或注释中的括号不会折叠任何内容；多行注释也可折叠。
- XML 和 HTML 按**标签**折叠（HTML 的空元素如 `<br>` 不开启任何范围）。
- YAML 和 Python 按**缩进**折叠。
- Markdown 按**标题**折叠：一节直到同级或更高级别的下一个标题；代码块单独折叠。

## 添加自己的语言

语法由若干状态组成，每个状态是一组规则，在每个位置按顺序尝试；规则的模式就在该位置匹配（变为 sticky）。
规则可以进入状态（`push`）、离开状态（`pop`）、替换状态（`next`）、把匹配拆成带类型的捕获组（`groups`）、
查看前一个 token（`when`），或把文本交给另一种语法（`embed`）。

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

两条规则保证语法是线性的：带条件的规则（`name(?=:)`）没有取走的词，必须由后面的规则整个取走，而不是从下一个字母重新读；
匹配空串的规则必须改变状态。

## 它不做什么

它读取代码的形态而非含义：不报告语法错误，有些结构是近似处理——JSX 按 JavaScript 读取，
字符串插值只在 JavaScript、TypeScript 和 Python f-string 中按代码解析，`/` 是否开始正则表达式由前一个 token 决定。

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

# @dskripchenko/syntax

## 0.3.4

### Patch Changes

- 2852589: Markdown: internal links as note-taking apps write them — `[[note#heading|text]]`, `![[picture.png]]` — in parts: the brackets, the note (a link), the heading, the text.

## 0.3.3

### Patch Changes

- 292b779: Markdown read more fully: links and images in parts (brackets, the text, the address, the title) and nested — a badge, an image in a link, whole; references `[text][ref]` and their definitions, footnotes `[^1]`, bare and angle-bracket addresses; the quoted text in a colour of its own; a heading's marker apart from its text; strike-through; tables' bars and rule rows; task boxes; inline HTML as HTML; YAML front matter. A line starting with inline code in backticks (` ```x `) is no longer taken for a fence; an underscore inside a word is not emphasis.

## 0.3.2

### Patch Changes

- 38e6395: CSS: the minus in `calc(100% - 2px)` is an operator, not a value word. HTTP: a header's value starts after the space following the colon.

## 0.3.1

### Patch Changes

- f69790b: PHP: a fragment without `<?` (a snippet in documentation, `$x = strlen($s);`) is highlighted as code rather than as a page of HTML. Aliases `pgsql` (SQL) and `markup` (HTML).

## 0.3.0

### Minor Changes

- f6b11af: `LineHighlighter`: a window of lines of a big file highlighted without tokenizing it all — from checkpoints kept every 500 lines; the same lines as `highlightLines`, a long line cut at `maxLength`. `logEntries(text)` and `logLevelOf(line)`: a log as entries (a timestamped line and its stack trace) with their level — level words, `level=` fields, `[crit]`, an access log's status. `escapeHtml` exported. Checked on real logs up to 100 MB.

## 0.2.0

### Minor Changes

- 389e0a0: `validate(text, language)`: where a data file breaks its format, with line, column and message — JSON (strict; `jsonc` with comments and trailing commas: tsconfig.json and the like; `jsonl`), YAML (document by document), XML (well-formedness), TOML, CSV/TSV, INI, `.env`; errors and warnings. `foldRanges(text, language)`: what can be folded — brackets (from the tokens), tags, indentation, Markdown headings. New languages `jsonc` and `jsonl` (were aliases of `json`). Checked against the samples and a corpus of 1527 real data files.

## 0.1.0

### Minor Changes

- a7239c2: First release: syntax highlighting with no runtime dependencies for 17 programming languages and 17 formats, `highlight` / `highlightLines` / `tokenize` / `tokenizeLines`, `languageOf` by file name, extension or `#!` line, a light and dark theme of CSS custom properties, `register` for languages of your own. The text always comes back exactly and the work is linear in its length.

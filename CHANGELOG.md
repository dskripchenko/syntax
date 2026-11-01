# @dskripchenko/syntax

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

# @dskripchenko/syntax

## 0.2.0

### Minor Changes

- 389e0a0: `validate(text, language)`: where a data file breaks its format, with line, column and message — JSON (strict; `jsonc` with comments and trailing commas: tsconfig.json and the like; `jsonl`), YAML (document by document), XML (well-formedness), TOML, CSV/TSV, INI, `.env`; errors and warnings. `foldRanges(text, language)`: what can be folded — brackets (from the tokens), tags, indentation, Markdown headings. New languages `jsonc` and `jsonl` (were aliases of `json`). Checked against the samples and a corpus of 1527 real data files.

## 0.1.0

### Minor Changes

- a7239c2: First release: syntax highlighting with no runtime dependencies for 17 programming languages and 17 formats, `highlight` / `highlightLines` / `tokenize` / `tokenizeLines`, `languageOf` by file name, extension or `#!` line, a light and dark theme of CSS custom properties, `register` for languages of your own. The text always comes back exactly and the work is linear in its length.

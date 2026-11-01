---
'@dskripchenko/syntax': minor
---

`validate(text, language)`: where a data file breaks its format, with line, column and message — JSON (strict; `jsonc` with comments and trailing commas: tsconfig.json and the like; `jsonl`), YAML (document by document), XML (well-formedness), TOML, CSV/TSV, INI, `.env`; errors and warnings. `foldRanges(text, language)`: what can be folded — brackets (from the tokens), tags, indentation, Markdown headings. New languages `jsonc` and `jsonl` (were aliases of `json`). Checked against the samples and a corpus of 1527 real data files.

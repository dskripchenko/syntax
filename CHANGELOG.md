# @dskripchenko/syntax

## 0.6.0

### Minor Changes

- a6896a9: `symbols(code, language)`: the functions, classes, methods, types and constants of code in 19 languages, a document's headings, a config's keys and sections, CSS selectors, Makefile targets and Dockerfile stages — each with the lines it spans, nested as written. Declarations in comments and strings are never symbols. `symbolPath(tree, line)` gives the symbols holding a line (a breadcrumb), `flattenSymbols(tree)` every symbol with its container.

## 0.5.0

### Minor Changes

- 119c2f2: `IncrementalHighlighter`: highlighting for text being edited. The tokenizer's state is kept at the start of every line; after an edit the text is tokenized again from a little before it until a line whose state is what it was, so a keystroke costs a few lines however long the file. The text is read line by line through a `TextSource`; lines far ahead or inside a token whose end is far off get a guess at once (`settled`), and `work` settles them in idle time. The tokens are always those of the whole text tokenized at once.

  Constructs over several lines now read the same in a part of a text as in the whole of it:

  - An unclosed heredoc (PHP, Ruby, shell), raw string (Rust, C++), long bracket (Lua), here-string (PowerShell), `%w(` literal (Ruby), `<!DOCTYPE` (XML) or quoted identifier (SQL) runs to the end of the text, as an unclosed block comment already did.
  - Markdown's emphasis, strong text, `$$` math and inline HTML tags stay within a paragraph: they no longer cross a blank line.
  - PHP: a text that does not start with markup is code (a snippet without `<?php`), wherever a `<?` may come later; a `#!` line before `<?php` is meta.
  - A Ruby `:"symbol"` and a PowerShell `${variable}` end at the line's end.
  - Grammars may name a line that changes how the text reads from its start (`restartAtTop`; Markdown's front matter `---`).

## 0.4.1

### Patch Changes

- 7a7a61e: Markdown: `#tags` (a letter in them, at the start of a word — not `C#`, `#123` or a heading) highlighted as `type`.

## 0.4.0

### Minor Changes

- 1e38932: A LaTeX grammar (`latex`, also `tex`, `math`, `katex`; `.tex`, `.sty`, `.cls`): commands, environments, comments, math shifts. Markdown highlights TeX math in it — `$…$` as Pandoc reads it (prices stay text), `$$…$$`, a ```math block — and `==highlighted==` text.

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

---
'@dskripchenko/syntax': minor
---

`IncrementalHighlighter`: highlighting for text being edited. The tokenizer's state is kept at the start of every line; after an edit the text is tokenized again from a little before it until a line whose state is what it was, so a keystroke costs a few lines however long the file. The text is read line by line through a `TextSource`; lines far ahead or inside a token whose end is far off get a guess at once (`settled`), and `work` settles them in idle time. The tokens are always those of the whole text tokenized at once.

Constructs over several lines now read the same in a part of a text as in the whole of it:

- An unclosed heredoc (PHP, Ruby, shell), raw string (Rust, C++), long bracket (Lua), here-string (PowerShell), `%w(` literal (Ruby), `<!DOCTYPE` (XML) or quoted identifier (SQL) runs to the end of the text, as an unclosed block comment already did.
- Markdown's emphasis, strong text, `$$` math and inline HTML tags stay within a paragraph: they no longer cross a blank line.
- PHP: a text that does not start with markup is code (a snippet without `<?php`), wherever a `<?` may come later; a `#!` line before `<?php` is meta.
- A Ruby `:"symbol"` and a PowerShell `${variable}` end at the line's end.
- Grammars may name a line that changes how the text reads from its start (`restartAtTop`; Markdown's front matter `---`).

---
'@dskripchenko/syntax': minor
---

`LineHighlighter`: a window of lines of a big file highlighted without tokenizing it all — from checkpoints kept every 500 lines; the same lines as `highlightLines`, a long line cut at `maxLength`. `logEntries(text)` and `logLevelOf(line)`: a log as entries (a timestamped line and its stack trace) with their level — level words, `level=` fields, `[crit]`, an access log's status. `escapeHtml` exported. Checked on real logs up to 100 MB.

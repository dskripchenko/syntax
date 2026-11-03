---
'@dskripchenko/syntax': minor
---

`symbols(code, language)`: the functions, classes, methods, types and constants of code in 19 languages, a document's headings, a config's keys and sections, CSS selectors, Makefile targets and Dockerfile stages — each with the lines it spans, nested as written. Declarations in comments and strings are never symbols. `symbolPath(tree, line)` gives the symbols holding a line (a breadcrumb), `flattenSymbols(tree)` every symbol with its container.

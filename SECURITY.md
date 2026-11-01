# Security

`@dskripchenko/syntax` turns text that may come from anyone — a file opened
from disk, a code block in a comment — into HTML. Its job is that this text
can never become active content in the page that shows it.

## What it guarantees

- **Escaped output.** `highlight()` and `highlightLines()` escape `&`, `<`,
  `>` and `"` in every piece of the text; the only markup in the output is the
  package's own `<span class="sx-…">`.
- **No code execution.** Nothing from the text is evaluated.
- **Bounded work.** Tokenizing is linear in the length of the text: a position
  no rule matches is taken as one character, a rule that matches nothing must
  change the state and cannot repeat it in place, and embedded grammars nest at
  most four deep. The tests feed every language pathological input (thousands
  of quotes, slashes, open brackets) and check that it finishes fast.

## Reporting a vulnerability

Please report it privately through
[GitHub security advisories](https://github.com/dskripchenko/syntax/security/advisories/new)
rather than a public issue. Include the text and the language that reproduce
it.

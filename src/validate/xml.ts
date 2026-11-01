/**
 * Whether XML is well-formed: one root element, every tag closed in order,
 * attributes written once each and quoted, entities and references well
 * written, comments without `--`, nothing but comments and processing
 * instructions around the root. It does not read a DTD or a schema.
 */
import type { Diagnostic } from './index'

const NAME = /[A-Za-z_:À-￿][\w.:\-·À-￿]*/y
const XML_ENTITIES = new Set(['amp', 'lt', 'gt', 'quot', 'apos'])

export function validateXml(text: string): Diagnostic[] {
  const out: Diagnostic[] = []
  // Line starts, to turn an offset into a line and column.
  const starts = [0]
  for (let i = 0; i < text.length; i++) if (text.charCodeAt(i) === 10) starts.push(i + 1)
  const at = (offset: number): { line: number; column: number } => {
    let lo = 0
    let hi = starts.length - 1
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1
      if (starts[mid]! <= offset) lo = mid
      else hi = mid - 1
    }
    return { line: lo + 1, column: offset - starts[lo]! + 1 }
  }
  const report = (offset: number, message: string, severity: Diagnostic['severity'] = 'error') => {
    if (out.length < 50) out.push({ ...at(offset), message, severity })
  }

  // A DTD may declare entities of its own: then any well-written one is fine.
  const declaresEntities = /<!ENTITY\s/.test(text)
  const stack: { name: string; offset: number }[] = []
  let roots = 0
  let i = 0
  const checkText = (from: number, to: number) => {
    const chunk = text.slice(from, to)
    if (stack.length === 0 && chunk.trim() !== '') report(from + chunk.search(/\S/), roots === 0 ? 'text before the root element' : 'text after the root element')
    for (let k = chunk.indexOf('&'); k >= 0; k = chunk.indexOf('&', k + 1)) {
      const ref = /^&(?:#\d+|#x[\da-fA-F]+|([A-Za-z_][\w.-]*));/.exec(chunk.slice(k, k + 40))
      if (!ref) report(from + k, "a bare '&': write &amp;")
      else if (ref[1] && !XML_ENTITIES.has(ref[1]) && !declaresEntities) report(from + k, `unknown entity &${ref[1]};`)
    }
    const lt = chunk.indexOf('<')
    if (lt >= 0) report(from + lt, "a bare '<': write &lt;")
  }

  while (i < text.length) {
    const lt = text.indexOf('<', i)
    if (lt < 0) {
      checkText(i, text.length)
      break
    }
    checkText(i, lt)
    if (text.startsWith('<!--', lt)) {
      const end = text.indexOf('-->', lt + 4)
      if (end < 0) return [...out, { ...at(lt), message: 'unterminated comment', severity: 'error' }]
      const dash = text.slice(lt + 4, end).indexOf('--')
      if (dash >= 0) report(lt + 4 + dash, "'--' inside a comment")
      i = end + 3
    } else if (text.startsWith('<![CDATA[', lt)) {
      const end = text.indexOf(']]>', lt)
      if (end < 0) return [...out, { ...at(lt), message: 'unterminated CDATA section', severity: 'error' }]
      if (stack.length === 0) report(lt, 'CDATA outside the root element')
      i = end + 3
    } else if (text.startsWith('<?', lt)) {
      const end = text.indexOf('?>', lt)
      if (end < 0) return [...out, { ...at(lt), message: 'unterminated processing instruction', severity: 'error' }]
      if (text.startsWith('<?xml', lt) && /\s|\?/.test(text[lt + 5] ?? '') && lt !== (text.charCodeAt(0) === 0xfeff ? 1 : 0)) report(lt, 'the XML declaration must come first')
      i = end + 2
    } else if (text.startsWith('<!', lt)) {
      // A DOCTYPE, with an internal subset in brackets.
      let depth = 0
      let k = lt + 2
      for (; k < text.length; k++) {
        const ch = text[k]
        if (ch === '[') depth++
        else if (ch === ']') depth--
        else if (ch === '>' && depth <= 0) break
      }
      if (k >= text.length) return [...out, { ...at(lt), message: 'unterminated declaration', severity: 'error' }]
      if (roots > 0 || stack.length > 0) report(lt, 'a DOCTYPE after the root element has started')
      i = k + 1
    } else if (text[lt + 1] === '/') {
      NAME.lastIndex = lt + 2
      const m = NAME.exec(text)
      const end = text.indexOf('>', lt)
      if (!m || end < 0) return [...out, { ...at(lt), message: 'a closing tag without a name', severity: 'error' }]
      if (text.slice(lt + 2 + m[0].length, end).trim() !== '') report(lt, `junk in the closing tag </${m[0]}>`)
      const open = stack.pop()
      if (!open) report(lt, `</${m[0]}> closes nothing`)
      else if (open.name !== m[0]) {
        report(lt, `</${m[0]}> does not close <${open.name}> (line ${at(open.offset).line})`)
        // Recover: close up to a matching opening if there is one.
        const k = stack.map((s) => s.name).lastIndexOf(m[0])
        if (k >= 0) stack.length = k
        else stack.push(open)
      }
      i = end + 1
    } else {
      NAME.lastIndex = lt + 1
      const m = NAME.exec(text)
      if (!m) {
        report(lt, "a bare '<': write &lt;")
        i = lt + 1
        continue
      }
      if (stack.length === 0) {
        roots++
        if (roots === 2) report(lt, 'a second root element: XML has one')
      }
      // Attributes up to the end of the tag.
      let k = lt + 1 + m[0].length
      const seen = new Set<string>()
      let closed = false
      let selfClosing = false
      while (k < text.length) {
        while (/\s/.test(text[k] ?? '')) k++
        const ch = text[k]
        if (ch === '>') {
          closed = true
          k++
          break
        }
        if (ch === '/' && text[k + 1] === '>') {
          closed = selfClosing = true
          k += 2
          break
        }
        if (ch === '<' || ch === undefined) break
        NAME.lastIndex = k
        const a = NAME.exec(text)
        if (!a) {
          report(k, `unexpected '${ch}' in <${m[0]}>`)
          k++
          continue
        }
        if (seen.has(a[0])) report(k, `attribute '${a[0]}' given twice`)
        seen.add(a[0])
        k += a[0].length
        while (/\s/.test(text[k] ?? '')) k++
        if (text[k] !== '=') {
          report(k, `attribute '${a[0]}' has no value`)
          continue
        }
        k++
        while (/\s/.test(text[k] ?? '')) k++
        const q = text[k]
        if (q !== '"' && q !== "'") {
          report(k, `the value of '${a[0]}' must be quoted`)
          // Up to the end of the value — not into the tag's `/>`.
          while (k < text.length && !/[\s>]/.test(text[k]!) && !text.startsWith('/>', k)) k++
          continue
        }
        const end = text.indexOf(q, k + 1)
        if (end < 0) return [...out, { ...at(k), message: 'unterminated attribute value', severity: 'error' }]
        const value = text.slice(k + 1, end)
        if (value.includes('<')) report(k, `'<' in the value of '${a[0]}'`)
        k = end + 1
      }
      if (!closed) return [...out, { ...at(lt), message: `unterminated tag <${m[0]}>`, severity: 'error' }]
      if (!selfClosing) stack.push({ name: m[0], offset: lt })
      i = k
    }
  }
  for (const open of stack.reverse()) report(open.offset, `<${open.name}> is not closed`)
  if (roots === 0 && text.trim() !== '') report(0, 'no root element')
  return out
}

import type { Token } from './engine'

const ESCAPE: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }

export const escapeHtml = (text: string): string => text.replace(/[&<>"]/g, (c) => ESCAPE[c]!)

/** A token as HTML: plain text bare, any other in a span of its type. */
export const span = (t: Token): string => (t.type === 'plain' ? escapeHtml(t.text) : `<span class="sx-${t.type}">${escapeHtml(t.text)}</span>`)

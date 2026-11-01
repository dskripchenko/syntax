// A router: regexes, divisions, nested templates.
const routes = [/^\/orders\/(\d+)$/, /^\/users\/[^/]+$/g]
const half = total / 2 / count
const html = `<ul>${items.map((i) => `<li class="${i.done ? 'done' : ''}">${i.name}</li>`).join('')}</ul>`
export default function match(path) {
  for (const re of routes) if (re.test(path)) return { ok: true, re }
  return null
}

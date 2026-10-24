// The API calls the website makes from the browser. Mirrors VAULT_ROUTES in
// SERVERF/src/security/vault.js; keep both in sync. Anything else is refused.
const GET: RegExp[] = [
  /^\/matcher\/data(\/(current|live|live-upcoming|enhanced|old|stats|team\/[^/]+))?$/,
  /^\/matcher\/match\/[0-9A-Za-z_-]+(\/events)?$/,
  /^\/matcher\/events$/,
  /^\/matcher\/standings$/,
  /^\/scout\/(overview|status|search|register|team\/[^/]+|match\/[^/]+|lag\/[^/]+|serie\/[^/]+)$/,
  /^\/teams$/,
  /^\/chat\/status$/,
  /^\/instagram\/posts$/,
  /^\/shop\/status$/,
]
const POST: RegExp[] = [/^\/chat$/, /^\/contact$/, /^\/analytics\/collect$/, /^\/sys\/diagnostics\/v1\/visit-6f2a9d3b5c$/, /^\/seal\/open$/, /^\/seal\/props$/]

export function browserRouteAllowed(method: string, path: string): boolean {
  if (path.length > 2048 || !path.startsWith("/") || /[\s\\\x00-\x1f\x7f]/.test(path)) return false
  const pathname = path.split("?")[0]
  if (/%2f|%2e|%5c|\.\.|\/\//i.test(pathname)) return false
  const list = method === "GET" ? GET : method === "POST" ? POST : []
  return list.some((re) => re.test(pathname))
}

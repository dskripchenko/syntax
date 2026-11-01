/**
 * A log as entries: a line that starts one — by a timestamp, when the log
 * writes them — and the lines that continue it (a stack trace, a dumped
 * object), with the entry's level. For filtering a log by level and for
 * counting what it holds.
 */

export type LogLevel = 'error' | 'warning' | 'info' | 'debug'

export const LOG_LEVELS: readonly LogLevel[] = ['error', 'warning', 'info', 'debug']

export interface LogEntry {
  /** 1-based, inclusive: the entry's first line and its last. */
  start: number
  end: number
  level: LogLevel | null
}

const WORDS: Record<string, LogLevel> = {
  fatal: 'error', critical: 'error', crit: 'error', alert: 'error', emerg: 'error', emergency: 'error',
  error: 'error', err: 'error', severe: 'error', panic: 'error', fail: 'error', failed: 'error',
  warning: 'warning', warn: 'warning',
  info: 'info', notice: 'info', information: 'info',
  debug: 'debug', trace: 'debug', verbose: 'debug', fine: 'debug', finer: 'debug', finest: 'debug',
}

// Written in capitals (`ERROR`, `local.ERROR:`), the level is a word of its own.
const UPPER = /\b(FATAL|CRITICAL|CRIT|ALERT|EMERG(?:ENCY)?|ERROR|ERR|SEVERE|PANIC|FAIL(?:ED)?|WARNING|WARN|INFO|NOTICE|DEBUG|TRACE|VERBOSE)\b/
// In lower case only where the form says it is one: `level=warn`, `"level":"error"`, `[error]`, `<info>`.
const MARKED = /\b(?:level|lvl|severity|loglevel)["']?\s*[=:]\s*["']?([A-Za-z]+)|[[<]([a-z]+)[\]>]/i
// An access log's status: `"GET / HTTP/1.1" 502 …`.
const STATUS = /"\s+([1-5])\d\d\s/
// A timestamp at the start of a line, perhaps in brackets: ISO dates, `12/Mar/2026:…`, syslog's `Mar 12 10:00:00`, a time alone.
const STAMP = /^\s{0,2}[[(]?(?:\d{4}[-/.]\d\d[-/.]\d\d[T ]?\d\d:\d\d|\d\d\/[A-Z][a-z]{2}\/\d{4}:\d\d|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) +\d{1,2} \d\d:\d\d|\d\d:\d\d:\d\d|\d{10}(?:\.\d+)?\s|[IWEF]\d{4} \d\d:\d\d)/
// An access log's line: an address first, then the bracketed time.
const ACCESS = /^\S+ \S+ \S+ \[\d\d\/[A-Z][a-z]{2}\/\d{4}:/
// Without timestamps: lines that continue the one before (indented, a trace's frames, a cause).
const CONTINUED = /^(?:\s|at |Caused by|Traceback|\.\.\. \d+ more|#\d+ |\}|\]|Stack trace:|\[stacktrace\])/

/** The level a line names: a capitalised level word, a `level=` field, a bracketed `[warn]`, an access log's status. Null when none. */
export function logLevelOf(line: string): LogLevel | null {
  const upper = UPPER.exec(line)
  const marked = MARKED.exec(line)
  // The earlier of the two: the level stands near the start; a later word is the message's.
  const markedWord = marked && WORDS[(marked[1] ?? marked[2])!.toLowerCase()] ? marked : null
  const pick = upper && markedWord ? (upper.index <= markedWord.index ? upper[1]! : (markedWord[1] ?? markedWord[2])!) : upper ? upper[1]! : markedWord ? (markedWord[1] ?? markedWord[2])! : null
  if (pick) return WORDS[pick.toLowerCase()] ?? null
  const status = STATUS.exec(line)
  if (status) return status[1] === '5' ? 'error' : status[1] === '4' ? 'warning' : 'info'
  return null
}

/**
 * The entries of a log. When most lines start with a timestamp, an entry is
 * such a line and every line up to the next; otherwise every line is one,
 * except the lines that continue it (indented, `at …`, `Caused by`).
 */
export function logEntries(text: string): LogEntry[] {
  const lines = text.replace(/\r?\n$/, '').split(/\r?\n/)
  let stamped = 0
  let filled = 0
  let firstStamped: boolean | null = null
  for (const l of lines) {
    if (l.trim() === '') continue
    filled++
    const stamp = STAMP.test(l) || ACCESS.test(l)
    if (stamp) stamped++
    firstStamped ??= stamp
  }
  // A log that starts with a timestamp writes them (its entries may be long traces); or most lines carry one.
  const byStamp = stamped > 0 && (firstStamped === true || stamped >= filled * 0.3)
  const out: LogEntry[] = []
  lines.forEach((l, i) => {
    const last = out[out.length - 1]
    const starts = byStamp ? STAMP.test(l) || ACCESS.test(l) : !CONTINUED.test(l) && l.trim() !== ''
    if (last && !starts) {
      last.end = i + 1
      return
    }
    out.push({ start: i + 1, end: i + 1, level: logLevelOf(l) })
  })
  return out
}

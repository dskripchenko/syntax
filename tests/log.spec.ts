import { describe, expect, it } from 'vitest'
import { logEntries, logLevelOf } from '../src'

describe('log levels and entries', () => {
  it('levels as logs write them', () => {
    expect(logLevelOf('2026-11-01 10:00:00 ERROR db down')).toBe('error')
    expect(logLevelOf('[2026-11-01 10:00:00] local.WARNING: slow query')).toBe('warning')
    expect(logLevelOf('time=2026-11-01T10:00:00Z level=info msg="started"')).toBe('info')
    expect(logLevelOf('{"ts":1,"level":"debug","msg":"x"}')).toBe('debug')
    expect(logLevelOf('2026/11/01 10:00:00 [crit] 12#0: worker died')).toBe('error')
    expect(logLevelOf('10.0.0.1 - - [01/Nov/2026:10:00:00 +0000] "GET / HTTP/1.1" 502 157')).toBe('error')
    expect(logLevelOf('10.0.0.1 - - [01/Nov/2026:10:00:00 +0000] "GET /x HTTP/1.1" 404 0')).toBe('warning')
    expect(logLevelOf('SEVERE: Servlet failed')).toBe('error')
    expect(logLevelOf(' 2026-10-27 09:55:10 App\\Jobs\\Sync .. 3s FAIL')).toBe('error')
    // The level, not a word of the message after it.
    expect(logLevelOf('10:00:00 INFO retrying after an ERROR upstream')).toBe('info')
    expect(logLevelOf('just a line about errors')).toBeNull()
  })

  it('timestamped: a stack trace belongs to its entry', () => {
    const log = [
      '2026-11-01 10:00:00 INFO started',
      '2026-11-01 10:00:01 ERROR failed',
      'java.lang.IllegalStateException: boom',
      '    at a.B.c(B.java:10)',
      '',
      '2026-11-01 10:00:02 WARN slow',
    ].join('\n')
    expect(logEntries(log)).toEqual([
      { start: 1, end: 1, level: 'info' },
      { start: 2, end: 5, level: 'error' },
      { start: 6, end: 6, level: 'warning' },
    ])
  })

  it('a Laravel log: the trace after [stacktrace] is the entry', () => {
    const log = '[2026-11-01 10:00:00] local.ERROR: boom {"exception":"x"}\n[stacktrace]\n#0 /app/x.php(10): f()\n#1 {main}\n"}\n[2026-11-01 10:00:05] local.INFO: ok\n'
    expect(logEntries(log)).toEqual([
      { start: 1, end: 5, level: 'error' },
      { start: 6, end: 6, level: 'info' },
    ])
  })

  it('without timestamps: indented and `Caused by` lines continue', () => {
    const log = 'ERROR boom\nTraceback (most recent call last):\n  File "a.py", line 1\nINFO next\nCaused by: x\n'
    expect(logEntries(log)).toEqual([
      { start: 1, end: 3, level: 'error' },
      { start: 4, end: 5, level: 'info' },
    ])
  })
})

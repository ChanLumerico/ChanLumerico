/** Network primitives: per-request deadlines, retry, and racing. */

export class TimeoutError extends Error {
  constructor(ms: number) {
    super(`timed out after ${ms}ms`)
    this.name = 'TimeoutError'
  }
}

/** `fetch` with its own AbortController deadline. */
export const fetchWithTimeout = async (
  url: string,
  ms: number,
  init: RequestInit = {}
): Promise<Response> => {
  const ctrl = typeof AbortController === 'function' ? new AbortController() : null
  const timer = ctrl ? setTimeout(() => ctrl.abort(new TimeoutError(ms)), ms) : null
  try {
    return await fetch(url, { ...init, signal: ctrl?.signal })
  } finally {
    if (timer) clearTimeout(timer)
  }
}

export const sleep = (ms: number): Promise<void> =>
  new Promise(resolve => setTimeout(resolve, ms))

/** Run `task`, retrying up to `tries` more times with a fixed gap. */
export const retry = async <T>(
  task: () => Promise<T>,
  tries: number,
  gapMs: number
): Promise<T> => {
  let lastError: unknown
  for (let attempt = 0; attempt <= tries; attempt++) {
    try {
      return await task()
    } catch (err) {
      lastError = err
      if (attempt < tries) await sleep(gapMs)
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError))
}

/**
 * First usable result wins.
 *
 * `Promise.any` is close but not equivalent: a task that resolves with a
 * value the caller cannot use (an empty feed, a chrome dump) has to count as
 * a failure, and the aggregate error has to survive so the caller can tell
 * "all sources failed" from "no sources given". Every loser is left to settle
 * on its own; nothing here depends on cancelling them.
 */
export const race = async <T>(tasks: readonly (() => Promise<T>)[]): Promise<T> => {
  if (tasks.length === 0) throw new Error('no sources')
  return new Promise<T>((resolve, reject) => {
    let pending = tasks.length
    let settled = false
    const errors: unknown[] = []
    tasks.forEach((task, i) => {
      task().then(
        value => {
          if (settled) return
          settled = true
          resolve(value)
        },
        err => {
          errors[i] = err
          pending--
          if (!settled && pending === 0) {
            reject(new AggregateError(errors, 'every source failed'))
          }
        }
      )
    })
  })
}

interface Job {
  run: () => void
  prio: number
}

/**
 * A small priority pool. `size` tasks run at once, lowest `prio` first, so
 * whatever the user just opened jumps the queue without starving the
 * background work behind it.
 */
export class Pool {
  private running = 0
  private waiting: Job[] = []

  constructor(private readonly size: number) {}

  submit<T>(task: () => Promise<T>, prio = 0): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.waiting.push({
        prio,
        run: () => {
          task().then(resolve, reject).finally(() => {
            this.running--
            this.pump()
          })
        },
      })
      this.waiting.sort((a, b) => a.prio - b.prio)
      this.pump()
    })
  }

  private pump(): void {
    while (this.running < this.size && this.waiting.length > 0) {
      const job = this.waiting.shift()
      if (!job) return
      this.running++
      job.run()
    }
  }
}

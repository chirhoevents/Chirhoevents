/**
 * react-pdf uses a single shared React reconciler. Calling renderToBuffer
 * concurrently (from two simultaneous requests) causes React error #31.
 * This module serialises all renderToBuffer calls server-wide within one
 * Node.js process so only one PDF renders at a time.
 */

let tail: Promise<unknown> = Promise.resolve()

export function withRenderLock<T>(fn: () => Promise<T>): Promise<T> {
  const result = tail.then(() => fn())
  // Keep the chain alive even if fn rejects, so the next caller can proceed
  tail = result.catch(() => {})
  return result
}

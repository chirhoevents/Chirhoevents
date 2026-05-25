/**
 * react-pdf uses a shared React reconciler. Calling renderToBuffer
 * concurrently causes React error #31 because the reconciler has global state.
 * This module serialises all renderToBuffer calls server-wide within one
 * Node.js process so only one PDF renders at a time.
 *
 * Uses globalThis so there is exactly ONE lock across ALL webpack chunks,
 * even if this module is loaded multiple times (once per route bundle).
 */

const g = globalThis as typeof globalThis & { __pdfRenderTail?: Promise<unknown> }

export function withRenderLock<T>(fn: () => Promise<T>): Promise<T> {
  if (!g.__pdfRenderTail) {
    g.__pdfRenderTail = Promise.resolve()
  }
  const result = (g.__pdfRenderTail as Promise<unknown>).then(() => fn())
  // Keep the chain alive even if fn rejects so the next caller can proceed
  g.__pdfRenderTail = result.catch(() => {})
  return result
}

/**
 * The admin layer is gated so visitors never see the gear — and, because
 * `AdminLayer` is only imported behind this check, never download it either.
 *
 * `?admin=1` works in the query string (`/?admin=1#/research`) and after the
 * hash (`/#/research?admin=1`), and it is always on in a dev build.
 */
export const adminEnabled = (): boolean => {
  if (import.meta.env.DEV) return true
  try {
    if (new URLSearchParams(window.location.search).get('admin') === '1') return true
    const hash = window.location.hash
    const q = hash.indexOf('?')
    if (q >= 0 && new URLSearchParams(hash.slice(q + 1)).get('admin') === '1') return true
  } catch {
    return false
  }
  return false
}

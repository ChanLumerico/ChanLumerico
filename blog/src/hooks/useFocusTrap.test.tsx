import { useRef, useState } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useFocusTrap } from './useFocusTrap'

/**
 * Harness: an opener that unmounts as the modal opens, exactly as the admin
 * panel does when it hands off to the source editor.
 */
function Harness({ dropOpener }: { dropOpener: boolean }) {
  const [open, setOpen] = useState(false)
  const fallbackRef = useRef<HTMLButtonElement | null>(null)
  const trapRef = useFocusTrap<HTMLDivElement>(
    open,
    () => setOpen(false),
    () => fallbackRef.current
  )

  return (
    <>
      <button ref={fallbackRef} type="button">
        gear
      </button>
      {open && dropOpener ? null : (
        <button type="button" onClick={() => setOpen(true)}>
          open
        </button>
      )}
      {open ? (
        <div ref={trapRef} role="dialog" aria-modal="true" aria-label="Modal" tabIndex={-1}>
          <button type="button">first</button>
          <button type="button">last</button>
        </div>
      ) : null}
    </>
  )
}

describe('useFocusTrap', () => {
  it('moves focus into the modal on open', () => {
    render(<Harness dropOpener={false} />)
    fireEvent.click(screen.getByRole('button', { name: 'open' }))
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'first' }))
  })

  it('closes on Escape', () => {
    render(<Harness dropOpener={false} />)
    fireEvent.click(screen.getByRole('button', { name: 'open' }))
    expect(screen.getByRole('dialog')).toBeTruthy()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('cycles Tab forward from the last item to the first', () => {
    render(<Harness dropOpener={false} />)
    fireEvent.click(screen.getByRole('button', { name: 'open' }))
    const last = screen.getByRole('button', { name: 'last' })
    last.focus()
    fireEvent.keyDown(document, { key: 'Tab' })
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'first' }))
  })

  it('cycles Shift+Tab backward from the first item to the last', () => {
    render(<Harness dropOpener={false} />)
    fireEvent.click(screen.getByRole('button', { name: 'open' }))
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true })
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'last' }))
  })

  it('returns focus to the opener when it is still there', () => {
    render(<Harness dropOpener={false} />)
    const opener = screen.getByRole('button', { name: 'open' })
    // A real click focuses what it hits; fireEvent does not, and the hook
    // reads `document.activeElement`.
    opener.focus()
    fireEvent.click(opener)
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'open' }))
  })

  it('falls back when the opener unmounted as the modal opened', () => {
    // This is the admin panel's case: it closes as it hands off, so
    // `document.activeElement` is already <body> by the time it is captured.
    render(<Harness dropOpener />)
    fireEvent.click(screen.getByRole('button', { name: 'open' }))
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'gear' }))
    expect(document.activeElement).not.toBe(document.body)
  })
})

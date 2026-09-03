/**
 * The prototype's `BLOCK_MENU` — text, heading, card, link, divider — as RST
 * snippets.
 *
 * The prototype appended these as DOM nodes into an authored section and kept
 * them in `localStorage.extras`. With the `.rst` files as the content of
 * record, the same five blocks are inserted into the source instead, which is
 * where they can actually be committed.
 */
export interface Snippet {
  type: string
  label: string
  code: string
}

export const BLOCK_MENU: readonly Snippet[] = [
  { type: 'text', label: 'Text', code: 'New paragraph. Click to write.\n' },
  { type: 'heading', label: 'Heading', code: 'New heading\n===========\n:layout: stack\n' },
  {
    type: 'card',
    label: 'Card',
    code: '.. card:: New card\n   :num: 01\n\n   A short description of what this is.\n',
  },
  {
    type: 'link',
    label: 'Link',
    code: '.. card:: New link\n   :link: Label <https://example.com>\n',
  },
  { type: 'divider', label: 'Divider', code: '----\n' },
]

/** Insert `code` at the caret, keeping blank-line separation on both sides. */
export const insertSnippet = (
  source: string,
  caret: number,
  code: string
): { text: string; caret: number } => {
  const before = source.slice(0, caret)
  const after = source.slice(caret)
  const lead =
    before === '' || before.endsWith('\n\n') ? '' : before.endsWith('\n') ? '\n' : '\n\n'
  const tail = after.startsWith('\n') || after === '' ? '\n' : '\n\n'
  const insert = `${lead}${code.replace(/\n+$/, '')}${tail}`
  return { text: before + insert + after, caret: caret + insert.length }
}

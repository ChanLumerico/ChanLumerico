/**
 * The authoring cheatsheet, verbatim from the prototype's `RST_LEGEND`. It
 * floats beside the source editor above 1240px and is hidden below it.
 */
export interface LegendRow {
  label: string
  code: string
}

export const RST_LEGEND: readonly LegendRow[] = [
  { label: 'Section', code: 'Title\n=====\n:id: about\n:layout: grid | stack | list' },
  { label: 'Paragraph', code: 'Any plain line becomes body copy.' },
  {
    label: 'Card',
    code: '.. card:: Title\n   :num: 01\n   :meta: Python · NumPy\n   :link: Label <https://…>\n   :tag: a metric pill\n\n   Body, indented 3 spaces.',
  },
  {
    label: 'Timeline entry',
    code: '.. entry:: Role\n   :date: 2025 — Present\n   :org: Where it happened',
  },
  {
    label: 'Post',
    code: '.. post:: Post title\n   :date: Feb 2026\n   :href: /posts/slug\n\n   One-line summary.',
  },
  {
    label: 'Figure',
    code: '.. figure:: Caption text\n   :id: fig-name\n   :ratio: 16/9\n\nA drop target for an image.',
  },
  {
    label: 'Video',
    code: '.. embed:: https://www.youtube.com/watch?v=ID\n   :caption: What it shows',
  },
  {
    label: 'Vector field',
    code: '.. field:: Caption text\n\nScore field and velocity field,\ncomputed on a grid.',
  },
  {
    label: 'Diagram',
    code: '.. diagram:: Caption text\n   :cite: Source line — https://…\n\nDrawn in-page: curved SDE path\nvs straight flow transport.',
  },
  {
    label: 'References',
    code: '.. refs::\n   :item: Paper title | 2021\n   :item: With a link | 2025 | https://…',
  },
  {
    label: 'Velog series',
    code: '.. series::\n   :item: Diffusion-101\n   :item: RL-notes\n\nOne :item: per velog series slug\n(the last part of its velog URL).',
  },
  { label: 'Velog feed', code: '.. velog:: 10\n\nThe ten newest posts, live.' },
  { label: 'Lede', code: '.. lede:: One large opening statement.' },
  {
    label: 'Stats',
    code: '.. stats::\n   :item: 2025 | joined the lab\n   :item: 4 | papers rebuilt',
  },
  {
    label: 'Card bullets',
    code: '.. card:: Title\n   :bullet: First point\n   :bullet: Second point',
  },
  { label: 'Pills', code: '.. pills:: One, Two, Three' },
  { label: 'Divider', code: '----' },
]

import type { PageKey, SiteConfig, SiteDraft } from '../../config/types'
import { BUILTIN_DRAFT } from '../../config/normalise'

export interface OutputFile {
  /** Repo-relative path, so the label says exactly where it goes. */
  path: string
  contents: string
  changed: boolean
}

const configJson = (config: SiteConfig): string =>
  `${JSON.stringify({ $schema: './config.schema.json', ...config }, null, 2)}\n`

const rst = (source: string): string => (source.endsWith('\n') ? source : `${source}\n`)

/** What a Save would write. The user commits these; nothing is pushed here. */
export const filesFor = (draft: SiteDraft): OutputFile[] => {
  const out: OutputFile[] = [
    {
      path: 'src/content/config.json',
      contents: configJson(draft.config),
      changed: configJson(draft.config) !== configJson(BUILTIN_DRAFT.config),
    },
  ]
  for (const key of Object.keys(draft.pages) as PageKey[]) {
    out.push({
      path: `src/content/${key}.rst`,
      contents: rst(draft.pages[key]),
      changed: rst(draft.pages[key]) !== rst(BUILTIN_DRAFT.pages[key]),
    })
  }
  return out
}

export const copyText = async (text: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

export const downloadText = (filename: string, text: string, type = 'text/plain'): void => {
  const blob = new Blob([text], { type: `${type};charset=utf-8` })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  // Revoking synchronously can cancel the download in some browsers.
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export const downloadBlob = (filename: string, blob: Blob): void => {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export const BOOT_FAILURE_ROOT_SELECTOR = '[data-dsh-boot]'

const BOOT_FAILURE_TITLE = 'Failed to load plugins'

export interface BootFailureElement {
  innerText?: string
  textContent?: string | null
}

/**
 * Returns a normalized boot failure diagnostic only from Harness's dedicated
 * boot screen. Callers must pass the `[data-dsh-boot]` root, rather than a
 * document-wide container: conversations may legitimately quote this title.
 */
export function extractBootFailureText(root: BootFailureElement | null): string | undefined {
  if (!root) return undefined

  const text = root.innerText || root.textContent
  if (!text?.includes(BOOT_FAILURE_TITLE)) return undefined

  return text
    .split(/\r?\n/)
    .map((value) => value.trim())
    .filter(Boolean)
    .join('\n')
}

export function findBootFailureText(document: Document): string | undefined {
  return extractBootFailureText(
    document.querySelector<HTMLElement>(BOOT_FAILURE_ROOT_SELECTOR)
  )
}

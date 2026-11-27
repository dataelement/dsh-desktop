/** Read the window identity supplied by the main process; older hosts use the original name. */
export function preloadProductName(args: readonly string[]): string {
  const prefix = '--dsh-product-name='
  const value = args.find(arg => arg.startsWith(prefix))?.slice(prefix.length)
  if (!value) return 'DSH Desktop'
  try {
    return decodeURIComponent(value) || 'DSH Desktop'
  } catch {
    return 'DSH Desktop'
  }
}

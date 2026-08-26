export type ElectronFilePathResolver = (file: File) => unknown

export function safePathForFile(file: File, resolve: ElectronFilePathResolver): string {
  try {
    const value = resolve(file)
    return typeof value === 'string' ? value : ''
  } catch {
    return ''
  }
}

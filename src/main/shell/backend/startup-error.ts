/** Serializable failure text for a renderer. Nested aggregate errors stay in the message. */
export function desktopErrorState(error: unknown): { phase: 'error', message: string } {
  const message = error instanceof AggregateError
    ? [error.message, ...error.errors.map(item => desktopErrorState(item).message)].join('\n')
    : error instanceof Error ? error.message : String(error)
  return { phase: 'error', message }
}

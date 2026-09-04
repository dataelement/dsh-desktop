export interface CreateHiddenConsoleOptions {
  load?: (name: string) => any
}

export function createHiddenConsole(options?: CreateHiddenConsoleOptions): boolean

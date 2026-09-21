export interface JsignArgsOptions {
  jsignJar: string
  pinFile: string
  targetFile: string
  tsaUrl?: string
  name?: string
  url?: string
}

export function findSignableBinaries(unpackedDir: string): Promise<string[]>
export function buildJsignArgs(options: JsignArgsOptions): string[]

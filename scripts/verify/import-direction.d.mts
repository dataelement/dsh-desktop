export interface ImportDirectionError {
  file: string
  specifier: string
  rule: string
}

export function checkImportDirection(root: string): Promise<ImportDirectionError[]>

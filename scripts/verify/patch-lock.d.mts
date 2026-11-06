export interface PatchLockError {
  file: string
  rule: 'filename' | 'version' | 'integrity'
}

export function checkPatchLock(root: string): Promise<PatchLockError[]>

export interface SafeStorageAdapter {
  isEncryptionAvailable(): boolean
  getSelectedStorageBackend?(): string
}

export interface SecureStorageInspection {
  available: boolean
  backend?: string
  reason?: string
}

export function inspectSecureStorage(safeStorage: SafeStorageAdapter): SecureStorageInspection {
  if (!safeStorage.isEncryptionAvailable()) {
    return {
      available: false,
      reason: 'Operating-system secure storage is unavailable.'
    }
  }
  const backend = safeStorage.getSelectedStorageBackend?.()
  if (process.platform === 'linux' && backend === 'basic_text') {
    return {
      available: false,
      backend,
      reason: 'Linux secure storage fell back to basic_text and cannot protect enterprise credentials.'
    }
  }
  return {
    available: true,
    ...(backend ? { backend } : {})
  }
}

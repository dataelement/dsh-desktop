import { join } from 'node:path'
import {
  startEnterpriseCredentialBroker,
  type EnterpriseCredentialBroker
} from './credential-broker'
import { EnterpriseService, type EnterprisePublicState } from './enterprise-service'
import type { EnterpriseFetch } from './platform-fetch'
import {
  ENTERPRISE_VAULT_FILENAME,
  type SafeStorageCryptoAdapter,
  SecureEnterpriseCredentialVault
} from './secure-credential-vault'

export interface EnterpriseDesktopRuntime {
  snapshot(): EnterprisePublicState
  harnessEnvironment(): NodeJS.ProcessEnv
  rotateCapability(): void
  stop(): Promise<void>
}

export async function startEnterpriseDesktop(options: {
  desktopVersion?: string
  activateDesktop?: () => Promise<void> | void
  userDataPath: string
  safeStorage: SafeStorageCryptoAdapter
  fetchImpl: EnterpriseFetch
  allowInsecureLoopback: boolean
  note?: (line: string) => void
}): Promise<EnterpriseDesktopRuntime> {
  const vault = new SecureEnterpriseCredentialVault(
    join(options.userDataPath, ENTERPRISE_VAULT_FILENAME),
    options.safeStorage
  )
  const service = new EnterpriseService({
    desktopVersion: options.desktopVersion,
    activateDesktop: options.activateDesktop,
    vault,
    fetchImpl: options.fetchImpl,
    allowInsecureLoopback: options.allowInsecureLoopback,
    note: (entry) => {
      const parts = [`[enterprise] ${entry.event}`]
      if (entry.status) parts.push(`status=${entry.status}`)
      if (entry.requestId) parts.push(`requestId=${entry.requestId}`)
      if (entry.originHash) parts.push(`origin=${entry.originHash}`)
      options.note?.(parts.join(' '))
    }
  })
  await service.restore()

  let broker: EnterpriseCredentialBroker | undefined
  try {
    broker = await startEnterpriseCredentialBroker(service, {
      allowInsecureLoopback: options.allowInsecureLoopback
    })
  } catch {
    options.note?.('[enterprise] broker_start_failed')
  }

  return {
    snapshot: () => service.snapshot(),
    harnessEnvironment: () => broker?.environment() ?? {},
    rotateCapability() {
      broker?.rotateCapability()
    },
    async stop() {
      await broker?.stop()
      await service.stop()
    }
  }
}

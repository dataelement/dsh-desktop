import { ProcessRecovery } from '../../src/main/process-recovery'

export function createProcessRecovery(options: Partial<ConstructorParameters<typeof ProcessRecovery>[0]> = {}) {
  return new ProcessRecovery({
    stop: async () => {}, releasePage: async () => {},
    prompt: async () => 'quit', restart: () => {}, quit: () => {},
    onError: error => { throw error }, ...options
  })
}

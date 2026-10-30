const MIB = 1024 * 1024

export function isMemoryExit(reason: string, exitCode: number): boolean {
  return reason === 'oom' || (exitCode >>> 0) === 0xe0000008
}

export interface ProcessResourceMetric {
  pid: number
  type: string
  cpu: { percentCPUUsage: number }
  memory: { workingSetSize: number; privateBytes?: number }
}

/** Fault-time snapshot only. No process names, URLs, commands or filesystem paths. */
export function resourceSnapshot(totalBytes: number, freeBytes: number, metrics: readonly ProcessResourceMetric[]): string {
  const processes = [...metrics].sort((a, b) => b.memory.workingSetSize - a.memory.workingSetSize).slice(0, 8)
    .map(p => ({ pid: p.pid, type: p.type, rssMb: Math.round(p.memory.workingSetSize / 1024),
      privateMb: p.memory.privateBytes === undefined ? undefined : Math.round(p.memory.privateBytes / 1024),
      cpu: Math.round(p.cpu.percentCPUUsage) }))
  return JSON.stringify({ totalMb: Math.round(totalBytes / MIB), freeMb: Math.round(freeBytes / MIB),
    processes })
}

export function graphicsSnapshot(info: unknown): string {
  if (!info || typeof info !== 'object') return 'unavailable'
  const data = info as Record<string, unknown>
  const devices = Array.isArray(data.gpuDevice) ? data.gpuDevice.slice(0, 4) : []
  return JSON.stringify(devices.map(device => {
    if (!device || typeof device !== 'object') return {}
    const fields = device as Record<string, unknown>
    return Object.fromEntries(['vendorId', 'deviceId', 'active', 'driverVendor', 'driverVersion'].flatMap(key => {
      const value = fields[key]
      return typeof value === 'number' || typeof value === 'boolean' || typeof value === 'string'
        ? [[key, typeof value === 'string' ? value.slice(0, 64) : value]] : []
    }))
  }))
}

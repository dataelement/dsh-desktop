import { describe, expect, it } from 'vitest'
import { createHostPathsBridge, HOST_PATHS_BRIDGE } from '../src/preload/host-paths'

describe('preload host paths bridge', () => {
  it('uses the global name the stock composer reads', () => {
    expect(HOST_PATHS_BRIDGE).toBe('__DSH_HOST_PATHS__')
  })

  it('answers the host path of a dropped file or folder', () => {
    const folder = new File([], 'project')
    const seen: File[] = []
    const bridge = createHostPathsBridge(file => {
      seen.push(file)
      return '/Users/me/project'
    })

    expect(bridge.pathFor(folder)).toBe('/Users/me/project')
    expect(seen).toEqual([folder])
  })

  it('passes through an empty path so pasted bytes keep uploading', () => {
    const bridge = createHostPathsBridge(() => '')

    expect(bridge.pathFor(new File(['x'], 'image.png'))).toBe('')
  })

  it('exposes only the single frozen method', () => {
    const bridge = createHostPathsBridge(() => '')

    expect(Object.keys(bridge)).toEqual(['pathFor'])
    expect(Object.isFrozen(bridge)).toBe(true)
  })
})

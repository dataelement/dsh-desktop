import { describe, expect, it } from 'vitest'
import {
  buildReleaseRetentionPlan,
  validateReleaseInventory
} from '../scripts/cloudflare-release-retention.mjs'
import type { ReleaseInventory } from '../scripts/cloudflare-release-retention.mjs'

const inventory: ReleaseInventory = {
  schemaVersion: 1,
  releases: {
    '0.6.0': [
      'releases/v0.6.0/sherlock-mac-arm64.zip',
      'releases/v0.6.0/sherlock-mac-arm64.zip.blockmap',
      'releases/v0.6.0/sherlock-mac-arm64.dmg'
    ],
    '0.6.1': [
      'releases/v0.6.1/sherlock-mac-arm64.zip',
      'releases/v0.6.1/sherlock-mac-arm64.zip.blockmap',
      'releases/v0.6.1/sherlock-mac-arm64.dmg'
    ]
  }
}

describe('Cloudflare release retention', () => {
  it('deletes exactly the oldest immutable version after recording the verified current release', () => {
    const plan = buildReleaseRetentionPlan({
      inventory,
      currentVersion: '0.6.2',
      currentKeys: [
        'releases/v0.6.2/sherlock-mac-arm64.zip',
        'releases/v0.6.2/sherlock-mac-arm64.zip.blockmap',
        'releases/v0.6.2/sherlock-mac-arm64.dmg'
      ]
    })

    expect(plan.deletedVersion).toBe('0.6.0')
    expect(plan.deleteKeys).toEqual(inventory.releases['0.6.0'])
    expect(Object.keys(plan.nextInventory.releases)).toEqual(['0.6.1', '0.6.2'])
    expect(plan.nextInventory.releases['0.6.2']).toEqual([
      'releases/v0.6.2/sherlock-mac-arm64.dmg',
      'releases/v0.6.2/sherlock-mac-arm64.zip',
      'releases/v0.6.2/sherlock-mac-arm64.zip.blockmap'
    ])
  })

  it('sorts semantic versions numerically instead of lexicographically', () => {
    const plan = buildReleaseRetentionPlan({
      inventory: {
        schemaVersion: 1,
        releases: {
          '0.6.9': ['releases/v0.6.9/app.zip'],
          '0.6.10': ['releases/v0.6.10/app.zip']
        }
      },
      currentVersion: '0.7.0',
      currentKeys: ['releases/v0.7.0/app.zip']
    })

    expect(plan.deletedVersion).toBe('0.6.9')
  })

  it('rejects mutable aliases, foreign versions, duplicate keys, and current-version reuse', () => {
    expect(() =>
      validateReleaseInventory({
        schemaVersion: 1,
        releases: { '0.6.0': ['latest/latest-mac.yml'] }
      })
    ).toThrow('immutable release key')

    expect(() =>
      validateReleaseInventory({
        schemaVersion: 1,
        releases: { '0.6.0': ['releases/v0.6.1/app.zip'] }
      })
    ).toThrow('does not belong')

    expect(() =>
      validateReleaseInventory({
        schemaVersion: 1,
        releases: { '0.6.0': ['releases/v0.6.0/app.zip', 'releases/v0.6.0/app.zip'] }
      })
    ).toThrow('duplicate')

    expect(() =>
      buildReleaseRetentionPlan({
        inventory,
        currentVersion: '0.6.1',
        currentKeys: ['releases/v0.6.1/app.zip']
      })
    ).toThrow('already exists')
  })

  it('refuses to prune when fewer than two versions would exist', () => {
    expect(() =>
      buildReleaseRetentionPlan({
        inventory: { schemaVersion: 1, releases: {} },
        currentVersion: '0.6.0',
        currentKeys: ['releases/v0.6.0/app.zip']
      })
    ).toThrow('No older release')
  })
})

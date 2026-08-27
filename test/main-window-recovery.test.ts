import { describe, expect, it } from 'vitest'
import {
  MAIN_WINDOW_RECOVERY_MAX_RELOADS,
  MAIN_WINDOW_RECOVERY_RELOAD_COOLDOWN_MS,
  shouldReloadAfterMainWindowRendererLoss
} from '../src/main/main-window-recovery'

describe('main window renderer recovery', () => {
  it('allows the first reload when no previous crash has been recorded', () => {
    expect(
      shouldReloadAfterMainWindowRendererLoss({
        now: 1_000,
        lastReloadAt: 0,
        reloadCount: 0
      })
    ).toBe(true)
  })

  it('throttles a second crash that lands inside the cooldown window', () => {
    expect(
      shouldReloadAfterMainWindowRendererLoss({
        now: 1_000 + MAIN_WINDOW_RECOVERY_RELOAD_COOLDOWN_MS - 1,
        lastReloadAt: 1_000,
        reloadCount: 1
      })
    ).toBe(false)
  })

  it('lets a fresh crash through once the cooldown has fully elapsed', () => {
    expect(
      shouldReloadAfterMainWindowRendererLoss({
        now: 1_000 + MAIN_WINDOW_RECOVERY_RELOAD_COOLDOWN_MS,
        lastReloadAt: 1_000,
        reloadCount: 1
      })
    ).toBe(true)
  })

  it('gives up after the configured number of reloads to avoid hammering a dead GPU', () => {
    expect(
      shouldReloadAfterMainWindowRendererLoss({
        now: 1_000 + MAIN_WINDOW_RECOVERY_RELOAD_COOLDOWN_MS * 100,
        lastReloadAt: 1_000,
        reloadCount: MAIN_WINDOW_RECOVERY_MAX_RELOADS
      })
    ).toBe(false)
  })

  it('honors a custom cooldown and reload cap when the caller tightens the policy', () => {
    expect(
      shouldReloadAfterMainWindowRendererLoss({
        now: 1_100,
        lastReloadAt: 1_000,
        reloadCount: 1,
        cooldownMs: 50,
        maxReloads: 2
      })
    ).toBe(true)
    expect(
      shouldReloadAfterMainWindowRendererLoss({
        now: 1_010,
        lastReloadAt: 1_000,
        reloadCount: 1,
        cooldownMs: 50,
        maxReloads: 2
      })
    ).toBe(false)
    expect(
      shouldReloadAfterMainWindowRendererLoss({
        now: 1_000_000,
        lastReloadAt: 1_000,
        reloadCount: 2,
        cooldownMs: 50,
        maxReloads: 2
      })
    ).toBe(false)
  })
})

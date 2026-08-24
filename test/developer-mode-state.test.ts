import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import {
  developerModeStatePath,
  isDeveloperModeEnabled,
  setDeveloperModeEnabled
} from '../src/main/developer-mode-state'
import {
  developerModeArgument,
  developerModeEnabledFromArguments
} from '../src/shared/developer-mode'

const temporaryDirectories: string[] = []

function temporaryUserData(): string {
  const directory = mkdtempSync(path.join(tmpdir(), 'sherlock-developer-mode-'))
  temporaryDirectories.push(directory)
  return directory
}

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true })
  }
})

describe('desktop-scoped developer mode state', () => {
  it('survives a new reader such as a Harness restart on a different port', () => {
    const userData = temporaryUserData()

    expect(isDeveloperModeEnabled(userData)).toBe(false)
    setDeveloperModeEnabled(userData, true)

    expect(isDeveloperModeEnabled(userData)).toBe(true)
  })

  it('persists an explicit disabled state after developer mode is turned off', () => {
    const userData = temporaryUserData()

    setDeveloperModeEnabled(userData, true)
    setDeveloperModeEnabled(userData, false)

    expect(isDeveloperModeEnabled(userData)).toBe(false)
    expect(JSON.parse(readFileSync(developerModeStatePath(userData), 'utf8'))).toEqual({
      enabled: false
    })
  })

  it('treats a malformed state file as disabled', () => {
    const userData = temporaryUserData()
    writeFileSync(developerModeStatePath(userData), '{not-json', 'utf8')

    expect(isDeveloperModeEnabled(userData)).toBe(false)
  })

  it('passes the desktop state into the isolated renderer without depending on its URL', () => {
    expect(developerModeArgument(true)).toBe('--sherlock-developer-mode=true')
    expect(
      developerModeEnabledFromArguments([
        '/path/to/helper',
        '--sherlock-developer-mode=true',
        '--other=value'
      ])
    ).toBe(true)
    expect(developerModeEnabledFromArguments(['/path/to/helper'])).toBe(false)
  })
})

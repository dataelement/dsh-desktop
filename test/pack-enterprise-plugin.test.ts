import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'
import { moduleRunnerTransform } from 'vite'

describe('pack-enterprise-plugin', () => {
  it('stays valid JavaScript when Vite transforms a CRLF checkout', async () => {
    const source = await readFile(new URL('../scripts/pack-enterprise-plugin.mjs', import.meta.url), 'utf8')
    const crlf = source.replace(/(?<!\r)\n/g, '\r\n')
    const result = await moduleRunnerTransform(crlf, null, '/scripts/pack-enterprise-plugin.mjs', crlf)
    const code = result?.code
    expect(code).toEqual(expect.any(String))
    // Vite runs the transformed module as an async function body, same as its module runner.
    const compile = async function () {}.constructor as new (body: string) => unknown
    expect(() => new compile(`"use strict";${code}`)).not.toThrow()
  })
})

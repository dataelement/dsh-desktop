import { describe, expect, it } from 'vitest'
import { withoutUndecodableValues } from '../src/main/runtime/harness-runtime'

/**
 * Windows PowerShell writes stdout in the console codepage. Decoding that as
 * UTF-8 on a CJK install turns every non-ASCII byte into U+FFFD, and the
 * value most likely to carry one is a path under the user's profile
 * directory. Passing such a TEMP to Harness points it at a directory that
 * does not exist, and it dies in mkdtemp before loading a plugin tree.
 */
describe('captured shell environment', () => {
  // C:\Users\数据项素\AppData\Local\Temp as GBK bytes decoded as UTF-8.
  const mojibakeTemp = 'C:\Users\\uFFFD\uFFFD\uFFFD\uFFFD\uFFFD\uFFFD\uFFFD\uFFFD\AppData\Local\Temp'
  const realTemp = 'C:\Users\数据项素\AppData\Local\Temp'

  it('replaces a mis-decoded value with the inherited one', () => {
    const result = withoutUndecodableValues({ TEMP: mojibakeTemp }, { TEMP: realTemp })
    expect(result.TEMP).toBe(realTemp)
  })

  it('keeps values that decoded cleanly', () => {
    const result = withoutUndecodableValues(
      { PATH: 'C:\bin;C:\Users\数据项素\.local\bin' },
      { PATH: 'C:\bin' }
    )
    expect(result.PATH).toBe('C:\bin;C:\Users\数据项素\.local\bin')
  })

  // A variable that exists only in the shell profile has nothing to fall back
  // to. Dropping it leaves the consumer its own default; passing it on broken
  // points it somewhere wrong.
  it('drops a mis-decoded value that has no inherited counterpart', () => {
    const result = withoutUndecodableValues({ CONDA_PREFIX: mojibakeTemp }, {})
    expect('CONDA_PREFIX' in result).toBe(false)
  })

  it('leaves an ASCII-only environment untouched', () => {
    const captured = { PATH: 'C:\bin', TEMP: 'C:\Temp' }
    expect(withoutUndecodableValues(captured, {})).toEqual(captured)
  })

  it('preserves an empty value', () => {
    expect(withoutUndecodableValues({ EMPTY: '' }, {})).toEqual({ EMPTY: '' })
  })
})

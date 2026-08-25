import { describe, expect, it } from 'vitest'
import * as credentialsModule from '@deepseek-ai/dsh-credentials-local'

const { parseCredentialsDocument } = credentialsModule
const renderCredentialsDocument = (
  credentialsModule as typeof credentialsModule & {
    renderCredentialsDocument(text: string | undefined, ref: string, value: string | undefined): string
  }
).renderCredentialsDocument

describe('Harness credential layout compatibility', () => {
  it('reads version-1 credentials written by newer Harness builds', () => {
    const credentials = parseCredentialsDocument(
      [
        'version: 1',
        'refs:',
        '  DEEPSEEK_API_KEY: sk-compatible',
        '  OPENAI_API_KEY: sk-openai',
        'records:',
        '  llm-pi-ai/openai-codex:',
        '    kind: grant',
        '    payload:',
        '      type: oauth',
        '      access: opaque-token',
        ''
      ].join('\n'),
      '/tmp/.credentials.yaml'
    )

    expect([...credentials]).toEqual([
      ['DEEPSEEK_API_KEY', 'sk-compatible'],
      ['OPENAI_API_KEY', 'sk-openai']
    ])
  })

  it('updates refs without flattening or damaging version-1 credential records', () => {
    const source = [
      'version: 1',
      'refs:',
      '  # Keep the user annotation.',
      '  DEEPSEEK_API_KEY: sk-compatible',
      'records:',
      '  llm-pi-ai/openai-codex:',
      '    kind: grant',
      '    payload:',
      '      type: oauth',
      '      access: opaque-token',
      ''
    ].join('\n')

    const updated = renderCredentialsDocument(source, 'OPENAI_API_KEY', 'sk-openai')

    expect(updated).toContain('  # Keep the user annotation.')
    expect(updated).toContain('  OPENAI_API_KEY: sk-openai')
    expect(updated).toContain('      access: opaque-token')
    expect(() => parseCredentialsDocument(updated, '/tmp/.credentials.yaml')).not.toThrow()
    expect([...parseCredentialsDocument(updated, '/tmp/.credentials.yaml')]).toEqual([
      ['DEEPSEEK_API_KEY', 'sk-compatible'],
      ['OPENAI_API_KEY', 'sk-openai']
    ])
  })

  it('keeps valid flat credentials named version, refs, or records backward compatible', () => {
    const source = ['version: "legacy-value"', 'refs: "legacy-ref"', 'records: "legacy-record"', ''].join(
      '\n'
    )

    expect([...parseCredentialsDocument(source, '/tmp/.credentials.yaml')]).toEqual([
      ['version', 'legacy-value'],
      ['refs', 'legacy-ref'],
      ['records', 'legacy-record']
    ])

    const updated = renderCredentialsDocument(source, 'OPENAI_API_KEY', 'sk-openai')
    expect(updated).toContain('OPENAI_API_KEY: sk-openai')
    expect(updated).not.toContain('\nrefs:\n')
  })

  it('rejects unknown versioned layouts instead of silently dropping credentials', () => {
    expect(() =>
      parseCredentialsDocument('version: 2\nrefs:\n  OPENAI_API_KEY: sk-openai\n', '/tmp/.credentials.yaml')
    ).toThrow('unsupported credentials document version')
    expect(() =>
      parseCredentialsDocument('version: 1\nrefs: not-a-mapping\n', '/tmp/.credentials.yaml')
    ).toThrow('must be a mapping')
    expect(() =>
      parseCredentialsDocument(
        'version: 1\nrefs:\n  OPENAI_API_KEY: sk-openai\nunexpected: secret\n',
        '/tmp/.credentials.yaml'
      )
    ).toThrow('unknown top-level key')
  })
})

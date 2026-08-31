import { Context } from '@deepseek-ai/cordis'
import { addHarnessSourceSection } from '@deepseek-ai/dsh-app-boot'
import { apply as applyWebApp } from '@deepseek-ai/dsh-web-app'
import {
  SystemPrompt,
  renderPrompt
} from '@deepseek-ai/dsh-system-prompt'
import { describe, expect, it } from 'vitest'

type PromptSection = {
  name: string
  order: number
  text: string | (() => string)
}

function renderedSectionText(section: PromptSection): string {
  return typeof section.text === 'function' ? section.text() : section.text
}

describe('Sherlock Agent model-facing identity', () => {
  it('assembles the fixed identity as Sherlock Agent', async () => {
    const prompt = new SystemPrompt(new Context(), {})

    const rendered = renderPrompt(await prompt.assemble())

    expect(rendered).toContain('You are Sherlock Agent.')
    expect(rendered).not.toContain('DeepSeek Harness')
  })

  it('describes the implementation checkout as Sherlock Agent', () => {
    const sections: PromptSection[] = []
    addHarnessSourceSection(
      {
        get(name: string) {
          if (name !== 'systemPrompt') return undefined
          return {
            section(section: PromptSection) {
              sections.push(section)
              return () => undefined
            }
          }
        }
      } as never,
      '/Applications/Sherlock.app/Contents/Resources/app'
    )

    const rendered = sections.map(renderedSectionText).join('\n')
    expect(rendered).toContain('Sherlock Agent implementation checkout')
    expect(rendered).not.toContain('DeepSeek Harness')
  })

  it('describes the active desktop surface as Sherlock', () => {
    const sections: PromptSection[] = []
    const promptContext = {
      get(name: string) {
        if (name === 'webServer') return { port: 49559 }
        if (name === 'systemPrompt') {
          return {
            section(section: PromptSection) {
              sections.push(section)
              return () => undefined
            }
          }
        }
        return undefined
      },
      systemPrompt: {
        section(section: PromptSection) {
          sections.push(section)
          return () => undefined
        }
      }
    }
    const shellContext = {
      shellEnv: { register: () => () => undefined },
      get(name: string) {
        return name === 'webServer' ? { port: 49559 } : undefined
      }
    }
    const webContext = {
      webServer: { host: '127.0.0.1', port: 49559 },
      provide: () => undefined,
      plugin: () => undefined,
      inject(names: string[], callback: (context: never) => void) {
        if (names.includes('systemPrompt')) callback(promptContext as never)
        if (names.includes('shellEnv')) callback(shellContext as never)
      },
      get: () => undefined
    }

    applyWebApp(webContext as never, {
      printUrl: false,
      surfaceContext: true,
      trustedHosts: []
    })

    const rendered = sections.map(renderedSectionText).join('\n')
    expect(rendered).toContain('Sherlock desktop interface')
    expect(rendered).not.toContain('DeepSeek Harness')
  })
})

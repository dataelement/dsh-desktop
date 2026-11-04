import { describe, expect, it } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import * as McpClient from '@deepseek-ai/dsh-mcp-client'

describe('MCP client decoupling', () => {
  it('does not block or crash startup when an external server is unreachable', async () => {
    const ctx = new Context()
    const start = Date.now()

    // Configure an unreachable external MCP server (e.g. simulated blender-mcp or rea-mcp)
    await expect(
      ctx.plugin(McpClient, {
        transport: 'streamable-http',
        serverName: 'unreachable-test-mcp',
        url: 'http://127.0.0.1:49999/mcp',
        startupTimeoutMs: 20_000,
        failOnStartupError: false
      })
    ).resolves.not.toThrow()

    const elapsed = Date.now() - start
    // Must return quickly (~1s) rather than blocking for 20s
    expect(elapsed).toBeLessThan(3_000)
  })
})

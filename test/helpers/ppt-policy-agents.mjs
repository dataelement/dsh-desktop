import { Context } from '@deepseek-ai/cordis'
import { SessionStore, SessionId } from '@deepseek-ai/dsh-session'
import { SessionProjectionRegistry } from '@deepseek-ai/dsh-session-projection'
import { AgentRegistry } from '@deepseek-ai/dsh-agent'
import { AgentLoop } from '@deepseek-ai/dsh-agent-loop'
import { SystemPrompt } from '@deepseek-ai/dsh-system-prompt'
import { ToolRuntime } from '@deepseek-ai/dsh-tools'
import { LlmRuntime } from '@deepseek-ai/dsh-llm'
import { SkillRegistry } from '@deepseek-ai/dsh-skill'

/** Create real Agent scopes through the current public factory, never createScope. */
export async function policyRuntime(cleanups) {
  const root = new Context()
  cleanups.push(() => root.fiber.dispose())
  for (const plugin of [SessionStore, SessionProjectionRegistry, AgentRegistry, SystemPrompt, ToolRuntime, LlmRuntime, SkillRegistry, AgentLoop]) await root.plugin(plugin)
  root.tools.setExecutor({ describe: () => ({ schemas: [] }), execute: async () => { throw new Error('PPT policy fixture does not execute tools') } })
  let sequence = 0
  const handles = new Map()
  async function agent(id = 'policy-' + ++sequence, parentAgent) {
    const handle = await root.agents.create({ sessionId: SessionId(id), agentOptions: { provider: 'fixture', model: 'test' }, ...(parentAgent ? { parentAgent } : {}) })
    handles.set(handle.agent, handle)
    return handle.agent
  }
  return { root, agent, dispose: value => handles.get(value).dispose() }
}

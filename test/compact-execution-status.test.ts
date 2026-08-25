import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { runInNewContext } from 'node:vm'
import { describe, expect, it } from 'vitest'

type ClientBundle = Record<string, unknown>

type BundleDescriptor = {
  factory(require: (id: string) => unknown): ClientBundle
}

function fakeModule(): unknown {
  let fake: unknown
  const target = function () {}
  fake = new Proxy(target, {
    get: () => fake,
    apply: () => fake,
    construct: () => ({})
  })
  return fake
}

async function loadConversationBundle(styleTexts?: string[]): Promise<ClientBundle> {
  const source = await readFile(
    'node_modules/@deepseek-ai/dsh-client-ui-conversation/lib/client.js',
    'utf8'
  )
  const requireModule = createRequire(import.meta.url)
  const react = requireModule('react')
  const jsxRuntime = requireModule('react/jsx-runtime')
  let descriptor: BundleDescriptor | undefined

  const document = styleTexts === undefined
    ? undefined
    : {
        querySelector: () => null,
        createElement: () => ({ dataset: {}, textContent: '' }),
        head: {
          appendChild(tag: { textContent?: string }) {
            styleTexts.push(tag.textContent ?? '')
          }
        }
      }

  runInNewContext(source, {
    ...(document === undefined ? {} : { document }),
    window: {
      __ModuleLoader__: {
        load(value: BundleDescriptor) {
          descriptor = value
        }
      }
    }
  })
  if (descriptor === undefined) throw new Error('conversation bundle did not register')

  return descriptor.factory((id) => {
    if (id === 'react') return react
    if (id === 'react/jsx-runtime') return jsxRuntime
    return fakeModule()
  })
}

function turnLocation(turn: number) {
  return { kind: 'turn', turn: { turn } }
}

function statusTranslator(key: string, values: Record<string, unknown> = {}) {
  const labels: Record<string, string> = {
    'execution.status.analyzing': '正在分析任务…',
    'execution.status.context': '正在准备任务上下文…',
    'execution.status.planning': '正在制定任务计划…',
    'execution.status.reading': '正在读取相关内容…',
    'execution.status.searching': '正在检索项目内容…',
    'execution.status.updating': '正在更新文件…',
    'execution.status.verifying': '正在验证运行结果…',
    'execution.status.researching': '正在使用互联网搜索…',
    'execution.status.webSearchTopic': `正在使用互联网搜索“${String(values.topic ?? '')}”…`,
    'execution.status.currentTask': `正在${String(values.task ?? '')}…`,
    'execution.status.pptRendering': '正在渲染 PPT 预览…',
    'execution.status.pptVerifying': '正在校验 PPT 文件…',
    'execution.status.executing': '正在执行检查…',
    'execution.status.compacting': '正在自动压缩上下文…',
    'execution.status.manualCompacting': '正在压缩上下文…',
    'execution.status.working': '正在执行任务…',
    'execution.status.history': '执行过程',
    'execution.progress.completed': `阶段进展：${String(values.task ?? '')}。`,
    'execution.progress.researched': `资料检索进展：${String(values.task ?? '')}。`,
    'execution.progress.researchReady': '资料检索与信息整理取得阶段进展。',
    'execution.progress.draftReady': '内容编写与文件更新取得阶段进展。',
    'execution.progress.previewReady': '预览渲染与视觉检查取得阶段进展。',
    'execution.progress.verificationReady': '方案检查与结果校验取得阶段进展。'
  }
  return labels[key] ?? key
}

describe('compact execution status', () => {
  it('shows automatic context compaction as soon as its real lifecycle starts', async () => {
    const client = await loadConversationBundle()
    expect(client.compactionDefinition).toBeTypeOf('object')
    if (typeof client.compactionDefinition !== 'object' || client.compactionDefinition === null) return
    const executionStatusForNodes = client.executionStatusForNodes
    expect(executionStatusForNodes).toBeTypeOf('function')
    if (typeof executionStatusForNodes !== 'function') return

    const definition = client.compactionDefinition as {
      match(event: unknown): { id: string; role: string } | null
      start(context: unknown, match: unknown): unknown
      update(context: { state: unknown }, match: unknown): unknown
      buildViewNode(context: unknown): {
        kind: string
        anchorSeq: number
        data: { running?: boolean }
      } | null
    }
    const event = {
      type: 'compaction/start',
      seq: 41,
      time: 1_725_000_000_000,
      data: { compactionId: 'compact-1', turn: 9 }
    }
    const matchResult = definition.match(event)
    expect(matchResult).toEqual({ id: 'compact-1', role: 'start' })

    const match = {
      event,
      role: 'start',
      location: turnLocation(9)
    }
    const state = definition.start({}, match)
    const node = definition.buildViewNode({
      key: 'compaction:compact-1',
      kind: 'compaction',
      id: 'compact-1',
      matches: [match],
      start: match,
      state,
      current: new Map()
    })

    expect(node).toMatchObject({
      kind: 'compaction',
      anchorSeq: 41,
      data: { kind: 'compaction', seq: 41, running: true }
    })
    expect(executionStatusForNodes([node], statusTranslator)).toBe(
      '正在自动压缩上下文…'
    )

    const endMatch = {
      event: {
        type: 'compaction/end',
        seq: 42,
        time: 1_725_000_001_000,
        data: { compactionId: 'compact-1', turn: 9, error: 'summary failed' }
      },
      role: 'update',
      location: turnLocation(9)
    }
    const endedState = definition.update({ state }, endMatch)
    expect(
      definition.buildViewNode({
        key: 'compaction:compact-1',
        kind: 'compaction',
        id: 'compact-1',
        matches: [match, endMatch],
        start: match,
        state: endedState,
        current: new Map()
      })
    ).toBeNull()
  })

  it('keeps an explicit compact command distinct from automatic context pressure', async () => {
    const client = await loadConversationBundle()
    expect(client.executionActivityLabel).toBeTypeOf('function')
    if (typeof client.executionActivityLabel !== 'function') return

    expect(
      client.executionActivityLabel(
        {
          kind: 'manual-compaction',
          data: { command: { outcome: null }, compaction: null }
        },
        statusTranslator
      )
    ).toBe('正在压缩上下文…')
  })

  it('collapses internal work into one expandable entry while keeping only the final answer visible', async () => {
    const client = await loadConversationBundle()
    expect(client.compactConversationFlow).toBeTypeOf('function')
    if (typeof client.compactConversationFlow !== 'function') return

    const nodes = new Map([
      ['user', { key: 'user', kind: 'user', location: turnLocation(7), data: {} }],
      ['context', { key: 'context', kind: 'context', location: turnLocation(7), data: {} }],
      [
        'process-copy',
        {
          key: 'process-copy',
          kind: 'assistant-step',
          location: turnLocation(7),
          data: { finalNode: { seq: 20 }, blocks: [{ kind: 'text', text: 'I will inspect files.' }] }
        }
      ],
      [
        'tool',
        {
          key: 'tool',
          kind: 'tool-call',
          location: turnLocation(7),
          data: { root: { callId: 'call-1', name: 'read', subCalls: [] } }
        }
      ],
      [
        'answer',
        {
          key: 'answer',
          kind: 'assistant-step',
          location: turnLocation(7),
          data: { finalNode: { seq: 40 }, blocks: [{ kind: 'text', text: '完成。' }] }
        }
      ],
      [
        'tail',
        {
          key: 'tail',
          kind: 'turn-tail',
          location: turnLocation(7),
          data: { turn: 7, closing: { finalNode: { seq: 40 } } }
        }
      ]
    ])

    expect(
      client.compactConversationFlow(
        ['user', 'context', 'process-copy', 'tool', 'answer', 'tail'],
        nodes,
        null
      )
    ).toEqual([
      { kind: 'node', key: 'user' },
      {
        kind: 'execution',
        key: 'execution:7',
        turn: 7,
        nodeKeys: ['context', 'process-copy', 'tool'],
        running: false
      },
      { kind: 'node', key: 'answer' },
      { kind: 'node', key: 'tail' }
    ])
  })

  it('keeps a running turn represented by one status entry even before internal nodes arrive', async () => {
    const client = await loadConversationBundle()
    expect(client.compactConversationFlow).toBeTypeOf('function')
    if (typeof client.compactConversationFlow !== 'function') return

    const nodes = new Map([
      ['user', { key: 'user', kind: 'user', location: turnLocation(8), data: {} }]
    ])

    expect(client.compactConversationFlow(['user'], nodes, 8)).toEqual([
      { kind: 'node', key: 'user' },
      {
        kind: 'execution',
        key: 'execution:8',
        turn: 8,
        nodeKeys: [],
        running: true
      }
    ])
  })

  it('starts a new execution segment after steering so its reply renders below the inserted input', async () => {
    const client = await loadConversationBundle()
    expect(client.compactConversationFlow).toBeTypeOf('function')
    if (typeof client.compactConversationFlow !== 'function') return

    const nodes = new Map([
      ['user', { key: 'user', kind: 'user', location: turnLocation(8), data: {} }],
      [
        'assistant-before-steering',
        {
          key: 'assistant-before-steering',
          kind: 'assistant-step',
          location: turnLocation(8),
          data: {
            finalNode: { seq: 20 },
            blocks: [{ kind: 'text', text: '先按默认页数规划。' }]
          }
        }
      ],
      [
        'steering',
        {
          key: 'steering',
          kind: 'steering',
          location: turnLocation(8),
          data: { content: [{ type: 'text', text: '做5页就行' }] }
        }
      ],
      [
        'assistant-after-steering',
        {
          key: 'assistant-after-steering',
          kind: 'assistant-step',
          location: turnLocation(8),
          data: {
            finalNode: { seq: 40 },
            blocks: [{ kind: 'text', text: '已按你的要求压缩为5页。' }]
          }
        }
      ]
    ])

    expect(
      client.compactConversationFlow(
        ['user', 'assistant-before-steering', 'steering', 'assistant-after-steering'],
        nodes,
        8
      )
    ).toEqual([
      { kind: 'node', key: 'user' },
      {
        kind: 'execution',
        key: 'execution:8',
        turn: 8,
        nodeKeys: ['assistant-before-steering'],
        running: false,
        preserveProgress: true
      },
      { kind: 'node', key: 'steering' },
      {
        kind: 'execution',
        key: 'execution:8:1',
        turn: 8,
        nodeKeys: ['assistant-after-steering'],
        running: true,
        preserveProgress: true
      }
    ])
  })

  it('keeps automatic compaction visibly running when the runtime turn signal is briefly absent', async () => {
    const client = await loadConversationBundle()
    expect(client.compactConversationFlow).toBeTypeOf('function')
    if (typeof client.compactConversationFlow !== 'function') return

    const nodes = new Map([
      ['user', { key: 'user', kind: 'user', location: turnLocation(9), data: {} }],
      [
        'compaction',
        {
          key: 'compaction',
          kind: 'compaction',
          location: turnLocation(9),
          data: { running: true }
        }
      ]
    ])

    expect(client.compactConversationFlow(['user', 'compaction'], nodes, null)).toEqual([
      { kind: 'node', key: 'user' },
      {
        kind: 'execution',
        key: 'execution:9',
        turn: 9,
        nodeKeys: ['compaction'],
        running: true
      }
    ])
  })

  it('extracts only user-facing assistant text into progress updates', async () => {
    const client = await loadConversationBundle()
    expect(client.executionProgressUpdates).toBeTypeOf('function')
    if (typeof client.executionProgressUpdates !== 'function') return

    const updates = client.executionProgressUpdates([
      {
        key: 'assistant-progress',
        kind: 'assistant-step',
        data: {
          status: 'complete',
          blocks: [
            { kind: 'reasoning', text: 'private chain of thought' },
            { kind: 'text', text: '资料范围已经确认，接下来整理核心证据。' },
            { kind: 'tool-call', name: 'bash', argsRaw: 'secret command' }
          ]
        }
      },
      {
        key: 'tool-detail',
        kind: 'tool-call',
        data: { root: { name: 'bash', argsRaw: 'secret command' } }
      }
    ])

    expect(updates).toEqual([
      {
        key: 'assistant-progress',
        blocks: [{ kind: 'text', text: '资料范围已经确认，接下来整理核心证据。' }],
        streaming: false
      }
    ])
  })

  it('keeps the six latest distinct progress updates', async () => {
    const client = await loadConversationBundle()
    expect(client.executionProgressUpdates).toBeTypeOf('function')
    if (typeof client.executionProgressUpdates !== 'function') return

    const progressNode = (key: string, text: string) => ({
      key,
      kind: 'assistant-step',
      data: { status: 'complete', blocks: [{ kind: 'text', text }] }
    })
    const updates = client.executionProgressUpdates([
      progressNode('step-1', '第一段过程反馈'),
      progressNode('step-2', '第二段过程反馈'),
      progressNode('step-3', '第二段过程反馈'),
      progressNode('step-4', '第三段过程反馈'),
      progressNode('step-5', '第四段过程反馈'),
      progressNode('step-6', '第五段过程反馈'),
      progressNode('step-7', '第六段过程反馈'),
      progressNode('step-8', '第七段过程反馈')
    ])

    expect(updates.map((update: { key: string }) => update.key)).toEqual([
      'step-3',
      'step-4',
      'step-5',
      'step-6',
      'step-7',
      'step-8'
    ])
  })

  it('derives high-level progress from settled plan milestones when commentary is absent', async () => {
    const client = await loadConversationBundle()
    expect(client.executionProgressUpdates).toBeTypeOf('function')
    if (typeof client.executionProgressUpdates !== 'function') return

    const updates = client.executionProgressUpdates(
      [
        {
          key: 'settled-plan',
          kind: 'tool-call',
          data: {
            root: {
              kind: 'result',
              call: {
                name: 'todo_write',
                argsRaw: JSON.stringify({
                  todos: [
                    { content: '核验权威资料与关键数字', status: 'completed' },
                    { content: '构建并导出演示文稿', status: 'completed' },
                    { content: '执行逐页版式质检', status: 'in_progress' }
                  ]
                })
              },
              content: []
            }
          }
        }
      ],
      { t: statusTranslator }
    )

    expect(updates.map((update: { blocks: Array<{ text: string }> }) => update.blocks[0]?.text)).toEqual(
      ['阶段进展：核验权威资料与关键数字。', '阶段进展：构建并导出演示文稿。']
    )
  })

  it('derives localized stage milestones from settled tools in older task history', async () => {
    const client = await loadConversationBundle()
    expect(client.executionProgressUpdates).toBeTypeOf('function')
    if (typeof client.executionProgressUpdates !== 'function') return

    const settledTool = (key: string, name: string, args: Record<string, unknown>) => ({
      key,
      kind: 'tool-call',
      data: {
        root: {
          kind: 'result',
          call: { name, argsRaw: JSON.stringify(args) },
          content: []
        }
      }
    })
    const updates = client.executionProgressUpdates(
      [
        settledTool('research', 'web_search', { query: 'future of software development' }),
        settledTool('draft', 'bash', { description: 'Build presentation deck' }),
        settledTool('preview', 'read_image', { path: '/private/contact-sheet.png' }),
        settledTool('verify', 'bash', { description: 'Verify final structure and typography' })
      ],
      { t: statusTranslator }
    )

    expect(updates.map((update: { blocks: Array<{ text: string }> }) => update.blocks[0]?.text)).toEqual(
      [
        '资料检索与信息整理取得阶段进展。',
        '内容编写与文件更新取得阶段进展。',
        '预览渲染与视觉检查取得阶段进展。',
        '方案检查与结果校验取得阶段进展。'
      ]
    )
  })

  it('uses a neutral process label after an execution turn settles', async () => {
    const client = await loadConversationBundle()
    expect(client.executionSummaryStatus).toBeTypeOf('function')
    if (typeof client.executionSummaryStatus !== 'function') return

    expect(client.executionSummaryStatus([], false, statusTranslator)).toBe('执行过程')
  })

  it('injects left alignment for assistant text and wrapped file links', async () => {
    const styles: string[] = []
    await loadConversationBundle(styles)
    const assistantStyles = styles.find((text) => text.includes('.Sxvs8a_root')) ?? ''

    expect(assistantStyles).toContain('.Sxvs8a_root{text-align:left;')
    expect(assistantStyles).toContain('.Sxvs8a_body code>button{text-align:left}')
  })

  it('shows progress only for a running or explicitly expanded execution', async () => {
    const client = await loadConversationBundle()
    expect(client.executionProgressSurface).toBeTypeOf('function')
    if (typeof client.executionProgressSurface !== 'function') return

    const nodes = [
      {
        key: 'assistant-progress',
        kind: 'assistant-step',
        data: {
          status: 'complete',
          blocks: [{ kind: 'text', text: '页面结构已经完成，正在校验版式。' }]
        }
      },
      {
        key: 'tool-detail',
        kind: 'tool-call',
        data: { root: { name: 'bash', argsRaw: 'secret command' } }
      }
    ]

    expect(client.executionProgressSurface(nodes, true, false)).toMatchObject({
      showProgress: true,
      detailNodeKeys: ['tool-detail']
    })
    expect(client.executionProgressSurface(nodes, false, false)).toMatchObject({
      showProgress: false,
      detailNodeKeys: ['tool-detail']
    })
    expect(client.executionProgressSurface(nodes, false, true)).toMatchObject({
      showProgress: true,
      detailNodeKeys: ['tool-detail']
    })
  })

  it('keeps user-facing body text visible in a steering-split execution without expanding details', async () => {
    const client = await loadConversationBundle()
    expect(client.executionProgressSurface).toBeTypeOf('function')
    if (typeof client.executionProgressSurface !== 'function') return

    const surface = client.executionProgressSurface(
      [
        {
          key: 'assistant-before-steering',
          kind: 'assistant-step',
          data: {
            status: 'complete',
            blocks: [{ kind: 'text', text: '规范已确认，接下来进入逐页制作。' }]
          }
        },
        {
          key: 'tool-detail',
          kind: 'tool-call',
          data: { root: { name: 'skill', argsRaw: '{}' } }
        }
      ],
      false,
      false,
      { preserveProgress: true }
    )

    expect(surface).toMatchObject({
      showProgress: true,
      updates: [
        {
          key: 'assistant-before-steering',
          blocks: [{ kind: 'text', text: '规范已确认，接下来进入逐页制作。' }]
        }
      ],
      detailNodeKeys: ['tool-detail']
    })
  })

  it('derives privacy-safe live copy from the actual latest activity', async () => {
    const client = await loadConversationBundle()
    expect(client.executionActivityLabel).toBeTypeOf('function')
    if (typeof client.executionActivityLabel !== 'function') return

    const labels: Record<string, string> = {
      'execution.status.analyzing': '正在分析任务…',
      'execution.status.context': '正在准备任务上下文…',
      'execution.status.reading': '正在读取相关内容…',
      'execution.status.searching': '正在检索项目内容…',
      'execution.status.updating': '正在更新文件…',
      'execution.status.verifying': '正在验证运行结果…'
    }
    const t = (key: string) => labels[key] ?? key

    expect(
      client.executionActivityLabel(
        { kind: 'assistant-step', data: { blocks: [{ kind: 'reasoning', text: '/private/path' }] } },
        t
      )
    ).toBe('正在分析任务…')
    expect(
      client.executionActivityLabel(
        {
          kind: 'tool-call',
          data: { root: { name: 'read', argsRaw: '{"path":"/Users/private/secret.md"}' } }
        },
        t
      )
    ).toBe('正在读取相关内容…')
    expect(
      client.executionActivityLabel(
        {
          kind: 'tool-call',
          data: { root: { name: 'apply_patch', argsRaw: 'password=do-not-show' } }
        },
        t
      )
    ).toBe('正在更新文件…')
    expect(
      client.executionActivityLabel(
        { kind: 'tool-call', data: { root: { name: 'playwright', argsRaw: 'token=hidden' } } },
        t
      )
    ).toBe('正在验证运行结果…')
  })

  it('names the live web-search subject from structured tool arguments', async () => {
    const client = await loadConversationBundle()
    expect(client.executionActivityLabel).toBeTypeOf('function')
    if (typeof client.executionActivityLabel !== 'function') return

    expect(
      client.executionActivityLabel(
        {
          kind: 'tool-call',
          data: {
            root: {
              name: 'web_search',
              argsRaw: JSON.stringify({ query: '人工智能发展史权威资料' })
            }
          }
        },
        statusTranslator
      )
    ).toBe('正在使用互联网搜索“人工智能发展史权威资料”…')
  })

  it('shows a safe model-authored Chinese command intent instead of a generic shell label', async () => {
    const client = await loadConversationBundle()
    expect(client.executionActivityLabel).toBeTypeOf('function')
    if (typeof client.executionActivityLabel !== 'function') return

    expect(
      client.executionActivityLabel(
        {
          kind: 'tool-call',
          data: {
            root: {
              name: 'bash',
              argsRaw: JSON.stringify({
                command: 'node scripts/build-slides.mjs',
                description: '整理人工智能发展史时间线'
              })
            }
          }
        },
        statusTranslator
      )
    ).toBe('正在整理人工智能发展史时间线…')
  })

  it('uses the current plan item when a command description is not localized', async () => {
    const client = await loadConversationBundle()
    expect(client.executionStatusForNodes).toBeTypeOf('function')
    if (typeof client.executionStatusForNodes !== 'function') return

    const nodes = [
      {
        kind: 'tool-call',
        data: {
          root: {
            name: 'todo_write',
            argsRaw: JSON.stringify({
              todos: [
                { content: '检查参考资料', status: 'completed' },
                { content: '撰写人工智能发展史 PPT 文件', status: 'in_progress' }
              ]
            })
          }
        }
      },
      {
        kind: 'tool-call',
        data: {
          root: {
            name: 'bash',
            argsRaw: JSON.stringify({
              command: 'node scripts/build-slides.mjs',
              description: 'Run the presentation generator'
            })
          }
        }
      }
    ]

    expect(client.executionStatusForNodes(nodes, statusTranslator)).toBe(
      '正在撰写人工智能发展史 PPT 文件…'
    )
  })

  it('stops showing planning after todo_write settles and names the active task', async () => {
    const client = await loadConversationBundle()
    expect(client.executionStatusForNodes).toBeTypeOf('function')
    if (typeof client.executionStatusForNodes !== 'function') return

    const settledTodo = {
      kind: 'tool-call',
      data: {
        root: {
          kind: 'result',
          call: {
            name: 'todo_write',
            argsRaw: JSON.stringify({
              todos: [
                { content: '研究 Vibecoding 现状与证据', status: 'completed' },
                { content: '基于唯一品牌源构建并导出 PPTX', status: 'in_progress' },
                { content: '执行版式质检', status: 'pending' }
              ]
            })
          },
          content: []
        }
      }
    }

    expect(client.executionStatusForNodes([settledTodo], statusTranslator)).toBe(
      '正在基于唯一品牌源构建并导出 PPTX…'
    )
  })

  it('derives PPT render and verification phases from the command that is actually running', async () => {
    const client = await loadConversationBundle()
    const executionActivityLabel = client.executionActivityLabel
    expect(executionActivityLabel).toBeTypeOf('function')
    if (typeof executionActivityLabel !== 'function') return

    const activity = (description: string) =>
      executionActivityLabel(
        {
          kind: 'tool-call',
          data: {
            root: {
              name: 'bash',
              argsRaw: JSON.stringify({ command: 'node task.mjs', description })
            }
          }
        },
        statusTranslator
      )

    expect(activity('Render PPT preview images')).toBe('正在渲染 PPT 预览…')
    expect(activity('Validate PPT layout and fonts')).toBe('正在校验 PPT 文件…')
  })

  it('never exposes secrets, commands, paths, or malformed raw arguments in live status', async () => {
    const client = await loadConversationBundle()
    expect(client.executionActivityLabel).toBeTypeOf('function')
    if (typeof client.executionActivityLabel !== 'function') return

    const sensitive = client.executionActivityLabel(
      {
        kind: 'tool-call',
        data: {
          root: {
            name: 'bash',
            argsRaw: JSON.stringify({
              command: 'curl -H "Authorization: Bearer abc" https://private.example',
              description: '检查 /Users/private/token.txt 中的 API_KEY'
            })
          }
        }
      },
      statusTranslator
    )
    const malformed = client.executionActivityLabel(
      { kind: 'tool-call', data: { root: { name: 'bash', argsRaw: '{not-json' } } },
      statusTranslator
    )

    expect(sensitive).toBe('正在执行检查…')
    expect(sensitive).not.toMatch(/private|token|API_KEY|Bearer|curl/i)
    expect(malformed).toBe('正在执行检查…')
  })

  it('removes reasoning and tool-call blocks from the completed answer surface', async () => {
    const client = await loadConversationBundle()
    expect(client.finalAnswerBlocks).toBeTypeOf('function')
    if (typeof client.finalAnswerBlocks !== 'function') return

    const image = { kind: 'image', attachmentId: 'image-1' }
    expect(
      client.finalAnswerBlocks([
        { kind: 'reasoning', text: 'private chain of thought' },
        { kind: 'tool-call', callId: 'call-1', name: 'bash', argsRaw: 'secret command' },
        { kind: 'text', text: '这是最终回答。' },
        image
      ])
    ).toEqual([{ kind: 'text', text: '这是最终回答。' }, image])
  })
})

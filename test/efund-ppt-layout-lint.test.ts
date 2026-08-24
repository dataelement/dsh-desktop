import { spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'

const projectRoot = path.resolve(import.meta.dirname, '..')
const lintScript = path.join(
  projectRoot,
  'skills/efund-ppt-maker/scripts/lint_efund_layouts.py'
)
const scratchDirectories: string[] = []

type LayoutElement = Record<string, unknown>

const footerElements: LayoutElement[] = [
  {
    id: 'footer-rule',
    name: 'footer-divider',
    kind: 'shape',
    geometry: 'line',
    scope: 'slide',
    bbox: [38, 496, 885, 1]
  },
  {
    id: 'footer-company',
    name: 'footer-company',
    kind: 'text',
    scope: 'slide',
    bbox: [38, 504, 220, 12],
    text: '易方达基金管理有限公司',
    resolvedFontSize: 10.7,
    textLayout: { lineCount: 1 }
  },
  {
    id: 'footer-confidentiality',
    name: 'footer-confidentiality',
    kind: 'text',
    scope: 'slide',
    bbox: [390, 504, 230, 12],
    text: '仅供内部交流讨论，禁止外传',
    resolvedFontSize: 10.7,
    textLayout: { lineCount: 1 }
  },
  {
    id: 'footer-page-number',
    name: 'page-number',
    kind: 'text',
    scope: 'slide',
    bbox: [900, 504, 20, 12],
    text: '3',
    resolvedFontSize: 10.7,
    textLayout: { lineCount: 1 }
  }
]

function title(overrides: LayoutElement = {}): LayoutElement {
  return {
    id: 'page-title',
    name: 'page-title',
    kind: 'text',
    textRole: 'page-title',
    scope: 'slide',
    bbox: [38, 22, 650, 28],
    text: '软件供给扩大后，验证与责任成为共同约束',
    resolvedFontSize: 23,
    resolvedTextStyle: { alignment: 'left' },
    textLayout: { lineCount: 1 },
    ...overrides
  }
}

function visual(overrides: LayoutElement = {}): LayoutElement {
  return {
    id: 'visual',
    name: 'primary-visual',
    kind: 'shape',
    scope: 'slide',
    bbox: [520, 160, 300, 180],
    fillColor: '#DFF3F8',
    lineWidth: 0,
    ...overrides
  }
}

function runLint(
  elements: LayoutElement[],
  entryOverrides: Record<string, unknown> = {},
  includeFooter = true
) {
  const root = mkdtempSync(path.join(tmpdir(), 'efund-layout-lint-'))
  scratchDirectories.push(root)
  const layoutDir = path.join(root, 'layouts')
  const reportPath = path.join(root, 'report.json')
  const layoutPath = path.join(layoutDir, 'slide-001.layout.json')
  const mapPath = path.join(root, 'template-frame-map.json')
  const allElements = includeFooter ? [...elements, ...footerElements] : elements
  mkdirSync(layoutDir)

  writeFileSync(
    layoutPath,
    `${JSON.stringify(
      {
        slide: { slide: 1, frame: { left: 0, top: 0, width: 960, height: 540 } },
        elements: allElements
      },
      null,
      2
    )}\n`,
    { encoding: 'utf8', flag: 'wx' }
  )
  writeFileSync(
    mapPath,
    `${JSON.stringify(
      {
        schemaVersion: '1.0',
        singleSourcePptx: 'assets/efund-ai-platform-v21.pptx',
        outputSlides: [
          {
            outputSlide: 1,
            buildMode: 'original-in-brand-shell',
            moduleCount: 1,
            layoutDecision: {
              contentStructure: '证据',
              readingOrder: '左侧解释到右侧证据',
              primaryVisual: '右侧主视觉',
              geometryPlan: '解释区与证据区组成非对称双区',
              caseInfluence: ['V21 第3页：证据双区语法'],
              whyNotDirectReuse: '内容模块与源页不同',
              originalityEvidence: ['列宽由当前证据量决定']
            },
            visualTextBinding: {
              visualType: 'diagram',
              supportsClaim: '验证与责任需要同步进入软件供给体系',
              textAnchor: '页面标题与左侧解释',
              sourceOrGeneration: '本页可编辑矢量图形',
              whyThisVisual: '关系图同时呈现供给扩张与约束机制',
              informationCarried: '供给扩大后约束同步增强的关系',
              visualObjectIds: ['visual']
            },
            editTargets: [],
            ...entryOverrides
          }
        ]
      },
      null,
      2
    )}\n`,
    'utf8'
  )

  const result = spawnSync(
    'python3',
    [lintScript, layoutDir, '--map', mapPath, '--json-output', reportPath],
    { cwd: projectRoot, encoding: 'utf8' }
  )
  const report = JSON.parse(readFileSync(reportPath, 'utf8')) as {
    issues: Array<{ code: string }>
  }
  return {
    status: result.status,
    codes: report.issues.map((item) => item.code),
    stdout: result.stdout,
    stderr: result.stderr
  }
}

afterEach(() => {
  while (scratchDirectories.length) {
    rmSync(scratchDirectories.pop()!, { recursive: true, force: true })
  }
})

describe('efund PowerPoint layout lint hard gates', () => {
  it('rejects a wrapped top-bar title even when the runtime reports points', () => {
    const result = runLint([
      title({
        bbox: [38, 18, 650, 52],
        text: 'AI开发工具已进入多数使用阶段，Agent仍处于\n早期扩张',
        textLayout: { lineCount: 2 }
      }),
      visual()
    ])

    expect(result.codes, result.stdout).toContain('wrapped-title')
  })

  it('rejects a normal content slide that drops the complete brand footer', () => {
    const result = runLint([title(), visual()], {}, false)

    expect(result.codes, result.stdout).toContain('missing-brand-footer-furniture')
  })

  it('rejects centered explanatory body text', () => {
    const result = runLint([
      title(),
      visual(),
      {
        id: 'body-copy',
        name: 'narrative-explanation',
        kind: 'text',
        textRole: 'body',
        scope: 'slide',
        bbox: [60, 140, 360, 90],
        text: '任务属性决定采用顺序；失败后果有限的场景更容易进入日常。',
        resolvedFontSize: 16,
        resolvedTextStyle: { alignment: 'center' },
        textLayout: { lineCount: 2 },
        paragraphs: [{ resolvedTextStyle: { alignment: 'center' }, runs: [] }]
      }
    ])

    expect(result.codes, result.stdout).toContain('body-text-not-left-aligned')
  })

  it('rejects a connector that enters the text safety envelope', () => {
    const result = runLint([
      title(),
      visual(),
      {
        id: 'relationship-connector',
        name: 'relationship-connector',
        kind: 'shape',
        geometry: 'line',
        scope: 'slide',
        bbox: [300, 250, 220, 1],
        lineStart: [300, 250],
        lineEnd: [520, 250]
      },
      {
        id: 'relationship-label',
        name: 'relationship-label',
        kind: 'text',
        textRole: 'body',
        scope: 'slide',
        bbox: [390, 235, 110, 30],
        text: '岗位与教育',
        resolvedFontSize: 16,
        resolvedTextStyle: { alignment: 'left' },
        textLayout: { lineCount: 1 }
      }
    ])

    expect(result.codes, result.stdout).toContain('connector-text-clearance')
  })

  it('rejects repeated modules that violate their declared alignment grid', () => {
    const result = runLint(
      [
        title(),
        visual({ id: 'm1', name: 'peer-module-1', bbox: [100, 180, 150, 100] }),
        visual({ id: 'm2', name: 'peer-module-2', bbox: [300, 183, 145, 100] }),
        visual({ id: 'm3', name: 'peer-module-3', bbox: [505, 180, 150, 96] })
      ],
      {
        moduleCount: 3,
        visualTextBinding: {
          visualType: 'diagram',
          supportsClaim: '三项控制共同约束软件供给',
          textAnchor: '页面标题',
          sourceOrGeneration: '三个可编辑同级模块',
          whyThisVisual: '并列模块用于比较三项同级控制',
          informationCarried: '三项控制的同级关系',
          visualObjectIds: ['m1', 'm2', 'm3']
        },
        alignmentGroups: [
          {
            name: '三项同级控制',
            objectIds: ['m1', 'm2', 'm3'],
            checks: ['top', 'width', 'height', 'horizontal-gap'],
            tolerancePx: 2
          }
        ]
      }
    )

    expect(result.codes, result.stdout).toContain('alignment-group-violation')
  })

  it('rejects text-bearing shapes without the minimum inner safe distance', () => {
    const result = runLint([
      title(),
      visual(),
      {
        id: 'tight-body-shape',
        name: 'body-container',
        kind: 'shape',
        geometry: 'rect',
        textRole: 'body',
        scope: 'slide',
        bbox: [80, 170, 260, 90],
        text: '说明文字与图形边缘必须留出安全距离',
        textInsets: { left: 4, right: 4, top: 4, bottom: 4 },
        resolvedFontSize: 16,
        resolvedTextStyle: { alignment: 'left' },
        textLayout: { lineCount: 2 },
        fillColor: '#DFF3F8',
        lineWidth: 0
      }
    ])

    expect(result.codes, result.stdout).toContain('text-inset-clearance')
  })

  it('allows deliberate centering for short node labels on a clean grid', () => {
    const result = runLint(
      [
        title(),
        {
          id: 'node-a',
          name: 'node-label-a',
          kind: 'shape',
          geometry: 'rect',
          textRole: 'node-label',
          scope: 'slide',
          bbox: [100, 180, 100, 60],
          text: '输入',
          resolvedFontSize: 16,
          resolvedTextStyle: { alignment: 'center' },
          textLayout: { lineCount: 1 },
          fillColor: '#DFF3F8',
          lineWidth: 0
        },
        {
          id: 'node-b',
          name: 'node-label-b',
          kind: 'shape',
          geometry: 'rect',
          textRole: 'node-label',
          scope: 'slide',
          bbox: [500, 180, 100, 60],
          text: '输出',
          resolvedFontSize: 16,
          resolvedTextStyle: { alignment: 'center' },
          textLayout: { lineCount: 1 },
          fillColor: '#005096',
          lineWidth: 0
        },
        {
          id: 'node-connector',
          name: 'relationship-connector',
          kind: 'shape',
          geometry: 'line',
          scope: 'slide',
          bbox: [200, 210, 300, 0],
          lineStart: [200, 210],
          lineEnd: [500, 210],
          fromId: 'node-a',
          toId: 'node-b'
        }
      ],
      {
        moduleCount: 2,
        visualTextBinding: {
          visualType: 'diagram',
          supportsClaim: '输入经过治理后形成输出',
          textAnchor: '页面标题',
          sourceOrGeneration: '两个节点和一条可编辑连接线',
          whyThisVisual: '节点关系直接表达输入到输出的方向',
          informationCarried: '输入、输出及两者之间的方向',
          visualObjectIds: ['node-a', 'node-b', 'node-connector']
        },
        alignmentGroups: [
          {
            name: '输入输出节点',
            objectIds: ['node-a', 'node-b'],
            checks: ['top', 'width', 'height'],
            tolerancePx: 2
          }
        ]
      }
    )

    expect(result.status, `${result.stdout}\n${result.stderr}`).toBe(0)
    expect(result.codes).toEqual([])
  })
})

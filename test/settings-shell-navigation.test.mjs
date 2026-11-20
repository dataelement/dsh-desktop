import { readFile } from 'node:fs/promises'
import vm from 'node:vm'
import { describe, expect, it, vi } from 'vitest'

const sourceUrl = new URL('../node_modules/@deepseek-ai/dsh-client-ui-settings-general/lib/client.js', import.meta.url)
const flatten = node => !node || typeof node !== 'object' ? [] : Array.isArray(node)
  ? node.flatMap(flatten) : [node, ...flatten(node.props?.children)]

async function settingsShell() {
  let plugin
  let root
  const jsx = (type, props, key) => ({ type, props, key })
  const modal = vi.fn()
  const react = {
    useState: initial => [typeof initial === 'function' ? initial() : initial, () => {}],
    useRef: current => ({ current }),
    useId: () => 'settings-title',
    useEffect() {},
    useLayoutEffect() {},
    useCallback: callback => callback
  }
  const dependencies = {
    react,
    'react/jsx-runtime': { jsx, jsxs: jsx, Fragment: 'fragment' },
    'react-dom': { createPortal: node => node },
    '@deepseek-ai/dsh-client-ui-primitives': { useModalLayer: modal },
    '@deepseek-ai/dsh-client-ui-slots': {},
    '@deepseek-ai/dsh-client-store': {
      defineStore: () => ({ create: () => ({ actions: { open() {} } }) }),
      createSnapshotStore: value => ({ getSnapshot: () => value, subscribe: () => () => {} })
    }
  }
  // Evaluate the unchanged installed factory. No private component exports or
  // extracted snippets: obtain SettingsRoot through its real slot registration.
  const sandbox = {
    window: { __ModuleLoader__: { load({ factory }) {
      plugin = factory(id => {
        if (!(id in dependencies)) throw new Error('Unexpected dependency: ' + id)
        return dependencies[id]
      })
    } } }
  }
  vm.runInNewContext(await readFile(sourceUrl, 'utf8'), sandbox)
  sandbox.document = { body: {}, querySelector() { throw new Error('Focus must use owned refs') } }
  plugin.apply({
    slots: {
      inject(name, callback) { if (name === 'sidebar.settings') return callback() },
      register(options, component) {
        if (options.name === 'sidebar.settings') root = component
        return () => {}
      }
    },
    effect() {},
    locale: { bind: () => key => key },
    get: () => ({}),
    remote: { $host: { isLoopback: false } },
    remoteAccess: { whenAccess: (_name, callback) => callback() },
    shortcuts: { register: () => () => {} }
  })
  expect(root).toBeTypeOf('function')
  const actions = { open: vi.fn(), close: vi.fn(), openSection: vi.fn(), select: vi.fn() }
  const slots = []
  const props = {
    wide: true,
    actions,
    useStore: select => select({ open: true, activeId: 'custom' }),
    useShortcuts: select => select([]),
    useSections: select => select([{ id: 'general', label: 'General' }, { id: 'custom', label: 'Custom section with a long label' }]),
    useOnboardingSteps: select => select([]),
    useSessions: select => select({ phase: 'loading' }),
    useDesktopUpdate: select => select({}),
    useConnectionState: select => select('connected'),
    renderSlot(name, owner, options) { slots.push({ name, owner, options }); return null },
    t: key => key
  }
  function render(overrides = {}) {
    slots.length = 0
    return root({ ...props, ...overrides })
  }
  function panel(tree) {
    const element = flatten(tree).find(node => node.type?.name === 'SettingsPanel')
    expect(element).toBeDefined()
    return element.type(element.props)
  }
  return { actions, props, slots, render, panel, modal }
}

describe('settings public shell navigation', () => {
  it('opens only a registered section through the launcher callback and preserves ordinary open', async () => {
    const shell = await settingsShell()
    shell.render()
    const launcher = shell.slots.find(slot => slot.name === 'settings.launcher').owner
    expect(launcher.wide).toBe(true)
    expect(launcher.settingsOpen).toBe(true)
    launcher.openSettings()
    expect(shell.actions.open).toHaveBeenCalledTimes(1)
    launcher.openSettingsSection('custom')
    expect(shell.actions.openSection).toHaveBeenCalledExactlyOnceWith('custom')
    for (const id of ['missing', '', '__proto__', undefined, { id: 'custom' }]) launcher.openSettingsSection(id)
    expect(shell.actions.openSection).toHaveBeenCalledTimes(1)
    expect(shell.actions.close).not.toHaveBeenCalled()

    // The next slot render follows the latest ledger snapshot, so an unloaded
    // section cannot be reopened through a newly rendered launcher.
    shell.render({ useSections: select => select([{ id: 'general', label: 'General' }]) })
    const updated = shell.slots.find(slot => slot.name === 'settings.launcher').owner
    updated.openSettingsSection('custom')
    updated.openSettingsSection('general')
    expect(shell.actions.openSection).toHaveBeenCalledTimes(2)
    expect(shell.actions.openSection).toHaveBeenLastCalledWith('general')
  })

  it.each(['custom', 'general', 'missing'])('focuses the actual active navigation and Close refs for activeId=%s', async activeId => {
    const shell = await settingsShell()
    const tree = shell.panel(shell.render({ useStore: select => select({ open: true, activeId }) }))
    const section = shell.slots.find(slot => slot.name === 'settings.section')
    const expected = activeId === 'custom' ? 'custom' : 'general'
    expect(section.options.only).toBe(expected)
    const buttons = flatten(tree).filter(node => node.type === 'button')
    const active = buttons.find(node => node.props['aria-current'] === 'true')
    const inactive = buttons.find(node => node.props['aria-current'] === undefined && node.key !== undefined)
    const close = buttons.find(node => node.props.onClick === shell.actions.close)
    expect(active.key).toBe(expected)
    expect(inactive.props.ref).toBeUndefined()
    const navFocus = vi.fn()
    const closeFocus = vi.fn()
    active.props.ref.current = { focus: navFocus }
    close.props.ref.current = { focus: closeFocus }
    section.owner.focusShell('previous')
    expect(navFocus).toHaveBeenCalledTimes(1)
    expect(closeFocus).not.toHaveBeenCalled()
    section.owner.focusShell('next')
    expect(closeFocus).toHaveBeenCalledTimes(1)
    section.owner.focusShell('invalid')
    expect(navFocus).toHaveBeenCalledTimes(1)
    expect(closeFocus).toHaveBeenCalledTimes(1)
    expect(shell.actions.select).not.toHaveBeenCalled()
    expect(shell.actions.close).not.toHaveBeenCalled()
    expect(shell.modal).toHaveBeenCalledWith(expect.any(Object), true, shell.actions.close)

    // Ref detachment during unmount is safe; no DOM lookup fallback is used.
    active.props.ref.current = null
    close.props.ref.current = null
    expect(() => section.owner.focusShell('previous')).not.toThrow()
    expect(() => section.owner.focusShell('next')).not.toThrow()
    expect(navFocus).toHaveBeenCalledTimes(1)
    expect(closeFocus).toHaveBeenCalledTimes(1)
  })

  it('keeps the section close callback and shell close button wired to onClose', async () => {
    const shell = await settingsShell()
    const tree = shell.panel(shell.render())
    const section = shell.slots.find(slot => slot.name === 'settings.section')
    expect(section.owner.close).toBe(shell.actions.close)
    section.owner.close()
    expect(shell.actions.close).toHaveBeenCalledTimes(1)
    const closeButton = flatten(tree).find(node => node.type === 'button' && node.props.onClick === shell.actions.close)
    closeButton.props.onClick()
    expect(shell.actions.close).toHaveBeenCalledTimes(2)
  })

  it('leaves an empty section ledger empty and ignores launcher navigation', async () => {
    const shell = await settingsShell()
    const tree = shell.render({ useSections: select => select([]) })
    shell.slots.find(slot => slot.name === 'settings.launcher').owner.openSettingsSection('general')
    expect(shell.actions.openSection).not.toHaveBeenCalled()
    shell.panel(tree)
    expect(shell.slots.filter(slot => slot.name === 'settings.section')).toHaveLength(0)
    expect(flatten(tree).filter(node => node.type?.name === 'SettingsPanel')).toHaveLength(1)
  })
})

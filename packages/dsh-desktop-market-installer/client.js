window.__ModuleLoader__.load({
  id: 'dsh-desktop-market-installer',
  factory: (require) => {
    const module = { exports: {} }
    const exports = module.exports
    Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' })
    const React = require('react')

    const NS = 'settings.desktopMarketInstaller'
    const MARKET_PACKAGE = 'dshmarket'
    const RECOMMENDED_MARKET_VERSION = '^1.66.47'
    const MARKET_REPOSITORY = 'https://github.com/dsh-market/dsh-market'

    const en = {
      nav: 'Plugin market',
      title: 'Plugin market',
      intro: 'Install dsh-market to browse, search, install, and manage community plugins inside DSH Desktop.',
      community: 'dsh-market is maintained by its community; installing and using community plugins requires network access, those plugins are not reviewed by DSH Desktop, and after installation dsh-market will notify you when its own updates are available.',
      version: 'Recommended version',
      install: 'Install plugin market',
      enable: 'Enable plugin market',
      update: 'Update/reinstall recommended version',
      updateFailed: 'Recommended plugin market update failed.',
      updateRestartHint: 'Recommended version saved. Restart Harness to apply the replacement; the enabled setting is preserved.',
      updateAppliedHint: 'Recommended version updated; the enabled setting is preserved.',
      updateBlocked: 'The installed version is outside the recommended major version or unknown. Replacement is unavailable to avoid a downgrade.',
      appliedHint: 'Plugin market is enabled.',
      removedAppliedHint: 'dsh-market has been removed.',
      installing: 'Installing plugin market…',
      installingHint: 'This can take a few minutes. Keep DSH Desktop open while pnpm downloads and configures the plugin.',
      installed: 'Plugin market installed',
      installedHint: 'Restart Harness once to load the complete market interface.',
      restart: 'Restart Harness',
      restarting: 'Restarting…',
      retry: 'Try again',
      incomplete: 'The previous installation is incomplete. Run the installer again to repair it.',
      failed: 'Plugin market could not be installed.',
      statusFailed: 'Could not read installation status.',
      repository: 'View dsh-market on GitHub',
      repositoryButton: 'View on GitHub',
      futureUpdates: 'After installation, dsh-market will notify you when its own updates are available.',
      managementTab: 'Plugin market',
      managementIntro: 'Manage the optional dsh-market integration installed by DSH Desktop.',
      installedVersion: 'Installed version',
      uninstall: 'Uninstall plugin market',
      uninstalling: 'Uninstalling plugin market…',
      uninstallingHint: 'Removing dsh-market from the web profile. Other plugins are not affected.',
      uninstallConfirmTitle: 'Uninstall plugin market?',
      uninstallConfirmDesc: 'Only dsh-market will be removed. Other plugins installed through the market will remain installed.',
      uninstallConfirmNote: 'Restart Harness after removal to finish unloading the market interface.',
      cancel: 'Cancel',
      removed: 'Plugin market uninstalled',
      removedHint: 'dsh-market has been removed. Restart Harness to finish.',
      uninstallFailed: 'Plugin market could not be uninstalled.',
      builtInImageTitle: 'Built-in image generation', builtInImageEnabled: 'The built-in plugin is on.', builtInImageDisabled: 'The built-in plugin is off. You can use the market version.', builtInImageEnable: 'Enable built-in plugin', builtInImageConflict: 'Disable the market version of image generation before enabling the built-in plugin.', builtInImageFailed: 'Could not read or change the built-in plugin state.', builtInImageRetry: 'Try again', builtInImageRestart: 'Restart Harness to apply', builtInImagePending: 'The built-in plugin will load after Harness restarts.'
    }

    const zh = {
      nav: '插件市场',
      title: '插件市场',
      intro: '安装 dsh-market，在 DSH Desktop 内浏览、搜索、安装并管理社区插件。',
      community: 'dsh-market 由社区维护，安装和使用社区插件需要联网且不由 DSH Desktop 审核，安装后有新版本时会提示并提供升级。',
      version: '推荐版本',
      install: '安装插件市场',
      enable: '启用插件市场',
      update: '更新/重新安装推荐版本',
      updateFailed: '推荐插件市场版本更新失败。',
      updateRestartHint: '推荐版本已保存，重启 Harness 后应用替换；当前启用设置保持不变。',
      updateAppliedHint: '推荐版本已更新，当前启用设置保持不变。',
      updateBlocked: '当前版本不属于推荐主版本或版本未知，为避免降级，不能替换为推荐版本。',
      appliedHint: '插件市场已启用。',
      removedAppliedHint: 'dsh-market 已移除。',
      installing: '正在安装插件市场…',
      installingHint: '下载和配置可能需要几分钟，请保持 DSH Desktop 处于打开状态。',
      installed: '插件市场已安装',
      installedHint: '重启一次 Harness，即可加载完整的插件市场界面。',
      restart: '重启 Harness',
      restarting: '正在重启…',
      retry: '重试',
      incomplete: '上一次安装没有完成，请重新运行安装以修复。',
      failed: '插件市场安装失败。',
      statusFailed: '无法读取安装状态。',
      repository: '在 GitHub 查看 dsh-market',
      repositoryButton: '在 GitHub 查看',
      futureUpdates: '安装后，dsh-market 会在有新版本时提示并提供升级。',
      managementTab: '插件市场',
      managementIntro: '管理由 DSH Desktop 安装的可选 dsh-market 集成。',
      installedVersion: '当前版本',
      uninstall: '卸载插件市场',
      uninstalling: '正在卸载插件市场…',
      uninstallingHint: '正在从 web profile 中移除 dsh-market，其他插件不会受到影响。',
      uninstallConfirmTitle: '卸载插件市场？',
      uninstallConfirmDesc: '只会移除 dsh-market。通过插件市场安装的其他插件将继续保留。',
      uninstallConfirmNote: '移除完成后需要重启 Harness，插件市场界面才会完全退出。',
      cancel: '取消',
      removed: '插件市场已卸载',
      removedHint: 'dsh-market 已移除，请重启 Harness 完成卸载。',
      uninstallFailed: '插件市场卸载失败。',
      builtInImageTitle: '内置生图工具', builtInImageEnabled: '内置插件已启用。', builtInImageDisabled: '内置插件已关闭，可以使用市场版本。', builtInImageEnable: '启用内置插件', builtInImageConflict: '请先停用市场版本的生图工具，再启用内置插件。', builtInImageFailed: '无法读取或更改内置插件状态。', builtInImageRetry: '重试', builtInImageRestart: '重启 Harness 使更改生效', builtInImagePending: '重启 Harness 后将加载内置插件。'
    }

    const css = `
      .dshDesktopMarketSection{box-sizing:border-box;max-width:720px;color:var(--dsw-alias-label-primary);display:flex;flex-direction:column;gap:16px}
      .dshDesktopMarketTitle{margin:0;font-size:20px;font-weight:600;line-height:30px}
      .dshDesktopMarketIntro{margin:0;color:var(--dsw-alias-label-secondary);font-size:14px;line-height:22px}
      .dshDesktopMarketCard{box-sizing:border-box;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-module-platform);border-radius:20px;padding:22px;display:flex;flex-direction:column;gap:18px}
      .dshDesktopMarketMark{width:46px;height:46px;border:1px solid var(--dsw-alias-border-l2);border-radius:12px;background:var(--dsw-alias-bg-layer-1);display:grid;grid-template-columns:repeat(2,10px);grid-auto-rows:10px;place-content:center;gap:4px}
      .dshDesktopMarketMark span{display:block;border-radius:3px;background:var(--dsw-alias-label-primary)}
      .dshDesktopMarketMark span:nth-child(4){opacity:.28}
      .dshDesktopMarketHead{display:flex;align-items:flex-start;gap:14px}
      .dshDesktopMarketIdentity{min-width:0;display:flex;flex-direction:column;gap:3px}
      .dshDesktopMarketName{font-size:16px;font-weight:600;line-height:24px}
      .dshDesktopMarketVersion{color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:18px}
      .dshDesktopMarketNotice{margin:0;padding-top:16px;border-top:1px solid var(--dsw-alias-border-l2);color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:19px}
      .dshDesktopMarketStatus{display:flex;flex-direction:column;gap:5px}
      .dshDesktopMarketStatusTitle{font-size:14px;font-weight:600;line-height:22px}
      .dshDesktopMarketStatusDetail{margin:0;color:var(--dsw-alias-label-secondary);font-size:13px;line-height:20px;overflow-wrap:anywhere}
      .dshDesktopMarketActions{display:flex;flex-wrap:wrap;align-items:center;gap:10px}
      .dshDesktopMarketButton{box-sizing:border-box;height:36px;padding:0 16px;border:1px solid transparent;border-radius:18px;font:inherit;font-size:14px;font-weight:500;cursor:pointer}
      .dshDesktopMarketPrimary{color:var(--dsw-alias-label-primary-foreground);background:var(--dsw-alias-button-primary-fill)}
      .dshDesktopMarketPrimary:hover:not(:disabled){background:var(--dsw-alias-button-primary-hover)}
      .dshDesktopMarketSecondary{color:var(--dsw-alias-label-primary);background:transparent;border-color:var(--dsw-alias-border-l3)}
      .dshDesktopMarketSecondary:hover:not(:disabled){background:var(--dsw-alias-bg-layer-2)}
      .dshDesktopMarketButton:disabled{cursor:default;opacity:.5}
      .dshDesktopMarketIconButton{display:inline-flex;align-items:center;gap:8px;text-decoration:none;line-height:34px}
      .dshDesktopMarketIconButton svg{width:16px;height:16px;flex:none;fill:currentColor}
      .dshDesktopMarketButton:focus-visible,.dshDesktopMarketLink:focus-visible{outline:none;box-shadow:0 0 0 2px var(--dsw-alias-border-l3)}
      .dshDesktopMarketLink{color:var(--dsw-alias-label-secondary);border-radius:6px;padding:5px 4px;font-size:13px;line-height:20px;text-decoration:none}
      .dshDesktopMarketLink:hover{color:var(--dsw-alias-label-primary);text-decoration:underline}
      .dshDesktopMarketSpinner{box-sizing:border-box;width:16px;height:16px;border:2px solid var(--dsw-alias-border-l2);border-top-color:var(--dsw-alias-label-primary);border-radius:50%;animation:dshDesktopMarketSpin .75s linear infinite}
      .dshDesktopMarketBusy{display:flex;align-items:center;gap:9px}
      .dshDesktopMarketError{color:var(--dsw-alias-state-error-primary)}
      .dshDesktopBuiltInImage{list-style:none;border:.5px solid var(--dsw-alias-border-l4);background:var(--dsw-alias-bg-layer-3);border-radius:16px;padding:16px;display:flex;flex-direction:column;gap:10px;color:var(--dsw-alias-label-primary)}.dshDesktopBuiltInImageTitle{font-size:15px;font-weight:600}.dshDesktopBuiltInImageHint{margin:0;font-size:12px;line-height:1.5;color:var(--dsw-alias-label-tertiary)}.dshDesktopBuiltInImageLabel{display:flex;align-items:center;gap:8px;font-size:13px;cursor:pointer}.dshDesktopBuiltInImageLabel input{accent-color:var(--dsw-alias-brand-primary)}
      .dshDesktopMarketModalBackdrop{position:fixed;inset:0;z-index:1000;display:grid;place-items:center;padding:24px;background:rgba(0,0,0,.42)}
      .dshDesktopMarketModal{box-sizing:border-box;width:min(440px,100%);padding:24px;border:1px solid var(--dsw-alias-border-l2);border-radius:16px;background:var(--dsw-alias-bg-layer-1);box-shadow:0 18px 48px rgba(0,0,0,.18);display:flex;flex-direction:column;gap:12px}
      .dshDesktopMarketModalTitle{margin:0;font-size:18px;font-weight:600;line-height:26px}
      .dshDesktopMarketModalText{margin:0;color:var(--dsw-alias-label-secondary);font-size:14px;line-height:22px}
      .dshDesktopMarketModalNote{margin:0;color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:19px}
      .dshDesktopMarketModalActions{display:flex;justify-content:flex-end;gap:10px;padding-top:8px}
      @keyframes dshDesktopMarketSpin{to{transform:rotate(360deg)}}
      @media (prefers-reduced-motion:reduce){.dshDesktopMarketSpinner{animation:none}}
    `

    const GITHUB_ICON_PATH =
      'M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8z'

    function GitHubIcon() {
      return React.createElement(
        'svg',
        { viewBox: '0 0 16 16', 'aria-hidden': 'true', focusable: 'false' },
        React.createElement('path', { d: GITHUB_ICON_PATH })
      )
    }

    function installStyles() {
      if (document.querySelector('style[data-plugin-css="dsh-desktop-market-installer"]')) return
      const style = document.createElement('style')
      style.dataset.plugin = 'dsh-desktop-market-installer'
      style.dataset.pluginCss = 'dsh-desktop-market-installer'
      style.textContent = css
      document.head.appendChild(style)
      return () => style.remove()
    }

    function marketAlreadyComposed() {
      const entries = globalThis.__DSH_BOOT__?.entries
      return Array.isArray(entries) && entries.some((entry) => entry?.id === 'dshmarket')
    }

    function BuiltInImageControl({ t }) {
      const [state, setState] = React.useState(null)
      const [busy, setBusy] = React.useState(false)
      const [restart, setRestart] = React.useState(false)
      const [error, setError] = React.useState('')
      const [retry, setRetry] = React.useState(0)
      React.useEffect(() => {
        const desktop = globalThis.dshDesktop
        if (!desktop?.getBuiltInImageGenerationStatus) { setError('builtInImageFailed'); return }
        let active = true
        void desktop.getBuiltInImageGenerationStatus().then(result => {
          if (active) { setState(result); setError('') }
        }, () => { if (active) setError('builtInImageFailed') })
        return () => { active = false }
      }, [retry])
      if (!state && !error) return null
      const enable = async event => {
        event.preventDefault()
        setBusy(true); setError('')
        try {
          const result = await globalThis.dshDesktop.setBuiltInImageGenerationEnabled(true)
          if (!result.ok) { setError(result.reason === 'market-active' ? 'builtInImageConflict' : 'builtInImageFailed'); return }
          setState(previous => ({ ...previous, enabled: true }))
          setRestart(result.restartRequired === true)
          if (result.restartRequired === true) window.dispatchEvent(new CustomEvent('dsh-desktop-restart-required', { detail: { source: 'image', restartRequired: true } }))
        } catch { setError('builtInImageFailed') }
        finally { setBusy(false) }
      }
      const restartHarness = async () => {
        setBusy(true); setError('')
        try {
          const result = await globalThis.dshDesktop.restartHarness()
          if (!result.ok) setError('builtInImageFailed')
        } catch { setError('builtInImageFailed') }
        finally { setBusy(false) }
      }
      return React.createElement('section', { className: 'dshDesktopBuiltInImage', 'data-testid': 'built-in-image-generation-control' },
        React.createElement('span', { className: 'dshDesktopBuiltInImageTitle' }, t('builtInImageTitle')),
        state && React.createElement('p', { className: 'dshDesktopBuiltInImageHint' }, t(restart ? 'builtInImagePending' : state.enabled ? 'builtInImageEnabled' : 'builtInImageDisabled')),
        state?.marketActive && !restart && !state.enabled && React.createElement('p', { className: 'dshDesktopBuiltInImageHint' }, t('builtInImageConflict')),
        state && !state.enabled && React.createElement('label', { className: 'dshDesktopBuiltInImageLabel' },
          React.createElement('input', { type: 'checkbox', role: 'switch', checked: restart, disabled: busy || restart || state.marketActive, onChange: enable }), t('builtInImageEnable')),
        error && React.createElement('p', { className: 'dshDesktopMarketError', role: 'alert' }, t(error)),
        !state && error && React.createElement('button', { className: 'dshDesktopMarketButton dshDesktopMarketSecondary', type: 'button', onClick: () => { setError(''); setRetry(value => value + 1) } }, t('builtInImageRetry')),
        restart && React.createElement('button', { className: 'dshDesktopMarketButton dshDesktopMarketSecondary', type: 'button', disabled: busy, onClick: restartHarness }, t('builtInImageRestart')))
    }

    // Keep the ordinary manager's inventory and application outcome separate:
    // a persisted selection may still need a restart, or fail to apply.
    function canUpdateRecommendation(status) {
      return status?.installed && /^1[.]\d+[.]\d+(?:[-+].*)?$/.test(status.installedVersion || '')
    }

    function createMarketController(ctx) {
      let disposed = false
      let ticket = 0
      let busy = false
      let snapshot = { status: undefined, error: undefined }
      const listeners = new Set()
      const publish = (patch) => {
        if (disposed) return
        snapshot = { ...snapshot, ...patch }
        for (const listener of listeners) listener()
      }
      const message = (failure) => failure?.diagnostic || failure?.message || failure?.code || String(failure)
      const unwrap = (result) => {
        if (!result?.ok) throw new Error(message(result?.error || 'Plugin manager unavailable'))
        return result.value
      }
      const refresh = async () => {
        if (disposed) return
        const current = ++ticket
        try {
          const bundles = unwrap(await ctx.remote.pluginManager.listBundles())
          if (!Array.isArray(bundles)) throw new Error('Invalid plugin inventory')
          if (disposed || current !== ticket) return
          const bundle = bundles.find(item => item?.name === MARKET_PACKAGE)
          const previous = snapshot.status
          const phase = bundle?.availability === 'missing' ? 'incomplete'
            : bundle?.installed || bundle?.availability === 'installation' ? 'installed' : 'absent'
          publish({ status: { ...previous, phase: busy ? previous?.phase : phase,
            recommendedVersion: RECOMMENDED_MARKET_VERSION, installedVersion: bundle?.version,
            enabled: bundle?.enabled === true, removable: bundle?.removable === true,
            installed: phase === 'installed', detail: bundle?.error?.diagnostic }, error: undefined })
        } catch (failure) {
          if (current === ticket) publish({ error: message(failure) })
        }
      }
      const change = async (operation) => {
        if (disposed || busy) return
        if (operation === 'update' && !canUpdateRecommendation(snapshot.status)) {
          publish({ error: ctx.locale.bind(NS)('updateBlocked') })
          return
        }
        const selected = snapshot.status?.enabled === true
        busy = true
        ++ticket // Invalidate inventory reads started before this operation.
        publish({ error: undefined, status: { ...snapshot.status,
          phase: operation === 'remove' ? 'uninstalling' : 'installing', operation } })
        let failure
        let value
        try {
          const manager = ctx.remote.pluginManager
          const result = operation === 'remove' ? await manager.removeBundle(MARKET_PACKAGE)
            : operation === 'enable' ? await manager.setBundleEnabled(MARKET_PACKAGE, true)
            : operation === 'update' ? await manager.installBundle(MARKET_PACKAGE + '@' + RECOMMENDED_MARKET_VERSION,
              { expectedName: MARKET_PACKAGE, replace: true, enabled: selected })
            : await manager.installBundle(MARKET_PACKAGE + '@' + RECOMMENDED_MARKET_VERSION, { enabled: true })
          value = unwrap(result)
          if (!['applied', 'restart-required'].includes(value?.application) ||
              (operation === 'remove' && value.changed === false)) {
            throw new Error(message(value?.error || value?.application || 'Invalid plugin change result'))
          }
        } catch (error) {
          failure = message(error)
        }
        if (disposed) { busy = false; return }
        // Show an actionable terminal state even when the inventory refresh fails.
        publish({ status: { ...snapshot.status,
          phase: failure ? 'error' : operation === 'remove' ? 'uninstalled' : 'installed',
          application: failure ? undefined : value.restartRequired ? 'restart-required' : value.application,
          enabled: operation === 'update' ? selected : !failure && operation !== 'remove',
          installedVersion: value?.version || snapshot.status?.installedVersion } })
        await refresh()
        if (failure) publish({ error: failure })
        busy = false
      }
      return {
        getSnapshot: () => snapshot,
        subscribe: (listener) => { listeners.add(listener); return () => listeners.delete(listener) },
        refresh,
        install: () => change(snapshot.status?.installed && !snapshot.status.enabled ? 'enable' : 'install'),
        uninstall: () => change('remove'),
        update: () => change('update'),
        start: () => {
          const offChanged = ctx.remote.$on('plugin-manager/changed', refresh)
          const offReset = ctx.on('connection/reset', refresh)
          void refresh()
          return () => { disposed = true; ++ticket; offChanged(); offReset(); listeners.clear() }
        }
      }
    }

    function useMarket(controller) {
      return React.useSyncExternalStore(controller.subscribe, controller.getSnapshot)
    }

    function UpdateRecommendedButton({ t, status, controller, restarting }) {
      if (!status?.installed) return null
      const allowed = canUpdateRecommendation(status)
      return React.createElement(React.Fragment, null,
        React.createElement('button', { type: 'button',
          className: 'dshDesktopMarketButton dshDesktopMarketSecondary',
          disabled: !allowed || restarting || status.phase === 'installing' || status.phase === 'uninstalling',
          onClick: () => void controller.update() }, t('update') + ' · ' + MARKET_PACKAGE + '@' + RECOMMENDED_MARKET_VERSION),
        !allowed && React.createElement('p', { className: 'dshDesktopMarketStatusDetail' }, t('updateBlocked')))
    }

    function UninstallConfirm({ t, busy, onCancel, onConfirm }) {
      React.useEffect(() => {
        const onKeyDown = (event) => {
          if (event.key === 'Escape' && !busy) onCancel()
        }
        window.addEventListener('keydown', onKeyDown)
        return () => window.removeEventListener('keydown', onKeyDown)
      }, [busy, onCancel])

      return React.createElement(
        'div',
        {
          className: 'dshDesktopMarketModalBackdrop',
          role: 'presentation',
          onMouseDown: (event) => {
            if (event.target === event.currentTarget && !busy) onCancel()
          }
        },
        React.createElement(
          'div',
          {
            className: 'dshDesktopMarketModal',
            role: 'dialog',
            'aria-modal': 'true',
            'aria-labelledby': 'dsh-desktop-market-uninstall-title'
          },
          React.createElement(
            'h3',
            {
              id: 'dsh-desktop-market-uninstall-title',
              className: 'dshDesktopMarketModalTitle'
            },
            t('uninstallConfirmTitle')
          ),
          React.createElement(
            'p',
            { className: 'dshDesktopMarketModalText' },
            t('uninstallConfirmDesc')
          ),
          React.createElement(
            'p',
            { className: 'dshDesktopMarketModalNote' },
            t('uninstallConfirmNote')
          ),
          React.createElement(
            'div',
            { className: 'dshDesktopMarketModalActions' },
            React.createElement(
              'button',
              {
                type: 'button',
                className: 'dshDesktopMarketButton dshDesktopMarketSecondary',
                disabled: busy,
                onClick: onCancel
              },
              t('cancel')
            ),
            React.createElement(
              'button',
              {
                type: 'button',
                className: 'dshDesktopMarketButton dshDesktopMarketPrimary',
                disabled: busy,
                onClick: onConfirm,
                autoFocus: true
              },
              busy ? t('uninstalling') : t('uninstall')
            )
          )
        )
      )
    }

    function MarketManagementTab({ t, controller }) {
      const { status, error: managerError } = useMarket(controller)
      const [confirming, setConfirming] = React.useState(false)
      const [restarting, setRestarting] = React.useState(false)
      const [restartError, setError] = React.useState()
      const error = managerError || restartError
      const uninstall = async () => {
        await controller.uninstall()
        setConfirming(false)
      }

      const restart = async () => {
        const bridge = globalThis.dshDesktop
        if (!bridge || typeof bridge.restartHarness !== 'function') {
          setError('Harness > Restart Harness')
          return
        }
        setRestarting(true)
        setError(undefined)
        try {
          const result = await bridge.restartHarness()
          if (!result?.ok) {
            setRestarting(false)
            setError(t('uninstallFailed'))
          }
        } catch (failure) {
          setRestarting(false)
          setError(failure instanceof Error ? failure.message : String(failure))
        }
      }

      const phase = status?.phase
      const uninstalling = phase === 'uninstalling'
      const removed = (phase === 'uninstalled' || phase === 'absent') && !error
      const failed = phase === 'error' || phase === 'incomplete' || Boolean(error)
      const installedVersion = status?.installedVersion || status?.dependency

      return React.createElement(
        React.Fragment,
        null,
        React.createElement(
          'section',
          { className: 'dshDesktopMarketSection' },
          React.createElement('h2', { className: 'dshDesktopMarketTitle' }, t('title')),
          React.createElement('p', { className: 'dshDesktopMarketIntro' }, t('managementIntro')),
          React.createElement(
            'div',
            { className: 'dshDesktopMarketCard' },
            React.createElement(
              'div',
              { className: 'dshDesktopMarketHead' },
              React.createElement(
                'div',
                { className: 'dshDesktopMarketMark', 'aria-hidden': 'true' },
                React.createElement('span'),
                React.createElement('span'),
                React.createElement('span'),
                React.createElement('span')
              ),
              React.createElement(
                'div',
                { className: 'dshDesktopMarketIdentity' },
                React.createElement('span', { className: 'dshDesktopMarketName' }, 'dsh-market'),
                installedVersion
                  ? React.createElement(
                      'span',
                      { className: 'dshDesktopMarketVersion' },
                      `${t('installedVersion')} · ${installedVersion}`
                    )
                  : null
              )
            ),
            (uninstalling || phase === 'installing')
              ? React.createElement(
                  'div',
                  { className: 'dshDesktopMarketStatus' },
                  React.createElement(
                    'div',
                    { className: 'dshDesktopMarketBusy' },
                    React.createElement('span', {
                      className: 'dshDesktopMarketSpinner',
                      'aria-hidden': 'true'
                    }),
                    React.createElement(
                      'span',
                      { className: 'dshDesktopMarketStatusTitle' },
                      t(uninstalling ? 'uninstalling' : 'installing')
                    )
                  ),
                  React.createElement(
                    'p',
                    { className: 'dshDesktopMarketStatusDetail' },
                    status?.detail || t(uninstalling ? 'uninstallingHint' : 'installingHint')
                  )
                )
              : removed
                ? React.createElement(
                    'div',
                    { className: 'dshDesktopMarketStatus' },
                    React.createElement(
                      'span',
                      { className: 'dshDesktopMarketStatusTitle' },
                      t('removed')
                    ),
                    React.createElement(
                      'p',
                      { className: 'dshDesktopMarketStatusDetail' },
                      t(status?.application === 'applied' ? 'removedAppliedHint' : 'removedHint')
                    )
                  )
                : failed
                  ? React.createElement(
                      'div',
                      { className: 'dshDesktopMarketStatus' },
                      React.createElement(
                        'span',
                        { className: 'dshDesktopMarketStatusTitle dshDesktopMarketError' },
                        t(status?.operation === 'update' ? 'updateFailed' : 'uninstallFailed')
                      ),
                      error || status?.detail
                        ? React.createElement(
                            'p',
                            { className: 'dshDesktopMarketStatusDetail dshDesktopMarketError' },
                            error || status?.detail
                          )
                        : null
                    )
                  : null,
            React.createElement(
              'div',
              { className: 'dshDesktopMarketActions' },
              UpdateRecommendedButton({ t, status, controller, restarting }),
              status?.operation === 'update' && phase === 'installed' && !error
                ? React.createElement('p', { className: 'dshDesktopMarketStatusDetail', role: 'status' },
                    t(status.application === 'restart-required' ? 'updateRestartHint' : 'updateAppliedHint'))
                : null,
              status?.operation === 'update' && phase === 'installed' && status.application === 'restart-required' && !error
                ? React.createElement('button', { type: 'button', className: 'dshDesktopMarketButton dshDesktopMarketPrimary',
                    disabled: restarting, onClick: () => void restart() }, t(restarting ? 'restarting' : 'restart'))
                : null,
              status?.installed && !status.enabled
                ? React.createElement('button', { type: 'button',
                    className: 'dshDesktopMarketButton dshDesktopMarketPrimary',
                    disabled: uninstalling || phase === 'installing',
                    onClick: () => void controller.install() }, t('enable'))
                : null,
              !status && error
                ? React.createElement('button', { type: 'button',
                    className: 'dshDesktopMarketButton dshDesktopMarketSecondary',
                    onClick: () => void controller.refresh() }, t('retry'))
                : null,
              removed
                ? React.createElement(
                    'button',
                    {
                      type: 'button',
                      className: 'dshDesktopMarketButton dshDesktopMarketPrimary',
                      disabled: restarting,
                      onClick: () => void restart()
                    },
                    restarting ? t('restarting') : t('restart')
                  )
                : React.createElement(
                    'button',
                    {
                      type: 'button',
                      className: 'dshDesktopMarketButton dshDesktopMarketSecondary',
                      disabled: uninstalling || phase === 'installing' || !status?.removable,
                      onClick: () => setConfirming(true)
                    },
                    t('uninstall')
                  ),
              React.createElement(
                'a',
                {
                  className: 'dshDesktopMarketLink',
                  href: MARKET_REPOSITORY,
                  target: '_blank',
                  rel: 'noopener noreferrer'
                },
                t('repository')
              )
            ),
            React.createElement('p', { className: 'dshDesktopMarketNotice' }, t('futureUpdates'))
          )
        ),
        confirming
          ? React.createElement(UninstallConfirm, {
              t,
              busy: uninstalling,
              onCancel: () => setConfirming(false),
              onConfirm: () => void uninstall()
            })
          : null
      )
    }

    function MarketInstallerSection({ t, controller }) {
      const { status, error: managerError } = useMarket(controller)
      const [restarting, setRestarting] = React.useState(false)
      const [restartError, setError] = React.useState()
      const error = managerError || restartError
      const install = () => controller.install()

      const restart = async () => {
        const bridge = globalThis.dshDesktop
        if (!bridge || typeof bridge.restartHarness !== 'function') {
          setError('Harness > Restart Harness')
          return
        }
        setRestarting(true)
        setError(undefined)
        try {
          const result = await bridge.restartHarness()
          if (!result?.ok) {
            setRestarting(false)
            setError(t('failed'))
          }
        } catch (failure) {
          setRestarting(false)
          setError(failure instanceof Error ? failure.message : String(failure))
        }
      }

      const phase = status?.phase
      const busy = phase === 'installing'
      const installed = phase === 'installed' && status.enabled && !error
      const failed = phase === 'error' || phase === 'incomplete' || Boolean(error)
      const version = status?.recommendedVersion || 'latest'

      return React.createElement(
        'section',
        { className: 'dshDesktopMarketSection' },
        React.createElement('h2', { className: 'dshDesktopMarketTitle' }, t('title')),
        React.createElement('p', { className: 'dshDesktopMarketIntro' }, t('intro')),
        React.createElement(
          'div',
          { className: 'dshDesktopMarketCard' },
          React.createElement(
            'div',
            { className: 'dshDesktopMarketHead' },
            React.createElement(
              'div',
              { className: 'dshDesktopMarketMark', 'aria-hidden': 'true' },
              React.createElement('span'),
              React.createElement('span'),
              React.createElement('span'),
              React.createElement('span')
            ),
            React.createElement(
              'div',
              { className: 'dshDesktopMarketIdentity' },
              React.createElement('span', { className: 'dshDesktopMarketName' }, 'dsh-market'),
              React.createElement(
                'span',
                { className: 'dshDesktopMarketVersion' },
                `${t('version')} · ${version}`
              )
            )
          ),
          busy
            ? React.createElement(
                'div',
                { className: 'dshDesktopMarketStatus' },
                React.createElement(
                  'div',
                  { className: 'dshDesktopMarketBusy' },
                  React.createElement('span', {
                    className: 'dshDesktopMarketSpinner',
                    'aria-hidden': 'true'
                  }),
                  React.createElement(
                    'span',
                    { className: 'dshDesktopMarketStatusTitle' },
                    t('installing')
                  )
                ),
                React.createElement(
                  'p',
                  { className: 'dshDesktopMarketStatusDetail' },
                  status?.detail || t('installingHint')
                )
              )
            : installed
              ? React.createElement(
                  'div',
                  { className: 'dshDesktopMarketStatus' },
                  React.createElement(
                    'span',
                    { className: 'dshDesktopMarketStatusTitle' },
                    t('installed')
                  ),
                  React.createElement(
                    'p',
                    { className: 'dshDesktopMarketStatusDetail' },
                    t(status?.application === 'applied' ? 'appliedHint' : 'installedHint')
                  )
                )
              : failed
                ? React.createElement(
                    'div',
                    { className: 'dshDesktopMarketStatus' },
                    React.createElement(
                      'span',
                      { className: 'dshDesktopMarketStatusTitle dshDesktopMarketError' },
                      phase === 'incomplete' ? t('incomplete') : t(status?.operation === 'update' ? 'updateFailed' : 'failed')
                    ),
                    error || status?.detail
                      ? React.createElement(
                          'p',
                          { className: 'dshDesktopMarketStatusDetail dshDesktopMarketError' },
                          error || status?.detail
                        )
                      : null
                  )
                : null,
          React.createElement(
            'div',
            { className: 'dshDesktopMarketActions' },
            UpdateRecommendedButton({ t, status, controller, restarting }),
            status?.operation === 'update' && phase === 'installed' && !error
              ? React.createElement('p', { className: 'dshDesktopMarketStatusDetail', role: 'status' },
                  t(status.application === 'restart-required' ? 'updateRestartHint' : 'updateAppliedHint'))
              : null,
            status?.operation === 'update' && phase === 'installed' && !status.enabled && status.application === 'restart-required' && !error
              ? React.createElement('button', { type: 'button', className: 'dshDesktopMarketButton dshDesktopMarketPrimary',
                  disabled: restarting, onClick: () => void restart() }, t(restarting ? 'restarting' : 'restart'))
              : null,
            installed
              ? React.createElement(
                  'button',
                  {
                    type: 'button',
                    className: 'dshDesktopMarketButton dshDesktopMarketPrimary',
                    disabled: restarting,
                    onClick: () => void restart()
                  },
                  restarting ? t('restarting') : t('restart')
                )
              : React.createElement(
                  'button',
                  {
                    type: 'button',
                    className: 'dshDesktopMarketButton dshDesktopMarketPrimary',
                    disabled: busy || (!status && !error),
                    onClick: () => void install()
                  },
                  status?.installed && !status.enabled ? t('enable') : failed ? t('retry') : t('install')
                ),
            React.createElement(
              'a',
              {
                className: 'dshDesktopMarketButton dshDesktopMarketSecondary dshDesktopMarketIconButton',
                href: MARKET_REPOSITORY,
                target: '_blank',
                rel: 'noopener noreferrer',
                'aria-label': t('repository')
              },
              GitHubIcon(),
              t('repositoryButton')
            )
          ),
          React.createElement('p', { className: 'dshDesktopMarketNotice' }, t('community'))
        )
      )
    }

    const inject = ['slots', 'locale', 'remote', 'remote.pluginManager']
    function apply(ctx) {
      ctx.effect(installStyles, 'dsh-desktop-market-installer: styles')
      const controller = createMarketController(ctx)
      ctx.effect(controller.start, 'dsh-desktop-market-installer: manager status')
      ctx.effect(
        () => ctx.locale.register(NS, { zh, en }),
        'dsh-desktop-market-installer: copy dictionaries'
      )
      const t = ctx.locale.bind(NS)
      ctx.slots.inject('settings.plugins.tab', () =>
        ctx.slots.register(
          { name: 'settings.plugins.tab', id: 'desktop-host-plugins', order: 20,
            label: () => t('builtInImageTitle'), locale: NS,
            inject: () => ({ t, controller }) },
          BuiltInImageControl
        )
      )
      if (marketAlreadyComposed()) {
        ctx.slots.inject('settings.plugins.tab', () =>
          ctx.slots.register(
            {
              name: 'settings.plugins.tab',
              id: 'desktop-market-management',
              order: 30,
              label: () => t('managementTab'),
              inject: () => ({ t, controller })
            },
            MarketManagementTab
          )
        )
        return
      }
      ctx.slots.inject('settings.section', () =>
        ctx.slots.register(
          {
            name: 'settings.section',
            id: 'market',
            order: 40,
            label: () => t('nav'),
            inject: () => ({ t, controller })
          },
          MarketInstallerSection
        )
      )
    }

    exports.apply = apply
    exports.inject = inject
    return module.exports
  }
})

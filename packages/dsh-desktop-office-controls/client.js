window.__ModuleLoader__.load({
  id: 'dsh-desktop-office-controls',
  factory: require => {
    const React = require('react')
    const { PluginToggleCard } = require('@deepseek-ai/dsh-client-ui-settings-plugins')
    const NS = 'settings.desktopOffice'
    const PATH = '/dsh-desktop/office'
    const names = new Set(['dsh-office', 'dsh-ppt', 'dsh-ppt-composer'])
    const zh = {
      title: 'Office 办公', description: '制作和编辑 Word、Excel、PPT。',
      loading: '正在读取设置…', pending: '当前任务结束后生效', saving: '正在更新…',
      failed: '设置更新失败，请重试。', retry: '重试'
    }
    const en = {
      title: 'Office', description: 'Create and edit Word, Excel and PPT files.',
      loading: 'Loading settings…', pending: 'Applies when current tasks finish', saving: 'Updating…',
      failed: 'Could not update settings. Try again.', retry: 'Retry'
    }

    async function request(enabled, path = PATH) {
      const response = await fetch(path, {
        method: enabled === undefined ? 'GET' : 'POST', credentials: 'same-origin', cache: 'no-store',
        ...(enabled === undefined ? {} : { headers: { 'content-type': 'application/json' }, body: JSON.stringify({ enabled }) })
      })
      const state = await response.json()
      if (!response.ok) throw new Error(state.error || `HTTP ${response.status}`)
      return state
    }

    function OfficeControl({ store, t }) {
      const { state, error, saving } = React.useSyncExternalStore(store.subscribe, store.snapshot)
      const busy = saving || !state || ['loading', 'saving', 'pending', 'applying'].includes(state.phase)
      const busyLabel = !state ? 'loading' : state.phase === 'pending' ? 'pending' : 'saving'
      return React.createElement(PluginToggleCard, {
        title: t('title'), description: t('description'),
        checked: state?.enabled ?? true, disabled: busy,
        busyLabel: busy ? t(busyLabel) : undefined,
        onChange: enabled => void store.set(enabled),
        error: error ? t('failed') : undefined,
        retryLabel: t('retry'), onRetry: () => void store.refresh()
      })
    }

    function apply(ctx) {
      const listeners = new Set()
      let value = { state: undefined, error: undefined, saving: false }
      let disposed = false
      let inFlight
      let synchronizedGeneration
      const publish = update => { value = { ...value, ...update }; for (const listener of listeners) listener() }
      const reconcile = async state => {
        if (state.phase !== 'idle') return
        // The browser Loader disposes only these plugin occupants. Conversation
        // drafts and attachment handles remain in their existing owning services.
        await ctx.loader.await()
        if (state.applied && synchronizedGeneration !== state.generation) {
          // A client opened while Office was disabled has no Office bundles.
          // Refresh the advertised arrivals and let Cordis create those entries.
          const manifest = ctx.modules.updateGraph(await request(undefined, `${PATH}?clients=1`))
          const existing = new Set([...ctx.loader.entries()].map(entry => entry.options.name))
          for (const row of manifest.plugins) {
            if (names.has(row.id) && !existing.has(row.id)) await ctx.loader.create({ name: row.id })
          }
        }
        const entries = [...ctx.loader.entries()].filter(entry => names.has(entry.options.name.replace(/\/client(?:-standard)?$/u, '')))
        for (const entry of entries) {
          if (entry.disabled !== !state.applied) await entry.update({ disabled: !state.applied })
        }
        synchronizedGeneration = state.generation
      }
      const store = {
        subscribe: listener => { listeners.add(listener); return () => listeners.delete(listener) },
        snapshot: () => value,
        refresh: async () => {
          if (inFlight || disposed) return inFlight
          inFlight = (async () => {
            try {
              const state = await request()
              if (disposed) return
              await reconcile(state)
              publish({ state, error: state.error })
            } catch (error) { if (!disposed) publish({ error }) }
            finally { inFlight = undefined }
          })()
          return inFlight
        },
        set: async enabled => {
          if (value.saving) return
          await inFlight
          publish({ saving: true, error: undefined })
          try {
            const state = await request(enabled)
            if (!disposed) publish({ state, error: state.error })
          } catch (error) { if (!disposed) publish({ error }) }
          finally {
            if (!disposed) { publish({ saving: false }); await store.refresh() }
          }
        }
      }
      ctx.effect(() => {
        const timer = setInterval(() => void store.refresh(), 1000)
        void store.refresh()
        return () => { disposed = true; clearInterval(timer); listeners.clear() }
      }, 'Office controls: live state and client lifecycle')
      ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'Office controls: translations')
      const t = ctx.locale.bind(NS)
      ctx.slots.inject('settings.plugin.control', () => ctx.slots.register({
        name: 'settings.plugin.control', id: 'desktop-office', order: 0,
        inject: () => ({ store, t })
      }, OfficeControl))
    }
    return { apply, inject: ['slots', 'locale', 'loader', 'modules'] }
  }
})

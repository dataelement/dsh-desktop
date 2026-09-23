window.__ModuleLoader__.load({
  id: 'dsh-desktop-workbenches',
  factory: (require) => {
    const React = require('react')
    const { Service } = require('@deepseek-ai/cordis')
    const h = React.createElement
    const PANEL = 'desktop-workbenches'
    const API = '/api/desktop-workbenches/state'
    const WRITE_API = '/api/desktop-workbenches/state/write'
    const MIGRATE_API = '/api/desktop-workbenches/state/migrate'
    const CATALOG_API = '/api/desktop-workbenches/catalog'
    const MARKET_INSTALLS_API = '/api/desktop-workbenches/market-installs'
    const SUBMISSION_STATUS_API = '/api/desktop-workbenches/submission-status'
    // One author guide ships with this Desktop version and covers development,
    // local acceptance, first listing and later releases.
    const GUIDE_API = '/api/desktop-workbenches/author-guide'
    const WORKBENCH_MARKET_REPO = 'https://github.com/dataelement/awesome-dsh-workbench'
    const ACCEPTANCE_API = '/api/desktop-workbenches/market-acceptance'
    // The website is the one public link for both documents; the bundled copies
    // behind GUIDE_API and ACCEPTANCE_API are only for reading offline in Desktop.
    // Agents read the Markdown; people open the reading page.
    const DEVELOPMENT_DOC_URL = 'https://dshdesktop.com/workbench/docs/development.md'
    const ACCEPTANCE_DOC_URL = 'https://dshdesktop.com/workbench/docs/market-acceptance.md'
    const DEVELOPMENT_PAGE_URL = 'https://dshdesktop.com/workbench/docs/development/'
    const ACCEPTANCE_PAGE_URL = 'https://dshdesktop.com/workbench/docs/market-acceptance/'
    const GUIDE_READING = `先阅读并遵循工作台开发规范：${DEVELOPMENT_DOC_URL} 。它包含包格式、运行规则和本地自测清单。`
    const DEVELOPMENT_GUIDE_READING = `${GUIDE_READING}当前任务只做本地开发和安装，不需要处理市场投稿或发布。`
    const ACCEPTANCE_READING = `先阅读并遵循工作台市场验收规范：${ACCEPTANCE_DOC_URL} 。它包含上传 GitHub、安装来源、上架资料、收录 PR 和验收清单。`
    const WORKBENCH_PREF = 'dsh-workbench-enabled'
    const WORKBENCH_DOCK_PREF = 'dsh-workbench-dock-visible'
    const workbenchPreference = {
      listeners: new Set(),
      enabled: (() => { try { return window.localStorage.getItem(WORKBENCH_PREF) !== 'false' } catch { return true } })(),
      subscribe(listener) { this.listeners.add(listener); return () => this.listeners.delete(listener) },
      getSnapshot() { return this.enabled },
      set(value) { this.enabled = !!value; try { window.localStorage.setItem(WORKBENCH_PREF, String(this.enabled)) } catch {} ; for (const listener of this.listeners) listener() }
    }
    const workbenchDockPreference = {
      listeners: new Set(),
      visible: (() => { try { return window.localStorage.getItem(WORKBENCH_DOCK_PREF) !== 'false' } catch { return true } })(),
      subscribe(listener) { this.listeners.add(listener); return () => this.listeners.delete(listener) },
      getSnapshot() { return this.visible },
      set(value) { this.visible = !!value; try { window.localStorage.setItem(WORKBENCH_DOCK_PREF, String(this.visible)) } catch {} ; for (const listener of this.listeners) listener() }
    }
    const EMPTY = () => ({ version: 1, added: [], pinned: [], favorites: [], active: null, sessionBindings: {}, recentSessions: {}, notes: {} })
    // This controller owns navigation and local state only. It never terminates
    // agents, changes a running session's preset, or registers global tools.
    class Workbenches {
      constructor(ctx, request = (...args) => fetch(...args)) {
        this.ctx = ctx
        Object.defineProperty(this, Service.tracker, { value: { property: 'ctx' } })
        this.request = request
        this.state = EMPTY()
        this.revision = 0
        this.ready = false
        this.error = ''
        this.blocked = false
        this.marketOpen = false
        this.pending = 0
        this.disposed = false
        this.listeners = new Set()
        this.catalog = new Map()
        this.providers = new Map()
        this.remoteCatalog = []
        // The market's own category list; submissions choose from it.
        this.marketCategories = []
        this.catalogError = ''
        this.catalogStale = false
        // Workbenches installed from the market, keyed by Awesome repository
        // identity. A new package only runs after Harness restarts, so
        // restartNeeded stays set until then.
        this.installs = {}
        this.installing = null
        this.restartNeeded = false
        this.draftNotes = new Map()
        this.noteTimers = new Map()
        this.queue = Promise.resolve()
        this.sessionRequests = new Map()
        this.navigation = 0
        this.suppressSelection = false
        this.internalSessionOpen = null
        this.lastSession = undefined
        this.publish()
      }
      getSnapshot = () => this.snapshot
      subscribe = (listener) => { this.listeners.add(listener); return () => this.listeners.delete(listener) }
      marketCatalog() {
        const matched = new Set()
        const providers = [...this.catalog.values()]
        const remote = this.remoteCatalog.map((item) => {
          const provider = this.catalog.get(item.id)
          if (provider) matched.add(provider.id)
          return {
            ...item,
            ...(provider || {}),
            id: provider?.id || item.id,
            catalogId: item.id,
            // Market metadata owns the displayed and update versions. Runtime
            // descriptors can be older than the installed package after a
            // tag-driven release and must not override the catalog.
            version: item.version,
            listedVersion: item.version,
            title: item.name,
            category: item.categoryName,
            description: item.description.zh,
            author: item.owner,
            repository: item.url,
            screenshots: item.screenshots.map(image => image.url),
            installed: !!provider
          }
        })
        for (const provider of providers) {
          if (!matched.has(provider.id)) remote.push({ ...provider, catalogId: provider.id, installed: true })
        }
        return remote
      }
      sourcePackage() {
        const source = this.ctx.fiber?.name
        if (typeof source !== 'string' || !source || source === 'dsh-desktop-workbenches') throw new Error('Workbench registration must come from a client package.')
        return source
      }
      repositoryIdentity(repository) {
        if (repository === undefined) return null
        if (typeof repository !== 'string') throw new Error('Workbench repository must be a GitHub URL.')
        const match = repository.match(/^https:\/\/github\.com\/([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+?)(?:\.git)?\/?$/i)
        if (!match) throw new Error('Workbench repository must be a GitHub URL.')
        return `${match[1]}/${match[2]}`.toLowerCase()
      }
      identityForSource(source, repository, legacyId) {
        const installed = Object.entries(this.installs).filter(([, install]) => install?.pluginName === source).map(([id]) => id)
        const listed = this.remoteCatalog.filter(entry => entry.distribution?.name === source).map(entry => entry.id)
        const legacy = typeof legacyId === 'string'
          ? this.remoteCatalog.filter(entry => entry.workbenchId === legacyId || entry.legacyWorkbenchIds?.includes(legacyId)).map(entry => entry.id)
          : []
        const declared = this.repositoryIdentity(repository)
        const identities = [...new Set([...installed, ...listed, ...legacy, ...(declared ? [declared] : [])])]
        if (identities.length !== 1) throw new Error(identities.length ? `Client package ${source} matches multiple workbenches.` : `Client package ${source} is not attributed to a market repository.`)
        return identities[0]
      }
      rebuildProviders() {
        const previous = this.catalog
        const catalog = new Map()
        for (const [source, provider] of this.providers) {
          let id
          try { id = this.identityForSource(source, provider.repository, provider.id) } catch { continue }
          if (catalog.has(id)) throw new Error(`Duplicate workbench provider: ${id}`)
          catalog.set(id, { ...provider, id, sourcePackage: source })
        }
        this.catalog = catalog
        for (const [id] of previous) {
          if (!catalog.has(id) && this.state.active === id) this.state = { ...this.state, active: null }
        }
      }
      reconcileMarketInstalls() {
        if (!this.ready || this.blocked || this.disposed) return
        const additions = this.marketCatalog().filter((entry) => {
          const install = this.installs[entry.catalogId]
          return entry.installed && install && !this.state.added.includes(entry.id)
        })
        if (!additions.length) return
        this.run(this.commit((state) => {
          for (const entry of additions) {
            if (!state.added.includes(entry.id)) state.added.push(entry.id)
            if (!state.pinned.includes(entry.id)) state.pinned.push(entry.id)
          }
        }))
      }
      migrateLegacyWorkbenchIds() {
        if (!this.ready || this.blocked || this.disposed) return
        const migrations = {}
        const referenced = id => this.state.added.includes(id) || this.state.pinned.includes(id) || this.state.favorites.includes(id)
          || this.state.active === id || Object.values(this.state.sessionBindings).includes(id)
          || Object.hasOwn(this.state.recentSessions, id) || Object.hasOwn(this.state.notes, id)
        for (const entry of this.remoteCatalog) {
          for (const legacy of [entry.workbenchId, ...(entry.legacyWorkbenchIds || [])]) {
            if (typeof legacy === 'string' && legacy !== entry.id && referenced(legacy)) migrations[legacy] = entry.id
          }
        }
        if (!Object.keys(migrations).length) return
        this.run(this.commit((state) => {
          const replace = id => migrations[id] || id
          state.added = [...new Set(state.added.map(replace))]
          state.pinned = [...new Set(state.pinned.map(replace))]
          state.favorites = [...new Set(state.favorites.map(replace))]
          state.active = state.active === null ? null : replace(state.active)
          for (const [session, owner] of Object.entries(state.sessionBindings)) state.sessionBindings[session] = replace(owner)
          for (const [legacy, current] of Object.entries(migrations)) {
            if (state.recentSessions[legacy] && !state.recentSessions[current]) state.recentSessions[current] = state.recentSessions[legacy]
            delete state.recentSessions[legacy]
            if (Object.hasOwn(state.notes, legacy)) {
              state.notes[current] = state.notes[current] ? `${state.notes[current]}\n\n${state.notes[legacy]}` : state.notes[legacy]
              delete state.notes[legacy]
            }
          }
        }, migrations))
      }
      publish() {
        this.snapshot = { state: this.state, drafts: Object.fromEntries(this.draftNotes), ready: this.ready, error: this.error,
          catalogError: this.catalogError, catalogStale: this.catalogStale, pending: this.pending, marketOpen: this.marketOpen,
          catalog: this.marketCatalog(), categories: this.marketCategories, installs: this.installs, installing: this.installing, restartNeeded: this.restartNeeded }
        for (const listener of this.listeners) listener()
      }
      report(error) { if (!this.disposed) { this.error = error instanceof Error ? error.message : String(error); this.publish() } }
      run(promise) { void promise.catch((error) => this.report(error)) }
      async read() {
        const response = await this.request(API, { credentials: 'same-origin', cache: 'no-store' })
        const data = await response.json()
        if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`)
        return data
      }
      async readCatalog() {
        const response = await this.request(CATALOG_API, { credentials: 'same-origin', cache: 'no-store' })
        const data = await response.json()
        if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`)
        const categories = new Map(data.catalog.categories.map(category => [category.id, category.name.zh]))
        return {
          entries: data.catalog.workbenches.map(entry => ({ ...entry, categoryName: categories.get(entry.category) || entry.category })),
          categories: data.catalog.categories.map(({ id, name }) => ({ id, name: name.zh })),
          stale: data.stale === true
        }
      }
      async readInstalls() {
        const response = await this.request(MARKET_INSTALLS_API, { credentials: 'same-origin', cache: 'no-store' })
        const data = await response.json()
        if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`)
        return data.installs && typeof data.installs === 'object' ? data.installs : {}
      }
      async marketPackage(path, catalogId) {
        if (this.installing) throw new Error('另一个工作台正在安装，请稍候。')
        this.installing = catalogId
        this.error = ''
        this.publish()
        try {
          const response = await this.request(path, {
            method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: catalogId })
          })
          const data = await response.json()
          if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`)
          if (data.restartRequired) this.restartNeeded = true
          return data
        } finally {
          this.installing = null
          this.publish()
        }
      }
      // Install and update are the same operation: Awesome names the one version to install.
      async installFromMarket(catalogId) {
        if (!this.remoteCatalog.some((entry) => entry.id === catalogId)) throw new Error('这个工作台已不在工作台市场中。')
        const data = await this.marketPackage('/api/desktop-workbenches/market-install', catalogId)
        if (data.install?.catalogId !== catalogId || typeof data.install?.pluginName !== 'string') throw new Error('市场安装记录无效。')
        this.installs = { ...this.installs, [catalogId]: data.install }
        this.publish()
        return this.commit((state) => {
          if (!state.added.includes(catalogId)) state.added.push(catalogId)
          if (!state.pinned.includes(catalogId)) state.pinned.push(catalogId)
        })
      }
      async uninstallFromMarket(catalogId) {
        await this.marketPackage('/api/desktop-workbenches/market-uninstall', catalogId)
        const { [catalogId]: _removed, ...rest } = this.installs
        this.installs = rest
        this.publish()
      }
      // The market install behind a runtime workbench, found through its registered repository.
      marketInstallFor(id) {
        return this.installs[id] ? id : null
      }
      async removeWorkbench(id) {
        // Market installs also remove the package; sessions, files and notes stay.
        const catalogId = this.marketInstallFor(id)
        if (catalogId) await this.uninstallFromMarket(catalogId)
        return this.remove(id)
      }
      async load() {
        await this.queue
        const ticket = ++this.navigation
        this.ready = false
        this.error = ''
        this.publish()
        try {
          const [data, catalog, installs] = await Promise.all([
            this.read(),
            this.readCatalog().catch(error => ({ error })),
            this.readInstalls().catch(() => ({}))
          ])
          await this.ctx.sessions.refresh()
          if (this.disposed || ticket !== this.navigation) return
          this.state = data.state
          this.revision = data.revision
          this.installs = installs
          if (catalog.error) this.catalogError = catalog.error instanceof Error ? catalog.error.message : String(catalog.error)
          else {
            this.remoteCatalog = catalog.entries
            this.marketCategories = catalog.categories
            this.catalogError = ''
            this.catalogStale = catalog.stale
          }
          this.rebuildProviders()
          this.blocked = false
          this.ready = true
          this.lastSession = this.currentSession()
          this.publish()
          this.migrateLegacyWorkbenchIds()
          this.reconcileMarketInstalls()
          const active = this.state.active
          if (active && this.catalog.has(active) && this.state.added.includes(active)) await this.open(active)
          else this.selectionChanged()
          for (const id of this.draftNotes.keys()) this.run(this.saveNote(id))
        } catch (error) { this.report(error) }
      }
      // Only reads the pull request; the result is shown, never stored.
      async readSubmissionStatus(link) {
        const response = await this.request(`${SUBMISSION_STATUS_API}?url=${encodeURIComponent(link)}`, { credentials: 'same-origin', cache: 'no-store' })
        const data = await response.json()
        if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`)
        return data
      }
      commit(change, migrations) {
        if (!this.ready || this.blocked || this.disposed) return Promise.reject(new Error('工作台更改尚未保存，请先重新加载。'))
        const next = JSON.parse(JSON.stringify(this.state))
        try { change(next) } catch (error) { return Promise.reject(error) }
        this.state = next
        this.pending++
        this.publish()
        const task = this.queue.then(async () => {
          if (this.blocked) throw new Error('工作台更改尚未保存，请先重新加载。')
          const response = await this.request(migrations ? MIGRATE_API : WRITE_API, {
            method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ revision: this.revision, state: next, ...(migrations ? { migrations } : {}) })
          })
          const data = await response.json()
          if (!response.ok) throw new Error(response.status === 409 ? '工作台已在其他窗口更新，请重新加载后再操作。' : data.error || `HTTP ${response.status}`)
          this.revision = data.revision
        }).catch((error) => { this.blocked = true; this.report(error); throw error })
          .finally(() => { this.pending--; this.publish() })
        this.queue = task.catch(() => {})
        return task
      }
      register(descriptor, Component) {
        // Older workbench packages declared a local id. Keep accepting those
        // packages during the repository-identity migration, but never use the
        // legacy value: identityForSource resolves the canonical catalog repo.
        if (!descriptor || !descriptor.title || typeof Component !== 'function') throw new Error('Invalid workbench registration')
        this.repositoryIdentity(descriptor.repository)
        const source = this.sourcePackage()
        if (this.providers.has(source)) throw new Error(`Duplicate workbench provider: ${source}`)
        if (descriptor.customFrame !== undefined && typeof descriptor.customFrame !== 'boolean') throw new Error('Invalid custom frame flag')
        const layout = descriptor.layout || {}
        if (layout.businessSide !== undefined && !['left', 'right'].includes(layout.businessSide)) throw new Error('Invalid workbench business side')
        if (layout.businessWidth !== undefined && (!Number.isFinite(layout.businessWidth) || layout.businessWidth < 0.25 || layout.businessWidth > 0.7)) throw new Error('Workbench business width must be between 0.25 and 0.7')
        const entry = { ...descriptor,
          category: descriptor.category || '其他',
          screenshot: descriptor.screenshot || '',
          screenshotPosition: descriptor.screenshotPosition || 'center',
          layout: { businessSide: layout.businessSide || 'right', businessWidth: layout.businessWidth ?? 0.36 }, Component }
        this.providers.set(source, entry)
        this.rebuildProviders()
        this.publish()
        this.reconcileMarketInstalls()
        return () => {
          if (this.providers.get(source) !== entry) return
          this.providers.delete(source)
          this.rebuildProviders()
          this.publish()
        }
      }
      isActive() {
        const source = this.sourcePackage()
        const id = this.identityForSource(source, this.providers.get(source)?.repository)
        return this.state.active === id && this.state.added.includes(id)
      }
      ownsSession(sessionId) {
        const source = this.sourcePackage()
        return this.state.sessionBindings[sessionId] === this.identityForSource(source, this.providers.get(source)?.repository)
      }
      collapseSidebar() {
        const root = globalThis.document?.querySelector?.('[data-dsh-sidebar-root]')
        if (root?.getAttribute('data-dsh-sidebar-wide') === 'true' && !globalThis.document.querySelector('[data-sidebar-collapsed]')) this.ctx.layout.toggleSidebar?.()
      }
      add(id) {
        if (!this.catalog.has(id)) return Promise.reject(new Error('工作台当前不可用。'))
        return this.commit((state) => {
          if (!state.added.includes(id)) state.added.push(id)
          if (!state.pinned.includes(id)) state.pinned.push(id)
        })
      }
      async open(id, sessionId) {
        if (!this.catalog.has(id) || !this.state.added.includes(id)) throw new Error('请先添加可用的工作台。')
        if (sessionId && this.state.sessionBindings[sessionId] !== id) throw new Error('会话不属于当前工作台。')
        this.marketOpen = false
        const ticket = ++this.navigation
        const signal = this.ctx.layout.beginNavigation()
        const defaultWorkspace = this.defaultWorkspace()
        await this.commit((state) => { state.active = id; if (!state.pinned.includes(id)) state.pinned.push(id) })
        if (this.disposed || signal.aborted || ticket !== this.navigation) return
        this.collapseSidebar()
        const target = sessionId || this.state.recentSessions[id]
        const listed = this.ctx.sessions.list.getSnapshot().byId
        this.suppressSelection = true
        try {
          if (target && listed[target] && this.state.sessionBindings[target] === id) this.openSession(target)
          this.lastSession = this.currentSession()
          this.ctx.layout.selectPanel(null)
        } finally { this.suppressSelection = false }
        if (target && listed[target]) await this.commit((state) => { state.recentSessions[id] = target })
        else if (this.catalog.get(id)?.initialization === 'new-session' && defaultWorkspace) await this.newSession(defaultWorkspace.workspaceId)
      }
      async home(id = this.state.active) {
        if (!id || !this.catalog.has(id) || !this.state.added.includes(id)) throw new Error('请先添加可用的工作台。')
        this.marketOpen = false
        const ticket = ++this.navigation
        const signal = this.ctx.layout.beginNavigation()
        await this.commit((state) => { state.active = id; if (!state.pinned.includes(id)) state.pinned.push(id) })
        if (this.disposed || signal.aborted || ticket !== this.navigation) return
        this.collapseSidebar()
        this.suppressSelection = true
        try {
          this.lastSession = null
          this.ctx.layout.selectPanel(null)
        } finally { this.suppressSelection = false }
      }
      setMarketOpen(open) {
        if (this.marketOpen === open) return
        this.marketOpen = open
        this.publish()
      }
      showMarket() {
        this.setMarketOpen(true)
        this.ctx.layout.selectPanel(PANEL)
      }
      openSession(sessionId) {
        this.internalSessionOpen = sessionId
        try { this.ctx.uiWorkspace.openSession(sessionId) }
        finally { this.internalSessionOpen = null }
      }
      // Harness 0.1.6 has no list.current: uiWorkspace's main view holds a
      // `mainView` retention, which the session list projects onto the summary.
      // Public so workbench providers read the same fact.
      currentSession() {
        const { byId } = this.ctx.sessions.list.getSnapshot()
        return Object.keys(byId).find((id) => (byId[id]?.retainedBy?.mainView ?? 0) > 0)
      }
      showSession(sessionId) {
        this.openSession(sessionId)
        this.lastSession = sessionId
      }
      toggle(id) {
        return this.state.active === id ? this.leave() : this.open(id)
      }
      async leave() {
        const signal = this.ctx.layout.beginNavigation()
        const ticket = ++this.navigation
        await this.commit((state) => { state.active = null })
        if (!this.disposed && !signal.aborted && ticket === this.navigation) this.ctx.layout.selectPanel(null)
      }
      remove(id) {
        this.ctx.layout.beginNavigation()
        ++this.navigation
        return this.commit((state) => {
          state.added = state.added.filter((item) => item !== id)
          state.pinned = state.pinned.filter((item) => item !== id)
          if (state.active === id) state.active = null
        })
      }
      toggleFavorite(id) {
        if (!this.marketCatalog().some(entry => entry.catalogId === id) && !(this.state.favorites || []).includes(id)) return Promise.reject(new Error('工作台当前不可用。'))
        return this.commit((state) => {
          const favorites = Array.isArray(state.favorites) ? state.favorites : []
          state.favorites = favorites.includes(id) ? favorites.filter((item) => item !== id) : [...favorites, id]
        })
      }
      reorder(id, before) {
        return this.commit((state) => {
          if (id === before || !state.pinned.includes(id) || !state.pinned.includes(before)) return
          const order = state.pinned.filter((item) => item !== id)
          order.splice(order.indexOf(before), 0, id)
          state.pinned = order
        })
      }
      setNote(id, value) { return this.commit((state) => { state.notes[id] = value }) }
      editNote(id, value) {
        this.draftNotes.set(id, value)
        clearTimeout(this.noteTimers.get(id))
        this.noteTimers.set(id, setTimeout(() => { this.noteTimers.delete(id); this.run(this.saveNote(id)) }, 450))
        this.publish()
      }
      async saveNote(id) {
        if (!this.draftNotes.has(id)) return
        const value = this.draftNotes.get(id)
        await this.setNote(id, value)
        if (this.draftNotes.get(id) === value) this.draftNotes.delete(id)
        this.publish()
      }
      workspaceFor(sessionId) {
        return this.ctx.workspaces.list.getSnapshot().items.find((item) => item.sessionIds.includes(sessionId))
      }
      defaultWorkspace() {
        const current = this.currentSession()
        return this.workspaceFor(current) || this.ctx.workspaces.list.getSnapshot().items[0]
      }
      routeWorkspaceSession(sessionId) {
        const active = this.state.active
        const workspace = this.workspaceFor(sessionId)
        if (!this.ready || this.blocked || this.disposed || !active || !workspace || !this.state.added.includes(active) || !this.catalog.has(active)) return false
        this.run(this.openOrdinaryWorkspaceSession(workspace.workspaceId, active))
        return true
      }
      async openOrdinaryWorkspaceSession(workspaceId, active) {
        const ticket = ++this.navigation
        const signal = this.ctx.layout.beginNavigation()
        const workspaces = this.ctx.workspaces.list.getSnapshot()
        const workspace = workspaces.items.find((item) => item.workspaceId === workspaceId)
        if (!workspace) throw new Error('工作区当前不可用。')
        const sessions = this.ctx.sessions.list.getSnapshot()
        const archived = new Set(workspaces.archivedSessionIds || [])
        let sessionId = sessions.ids.find((id) => {
          const summary = sessions.byId[id]
          return summary && summary.blank && workspace.sessionIds.includes(id) && !archived.has(id) && !this.state.sessionBindings[id]
        })
        if (!sessionId) sessionId = await this.ctx.sessions.create({ workspaceId })
        if (this.disposed || signal.aborted || ticket !== this.navigation || this.state.active !== active) return sessionId
        await this.commit((state) => { state.active = null })
        if (this.disposed || signal.aborted || ticket !== this.navigation) return sessionId
        this.suppressSelection = true
        try {
          this.showSession(sessionId)
          this.ctx.layout.selectPanel(null)
        } finally { this.suppressSelection = false }
        return sessionId
      }
      // Providers keep their own project/profile flows; Desktop owns session identity.
      ensureSession({ folder, sessionId: savedSessionId } = {}) {
        const source = this.sourcePackage()
        const id = this.identityForSource(source, this.providers.get(source)?.repository)
        if (!this.ready || this.blocked || this.disposed || this.state.active !== id || !this.state.added.includes(id) || !this.catalog.has(id)) return Promise.reject(new Error('请先打开可用的工作台。'))
        const key = JSON.stringify([id, folder, savedSessionId || null])
        if (this.sessionRequests.has(key)) return this.sessionRequests.get(key)
        const ticket = ++this.navigation
        const signal = this.ctx.layout.beginNavigation()
        const request = (async () => {
          await this.ctx.sessions.refresh()
          if (this.disposed || !this.state.added.includes(id) || !this.catalog.has(id)) throw new Error('工作台已移除或不可用。')
          let sessionId = savedSessionId && this.ctx.sessions.list.getSnapshot().byId[savedSessionId] ? savedSessionId : null
          if (sessionId) {
            const owner = this.state.sessionBindings[sessionId]
            if (owner && owner !== id) throw new Error('此会话已属于另一个工作台，不能重新绑定。')
          } else {
            if (typeof folder !== 'string' || !folder.trim()) throw new Error('创建会话需要业务项目文件夹。')
            const workspace = await this.ctx.workspaces.create({ path: folder })
            if (this.disposed || !this.state.added.includes(id) || !this.catalog.has(id)) throw new Error('工作台已移除或不可用。')
            sessionId = await this.ctx.sessions.create({ workspaceId: workspace.workspaceId })
          }
          if (this.disposed || !this.state.added.includes(id) || !this.catalog.has(id)) throw new Error('工作台已移除或不可用。')
          await this.commit((state) => {
            if (state.sessionBindings[sessionId] && state.sessionBindings[sessionId] !== id) throw new Error('不能改变已有会话的工作台归属。')
            state.sessionBindings[sessionId] = id
            state.recentSessions[id] = sessionId
          })
          if (!this.disposed && !signal.aborted && ticket === this.navigation && this.state.active === id) {
            this.suppressSelection = true
            try { this.showSession(sessionId); this.ctx.layout.selectPanel(null) }
            finally { this.suppressSelection = false }
          }
          return sessionId
        })().finally(() => { this.sessionRequests.delete(key) })
        this.sessionRequests.set(key, request)
        return request
      }
      newWorkspaceSession() {
        if (this.workspaceCreation) return this.workspaceCreation
        const id = this.state.active
        if (!id || !this.catalog.has(id)) return Promise.reject(new Error('请先打开工作台。'))
        const ticket = ++this.navigation
        const signal = this.ctx.layout.beginNavigation()
        const current = () => !this.disposed && !signal.aborted && ticket === this.navigation && this.state.active === id && this.state.added.includes(id) && this.catalog.has(id)
        this.workspaceCreation = (async () => {
          const path = await this.ctx.uiWorkspace.pickDirectory()
          if (!path || !current()) return
          const workspace = await this.ctx.workspaces.create({ path })
          if (!current()) return
          return this.newSession(workspace.workspaceId)
        })().finally(() => { this.workspaceCreation = null })
        return this.workspaceCreation
      }
      async newSession(workspaceId) {
        const id = this.state.active
        if (!id || !this.catalog.has(id)) throw new Error('请先打开工作台。')
        const workspace = workspaceId || this.defaultWorkspace()?.workspaceId
        if (!workspace) return this.newWorkspaceSession()
        const ticket = ++this.navigation
        const signal = this.ctx.layout.beginNavigation()
        const sessionId = await this.ctx.sessions.create({ workspaceId: workspace })
        if (this.disposed || !this.state.added.includes(id) || !this.catalog.has(id)) return sessionId
        await this.commit((state) => {
          if (state.sessionBindings[sessionId] && state.sessionBindings[sessionId] !== id) throw new Error('不能改变已有会话的工作台归属。')
          state.sessionBindings[sessionId] = id
          state.recentSessions[id] = sessionId
        })
        if (this.disposed || signal.aborted || ticket !== this.navigation) return sessionId
        this.suppressSelection = true
        try { this.showSession(sessionId); this.ctx.layout.selectPanel(null) }
        finally { this.suppressSelection = false }
        return sessionId
      }
      selectionChanged() {
        if (!this.ready || this.suppressSelection || this.disposed) return
        const current = this.currentSession()
        if (current === this.lastSession) return
        this.lastSession = current
        ++this.navigation
        const owner = current && this.state.sessionBindings[current]
        // Native workspace/session navigation invalidates pending workbench
        // navigation. A bound session activates its available owner; every
        // ordinary or unavailable-owner session leaves workbench mode.
        const active = owner && this.state.added.includes(owner) && this.catalog.has(owner) ? owner : null
        if (!active && this.state.active === null) return
        this.run(this.commit((state) => {
          state.active = active
          if (active) {
            state.recentSessions[active] = current
            if (!state.pinned.includes(active)) state.pinned.push(active)
          }
        }))
      }
      dispose() {
        for (const timer of this.noteTimers.values()) clearTimeout(timer)
        for (const id of this.draftNotes.keys()) this.run(this.saveNote(id))
        this.disposed = true; ++this.navigation; this.listeners.clear()
      }
    }

    const css = `
      .dshWb{font-family:inherit;font-size:13px;line-height:20px;color:var(--dsw-alias-label-primary);box-sizing:border-box}
      .dshWb button,.dshWb input,.dshWb select,.dshWb textarea{font-family:inherit;font-size:13px;line-height:20px;color:inherit;box-sizing:border-box}
      .dshWb button{cursor:pointer;transition:none}.dshWb button:disabled{opacity:1;cursor:default;color:var(--dsw-alias-label-secondary)}
      .dshWb button:focus-visible,.dshWb input:focus-visible,.dshWb select:focus-visible,.dshWb textarea:focus-visible{outline:2px solid var(--dsw-alias-label-primary);outline-offset:2px}
      .dshWbBtn{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1);border-radius:6px;padding:5px 10px;white-space:nowrap}
      a.dshWbBtn{display:inline-flex;align-items:center;text-decoration:none;color:inherit}
      .dshWbStepLink.dshWbOffline{font-size:12px;margin:0 4px;opacity:.75}
      .dshWbStatusForm{display:flex;flex-wrap:wrap;align-items:flex-end;gap:8px;margin-top:12px}.dshWbStatusForm label{display:flex;flex-direction:column;gap:4px;flex:1 1 240px;min-width:0;font-size:13px}.dshWbStatusForm input{min-width:0;border:1px solid var(--dsw-alias-border-l2);border-radius:6px;padding:5px 8px;background:var(--dsw-alias-bg-layer-1);color:inherit}.dshWbStatusResult{flex-basis:100%;font-size:13px;line-height:1.6}
      .dshWb .dshWbBtn:not(.dshWbPrimary):not([role=tab]):hover:not(:disabled),.dshWb .dshWbBtn:not(.dshWbPrimary):not([role=tab]):active:not(:disabled){background:var(--dsw-alias-bg-layer-2)}
      .dshWb .dshWbPrimary{background:var(--dsw-alias-button-primary-fill);color:var(--dsw-alias-label-primary-foreground);border-color:transparent}
      .dshWb .dshWbPrimary:hover:not(:disabled),.dshWb .dshWbPrimary:active:not(:disabled){background:var(--dsw-alias-button-primary-hover,var(--dsw-alias-button-primary-fill));color:var(--dsw-alias-label-primary-foreground)}
      .dshWb .dshWbPrimary:disabled{background:var(--dsw-alias-button-primary-fill);color:var(--dsw-alias-label-primary-foreground)}
      .dshWbMuted{color:var(--dsw-alias-label-secondary);font-size:13px;line-height:1.65}
      .dshWbActions{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
      .dshWbSetting{display:flex;align-items:center;justify-content:space-between;gap:20px;padding:14px 2px;border-bottom:1px solid var(--dsw-alias-border-l2);color:var(--dsw-alias-label-primary)}
      .dshWbSetting span{display:flex;flex-direction:column;gap:4px}.dshWbSetting strong{font-size:14px;font-weight:600}.dshWbSetting small{font-size:12px;line-height:1.5;color:var(--dsw-alias-label-secondary)}
      .dshWbSetting input{width:18px;height:18px;flex:none;accent-color:var(--dsw-alias-label-primary);cursor:pointer}
      .dshWbSessionIcon{width:16px;height:20px;display:inline-flex;align-items:center;justify-content:center;flex:none;color:var(--dsw-alias-label-tertiary)}
      .dshWbMarket{container-type:inline-size;container-name:workbench-market;overflow:auto;height:100%;width:100%;min-width:0;padding:30px 32px 52px;max-width:1440px;margin:0 auto;scrollbar-color:var(--dsw-alias-border-l2) transparent;scrollbar-width:thin}
      .dshWbMarket::selection,.dshWbMarket *::selection{background:var(--dsw-alias-label-primary);color:var(--dsw-alias-label-primary-foreground)}
      .dshWbMarketHeader{display:flex;align-items:flex-start;justify-content:space-between;gap:24px;margin-bottom:28px}
      .dshWbMarketHeaderText{max-width:70ch}.dshWbMarket h1{font-size:28px;line-height:36px;letter-spacing:-.025em;font-weight:650;margin:0 0 7px;text-wrap:balance}.dshWbMarketHeader p{margin:0}
      .dshWbMarketHeaderActions{display:flex;align-items:center;justify-content:flex-end;gap:10px;flex-wrap:wrap}
      .dshWbDockSetting{display:flex;align-items:center;gap:8px;height:36px;padding:0 10px;border:1px solid var(--dsw-alias-border-l2);border-radius:8px;background:var(--dsw-alias-bg-layer-1);white-space:nowrap}
      .dshWbDockSetting:hover{background:var(--dsw-alias-bg-layer-2)}.dshWbDockSwitch{position:relative;width:26px;height:16px;border-radius:999px;background:var(--dsw-alias-border-l2);flex:none}.dshWbDockSwitch::after{content:'';position:absolute;left:2px;top:2px;width:12px;height:12px;border-radius:50%;background:var(--dsw-alias-bg-layer-1);transition:transform .16s}.dshWbDockSetting[aria-checked=true] .dshWbDockSwitch{background:var(--dsw-alias-label-primary)}.dshWbDockSetting[aria-checked=true] .dshWbDockSwitch::after{transform:translateX(10px)}
      .dshWbCreate{display:inline-flex;align-items:center;gap:8px;padding:8px 13px;flex:none}
      .dshWbToolbar{display:flex;flex-direction:column;gap:14px;margin-bottom:22px;padding-bottom:18px;border-bottom:1px solid var(--dsw-alias-border-l2)}
      .dshWbTabs{display:flex;gap:12px;align-items:center;flex-wrap:wrap}
      .dshWbTabs [role=tablist]{display:flex;gap:4px;min-width:0;max-width:100%;overflow-x:auto;scrollbar-width:none}.dshWbTabs [role=tablist]::-webkit-scrollbar{display:none}
      .dshWbTabs [role=tab]{border:0;border-radius:0;background:transparent;padding:7px 3px;margin-right:18px;color:var(--dsw-alias-label-secondary);position:relative}
      .dshWbTabs [aria-selected=true]{color:var(--dsw-alias-label-primary);font-weight:600}
      .dshWbTabs [aria-selected=true]::after{content:'';position:absolute;left:3px;right:3px;bottom:-15px;height:2px;border-radius:2px;background:var(--dsw-alias-label-primary)}
      .dshWbTabs [role=tab][aria-selected=false]:hover:not(:disabled){color:var(--dsw-alias-label-primary)}
      .dshWbBrowseTools{display:flex;align-items:center;gap:12px;flex-wrap:wrap}
      .dshWbSearch{position:relative;min-width:220px;max-width:320px;flex:1}.dshWbSearch svg{position:absolute;left:11px;top:50%;transform:translateY(-50%);color:var(--dsw-alias-label-secondary);pointer-events:none}
      .dshWbSearch input{display:block;width:100%;border:1px solid var(--dsw-alias-border-l2);border-radius:8px;padding:7px 11px 7px 34px;background:var(--dsw-alias-bg-layer-1)}
      .dshWbCategories{display:flex;align-items:center;gap:6px;overflow:auto;padding:2px;scrollbar-width:none}.dshWbCategories::-webkit-scrollbar{display:none}
      .dshWb .dshWbCategoryFilter{border:0;background:transparent;border-radius:999px;padding:5px 10px;color:var(--dsw-alias-label-secondary);white-space:nowrap}
      .dshWb .dshWbCategoryFilter:hover{background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary)}.dshWb .dshWbCategoryFilter[aria-pressed=true]{background:var(--dsw-alias-label-primary);color:var(--dsw-alias-label-primary-foreground)}
      .dshWbSubmit{margin:0;padding:24px;border:1px solid var(--dsw-alias-border-l2);border-radius:9px;background:var(--dsw-alias-bg-layer-1)}
      .dshWbSubmitHero{margin-bottom:24px}.dshWbSubmitHero h2{font-size:22px;line-height:30px;margin:0 0 4px;font-weight:700}
      .dshWbSubmitHero p{font-size:14px;line-height:21px;margin:0;color:var(--dsw-alias-label-secondary)}
      .dshWbStepNum{display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:50%;background:var(--dsw-alias-label-primary);color:var(--dsw-alias-bg-layer-1);font-size:13px;font-weight:700;margin-bottom:10px;flex-shrink:0}
      .dshWbSteps{display:grid;grid-template-columns:1fr;gap:12px;margin:0 0 24px}
      .dshWbStep{min-width:0;padding:18px 20px;border:1px solid var(--dsw-alias-border-l2);border-radius:10px;background:var(--dsw-alias-bg-module-platform)}
      .dshWbStep strong{display:block;margin-bottom:6px;font-size:15px;line-height:22px}.dshWbStep p{margin:0;color:var(--dsw-alias-label-secondary);font-size:13px;line-height:20px}.dshWbStep a{color:var(--dsw-alias-label-primary)}
      .dshWbStepActions{display:flex;align-items:center;gap:14px;margin-top:14px;flex-wrap:wrap}
      .dshWbStepLink{background:none;border:0;padding:0;color:var(--dsw-alias-label-secondary);font-size:13px;line-height:20px;cursor:pointer;text-decoration:underline;text-underline-offset:2px}
      .dshWbStep .dshWbPrompt{margin-top:12px;min-height:150px}
      .dshWbSubmitCategory{display:flex;flex-wrap:wrap;gap:8px 16px;margin:10px 0 2px}
      .dshWbSubmitCategory label{display:flex;align-items:center;gap:8px;font-size:12px;color:var(--dsw-alias-label-secondary)}
      .dshWbSubmitCategory select,.dshWbSubmitCategory input{height:28px;min-width:0;padding:0 8px;border:1px solid var(--dsw-alias-border-l2);border-radius:6px;background:var(--dsw-alias-bg-module-platform);color:var(--dsw-alias-label-primary);font:inherit}
      .dshWbSubmitOutcome{margin-top:14px!important;padding-top:12px;border-top:1px solid var(--dsw-alias-border-l2);font-size:13px}
      .dshWbPrompt{display:block;width:100%;min-height:160px;resize:vertical;margin:0;padding:10px 12px;border:1px solid var(--dsw-alias-border-l2);border-radius:6px;background:var(--dsw-alias-bg-module-platform);font-family:ui-monospace,SFMono-Regular,Menlo,monospace!important;font-size:11px!important;line-height:18px!important}
      .dshWbCopyStatus{min-height:20px;margin:0;font-size:12px;color:var(--dsw-alias-label-secondary)}
      .dshWbGrid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:16px}
      .dshWbCard{min-width:0;border:1px solid var(--dsw-alias-border-l2);border-radius:12px;display:flex;flex-direction:column;background:var(--dsw-alias-bg-layer-1);overflow:hidden;transition:transform .2s cubic-bezier(.2,.8,.2,1),box-shadow .2s cubic-bezier(.2,.8,.2,1)}
      .dshWbCard:hover{transform:translateY(-2px);box-shadow:0 10px 26px rgba(0,0,0,.08)}
      .dshWbCardBody{display:flex;flex-direction:column;gap:10px;padding:16px 16px 15px;flex:1}.dshWbCardTitle{display:flex;align-items:center;gap:8px;min-width:0}
      .dshWbCard h2{overflow-wrap:anywhere;display:flex;align-items:center;gap:7px;min-width:0;font-size:17px;line-height:24px;letter-spacing:-.018em;font-weight:650;margin:0}.dshWbCard p{overflow-wrap:anywhere;margin:0;font-size:13px;line-height:20px}.dshWbCardDescription{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;min-height:40px}
      .dshWbCard .dshWbActions{margin-top:auto;gap:8px;padding-top:2px;align-items:center;flex-wrap:nowrap}.dshWbCard .dshWbActions>.dshWbBtn:first-child{margin-right:auto;border-color:transparent;background:transparent;color:var(--dsw-alias-label-secondary)}.dshWbCard .dshWbActions>.dshWbBtn:first-child:hover:not(:disabled){background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary)}.dshWbCardIcon{display:grid;place-items:center;width:20px;height:20px;flex-shrink:0;color:var(--dsw-alias-label-secondary)}.dshWbGlyph{display:inline-grid;place-items:center;line-height:1;flex-shrink:0}.dshWbMonogram{box-sizing:border-box;border:1.3px solid currentColor;border-radius:4px;font-weight:600}.dshWbCard .dshWbBtn{font-size:12px;line-height:18px;padding:6px 11px}
      .dshWbCategory{margin-left:auto;font-size:11px;line-height:18px;color:var(--dsw-alias-label-secondary);background:transparent;padding:0;white-space:nowrap}
      .dshWbMedia{position:relative;aspect-ratio:16/9;background:var(--dsw-alias-bg-module-platform);overflow:hidden;border-bottom:1px solid var(--dsw-alias-border-l2)}
      .dshWbPreview{position:absolute;inset:0;display:grid;grid-template-rows:22px 1fr;background:var(--dsw-alias-bg-module-platform);overflow:hidden;color:var(--dsw-alias-label-secondary)}
      .dshWbPreviewBar{display:flex;align-items:center;gap:4px;padding:0 9px;border-bottom:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1)}.dshWbPreviewDot{width:4px;height:4px;border-radius:50%;background:var(--dsw-alias-border-l2)}
      .dshWbPreviewCanvas{display:grid;min-height:0}.dshWbPreviewPane{padding:13px;min-width:0;font-size:10px;line-height:15px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.dshWbPreviewPane+.dshWbPreviewPane{border-left:1px solid var(--dsw-alias-border-l2)}
      .dshWbPreviewPane i{height:4px;background:var(--dsw-alias-border-l2);display:block;border-radius:2px;margin-top:9px;width:78%}.dshWbPreviewPane i:last-child{width:48%}.dshWbPreviewPane em{display:block;width:28px;height:28px;border-radius:7px;background:var(--dsw-alias-bg-layer-1);border:1px solid var(--dsw-alias-border-l2);margin-bottom:12px}
      .dshWbCardScreenshot{display:block;width:100%;height:100%;object-fit:cover;background:var(--dsw-alias-bg-module-platform)}
      .dshWbFavorite{position:absolute;right:10px;top:10px;z-index:2;display:grid;place-items:center;width:32px;height:32px;padding:0;border:0;border-radius:8px;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-secondary);box-shadow:0 4px 14px rgba(0,0,0,.12);opacity:0;transform:translateY(-3px);transition:opacity .16s,transform .16s,color .16s}
      .dshWbCard:hover .dshWbFavorite,.dshWbFavorite:focus-visible,.dshWbFavorite[aria-pressed=true]{opacity:1;transform:none}.dshWbFavorite:hover,.dshWbFavorite[aria-pressed=true]{color:var(--dsw-alias-label-primary)}.dshWbFavorite[aria-pressed=true] svg{fill:currentColor}
      .dshWbTitleLink{color:inherit;text-decoration:none}.dshWbTitleLink:hover{text-decoration:underline;text-underline-offset:3px}.dshWbTitleLink:focus-visible{outline:2px solid var(--dsw-alias-label-primary);outline-offset:2px;border-radius:3px}
      .dshWbAvatar{width:18px;height:18px;flex:0 0 auto;border-radius:50%;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-module-platform)}
      .dshWbMeta{display:grid;grid-template-columns:minmax(0,1fr) auto auto;align-items:center;gap:12px;padding:10px 0;border-top:1px solid var(--dsw-alias-border-l2);border-bottom:1px solid var(--dsw-alias-border-l2);font-variant-numeric:tabular-nums;min-width:0}
      .dshWbMetaItem{display:flex;align-items:center;gap:5px;color:var(--dsw-alias-label-secondary);font-size:11px;line-height:16px;min-width:0}.dshWbMetaItem svg{flex:0 0 auto}.dshWbMetaItem b{font-weight:550;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--dsw-alias-label-primary)}.dshWbMetaItem small{font-size:10px;line-height:16px;color:var(--dsw-alias-label-secondary);white-space:nowrap}.dshWbAuthor b{font-size:12px}.dshWbMetaItem:not(:first-child) small{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
      .dshWbVersion{font-size:10px;color:var(--dsw-alias-label-secondary);white-space:nowrap}.dshWbPending{font-weight:600;color:var(--dsw-alias-label-primary)}
      .dshWbEmpty{grid-column:1/-1;display:flex;min-height:240px;align-items:center;justify-content:center;text-align:center;padding:32px;border:1px dashed var(--dsw-alias-border-l2);border-radius:14px;background:var(--dsw-alias-bg-module-platform)}.dshWbEmpty strong{display:block;font-size:15px;margin-bottom:5px}.dshWbEmpty p{margin:0}
      .dshWbDetail{padding:16px;border:1px solid var(--dsw-alias-border-l2);border-radius:8px;margin-bottom:16px;background:var(--dsw-alias-bg-layer-1)}
      .dshWbDetail h2{font-size:16px;line-height:24px;margin:0 auto 0 0}.dshWbDetail p{font-size:13px;line-height:21px;margin:10px 0 0}
      .dshWbCarousel{position:relative;margin:0 -4px;border-radius:10px;overflow:hidden;background:var(--dsw-alias-bg-module-platform);border:1px solid var(--dsw-alias-border-l2)}
      .dshWbCarouselTrack{display:flex;overflow-x:auto;scroll-snap-type:x mandatory;scrollbar-width:none;overscroll-behavior-x:contain}.dshWbCarouselTrack::-webkit-scrollbar{display:none}
      .dshWbCarouselSlide{flex:0 0 100%;scroll-snap-align:start;display:block;padding:0;border:0;background:none;cursor:zoom-in;aspect-ratio:16/10}.dshWbCarouselSlide img{display:block;width:100%;height:100%;object-fit:contain}
      .dshWbCarouselSlide:focus-visible{outline:2px solid var(--dsw-alias-label-primary);outline-offset:-2px}
      .dshWbCarouselNav{position:absolute;top:50%;display:grid;place-items:center;width:34px;height:34px;margin-top:-17px;padding:0;border:1px solid var(--dsw-alias-border-l2);border-radius:50%;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);box-shadow:0 4px 14px rgba(0,0,0,.12);opacity:0;transition:opacity .16s}
      .dshWbCarouselNav[data-side=prev]{left:12px}.dshWbCarouselNav[data-side=next]{right:12px}.dshWbCarousel:hover .dshWbCarouselNav:not(:disabled),.dshWbCarouselNav:focus-visible{opacity:1}
      .dshWbCarouselDots{position:absolute;left:50%;bottom:10px;display:flex;gap:6px;transform:translateX(-50%)}.dshWbCarouselDots span{width:6px;height:6px;border-radius:50%;background:rgba(0,0,0,.22);transition:width .16s,background .16s}.dshWbCarouselDots span[data-active=true]{width:16px;border-radius:3px;background:rgba(0,0,0,.6)}
      .dshWbCarouselCount{position:absolute;right:10px;bottom:8px;padding:1px 7px;border-radius:9px;background:rgba(0,0,0,.45);color:#fff;font-size:11px;line-height:18px;font-variant-numeric:tabular-nums}
      @media(hover:none){.dshWbCarouselNav:not(:disabled){opacity:1}}
      .dshWbDetailLightbox{position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.75);cursor:pointer}
      .dshWbDetailLightbox img{max-width:92vw;max-height:92vh;object-fit:contain;border-radius:6px}.dshWbLightboxClose{position:fixed;right:22px;top:22px;width:36px;height:36px;border:0;border-radius:8px;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);font-size:20px;line-height:1}
      .dshWbModalBackdrop{position:fixed;inset:0;z-index:9998;display:flex;align-items:center;justify-content:center;background:rgba(16,16,18,.52);padding:24px;overflow:auto;animation:dshWbFade .16s ease-out}
      .dshWbModal{background:var(--dsw-alias-bg-layer-1);border-radius:14px;max-width:880px;width:100%;max-height:85vh;overflow:auto;padding:24px;box-shadow:0 18px 52px rgba(0,0,0,.24);animation:dshWbRise .2s cubic-bezier(.2,.8,.2,1)}
      .dshWbModal h2{margin:0}.dshWbModal p{font-size:14px;line-height:22px;margin:12px 0 0}.dshWbConfirm{max-width:430px}.dshWbModal .dshWbMeta{margin-top:14px}.dshWbConfirmIcon{display:grid;place-items:center;width:38px;height:38px;border-radius:10px;background:var(--dsw-alias-bg-module-platform);margin-bottom:18px}.dshWbConfirm .dshWbActions{justify-content:flex-end;margin-top:24px}.dshWbDanger{color:#b42318}.dshWbDanger:hover:not(:disabled){background:rgba(180,35,24,.08)!important}
      .dshWbGuideModal{max-width:920px;height:min(85vh,820px);padding:0;overflow:hidden;display:flex;flex-direction:column}
      .dshWbGuideHeader{display:flex;align-items:center;gap:18px;padding:18px 22px;border-bottom:1px solid var(--dsw-alias-border-l2);flex:0 0 auto}.dshWbGuideHeaderText{min-width:0;flex:1}.dshWbGuideHeader h2{font-size:18px;line-height:26px}.dshWbGuideHeader p{margin:2px 0 0;font-size:12px;line-height:18px;color:var(--dsw-alias-label-secondary)}
      .dshWbGuideBody{min-height:0;overflow:auto;padding:28px 34px 42px}.dshWbGuideSource{padding:12px 14px;margin-bottom:26px;border-radius:8px;background:var(--dsw-alias-bg-module-platform);color:var(--dsw-alias-label-secondary);font-size:12px;line-height:19px}
      .dshWbGuideDocument{max-width:780px;margin:0 auto}.dshWbGuideDocument h1{font-size:28px;line-height:38px;margin:0 0 24px}.dshWbGuideDocument h2{font-size:20px;line-height:29px;margin:36px 0 13px;padding-top:24px;border-top:1px solid var(--dsw-alias-border-l2)}.dshWbGuideDocument h3{font-size:16px;line-height:24px;margin:26px 0 10px}.dshWbGuideDocument h4{font-size:14px;line-height:22px;margin:22px 0 8px}.dshWbGuideDocument p,.dshWbGuideDocument li{font-size:13px;line-height:22px}.dshWbGuideDocument p{margin:9px 0}.dshWbGuideDocument ul,.dshWbGuideDocument ol{margin:10px 0;padding-left:22px}.dshWbGuideDocument pre{overflow:auto;margin:14px 0;padding:14px 16px;border-radius:8px;background:#18181b;color:#f4f4f5;font:12px/19px ui-monospace,SFMono-Regular,Menlo,monospace;white-space:pre}.dshWbGuideDocument hr{border:0;border-top:1px solid var(--dsw-alias-border-l2);margin:32px 0}.dshWbGuideStatus{display:grid;place-items:center;min-height:220px;text-align:center;color:var(--dsw-alias-label-secondary)}.dshWbGuideStatus .dshWbActions{margin-top:14px;justify-content:center}
      @keyframes dshWbFade{from{opacity:0}to{opacity:1}}@keyframes dshWbRise{from{opacity:.75;transform:translateY(8px) scale(.985)}to{opacity:1;transform:none}}
      .dshWbDisabledHint{display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;padding:48px 24px;text-align:center;color:var(--dsw-alias-label-secondary);gap:8px}
      .dshWbFrame{height:100%;min-height:0;display:flex;flex-direction:column;position:relative}
      .dshWbDockWrap{position:absolute;z-index:14;top:8px;left:50%;transform:translateX(-50%);display:flex;flex-direction:column;align-items:center;max-width:calc(100% - 48px)}
      .dshWbNotice+.dshWbDockWrap{top:52px}.dshWbDockTrigger{height:36px;min-width:180px;max-width:280px;padding:0 10px;border:1px solid var(--dsw-alias-border-l2);border-radius:10px;background:var(--dsw-alias-bg-layer-1);box-shadow:0 4px 14px rgba(0,0,0,.08);display:flex;align-items:center;gap:8px}
      .dshWbDockTrigger:hover,.dshWbDockTrigger[aria-expanded=true]{background:var(--dsw-alias-bg-layer-1)}.dshWbDockCurrentIcon{display:grid;place-items:center;width:20px;height:20px;flex:none;color:var(--dsw-alias-label-primary)}.dshWbDockCurrentLabel{min-width:0;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;text-align:left;font-weight:550}.dshWbDockChevron{display:grid;place-items:center;flex:none;color:var(--dsw-alias-label-secondary);transition:transform .16s}.dshWbDockTrigger[aria-expanded=true] .dshWbDockChevron{transform:rotate(180deg)}
      .dshWbDockMenu{display:flex;align-items:stretch;gap:4px;max-width:min(680px,calc(100vw - 64px));margin-top:6px;padding:6px;border:1px solid var(--dsw-alias-border-l2);border-radius:12px;background:var(--dsw-alias-bg-layer-1);box-shadow:0 12px 34px rgba(0,0,0,.14)}.dshWbDockItems{display:flex;align-items:center;gap:3px;min-width:0;overflow-x:auto;scrollbar-width:none}.dshWbDockItems::-webkit-scrollbar{display:none}.dshWbDockItem{display:flex;align-items:center;gap:7px;max-width:156px;height:34px;padding:0 10px;border:0;border-radius:8px;background:transparent;white-space:nowrap}.dshWbDockItem:hover,.dshWbDockItem[aria-current=page]{background:var(--dsw-alias-bg-layer-2)}.dshWbDockItemIcon{display:grid;place-items:center;width:18px;height:18px;flex:none}.dshWbDockItemLabel{overflow:hidden;text-overflow:ellipsis}.dshWbDockAll{height:34px;padding:0 10px;border:0;border-left:1px solid var(--dsw-alias-border-l2);border-radius:0 7px 7px 0;background:transparent;white-space:nowrap;color:var(--dsw-alias-label-secondary)}.dshWbDockAll:hover{color:var(--dsw-alias-label-primary);background:var(--dsw-alias-bg-layer-2)}
      .dshWbBody{display:flex;flex:1;min-height:0;min-width:0}.dshWbConversation{container-type:inline-size;container-name:workbench-conversation;overflow:hidden;order:1;flex:1;min-width:0;min-height:0;display:flex;flex-direction:column}
      .dshWbBusiness{order:2;width:var(--workbench-business-width,36%);min-width:220px;border-left:1px solid var(--dsw-alias-border-l2);overflow:auto;padding:18px;box-sizing:border-box}
      .dshWbBusiness[data-side=left]{order:0;border-left:0;border-right:1px solid var(--dsw-alias-border-l2)}
      .dshWbBusiness[data-embedded=true]{padding:0;overflow:hidden;display:flex;flex-direction:column}.dshWbBusiness[data-embedded=true]>div{flex:1;min-height:0}
      .dshWbBusiness h3{margin:0 0 8px;font-size:16px}.dshWbBusiness textarea{display:block;resize:vertical;min-height:260px;width:100%;padding:12px;background:var(--dsw-alias-bg-layer-1);border:1px solid var(--dsw-alias-border-l2);border-radius:8px;line-height:1.7}
      .dshWbInit{padding:32px;max-width:650px;margin:auto}.dshWbInit h2{font-size:21px}.dshWbInit select{padding:9px;max-width:100%;background:var(--dsw-alias-bg-layer-1);border:1px solid var(--dsw-alias-border-l2);border-radius:8px}
      .dshWbNotice{padding:10px 14px;background:var(--dsw-alias-bg-layer-2);font-size:13px;line-height:1.6;overflow-wrap:anywhere}
      .dshWb [hidden]{display:none!important}
      @media(hover:none){.dshWbFavorite{opacity:1;transform:none}}
      @media(prefers-reduced-motion:reduce){.dshWbCard,.dshWbFavorite,.dshWbModal,.dshWbModalBackdrop,.dshWbDockSwitch::after,.dshWbDockChevron{animation:none;transition:none}}
      @container workbench-market (max-width:980px){.dshWbGrid{grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}}
      @container workbench-market (max-width:620px){.dshWbGrid{grid-template-columns:1fr}}
      @media(max-width:900px){.dshWbMarket{padding:24px}.dshWbBusiness{min-width:180px}}
      @media(max-width:640px){.dshWbMarket{padding:20px 16px 40px}.dshWbMarketHeader{flex-direction:column;margin-bottom:22px}.dshWbMarketHeaderActions{width:100%;justify-content:flex-start}.dshWbCreate{flex:1;justify-content:center}.dshWbDockWrap{max-width:calc(100% - 24px)}.dshWbDockMenu{max-width:calc(100vw - 32px)}.dshWbDockItemLabel{display:none}.dshWbDockItem{width:34px;padding:0;justify-content:center}.dshWbTabs{min-width:0}.dshWbTabs [role=tablist]{width:100%}.dshWbBody{flex-direction:column}.dshWbBusiness,.dshWbBusiness[data-side=left]{order:2;width:100%;max-width:none;min-width:0;max-height:35%;border-left:0;border-top:1px solid var(--dsw-alias-border-l2)}.dshWbBusiness textarea{min-height:100px}.dshWbGuideModal{height:92vh;padding:0}.dshWbGuideHeader{padding:14px 16px}.dshWbGuideBody{padding:22px 18px 32px}.dshWbGuideDocument h1{font-size:24px;line-height:33px}.dshWbGrid{grid-template-columns:1fr}.dshWbBrowseTools,.dshWbSearch{width:100%;max-width:none}.dshWbCategories{width:100%}.dshWbSteps{grid-template-columns:1fr}.dshWbConfirm .dshWbActions{flex-direction:column;align-items:stretch}.dshWbConfirm .dshWbActions .dshWbBtn{width:100%}}
    `
    function useWorkbench(service) { return React.useSyncExternalStore(service.subscribe, service.getSnapshot) }
    function Button({ children, primary, ...props }) { return h('button', { type: 'button', className: `dshWbBtn${primary ? ' dshWbPrimary' : ''}`, ...props }, children) }
    function Notice({ service }) {
      const { error, catalogError, catalogStale, pending, ready, restartNeeded } = useWorkbench(service)
      const [restarting, setRestarting] = React.useState(false)
      const bridge = globalThis.dshDesktop
      const restart = async () => {
        setRestarting(true)
        try { await bridge.restartHarness() } catch (failure) { setRestarting(false); service.report(failure) }
      }
      if (restartNeeded && !error) return h('div', { className: 'dshWbNotice', role: 'status' }, '工作台安装变更需要重启 Harness 后生效。已有会话和数据不受影响。 ',
        typeof bridge?.restartHarness === 'function'
          ? h(Button, { primary: true, disabled: restarting, onClick: () => void restart() }, restarting ? '正在重启…' : '立即重启')
          : '请从菜单 Harness → 重启 Harness。')
      if (error) return h('div', { className: 'dshWbNotice', role: 'alert' }, error, ' ', h(Button, { disabled: pending > 0, onClick: () => service.run(service.load()) }, '重新加载'))
      if (!ready) return h('div', { className: 'dshWbNotice', role: 'status' }, '正在读取本地工作台…')
      if (catalogError) return h('div', { className: 'dshWbNotice', role: 'status' }, '在线市场暂时无法读取，仍可使用已安装的工作台。 ', h(Button, { disabled: pending > 0, onClick: () => service.run(service.load()) }, '重试'))
      if (catalogStale) return h('div', { className: 'dshWbNotice', role: 'status' }, '在线市场暂时无法更新，正在显示上一次成功读取的目录。')
      return null
    }
    function screenshotFor(entry) {
      return typeof entry?.screenshot === 'string' && entry.screenshot ? entry.screenshot
        : Array.isArray(entry?.screenshots) && typeof entry.screenshots[0] === 'string' ? entry.screenshots[0] : ''
    }
    function screenshotsFor(entry) {
      const result = []
      if (typeof entry?.screenshot === 'string' && entry.screenshot) result.push(entry.screenshot)
      if (Array.isArray(entry?.screenshots)) for (const s of entry.screenshots) if (typeof s === 'string' && s) result.push(s)
      return [...new Set(result)]
    }
    function compactCount(value) {
      if (!Number.isFinite(value) || value < 0) return '暂无'
      return new Intl.NumberFormat('zh-CN', { notation: 'compact', maximumFractionDigits: 1 }).format(value)
    }
    function MarketIcon({ name, size = 15 }) {
      const common = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true }
      if (name === 'author') return h('svg', common, h('circle', { cx: 12, cy: 8, r: 3.5 }), h('path', { d: 'M5.5 20c.7-4 2.9-6 6.5-6s5.8 2 6.5 6' }))
      if (name === 'install') return h('svg', common, h('path', { d: 'M12 3v12m0 0 4-4m-4 4-4-4M5 20h14' }))
      if (name === 'bookmark') return h('svg', common, h('path', { d: 'M6.5 4.5A1.5 1.5 0 0 1 8 3h8a1.5 1.5 0 0 1 1.5 1.5V21L12 17.2 6.5 21V4.5Z' }))
      if (name === 'star') return h('svg', common, h('path', { d: 'm12 3.5 2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.3-4.1 5.9-.9L12 3.5Z' }))
      if (name === 'search') return h('svg', common, h('circle', { cx: 10.5, cy: 10.5, r: 6.5 }), h('path', { d: 'm16 16 4 4' }))
      if (name === 'plus') return h('svg', common, h('path', { d: 'M12 5v14M5 12h14' }))
      if (name === 'remove') return h('svg', common, h('path', { d: 'M4 7h16M9 7V4h6v3m3 0-1 13H7L6 7m4 4v5m4-5v5' }))
      if (name === 'market') return h('svg', common, h('rect', { x: 3.5, y: 3.5, width: 7, height: 7, rx: 1.5 }), h('rect', { x: 13.5, y: 3.5, width: 7, height: 7, rx: 1.5 }), h('rect', { x: 3.5, y: 13.5, width: 7, height: 7, rx: 1.5 }), h('rect', { x: 13.5, y: 13.5, width: 7, height: 7, rx: 1.5 }))
      if (name === 'content') return h('svg', common, h('rect', { x: 3.5, y: 4, width: 17, height: 16, rx: 2 }), h('path', { d: 'M8 4v16M8 9h12M8 15h12' }))
      if (name === 'location') return h('svg', common, h('path', { d: 'M12 21s6-5.3 6-11a6 6 0 1 0-12 0c0 5.7 6 11 6 11Z' }), h('circle', { cx: 12, cy: 10, r: 2 }))
      if (name === 'life') return h('svg', common, h('circle', { cx: 12, cy: 12, r: 8.5 }), h('path', { d: 'M12 3.5c3.2 2.2 3.2 6.4 0 8.5s-3.2 6.3 0 8.5' }), h('circle', { cx: 12, cy: 7.7, r: .7, fill: 'currentColor', stroke: 'none' }), h('circle', { cx: 12, cy: 16.3, r: .7, fill: 'currentColor', stroke: 'none' }))
      if (name === 'flower') return h('svg', common, h('path', { d: 'M12 9.5C8.4 8 8.2 3.6 12 3.5c3.8.1 3.6 4.5 0 6Zm2.5 2.5c1.5-3.6 5.9-3.8 6-.1-.1 3.9-4.5 3.7-6 .1ZM12 14.5c3.6 1.5 3.8 5.9 0 6-3.8-.1-3.6-4.5 0-6ZM9.5 12c-1.5 3.6-5.9 3.8-6 .1.1-3.9 4.5-3.7 6-.1Z' }), h('circle', { cx: 12, cy: 12, r: 2 }))
      if (name === 'chevronLeft') return h('svg', common, h('path', { d: 'm14 7-5 5 5 5' }))
      if (name === 'chevronRight') return h('svg', common, h('path', { d: 'm10 7 5 5-5 5' }))
      if (name === 'chevronUp') return h('svg', common, h('path', { d: 'm7 14 5-5 5 5' }))
      if (name === 'chevronDown') return h('svg', common, h('path', { d: 'm7 10 5 5 5-5' }))
      return h('svg', common, h('path', { d: 'm12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-2.9-5.6 2.9 1.1-6.2L3 9.6l6.2-.9L12 3Z' }))
    }
    function WorkbenchPanelIcon({ service, size = 16, active = false }) {
      React.useEffect(() => service.setMarketOpen(active), [service, active])
      return h(MarketIcon, { name: 'market', size })
    }
    // A workbench's own short icon (an emoji or character) wins; otherwise its
    // category and title pick a themed glyph, then its first character.
    const TOPIC_ICONS = [[/内容|运营|媒体|content|media/i, 'content'], [/选址|地图|地理|location|map/i, 'location'], [/玄学|命理|人生|life/i, 'life'], [/花|植物|flower/i, 'flower']]
    function WorkbenchIcon({ entry, size = 16 }) {
      const own = typeof entry?.icon === 'string' ? entry.icon.trim() : ''
      if (own && [...own].length <= 2) return h('span', { className: 'dshWbGlyph', style: { fontSize: size } }, own)
      const topic = TOPIC_ICONS.find(([pattern]) => pattern.test(`${entry?.category || ''} ${entry?.title || ''}`))
      if (topic) return h(MarketIcon, { name: topic[1], size })
      const initial = [...(entry?.title || '').trim()][0]
      if (initial) return h('span', { className: 'dshWbGlyph dshWbMonogram', style: { width: size, height: size, fontSize: Math.round(size * 0.68) } }, initial)
      return h(MarketIcon, { name: 'market', size })
    }
    function SessionWorkbenchIcon({ service, sessionId, size = 14 }) {
      const { state, catalog } = useWorkbench(service)
      const owner = state.sessionBindings[sessionId]
      const entry = owner && catalog.find((item) => item.id === owner)
      if (!entry) return null
      return h('span', { className: 'dshWb dshWbSessionIcon', role: 'img', title: entry.title, 'aria-label': `属于${entry.title}` }, h(WorkbenchIcon, { entry, size }))
    }
    function WorkbenchDock({ service, entry }) {
      const { state, catalog, ready, pending } = useWorkbench(service)
      const visible = React.useSyncExternalStore(workbenchDockPreference.subscribe.bind(workbenchDockPreference), workbenchDockPreference.getSnapshot.bind(workbenchDockPreference))
      const [open, setOpen] = React.useState(false)
      const root = React.useRef(null)
      React.useEffect(() => { setOpen(false) }, [entry?.id])
      React.useEffect(() => {
        if (!open) return undefined
        const closeOutside = (event) => { if (root.current && !root.current.contains(event.target)) setOpen(false) }
        const closeEscape = (event) => { if (event.key === 'Escape') setOpen(false) }
        document.addEventListener('pointerdown', closeOutside)
        document.addEventListener('keydown', closeEscape)
        return () => {
          document.removeEventListener('pointerdown', closeOutside)
          document.removeEventListener('keydown', closeEscape)
        }
      }, [open])
      if (!visible || !entry) return null
      const disabled = !ready || pending > 0 || service.blocked
      const pinned = state.pinned.map((id) => catalog.find((item) => item.id === id)).filter((item) => item && state.added.includes(item.id) && service.catalog.has(item.id))
      return h('div', { ref: root, className: 'dshWb dshWbDockWrap', 'data-dsh-workbench-dock': '', 'data-open': open || undefined },
        h('button', { type: 'button', className: 'dshWbDockTrigger', 'aria-label': `切换工作台，当前为${entry.title}`, 'aria-expanded': open, 'aria-controls': 'dsh-workbench-dock-menu', onClick: () => setOpen((value) => !value) },
          h('span', { className: 'dshWbDockCurrentIcon', 'aria-hidden': true }, h(WorkbenchIcon, { entry, size: 16 })),
          h('span', { className: 'dshWbDockCurrentLabel' }, entry.title),
          h('span', { className: 'dshWbDockChevron', 'aria-hidden': true }, h(MarketIcon, { name: 'chevronDown', size: 14 }))),
        open && h('nav', { id: 'dsh-workbench-dock-menu', className: 'dshWbDockMenu', 'aria-label': '切换工作台' },
          h('div', { className: 'dshWbDockItems' }, pinned.map((item) => h('button', { key: item.id, type: 'button', className: 'dshWbDockItem', disabled, 'aria-current': item.id === entry.id ? 'page' : undefined, title: item.title, onClick: () => { setOpen(false); if (item.id !== entry.id) service.run(service.open(item.id)) } },
            h('span', { className: 'dshWbDockItemIcon', 'aria-hidden': true }, h(WorkbenchIcon, { entry: item, size: 15 })),
            h('span', { className: 'dshWbDockItemLabel' }, item.title)))),
          h('button', { type: 'button', className: 'dshWbDockAll', onClick: () => { setOpen(false); service.showMarket() } }, '全部工作台')))
    }
    function MetaItem({ icon, label, value }) {
      return h('span', { className: 'dshWbMetaItem', title: label }, h(MarketIcon, { name: icon }), h('b', null, value), h('small', null, label))
    }
    const GITHUB_LOGIN = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$/
    // The listing owner is a GitHub login, so its avatar comes from GitHub.
    function AuthorItem({ entry }) {
      const login = typeof entry.owner === 'string' && GITHUB_LOGIN.test(entry.owner) ? entry.owner : ''
      const [failed, setFailed] = React.useState(false)
      const name = login || entry.author || '暂无'
      return h('span', { className: 'dshWbMetaItem dshWbAuthor', title: `作者：${name}` },
        login && !failed
          ? h('img', { className: 'dshWbAvatar', src: `https://github.com/${login}.png?size=40`, alt: '', loading: 'lazy', onError: () => setFailed(true) })
          : h(MarketIcon, { name: 'author' }),
        h('b', null, name),
        entry.version && h('small', null, `· v${entry.version}`))
    }
    function metricValue(...values) { return values.find(value => Number.isSafeInteger(value) && value >= 0) }
    function EntryMeta({ entry }) {
      const downloads = metricValue(entry.metrics?.npmDownloads30d?.value, entry.metrics?.githubReleaseDownloads?.value, entry.installations, entry.installCount)
      const stars = metricValue(entry.metrics?.githubStars?.value, entry.githubStars)
      return h('div', { className: 'dshWbMeta', 'aria-label': '工作台信息' },
        h(AuthorItem, { entry }),
        h(MetaItem, { icon: 'star', label: stars === undefined ? 'GitHub Stars：暂无数据' : 'GitHub Stars', value: stars === undefined ? '—' : compactCount(stars) }),
        h(MetaItem, { icon: 'install', label: downloads === undefined ? '下载数：暂无数据' : '下载数', value: downloads === undefined ? '—' : compactCount(downloads) }))
    }
    // The workbench name opens its GitHub repository.
    function EntryTitle({ entry }) {
      const href = typeof entry.repository === 'string' && /^https:\/\/github\.com\//.test(entry.repository) ? entry.repository : ''
      return href ? h('a', { className: 'dshWbTitleLink', href, target: '_blank', rel: 'noopener noreferrer', title: `在 GitHub 上查看${entry.title || ''}` }, entry.title) : entry.title
    }
    function Preview({ entry, detail = false }) {
      const screenshot = screenshotFor(entry)
      const [failedScreenshot, setFailedScreenshot] = React.useState('')
      React.useEffect(() => { setFailedScreenshot('') }, [screenshot])
      if (detail) return null
      if (screenshot && failedScreenshot !== screenshot) return h('img', { className: 'dshWbCardScreenshot', src: screenshot, alt: `${entry.title || '工作台'}产品截图`, loading: 'lazy', style: { objectPosition: entry.screenshotPosition || 'center' }, onError: () => setFailedScreenshot(screenshot) })
      const columns = entry.layout?.businessSide === 'left' ? '1fr 1.8fr' : '1.45fr 1fr'
      return h('div', { className: 'dshWbPreview', role: 'img', 'aria-label': `${entry.title}界面预览（模拟）` },
        h('div', { className: 'dshWbPreviewBar', 'aria-hidden': true }, h('span', { className: 'dshWbPreviewDot' }), h('span', { className: 'dshWbPreviewDot' }), h('span', { className: 'dshWbPreviewDot' })),
        h('div', { className: 'dshWbPreviewCanvas', style: { gridTemplateColumns: columns } },
          h('div', { className: 'dshWbPreviewPane', style: { order: entry.layout?.businessSide === 'left' ? 2 : 1 } }, h('em'), '原生会话', h('i'), h('i')),
          h('div', { className: 'dshWbPreviewPane', style: { order: entry.layout?.businessSide === 'left' ? 1 : 2 } }, h('em'), entry.panelTitle || '业务区域', h('i'), h('i'))))
    }
    function ScreenshotGallery({ entry }) {
      const screenshots = screenshotsFor(entry)
      const [lightbox, setLightbox] = React.useState(null)
      const [index, setIndex] = React.useState(0)
      const trackRef = React.useRef(null)
      const lightboxCloseRef = React.useRef(null)
      const triggerRef = React.useRef(null)
      React.useEffect(() => {
        if (!lightbox) return undefined
        lightboxCloseRef.current?.focus()
        const handler = (event) => { if (event.key === 'Escape') setLightbox(null) }
        document.addEventListener('keydown', handler)
        return () => { document.removeEventListener('keydown', handler); triggerRef.current?.focus() }
      }, [lightbox])
      const openLightbox = (event, src) => { triggerRef.current = event.currentTarget; setLightbox(src) }
      // A scroll-snap track, so trackpad and touch swipes work natively.
      const go = (next) => {
        const track = trackRef.current
        const target = Math.max(0, Math.min(screenshots.length - 1, next))
        if (track) track.scrollTo({ left: target * track.clientWidth, behavior: 'smooth' })
        setIndex(target)
      }
      if (screenshots.length === 0) return null
      const many = screenshots.length > 1
      const carousel = h('div', { className: 'dshWbCarousel', role: 'region', 'aria-roledescription': '轮播', 'aria-label': `${entry.title || '工作台'}产品截图`,
        onKeyDown: (event) => { if (event.key === 'ArrowLeft') { event.preventDefault(); go(index - 1) } else if (event.key === 'ArrowRight') { event.preventDefault(); go(index + 1) } } },
        h('div', { ref: trackRef, className: 'dshWbCarouselTrack', onScroll: (event) => { const track = event.currentTarget; if (track.clientWidth) setIndex(Math.round(track.scrollLeft / track.clientWidth)) } },
          screenshots.map((src, i) => h('button', { key: src, type: 'button', className: 'dshWbCarouselSlide', 'aria-label': `放大截图 ${i + 1}/${screenshots.length}`, tabIndex: i === index ? 0 : -1, onClick: (event) => openLightbox(event, src) },
            h('img', { src, alt: '', loading: i === 0 ? 'eager' : 'lazy' })))),
        many && h('button', { type: 'button', className: 'dshWbCarouselNav', 'data-side': 'prev', 'aria-label': '上一张', disabled: index === 0, onClick: () => go(index - 1) }, h(MarketIcon, { name: 'chevronLeft', size: 18 })),
        many && h('button', { type: 'button', className: 'dshWbCarouselNav', 'data-side': 'next', 'aria-label': '下一张', disabled: index === screenshots.length - 1, onClick: () => go(index + 1) }, h(MarketIcon, { name: 'chevronRight', size: 18 })),
        many && h('div', { className: 'dshWbCarouselDots', 'aria-hidden': true }, screenshots.map((src, i) => h('span', { key: src, 'data-active': i === index }))),
        many && h('span', { className: 'dshWbCarouselCount', 'aria-live': 'polite' }, `${index + 1} / ${screenshots.length}`))
      if (!lightbox) return carousel
      return h(React.Fragment, null, carousel, h('div', { className: 'dshWbDetailLightbox', role: 'dialog', 'aria-modal': 'true', 'aria-label': '截图放大预览', onClick: () => setLightbox(null) },
        h('button', { ref: lightboxCloseRef, type: 'button', className: 'dshWbLightboxClose', 'aria-label': '关闭截图预览', onClick: () => setLightbox(null) }, '×'),
        h('img', { src: lightbox, alt: `${entry.title || '工作台'}截图放大`, onClick: (event) => event.stopPropagation() })))
    }
    function useDialogFocus(open, onClose, dialogRef) {
      const closeRef = React.useRef(onClose)
      closeRef.current = onClose
      React.useEffect(() => {
        if (!open) return undefined
        const previousFocus = document.activeElement
        const market = document.querySelector('.dshWbMarket')
        const wasInert = market?.inert === true
        if (market) market.inert = true
        const previousOverflow = document.body.style.overflow
        document.body.style.overflow = 'hidden'
        const handler = (event) => {
          if (event.key === 'Escape') { event.preventDefault(); closeRef.current() }
          if (event.key !== 'Tab' || !dialogRef.current) return
          const focusable = [...dialogRef.current.querySelectorAll('button:not(:disabled),a[href],input:not(:disabled),textarea:not(:disabled),select:not(:disabled),[tabindex]:not([tabindex="-1"])')]
          if (focusable.length === 0) { event.preventDefault(); dialogRef.current.focus(); return }
          const first = focusable[0]
          const last = focusable[focusable.length - 1]
          if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
          else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
        }
        document.addEventListener('keydown', handler)
        return () => {
          document.removeEventListener('keydown', handler)
          document.body.style.overflow = previousOverflow
          if (market && !wasInert) market.inert = false
          if (previousFocus?.isConnected && typeof previousFocus.focus === 'function') previousFocus.focus()
        }
      }, [open, dialogRef])
    }
    function DetailModal({ entry, onClose }) {
      const dialogRef = React.useRef(null)
      useDialogFocus(!!entry, onClose, dialogRef)
      if (!entry) return null
      // Render through a portal to body: the market panel declares container-type,
      // which would otherwise resolve a fixed-position overlay against that panel
      // and clip it with its own overflow.
      return require('react-dom').createPortal(
        h('div', { className: 'dshWbModalBackdrop', onClick: onClose },
          h('div', { ref: dialogRef, className: 'dshWbModal', role: 'dialog', 'aria-modal': 'true', 'aria-label': `${entry.title || '工作台'} 详情`, tabIndex: -1, onClick: (event) => event.stopPropagation() },
            h('div', { className: 'dshWbActions', style: { marginBottom: 14 } },
              h('h2', { style: { fontSize: 18, lineHeight: '26px', flex: 1, display: 'flex', alignItems: 'center', gap: 8 } }, h('span', { className: 'dshWbCardIcon', 'aria-hidden': true }, h(WorkbenchIcon, { entry, size: 16 })), h(EntryTitle, { entry })),
              h(Button, { autoFocus: true, onClick: onClose }, '关闭')
            ),
            h(ScreenshotGallery, { entry }),
            entry.description && h('p', null, entry.description),
            h(EntryMeta, { entry }),
            h('p', { className: 'dshWbMuted' }, `适用人群：${entry.audience || '暂无'}。${entry.requirements || ''}`)
          )
        ),
        document.body
      )
    }
    function ConfirmRemoveModal({ entry, disabled, uninstall, onCancel, onConfirm }) {
      const dialogRef = React.useRef(null)
      useDialogFocus(!!entry, onCancel, dialogRef)
      if (!entry) return null
      return require('react-dom').createPortal(
        h('div', { className: 'dshWbModalBackdrop', onClick: onCancel },
          h('div', { ref: dialogRef, className: 'dshWbModal dshWbConfirm', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'dsh-workbench-remove-title', 'aria-describedby': 'dsh-workbench-remove-description', tabIndex: -1, onClick: (event) => event.stopPropagation() },
            h('div', { className: 'dshWbConfirmIcon', 'aria-hidden': true }, h(MarketIcon, { name: 'remove', size: 18 })),
            h('h2', { id: 'dsh-workbench-remove-title', style: { fontSize: 18, lineHeight: '26px' } }, `移除「${entry.title || entry.id}」？`),
            h('p', { id: 'dsh-workbench-remove-description', className: 'dshWbMuted' }, uninstall ? '这会卸载从市场安装的工作台，并移除左侧固定入口，重启 Harness 后生效。已有会话、项目文件和工作台笔记都会保留，之后重新安装仍可继续使用。' : '这会移除本地工作台和左侧固定入口。已有会话、项目文件和工作台笔记都会保留，之后重新安装仍可继续使用。'),
            h('div', { className: 'dshWbActions' },
              h(Button, { autoFocus: true, onClick: onCancel }, '取消'),
              h(Button, { className: 'dshWbBtn dshWbDanger', disabled, onClick: onConfirm }, '确认移除')))),
        document.body)
    }
    function renderGuideBlocks(markdown) {
      const blocks = []
      let paragraph = []
      let list = null
      let code = null
      let key = 0
      const flushParagraph = () => {
        if (!paragraph.length) return
        blocks.push(h('p', { key: `p-${key++}` }, paragraph.join(' ')))
        paragraph = []
      }
      const flushList = () => {
        if (!list) return
        blocks.push(h(list.tag, { key: `list-${key++}` }, list.items.map((item, index) => h('li', { key: index }, item))))
        list = null
      }
      const flushCode = () => {
        if (code === null) return
        blocks.push(h('pre', { key: `code-${key++}` }, h('code', null, code.join('\n'))))
        code = null
      }
      for (const line of String(markdown).split('\n')) {
        if (line.trim().startsWith('```')) {
          flushParagraph(); flushList()
          if (code === null) code = []
          else flushCode()
          continue
        }
        if (code !== null) { code.push(line); continue }
        const heading = /^(#{1,4})\s+(.+)$/.exec(line)
        if (heading) {
          flushParagraph(); flushList()
          blocks.push(h(`h${heading[1].length}`, { key: `heading-${key++}` }, heading[2]))
          continue
        }
        if (/^---+$/.test(line.trim())) { flushParagraph(); flushList(); blocks.push(h('hr', { key: `hr-${key++}` })); continue }
        const unordered = /^[-*]\s+(.+)$/.exec(line)
        const ordered = /^\d+\.\s+(.+)$/.exec(line)
        if (unordered || ordered) {
          flushParagraph()
          const tag = unordered ? 'ul' : 'ol'
          if (list?.tag !== tag) { flushList(); list = { tag, items: [] } }
          list.items.push((unordered || ordered)[1])
          continue
        }
        if (!line.trim()) { flushParagraph(); flushList(); continue }
        paragraph.push(line.trim())
      }
      flushParagraph(); flushList(); flushCode()
      return blocks
    }
    const GUIDE_DOCUMENTS = {
      author: { api: GUIDE_API, url: DEVELOPMENT_PAGE_URL, title: '工作台开发规范', source: '这里展示的是 Desktop 内附的离线副本，覆盖开发和本地自测。以官网版本为准。' },
      acceptance: { api: ACCEPTANCE_API, url: ACCEPTANCE_PAGE_URL, title: '工作台市场验收规范', source: '这里展示的是 Desktop 内附的离线副本，只在上架到工作台市场时需要。以官网版本为准。' }
    }
    function GuideModal({ service, open, onClose, document: kind = 'author' }) {
      const doc = GUIDE_DOCUMENTS[kind] || GUIDE_DOCUMENTS.author
      const dialogRef = React.useRef(null)
      const [retry, setRetry] = React.useState(0)
      const [guide, setGuide] = React.useState({ loading: true, text: '', error: '' })
      useDialogFocus(open, onClose, dialogRef)
      React.useEffect(() => {
        if (!open) return undefined
        let cancelled = false
        setGuide({ loading: true, text: '', error: '' })
        service.request(doc.api, { cache: 'no-store', credentials: 'same-origin' })
          .then(async response => {
            if (!response.ok) {
              const data = await response.json().catch(() => ({}))
              throw new Error(data.error || `HTTP ${response.status}`)
            }
            const text = await response.text()
            if (!text.trim()) throw new Error('接口未返回有效指南。')
            if (!cancelled) setGuide({ loading: false, text, error: '' })
          })
          .catch(error => { if (!cancelled) setGuide({ loading: false, text: '', error: `指南暂时无法读取：${error instanceof Error ? error.message : String(error)}` }) })
        return () => { cancelled = true }
      }, [service, open, retry, doc.api])
      if (!open) return null
      return require('react-dom').createPortal(
        h('div', { className: 'dshWbModalBackdrop', onClick: onClose },
          h('div', { ref: dialogRef, className: 'dshWbModal dshWbGuideModal', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'dsh-workbench-guide-title', tabIndex: -1, onClick: event => event.stopPropagation() },
            h('header', { className: 'dshWbGuideHeader' },
              h('div', { className: 'dshWbGuideHeaderText' },
                h('h2', { id: 'dsh-workbench-guide-title' }, doc.title),
                h('p', null, '官方地址：', h('a', { href: doc.url, target: '_blank', rel: 'noopener noreferrer' }, doc.url))),
              h(Button, { autoFocus: true, onClick: onClose }, '关闭')),
            h('div', { className: 'dshWbGuideBody' },
              guide.loading
                ? h('div', { className: 'dshWbGuideStatus', role: 'status' }, '正在读取指南…')
                : guide.error
                  ? h('div', { className: 'dshWbGuideStatus', role: 'alert' }, h('div', null, h('strong', null, guide.error), h('div', { className: 'dshWbActions' }, h(Button, { onClick: () => setRetry(value => value + 1) }, '重试'))))
                  : h('div', { className: 'dshWbGuideDocument' },
                    h('div', { className: 'dshWbGuideSource' }, doc.source),
                    renderGuideBlocks(guide.text))))),
        document.body)
    }
    function developmentWorkbenchAgentPrompt() {
      return `请帮我制作一个 DSH Desktop 工作台，只在本机开发和使用，不需要上传或投稿。你可以使用自己的开发流程，DSH 不控制开发过程。

${DEVELOPMENT_GUIDE_READING}不要覆盖已有的未提交更改。按规范第 3 节完成包格式（package.json 的 dsh 字段、cordis.patch.yml、服务端和客户端入口），实现工作台功能和界面，运行相关测试与构建；若存在 scripts/check-workbench-package.mjs，用它校验工作台包。

完成后，按当前可用的插件安装方式把工作台装到我这台 DSH Desktop，不要让我重新填写项目信息。然后按规范第 8 节“本地自测清单”逐项检查，确认它出现在「已安装的工作台」和左侧入口，并实际打开使用。

若当前版本没有可用的本地安装方式，或你不能操作这台 DSH Desktop，请保留经过校验的包，准确说明缺少的步骤，不要声称已加载。最后告诉我修改的文件、自测结果、实际加载状态和未验证的项目。`
    }
    // One line, no Markdown or YAML syntax: the text lands in a prompt and a PR body.
    const categorySuggestion = (value) => String(value || '').replace(/[\r\n`"'<>{}\[\]]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 20)
    function categoryInstruction(category, suggestion) {
      if (!category?.id) return '分类按市场仓库 data/categories.json 选最贴切的一个。'
      const wanted = category.id === 'other' && categorySuggestion(suggestion)
      return `category 填 ${category.id}（${category.name}），这是作者自己选的分类，不要改成别的。${wanted ? `现有分类都不合适，请在 PR 描述里写一句“建议新增分类：${wanted}”，由市场维护者决定是否新增。` : ''}`
    }
    function submissionWorkbenchAgentPrompt({ category, suggestion } = {}) {
      return `我的 DSH Desktop 工作台已经做好，也装到本机验证过了。现在按工作台市场验收规范把它提交到公共工作台市场，不用重复开发功能。

${ACCEPTANCE_READING}先确认要公开的仓库和内容，不得公开密钥、业务数据或未经授权的私有代码。按规范的上架流程，把代码提交到我自己的公开 GitHub 仓库；有 npm 包就发布 npm，也可以发布 GitHub Release 安装包，或者只提供可直接安装的源码。先读取项目真实脚本和工具帮助，不要编造发布命令。

然后向 ${WORKBENCH_MARKET_REPO} 提交一个 PR，只新增 data/workbenches/<owner>__<repo>.yml。格式以该仓库的 catalog/README.md 为准：url、name、category、description.zh 和 description.en 必填，screenshots 填 1–5 张我仓库里的真实截图地址，没有 npm 时可以填 tarball。${categoryInstruction(category, suggestion)}不要填写版本、npm 包名或校验值，也不要修改生成的文件。使用我已经授权的 GitHub 网页或 gh；缺少登录或公开授权时，先完成能完成的部分，再准确说明缺什么。

提交前按规范第 6 节的验收清单逐项自查。提交 PR 就是进入审核，本机不保存投稿状态。只有拿到真实 PR URL 才能说“已提交”；PR 合并且市场目录能读到条目后才能说“已上架”。最后给我发布地址、PR URL、目录是否可见、验收证据和仍未完成的事项。`
    }
    function submissionAgentPrompt(mode = 'development') {
      return mode === 'submission' ? submissionWorkbenchAgentPrompt() : developmentWorkbenchAgentPrompt()
    }
    async function copySubmissionPrompt(text, targetWindow = window) {
      if (targetWindow.navigator?.clipboard?.writeText) return targetWindow.navigator.clipboard.writeText(text)
      const textarea = targetWindow.document.createElement('textarea')
      textarea.value = text
      textarea.setAttribute('readonly', '')
      Object.assign(textarea.style, { position: 'fixed', opacity: '0', pointerEvents: 'none' })
      targetWindow.document.body.appendChild(textarea)
      textarea.select()
      try {
        if (!targetWindow.document.execCommand?.('copy')) throw new Error('浏览器未允许复制。')
      } finally { textarea.remove() }
    }
    const SUBMISSION_STATUS_TEXT = {
      open: '审核中：PR 已提交，正在等待检查和维护者审核。',
      draft: '草稿：PR 还是草稿状态，标记为可审核后才会进入审核。',
      'changes-requested': '需修改：审核者要求修改，请在 GitHub 上查看意见并更新 PR。',
      merged: '已合并：市场目录更新后，工作台就会出现在工作台市场中。',
      closed: '已关闭：这个 PR 没有合并。可以在 GitHub 上查看原因。'
    }
    function SubmissionStatus({ service }) {
      const [link, setLink] = React.useState('')
      const [result, setResult] = React.useState(null)
      const [error, setError] = React.useState('')
      const [checking, setChecking] = React.useState(false)
      const check = async (event) => {
        event.preventDefault()
        setChecking(true)
        setError('')
        setResult(null)
        try { setResult(await service.readSubmissionStatus(link)) }
        catch (failure) { setError(failure instanceof Error ? failure.message : String(failure)) }
        finally { setChecking(false) }
      }
      return h('form', { className: 'dshWbStatusForm', onSubmit: check },
        h('label', null, h('span', null, '已经提交了 PR？粘贴链接查看进度'),
          h('input', { type: 'url', value: link, placeholder: 'https://github.com/dataelement/awesome-dsh-workbench/pull/…', 'aria-label': '投稿 PR 链接', onChange: (event) => setLink(event.target.value) })),
        h(Button, { type: 'submit', disabled: checking || !link.trim() }, checking ? '正在查询…' : '查询'),
        h('div', { role: 'status', 'aria-live': 'polite', className: 'dshWbStatusResult' },
          error && h('p', { className: 'dshWbMuted' }, `无法查询：${error}`),
          result && h('p', null, h('strong', null, `#${result.number} ${result.title}`), h('br'), SUBMISSION_STATUS_TEXT[result.status] || result.status, ' ',
            h('a', { href: result.url, target: '_blank', rel: 'noopener noreferrer' }, '在 GitHub 查看'))))
    }
    function Market({ service }) {
      const { state, catalog, categories: marketCategories = [], ready, pending, installs, installing } = useWorkbench(service)
      const workbenchEnabled = React.useSyncExternalStore(workbenchPreference.subscribe.bind(workbenchPreference), workbenchPreference.getSnapshot.bind(workbenchPreference))
      const dockVisible = React.useSyncExternalStore(workbenchDockPreference.subscribe.bind(workbenchDockPreference), workbenchDockPreference.getSnapshot.bind(workbenchDockPreference))
      const [tab, setTab] = React.useState('market')
      const [search, setSearch] = React.useState('')
      const [category, setCategory] = React.useState('全部')
      const [detail, setDetail] = React.useState(null)
      const [removing, setRemoving] = React.useState(null)
      const [openPrompt, setOpenPrompt] = React.useState(null)
      const [copyStatus, setCopyStatus] = React.useState('')
      const [guideOpen, setGuideOpen] = React.useState(null)
      const [submitCategory, setSubmitCategory] = React.useState('')
      const [categoryIdea, setCategoryIdea] = React.useState('')
      if (!workbenchEnabled) return h('section', { className: 'dshWb dshWbMarket', 'aria-label': '工作台市场' },
        h('div', { className: 'dshWbDisabledHint' }, h('h1', null, '工作台功能已关闭'), h('p', { className: 'dshWbMuted' }, '可在 设置 → 通用 中重新开启。')))
      const developmentPrompt = developmentWorkbenchAgentPrompt()
      const chosenCategory = marketCategories.find((item) => item.id === submitCategory)
      const submissionPrompt = submissionWorkbenchAgentPrompt({ category: chosenCategory, suggestion: categoryIdea })
      const disabled = !ready || pending > 0 || service.blocked
      const added = state.added
      const favorites = state.favorites || []
      const unavailableEntry = (id) => ({ id, title: id, category: '其他', unavailable: true, description: '提供此工作台的插件当前未加载。' })
      const allEntries = tab === 'mine'
        ? added.map((id) => catalog.find((entry) => entry.id === id) || unavailableEntry(id))
        : tab === 'favorites'
          ? favorites.map((id) => catalog.find((entry) => entry.catalogId === id || entry.id === id) || unavailableEntry(id))
          : tab === 'market' ? [...catalog] : []
      const categories = ['全部', ...new Set(allEntries.map((entry) => entry.category || '其他'))]
      const query = search.toLowerCase().trim()
      const entries = allEntries.filter((entry) => (category === '全部' || (entry.category || '其他') === category) && `${entry.title || ''} ${entry.description || ''} ${entry.author || ''} ${entry.category || ''}`.toLowerCase().includes(query))
      const selected = allEntries.find((entry) => (entry.catalogId || entry.id) === detail)
      const removingEntry = allEntries.find((entry) => entry.id === removing) || catalog.find((entry) => entry.id === removing)
      const selectCollection = (value) => { setTab(value); setCategory('全部'); setDetail(null) }
      const navigateCollections = (event) => {
        const values = ['market', 'favorites', 'mine']
        const current = values.indexOf(tab)
        let next = current
        if (event.key === 'ArrowRight') next = (current + 1) % values.length
        else if (event.key === 'ArrowLeft') next = (current - 1 + values.length) % values.length
        else if (event.key === 'Home') next = 0
        else if (event.key === 'End') next = values.length - 1
        else return
        event.preventDefault()
        selectCollection(values[next])
        requestAnimationFrame(() => document.getElementById(`dsh-workbench-${values[next]}-tab`)?.focus())
      }
      const copyPrompt = async (text) => {
        setCopyStatus('')
        try { await copySubmissionPrompt(text); setCopyStatus('已复制，现在可以粘贴给你的 Agent。') }
        catch { setCopyStatus('复制失败，请展开指令后手动全选复制。') }
      }
      return h('section', { className: 'dshWb dshWbMarket', 'aria-label': '工作台市场' },
        h('header', { className: 'dshWbMarketHeader' },
          h('div', { className: 'dshWbMarketHeaderText' },
            h('h1', null, tab === 'submit' ? '制作属于你的工作台' : '切换工作台，进入不同工作方式'),
            h('p', { className: 'dshWbMuted' }, tab === 'submit' ? '遵循规范开发、安装并验证，也可以准备材料提交到工作台市场。' : '工作台把专属界面、会话和资料组织在一起。进入工作台后，可通过顶部 Dock 快速切换。')),
          h('div', { className: 'dshWbMarketHeaderActions' },
            h('button', { type: 'button', className: 'dshWbDockSetting', role: 'switch', 'aria-checked': dockVisible, onClick: () => workbenchDockPreference.set(!dockVisible) },
              h('span', null, '显示工作台 Dock'), h('span', { className: 'dshWbDockSwitch', 'aria-hidden': true })),
            h(Button, { primary: tab !== 'submit', className: `dshWbBtn${tab !== 'submit' ? ' dshWbPrimary' : ''} dshWbCreate`, onClick: () => { setTab(tab === 'submit' ? 'market' : 'submit'); setDetail(null); setCopyStatus('') } }, h(MarketIcon, { name: tab === 'submit' ? 'search' : 'plus' }), tab === 'submit' ? '返回工作台市场' : '制作我的工作台'))),
        h(Notice, { service }),
        tab !== 'submit' && h('div', { className: 'dshWbToolbar' },
          h('div', { className: 'dshWbTabs' }, h('div', { role: 'tablist', 'aria-label': '工作台集合' },
            h(Button, { id: 'dsh-workbench-market-tab', role: 'tab', tabIndex: tab === 'market' ? 0 : -1, 'aria-selected': tab === 'market', 'aria-controls': 'dsh-workbench-market-panel', onKeyDown: navigateCollections, onClick: () => selectCollection('market') }, '工作台市场'),
            h(Button, { id: 'dsh-workbench-favorites-tab', role: 'tab', tabIndex: tab === 'favorites' ? 0 : -1, 'aria-selected': tab === 'favorites', 'aria-controls': 'dsh-workbench-favorites-panel', onKeyDown: navigateCollections, onClick: () => selectCollection('favorites') }, `我的收藏 (${favorites.length})`),
            h(Button, { id: 'dsh-workbench-mine-tab', role: 'tab', tabIndex: tab === 'mine' ? 0 : -1, 'aria-selected': tab === 'mine', 'aria-controls': 'dsh-workbench-mine-panel', onKeyDown: navigateCollections, onClick: () => selectCollection('mine') }, `已安装的工作台 (${added.length})`))),
          h('div', { className: 'dshWbBrowseTools' },
            h('label', { className: 'dshWbSearch' }, h(MarketIcon, { name: 'search' }), h('input', { type: 'search', placeholder: '搜索名称、作者或分类', 'aria-label': '搜索工作台', value: search, onChange: (event) => setSearch(event.target.value) })),
            h('div', { className: 'dshWbCategories', role: 'group', 'aria-label': '按分类筛选' }, categories.map((value) => h('button', { key: value, type: 'button', className: 'dshWbCategoryFilter', 'aria-pressed': category === value, onClick: () => setCategory(value) }, value))))),
        tab === 'submit' && h('section', { id: 'dsh-workbench-submit-panel', className: 'dshWbSubmit', 'aria-label': '制作我的工作台', tabIndex: 0 },
          h('div', { className: 'dshWbSubmitHero' },
            h('h2', null, '制作属于你自己的工作台'),
            h('p', null, '照着下面三步做。只给自己用的话，做完第二步就够了。')
          ),
          h('div', { className: 'dshWbSteps', 'aria-label': '工作台制作步骤' },
            h('div', { className: 'dshWbStep' },
              h('span', { className: 'dshWbStepNum' }, '1'),
              h('strong', null, '把开发指令交给 Agent'),
              h('p', null, '复制指令给你的 Agent，它会按', h('a', { href: DEVELOPMENT_PAGE_URL, target: '_blank', rel: 'noopener noreferrer' }, '工作台开发规范'), h('button', { type: 'button', className: 'dshWbStepLink dshWbOffline', onClick: () => setGuideOpen('author') }, '离线查看'), '开发。只在本机使用，不需要上传代码。'),
              h('div', { className: 'dshWbStepActions' },
                h(Button, { primary: true, onClick: () => copyPrompt(developmentPrompt) }, '复制开发指令'),
                h('button', { type: 'button', className: 'dshWbStepLink', onClick: () => setOpenPrompt(openPrompt === 'development' ? null : 'development') }, openPrompt === 'development' ? '收起指令' : '查看指令')),
              openPrompt === 'development' && h('textarea', { className: 'dshWbPrompt', readOnly: true, value: developmentPrompt, 'aria-label': '开发工作台给 Agent 的指令', onFocus: (event) => event.currentTarget.select() })),
            h('div', { className: 'dshWbStep' },
              h('span', { className: 'dshWbStepNum' }, '2'),
              h('strong', null, '装到本机，自测确认能用'),
              h('p', null, 'Agent 会把它装到这台 Desktop，并按开发规范的本地自测清单检查。你打开确认它出现在「已安装的工作台」和左侧入口。自己用的话，到这一步就完成了。')),
            h('div', { className: 'dshWbStep' },
              h('span', { className: 'dshWbStepNum' }, '3'),
              h('strong', null, '想上架，再按验收规范提交'),
              h('p', null, '按', h('a', { href: ACCEPTANCE_PAGE_URL, target: '_blank', rel: 'noopener noreferrer' }, '工作台市场验收规范'), h('button', { type: 'button', className: 'dshWbStepLink dshWbOffline', onClick: () => setGuideOpen('acceptance') }, '离线查看'), '，把代码上传到你自己的 GitHub 仓库，准备简介和截图，再向', h('a', { href: WORKBENCH_MARKET_REPO, target: '_blank', rel: 'noopener noreferrer' }, '工作台市场仓库'), '提交收录 PR。把投稿指令复制给 Agent 即可。'),
              marketCategories.length > 0 && h('div', { className: 'dshWbSubmitCategory' },
                h('label', null, h('span', null, '上架分类'),
                  h('select', { value: submitCategory, onChange: (event) => setSubmitCategory(event.target.value), 'aria-label': '上架分类' },
                    h('option', { value: '' }, '让 Agent 按规范选择'),
                    marketCategories.map((item) => h('option', { key: item.id, value: item.id }, item.name)))),
                submitCategory === 'other' && h('label', null, h('span', null, '想要的新分类（可选）'),
                  h('input', { type: 'text', maxLength: 20, value: categoryIdea, placeholder: '例如：法务合规', onChange: (event) => setCategoryIdea(event.target.value), 'aria-label': '想要的新分类' }))),
              h('div', { className: 'dshWbStepActions' },
                h(Button, { primary: true, onClick: () => copyPrompt(submissionPrompt) }, '复制投稿指令'),
                h('button', { type: 'button', className: 'dshWbStepLink', onClick: () => setOpenPrompt(openPrompt === 'submission' ? null : 'submission') }, openPrompt === 'submission' ? '收起指令' : '查看指令')),
              openPrompt === 'submission' && h('textarea', { className: 'dshWbPrompt', readOnly: true, value: submissionPrompt, 'aria-label': '投稿工作台给 Agent 的指令', onFocus: (event) => event.currentTarget.select() }),
              h(SubmissionStatus, { service }))),
          h('p', { className: 'dshWbMuted dshWbSubmitOutcome' }, '提交 PR 就是进入审核，进度以 GitHub 上的 PR 为准，本机不保存投稿状态。PR 合并、市场目录更新后，工作台就会出现在工作台市场中。'),
          h('p', { className: 'dshWbCopyStatus', role: 'status', 'aria-live': 'polite' }, copyStatus)),
        tab !== 'submit' && h('section', { id: `dsh-workbench-${tab}-panel`, role: 'tabpanel', 'aria-labelledby': `dsh-workbench-${tab}-tab`, tabIndex: 0 },
          h('div', { className: 'dshWbGrid', 'data-tab': tab }, entries.map((entry) => {
            const catalogId = entry.catalogId || entry.id
            const isFavorite = favorites.includes(catalogId)
            // Offer an update only for market installs whose listed version moved on.
            const updatable = entry.installed && installs[catalogId] && entry.listedVersion && installs[catalogId].version !== entry.listedVersion
            return h('article', { key: catalogId, className: 'dshWbCard' },
              h('div', { className: 'dshWbMedia' }, h(Preview, { entry }), h('button', { type: 'button', className: 'dshWbFavorite', title: isFavorite ? '取消收藏' : '收藏工作台', 'aria-label': isFavorite ? `取消收藏${entry.title}` : `收藏${entry.title}`, 'aria-pressed': isFavorite, disabled: disabled, onClick: () => service.run(service.toggleFavorite(catalogId)) }, h(MarketIcon, { name: 'bookmark', size: 17 }))),
              h('div', { className: 'dshWbCardBody' },
                h('div', { className: 'dshWbCardTitle' }, h('h2', null, h('span', { className: 'dshWbCardIcon', 'aria-hidden': true }, h(WorkbenchIcon, { entry, size: 15 })), h(EntryTitle, { entry })), h('span', { className: 'dshWbCategory' }, entry.category || '其他')),
                h('p', { className: 'dshWbMuted dshWbCardDescription' }, entry.description || '这个工作台暂时还没有填写介绍。'),
                h(EntryMeta, { entry }),
                h('div', { className: 'dshWbActions' }, h(Button, { onClick: () => setDetail(catalogId) }, '查看详情'),
                  // Added workbenches must always keep a direct entry point, even when an update is available.
                  state.added.includes(entry.id)
                    ? h(React.Fragment, null,
                      h(Button, { primary: true, disabled: disabled || !service.catalog.has(entry.id), onClick: () => service.run(service.open(entry.id)) }, '打开工作台'),
                      updatable && h(Button, { title: `更新到 v${entry.listedVersion}`, 'aria-label': `更新${entry.title}到 v${entry.listedVersion}`, disabled: disabled || !!installing, onClick: () => service.run(service.installFromMarket(catalogId)) }, installing === catalogId ? '更新中…' : '更新'))
                  : updatable
                    ? h(Button, { title: `更新到 v${entry.listedVersion}`, 'aria-label': `更新${entry.title}到 v${entry.listedVersion}`, disabled: disabled || !!installing, onClick: () => service.run(service.installFromMarket(catalogId)) }, installing === catalogId ? '正在更新…' : '检测到更新')
                  : entry.installed
                      ? h(Button, { primary: true, disabled: disabled || entry.unavailable, onClick: () => service.run(service.add(entry.id)) }, '添加到我的工作台')
                      : installs[catalogId]
                        // Installed but not loaded yet: it runs after Harness restarts.
                        ? h(React.Fragment, null,
                          h(Button, { disabled: true }, '重启后生效'),
                          h(Button, { className: 'dshWbBtn dshWbDanger', disabled: disabled || !!installing, onClick: () => service.run(service.uninstallFromMarket(catalogId)) }, '卸载'))
                        : entry.distribution
                          ? h(Button, { primary: true, disabled: disabled || !!installing, onClick: () => service.run(service.installFromMarket(catalogId)) }, installing === catalogId ? '正在安装…' : '安装')
                          : h('a', { className: 'dshWbBtn dshWbPrimary', href: entry.repository, target: '_blank', rel: 'noopener noreferrer' }, '查看安装说明'),
                  tab === 'mine' && h(Button, { className: 'dshWbBtn dshWbDanger', disabled, onClick: () => setRemoving(entry.id) }, '移除'))))
          }), entries.length === 0 && h('div', { className: 'dshWbEmpty' }, h('div', null,
            h('strong', null, tab === 'favorites' && !search ? '还没有收藏工作台' : tab === 'mine' && !search ? '还没有安装工作台' : '没有找到匹配的工作台'),
            h('p', { className: 'dshWbMuted' }, tab === 'favorites' && !search ? '把鼠标移到市场卡片上，点击书签即可收藏。' : tab === 'mine' && !search ? '到工作台市场选择一个工作台开始。' : '试试其他关键词或分类。'))))),
        detail != null && h(DetailModal, { entry: selected, onClose: () => setDetail(null) }),
        removing != null && h(ConfirmRemoveModal, { entry: removingEntry, disabled, onCancel: () => setRemoving(null), uninstall: !!service.marketInstallFor(removing), onConfirm: () => service.run(service.removeWorkbench(removing).then(() => setRemoving(null))) }),
        guideOpen && h(GuideModal, { service, open: !!guideOpen, document: guideOpen, onClose: () => setGuideOpen(null) }))
    }
    function Notebook({ service, entry }) {
      const { state, drafts, pending, error } = useWorkbench(service)
      const value = drafts[entry.id] ?? state.notes[entry.id] ?? ''
      const dirty = Object.hasOwn(drafts, entry.id)
      return h('div', null, h('h3', null, entry.panelTitle), h('p', { className: 'dshWbMuted' }, entry.hint),
        h('textarea', { value, maxLength: 100000, 'aria-label': entry.panelTitle, placeholder: entry.placeholder, onChange: (event) => service.editNote(entry.id, event.target.value) }),
        h('p', { className: 'dshWbMuted', role: 'status' }, error ? '保存失败，当前内容仍保留在界面中。' : dirty || pending ? '正在保存…' : '已保存在本地 · 此工作台的会话共用这份笔记'))
    }
    class PanelBoundary extends React.Component {
      state = { error: false }
      static getDerivedStateFromError() { return { error: true } }
      render() { return this.state.error ? h('div', { role: 'alert' }, '业务面板加载失败。原生会话和公共入口仍可使用。') : this.props.children }
    }
    // The portal destination stays stable; providers may dock its mount anywhere
    // inside their own main-area layout without remounting the native input.
    function ConversationMount({ container }) {
      const previous = React.useRef(null)
      const attach = React.useCallback((node) => {
        if (node) node.appendChild(container)
        else if (container.parentNode === previous.current) container.remove()
        previous.current = node
      }, [container])
      return h('div', { ref: attach, style: { display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, minWidth: 0, height: '100%' } })
    }
    function Frame({ service, conversation }) {
      const { state, catalog, ready, pending } = useWorkbench(service)
      const workbenchEnabled = React.useSyncExternalStore(workbenchPreference.subscribe.bind(workbenchPreference), workbenchPreference.getSnapshot.bind(workbenchPreference))
      // The list snapshot changes whenever the main-view retention moves.
      React.useSyncExternalStore(React.useCallback((listener) => service.ctx.sessions.list.subscribe(listener), [service]), () => service.ctx.sessions.list.getSnapshot())
      const workspaces = React.useSyncExternalStore(React.useCallback((listener) => service.ctx.workspaces.list.subscribe(listener), [service]), () => service.ctx.workspaces.list.getSnapshot())
      const [workspaceId, setWorkspaceId] = React.useState('')
      const [conversationContainer] = React.useState(() => {
        const node = document.createElement('div')
        Object.assign(node.style, { display: 'flex', flexDirection: 'column', flex: '1', minHeight: '0', minWidth: '0', height: '100%' })
        return node
      })
      if (!workbenchEnabled) return h('div', { className: 'dshWb dshWbFrame' }, h('div', { className: 'dshWbDisabledHint' }, h('h2', null, '工作台功能已关闭'), h('p', { className: 'dshWbMuted' }, '可在 设置 → 通用 中重新开启。')))
      const entry = state.active && catalog.find((item) => item.id === state.active)
      // Catalog-only entries can remain pinned after their runtime package is
      // removed or while an install is waiting for restart. Never pass their
      // missing Component to React: one unavailable workbench must not blank
      // the native conversation or every other installed workbench.
      const loaded = catalog.filter((item) => state.added.includes(item.id) && typeof item.Component === 'function')
      const runtimeEntry = typeof entry?.Component === 'function' ? entry : null
      const id = runtimeEntry?.id
      const customFrame = runtimeEntry?.customFrame === true
      const conversationMount = h(ConversationMount, { container: conversationContainer })
      const currentSession = service.currentSession()
      const hasCurrentSession = !!(entry && currentSession != null && state.sessionBindings[currentSession] === entry.id)
      const disabled = !ready || pending > 0 || service.blocked
      const chosen = workspaces.items.find((item) => item.workspaceId === workspaceId) || service.defaultWorkspace()
      return h('div', { className: 'dshWb dshWbFrame' }, h(Notice, { service }),
        runtimeEntry && h(WorkbenchDock, { service, entry: runtimeEntry }),
        require('react-dom').createPortal(conversation, conversationContainer),
        ...loaded.filter((item) => item.customFrame === true).map((item) => h('div', { key: item.id, hidden: id !== item.id, style: { position: 'relative', overflow: 'hidden', flex: 1, minHeight: 0, minWidth: 0, width: '100%', maxWidth: '100%', display: 'flex', flexDirection: 'column', boxSizing: 'border-box' } }, h(PanelBoundary, null, h(item.Component, { service, entry: item, active: id === item.id, conversation: id === item.id ? conversationMount : null })))),
        h('div', { className: 'dshWbBody', hidden: customFrame, style: { '--workbench-business-width': `${(entry?.layout?.businessWidth ?? 0.36) * 100}%` } },
          h('div', { className: 'dshWbConversation' },
            entry && !hasCurrentSession && h('section', { className: 'dshWbInit' }, h('h2', null, `开始使用${entry.title}`), h('p', { className: 'dshWbMuted' }, '可以直接新建工作区并开始对话，也可以使用已有工作区。新会话会自动关联这个工作台。'),
              h(Button, { primary: !chosen, disabled, onClick: () => service.run(service.newWorkspaceSession()) }, '新建工作区并开始对话'),
              workspaces.items.length > 0 && h('div', { className: 'dshWbActions' }, h('select', { 'aria-label': '选择工作区', value: chosen?.workspaceId || '', disabled, onChange: (event) => setWorkspaceId(event.target.value) }, h('option', { value: '', disabled: true }, '选择已有工作区'), ...workspaces.items.map((item) => h('option', { key: item.workspaceId, value: item.workspaceId }, item.title)))),
              h('p', { className: 'dshWbMuted' }, chosen ? `将使用工作区：${chosen.title}` : '选择或新建一个项目文件夹，即可创建工作区并开始对话。'),
              chosen && h(Button, { primary: true, disabled, onClick: () => service.run(service.newSession(chosen.workspaceId)) }, '在此工作区新建会话')),
            // One fixed position for the native conversation: changing workbench
            // content or moving to a custom dock does not remount its input tree.
            h('div', { style: { display: entry && !hasCurrentSession ? 'none' : 'contents' } }, !customFrame && conversationMount)),
          ...loaded.filter((item) => !item.customFrame).map((item) => h('aside', { key: item.id, className: 'dshWbBusiness', 'data-side': item.layout?.businessSide, 'data-embedded': item.embedded === true, hidden: id !== item.id, 'aria-label': item.panelTitle }, h(PanelBoundary, null, h(item.Component, { service, entry: item }))))))
    }
    function apply(ctx) {
      const service = new Workbenches(ctx)
      ctx.effect(() => ctx.reflect.provide('desktopWorkbenches', service), 'workbenches: service')
      ctx.effect(() => {
        const style = document.createElement('style')
        style.dataset.pluginCss = 'dsh-desktop-workbenches'
        style.textContent = css
        document.head.appendChild(style)
        return () => style.remove()
      }, 'workbenches: styles')
      ctx.slots.inject('main', () => ctx.slots.register({ name: 'main', key: PANEL, inject: () => ({ service }) }, Market))
      ctx.slots.inject('sidebar.panellist', () => ctx.slots.register({ name: 'sidebar.panellist', id: PANEL, order: 100, label: '工作台', inject: () => ({ service }) }, WorkbenchPanelIcon))
      ctx.slots.inject('sidebar.workspaces', () => ctx.slots.inject('sidebar.session.leading', () => ctx.slots.register({ name: 'sidebar.session.leading', inject: () => ({ service }) }, SessionWorkbenchIcon)))
      function WorkbenchEnableSetting() {
        const enabled = React.useSyncExternalStore(workbenchPreference.subscribe.bind(workbenchPreference), workbenchPreference.getSnapshot.bind(workbenchPreference))
        return h('label', { className: 'dshWbSetting' }, h('span', null, h('strong', null, '启用工作台功能'), h('small', null, '开启后可使用工作台市场和已安装的工作台；关闭后所有工作台不加载，不影响已保存的会话和数据。')),
          h('input', { type: 'checkbox', role: 'switch', checked: enabled, onChange: (event) => { workbenchPreference.set(event.target.checked); if (!event.target.checked) ctx.layout.selectPanel(null) }, 'aria-label': '启用或关闭工作台功能' }))
      }
      ctx.slots.inject('settings.general.item', () => ctx.slots.register({ name: 'settings.general.item', id: 'desktop-workbench-enable', order: 34 }, WorkbenchEnableSetting))
      ctx.slots.inject('desktop.workbench.frame', () => ctx.slots.register({ name: 'desktop.workbench.frame', inject: () => ({ service }) }, Frame))
      ctx.effect(() => ctx.sessions.list.subscribe(() => service.selectionChanged()), 'workbenches: session navigation')
      ctx.effect(() => ctx.uiWorkspace.registerSessionOpener((sessionId, source = 'explicit-session') => {
        if (service.internalSessionOpen === sessionId) return false
        if (source === 'workspace' && service.routeWorkspaceSession(sessionId)) return true
        const id = service.state.sessionBindings[sessionId]
        if (!service.ready || !id || !service.state.added.includes(id) || !service.catalog.has(id)) return false
        service.run(service.open(id, sessionId))
        return true
      }), 'workbenches: open linked session')
      ctx.effect(() => {
        service.run(service.load())
        const beforeUnload = (event) => { if (service.pending || service.blocked || service.draftNotes.size) { event.preventDefault(); event.returnValue = '' } }
        window.addEventListener('beforeunload', beforeUnload)
        return () => { window.removeEventListener('beforeunload', beforeUnload); service.dispose() }
      }, 'workbenches: lifecycle')
    }
    return { apply, inject: ['slots', 'layout', 'sessions', 'workspaces', 'uiWorkspace'], Workbenches, Frame, Market, Notebook, submissionAgentPrompt, developmentWorkbenchAgentPrompt, submissionWorkbenchAgentPrompt, copySubmissionPrompt }
  }
})

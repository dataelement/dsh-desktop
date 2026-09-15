window.__ModuleLoader__.load({
  id: 'dsh-desktop-workbenches',
  factory: (require) => {
    const React = require('react')
    const h = React.createElement
    const PANEL = 'desktop-workbenches'
    const API = '/api/desktop-workbenches/state'
    const SUBMISSIONS_API = '/api/desktop-workbenches/submissions'
    const MARKET_PREF = 'dsh-workbench-market-enabled'
    const marketPreference = {
      listeners: new Set(),
      enabled: (() => { try { return window.localStorage.getItem(MARKET_PREF) !== 'false' } catch { return true } })(),
      subscribe(listener) { this.listeners.add(listener); return () => this.listeners.delete(listener) },
      getSnapshot() { return this.enabled },
      set(value) { this.enabled = !!value; try { window.localStorage.setItem(MARKET_PREF, String(this.enabled)) } catch {} ; for (const listener of this.listeners) listener() }
    }
    const EMPTY = () => ({ version: 1, added: [], pinned: [], active: null, sessionBindings: {}, recentSessions: {}, notes: {} })

    // This controller owns navigation and local state only. It never terminates
    // agents, changes a running session's preset, or registers global tools.
    class Workbenches {
      constructor(ctx, request = (...args) => fetch(...args)) {
        this.ctx = ctx
        this.request = request
        this.state = EMPTY()
        this.revision = 0
        this.ready = false
        this.error = ''
        this.blocked = false
        this.pending = 0
        this.disposed = false
        this.listeners = new Set()
        this.catalog = new Map()
        this.submissions = []
        this.submissionPending = false
        this.submissionError = ''
        this.draftNotes = new Map()
        this.noteTimers = new Map()
        this.queue = Promise.resolve()
        this.sessionRequests = new Map()
        this.navigation = 0
        this.suppressSelection = false
        this.lastSession = undefined
        this.publish()
      }
      getSnapshot = () => this.snapshot
      subscribe = (listener) => { this.listeners.add(listener); return () => this.listeners.delete(listener) }
      publish() {
        this.snapshot = { state: this.state, drafts: Object.fromEntries(this.draftNotes), ready: this.ready, error: this.error, pending: this.pending, catalog: [...this.catalog.values()], submissions: this.submissions, submissionPending: this.submissionPending, submissionError: this.submissionError }
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
      async readSubmissions() {
        const response = await this.request(SUBMISSIONS_API, { credentials: 'same-origin', cache: 'no-store' })
        const data = await response.json()
        if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`)
        return Array.isArray(data) ? data : Array.isArray(data.submissions) ? data.submissions : []
      }
      async load() {
        await this.queue
        const ticket = ++this.navigation
        this.ready = false
        this.error = ''
        this.publish()
        try {
          const [data, submissionsResult] = await Promise.all([this.read(), this.readSubmissions().then((value) => ({ value, error: '' })).catch((error) => ({ value: [], error: error instanceof Error ? error.message : String(error) }))])
          await this.ctx.sessions.refresh()
          if (this.disposed || ticket !== this.navigation) return
          this.state = data.state
          this.revision = data.revision
          this.submissions = submissionsResult.value
          this.submissionError = submissionsResult.error
          this.blocked = false
          this.ready = true
          this.lastSession = this.ctx.sessions.list.getSnapshot().current
          this.publish()
          const active = this.state.active
          if (active && this.catalog.has(active) && this.state.added.includes(active)) await this.open(active)
          else this.selectionChanged()
          for (const id of this.draftNotes.keys()) this.run(this.saveNote(id))
        } catch (error) { this.report(error) }
      }
      async submit(payload) {
        if (!this.ready || this.blocked || this.disposed) throw new Error('投稿服务尚未就绪，请稍后再试。')
        if (this.submissionPending) throw new Error('工作台正在保存，请勿重复提交。')
        this.submissionPending = true
        this.error = ''
        this.publish()
        try {
          const response = await this.request(SUBMISSIONS_API, {
            method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
          })
          const data = await response.json()
          if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`)
          const submission = data.submission || data
          if (!submission || typeof submission !== 'object' || !submission.id) throw new Error('投稿已保存，但服务器未返回有效记录。')
          this.submissions = [submission, ...this.submissions.filter((item) => item.id !== submission.id)]
          this.submissionError = ''
          this.publish()
          return submission
        } finally {
          this.submissionPending = false
          this.publish()
        }
      }
      commit(change) {
        if (!this.ready || this.blocked || this.disposed) return Promise.reject(new Error('工作台更改尚未保存，请先重新加载。'))
        const next = JSON.parse(JSON.stringify(this.state))
        try { change(next) } catch (error) { return Promise.reject(error) }
        this.state = next
        this.pending++
        this.publish()
        const task = this.queue.then(async () => {
          if (this.blocked) throw new Error('工作台更改尚未保存，请先重新加载。')
          const response = await this.request(API, {
            method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ revision: this.revision, state: next })
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
        if (!descriptor || !/^[a-z][a-z0-9-]{0,79}$/.test(descriptor.id) || !descriptor.title || typeof Component !== 'function') throw new Error('Invalid workbench registration')
        if (this.catalog.has(descriptor.id)) throw new Error(`Duplicate workbench: ${descriptor.id}`)
        if (descriptor.customFrame !== undefined && typeof descriptor.customFrame !== 'boolean') throw new Error('Invalid custom frame flag')
        const layout = descriptor.layout || {}
        if (layout.businessSide !== undefined && !['left', 'right'].includes(layout.businessSide)) throw new Error('Invalid workbench business side')
        if (layout.businessWidth !== undefined && (!Number.isFinite(layout.businessWidth) || layout.businessWidth < 0.25 || layout.businessWidth > 0.7)) throw new Error('Workbench business width must be between 0.25 and 0.7')
        const entry = { ...descriptor, layout: { businessSide: layout.businessSide || 'right', businessWidth: layout.businessWidth ?? 0.36 }, Component }
        this.catalog.set(entry.id, entry)
        this.publish()
        return () => {
          if (this.catalog.get(entry.id) !== entry) return
          this.catalog.delete(entry.id)
          // Unloading the provider cannot erase its sessions or user's notes.
          if (this.state.active === entry.id) this.state = { ...this.state, active: null }
          this.publish()
        }
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
        const ticket = ++this.navigation
        const signal = this.ctx.layout.beginNavigation()
        const defaultWorkspace = this.defaultWorkspace()
        await this.commit((state) => { state.active = id; if (!state.pinned.includes(id)) state.pinned.push(id) })
        if (this.disposed || signal.aborted || ticket !== this.navigation) return
        const target = sessionId || this.state.recentSessions[id]
        const listed = this.ctx.sessions.list.getSnapshot().byId
        this.suppressSelection = true
        try {
          if (target && listed[target] && this.state.sessionBindings[target] === id) this.ctx.sessions.open(target)
          else this.ctx.sessions.clear()
          this.lastSession = this.ctx.sessions.list.getSnapshot().current
          this.ctx.layout.selectPanel(null)
        } finally { this.suppressSelection = false }
        if (target && listed[target]) await this.commit((state) => { state.recentSessions[id] = target })
        else if (this.catalog.get(id)?.initialization === 'new-session' && defaultWorkspace) await this.newSession(defaultWorkspace.workspaceId)
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
        const current = this.ctx.sessions.list.getSnapshot().current
        return this.workspaceFor(current) || this.ctx.workspaces.list.getSnapshot().items[0]
      }
      // Providers keep their own project/profile flows; Desktop owns session identity.
      ensureSession({ workbenchId, folder, sessionId: savedSessionId } = {}) {
        if (!this.ready || this.blocked || this.disposed || this.state.active !== workbenchId || !this.state.added.includes(workbenchId) || !this.catalog.has(workbenchId)) return Promise.reject(new Error('请先打开可用的工作台。'))
        const key = JSON.stringify([workbenchId, folder, savedSessionId || null])
        if (this.sessionRequests.has(key)) return this.sessionRequests.get(key)
        const ticket = ++this.navigation
        const signal = this.ctx.layout.beginNavigation()
        const request = (async () => {
          await this.ctx.sessions.refresh()
          if (this.disposed || !this.state.added.includes(workbenchId) || !this.catalog.has(workbenchId)) throw new Error('工作台已移除或不可用。')
          let sessionId = savedSessionId && this.ctx.sessions.list.getSnapshot().byId[savedSessionId] ? savedSessionId : null
          if (sessionId) {
            const owner = this.state.sessionBindings[sessionId]
            if (owner && owner !== workbenchId) throw new Error('此会话已属于另一个工作台，不能重新绑定。')
          } else {
            if (typeof folder !== 'string' || !folder.trim()) throw new Error('创建会话需要业务项目文件夹。')
            const workspace = await this.ctx.workspaces.create({ path: folder })
            if (this.disposed || !this.state.added.includes(workbenchId) || !this.catalog.has(workbenchId)) throw new Error('工作台已移除或不可用。')
            sessionId = await this.ctx.sessions.create({ workspaceId: workspace.workspaceId })
          }
          if (this.disposed || !this.state.added.includes(workbenchId) || !this.catalog.has(workbenchId)) throw new Error('工作台已移除或不可用。')
          await this.commit((state) => {
            if (state.sessionBindings[sessionId] && state.sessionBindings[sessionId] !== workbenchId) throw new Error('不能改变已有会话的工作台归属。')
            state.sessionBindings[sessionId] = workbenchId
            state.recentSessions[workbenchId] = sessionId
          })
          if (!this.disposed && !signal.aborted && ticket === this.navigation && this.state.active === workbenchId) {
            this.suppressSelection = true
            try { this.ctx.sessions.open(sessionId); this.lastSession = sessionId; this.ctx.layout.selectPanel(null) }
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
        try { this.ctx.sessions.open(sessionId); this.lastSession = sessionId; this.ctx.layout.selectPanel(null) }
        finally { this.suppressSelection = false }
        return sessionId
      }
      selectionChanged() {
        if (!this.ready || this.suppressSelection || this.disposed) return
        const current = this.ctx.sessions.list.getSnapshot().current
        if (current === this.lastSession) return
        this.lastSession = current
        ++this.navigation
        const owner = current && this.state.sessionBindings[current]
        // Native workspace/session navigation invalidates pending workbench
        // navigation. Only a currently available owner may replace the active
        // business panel; ordinary sessions and sessions left behind by removed
        // providers stay native without changing the current workbench.
        const active = owner && this.state.added.includes(owner) && this.catalog.has(owner) ? owner : null
        if (!active) return
        this.run(this.commit((state) => {
          state.active = active
          state.recentSessions[active] = current
          if (!state.pinned.includes(active)) state.pinned.push(active)
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
      .dshWb .dshWbBtn:not(.dshWbPrimary):not([role=tab]):hover:not(:disabled),.dshWb .dshWbBtn:not(.dshWbPrimary):not([role=tab]):active:not(:disabled){background:var(--dsw-alias-bg-layer-2)}
      .dshWb .dshWbPrimary{background:var(--dsw-alias-button-primary-fill);color:var(--dsw-alias-label-primary-foreground);border-color:transparent}
      .dshWb .dshWbPrimary:hover:not(:disabled),.dshWb .dshWbPrimary:active:not(:disabled){background:var(--dsw-alias-button-primary-hover,var(--dsw-alias-button-primary-fill));color:var(--dsw-alias-label-primary-foreground)}
      .dshWb .dshWbPrimary:disabled{background:var(--dsw-alias-button-primary-fill);color:var(--dsw-alias-label-primary-foreground)}
      .dshWbMuted{color:var(--dsw-alias-label-secondary);font-size:13px;line-height:1.65}
      .dshWbActions{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
      .dshWbNav{display:flex;flex-direction:column;gap:4px;padding:6px 0;max-height:32vh;overflow:auto;width:100%;min-width:0}
      .dshWbSetting{display:flex;align-items:center;justify-content:space-between;gap:20px;padding:14px 2px;border-bottom:1px solid var(--dsw-alias-border-l2);color:var(--dsw-alias-label-primary)}
      .dshWbSetting span{display:flex;flex-direction:column;gap:4px}.dshWbSetting strong{font-size:14px;font-weight:600}.dshWbSetting small{font-size:12px;line-height:1.5;color:var(--dsw-alias-label-secondary)}
      .dshWbSetting input{width:18px;height:18px;flex:none;accent-color:var(--dsw-alias-label-primary);cursor:pointer}
      .dshWbNavHeader{display:flex;align-items:center;gap:4px;min-width:0}
      .dshWbNavModes{display:flex;gap:2px;flex-shrink:0}
      .dshWb .dshWbMode{display:grid;place-items:center;width:24px;height:24px;padding:0;border:0;border-radius:4px;background:transparent;color:var(--dsw-alias-label-secondary)}
      .dshWb .dshWbMode[aria-pressed=true]{background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary)}
      .dshWbNavItems{display:flex;flex-direction:column;gap:2px}
      .dshWbNavRow{display:flex;align-items:center;gap:2px;border-radius:6px;min-width:0}.dshWbNavRow[data-active=true]{background:var(--dsw-alias-bg-layer-2)}
      .dshWbNavOpen{border:0;background:none;display:flex;align-items:center;gap:8px;text-align:left;padding:6px 8px;flex:1;min-width:0;border-radius:6px}
      .dshWb .dshWbNavOpen:hover:not(:disabled),.dshWb .dshWbMove:hover:not(:disabled),.dshWb .dshWbMode:hover:not(:disabled),.dshWb .dshWbNavOpen:active:not(:disabled),.dshWb .dshWbMove:active:not(:disabled),.dshWb .dshWbMode:active:not(:disabled){background:var(--dsw-alias-bg-layer-2)}
      .dshWbNavIcon{display:grid;place-items:center;width:16px;height:20px;flex-shrink:0;font-size:15px;line-height:20px}
      .dshWbNavLabel{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
      .dshWb .dshWbMove{border:0;background:transparent;padding:3px;font-size:12px;line-height:18px;border-radius:4px}
      .dshWbNav[data-mode=icons] .dshWbNavItems{flex-direction:row;flex-wrap:wrap;gap:5px;padding:2px 4px}
      .dshWbNav[data-mode=icons] .dshWbNavRow{width:32px;height:32px}
      .dshWbNav[data-mode=icons] .dshWbNavRow .dshWbNavOpen{justify-content:center;padding:6px;width:32px;height:32px}
      .dshWbNav[data-wide=false] .dshWbNavOpen{justify-content:center}
      .dshWbMarket{container-type:inline-size;container-name:workbench-market;overflow:auto;height:100%;width:100%;min-width:0;padding:28px 32px;max-width:1200px;margin:0 auto}
      .dshWbMarket h1{font-size:22px;line-height:30px;letter-spacing:-.4px;font-weight:600;margin:3px 0 6px}
      .dshWbMarket>p{margin:0}
      .dshWbTabs{display:flex;gap:12px;margin:22px 0 18px;padding-bottom:12px;border-bottom:1px solid var(--dsw-alias-border-l2);align-items:center;flex-wrap:wrap}
      .dshWbTabs [role=tablist]{gap:3px;padding:3px;border-radius:7px;background:var(--dsw-alias-bg-module-platform)}
      .dshWbTabs [role=tab]{border-color:transparent;background:transparent;padding:4px 10px;color:var(--dsw-alias-label-secondary)}
      .dshWbTabs [aria-selected=true]{background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);border-color:var(--dsw-alias-border-l2);font-weight:600}
      .dshWbTabs [role=tab][aria-selected=false]:hover:not(:disabled),.dshWbTabs [role=tab][aria-selected=false]:active:not(:disabled){background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary)}
      .dshWbTabs input{margin-left:auto;width:200px;min-width:140px;border:1px solid var(--dsw-alias-border-l2);border-radius:6px;padding:5px 10px;background:var(--dsw-alias-bg-layer-1)}
      .dshWbSubmit{margin:0;padding:18px;border:1px solid var(--dsw-alias-border-l2);border-radius:9px;background:var(--dsw-alias-bg-layer-1)}
      .dshWbSubmit h2{font-size:15px;line-height:22px;margin:0 0 3px}.dshWbSubmit>p{margin:0 0 12px}
      .dshWbSteps{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin:14px 0 20px}.dshWbStep{min-width:0;padding:13px;border:1px solid var(--dsw-alias-border-l2);border-radius:7px;background:var(--dsw-alias-bg-module-platform)}.dshWbStep strong{display:block;margin-bottom:4px;font-size:13px}.dshWbStep p{margin:0;color:var(--dsw-alias-label-secondary);font-size:12px;line-height:18px}.dshWbStep code{overflow-wrap:anywhere}
      .dshWbSubmit h3{font-size:13px;line-height:20px;margin:18px 0 6px}.dshWbSubmitOutcome{margin-top:14px!important;padding-top:12px;border-top:1px solid var(--dsw-alias-border-l2)}
      .dshWbSubmitChoices{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin:12px 0}
      .dshWbSubmitChoice{min-width:0;padding:12px;border:1px solid var(--dsw-alias-border-l2);border-radius:7px;background:var(--dsw-alias-bg-module-platform);text-align:left;white-space:normal}
      .dshWbSubmitChoice strong{display:block;font-size:13px;line-height:20px;margin-bottom:2px}.dshWbSubmitChoice span{display:block;color:var(--dsw-alias-label-secondary);font-size:12px;line-height:18px}
      .dshWbSubmitChoice[aria-pressed=true]{border-color:var(--dsw-alias-label-primary);background:var(--dsw-alias-bg-layer-2)}
      .dshWbPrompt{display:block;width:100%;min-height:190px;resize:vertical;margin:0 0 12px;padding:10px 12px;border:1px solid var(--dsw-alias-border-l2);border-radius:6px;background:var(--dsw-alias-bg-module-platform);font-family:ui-monospace,SFMono-Regular,Menlo,monospace!important;font-size:11px!important;line-height:18px!important}
      .dshWbCopyStatus{min-height:20px;margin:0;font-size:12px;color:var(--dsw-alias-label-secondary)}
      .dshWbGrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,245px),1fr));gap:14px}
      .dshWbCard{min-width:0;border:1px solid var(--dsw-alias-border-l2);border-radius:9px;padding:14px;display:flex;flex-direction:column;gap:10px;background:var(--dsw-alias-bg-layer-1)}
      .dshWbCard h2{overflow-wrap:anywhere;display:flex;align-items:center;gap:8px;font-size:14px;line-height:21px;font-weight:600;margin:0}.dshWbCard p{overflow-wrap:anywhere;margin:0;font-size:12px;line-height:19px}.dshWbCard .dshWbActions{margin-top:auto;gap:6px;padding-top:2px}
      .dshWbCardIcon{font-size:17px;line-height:22px;flex-shrink:0}.dshWbCard .dshWbBtn{font-size:12px;line-height:18px;padding:5px 9px}
      .dshWbPreview{height:108px;border:1px solid var(--dsw-alias-border-l2);border-radius:5px;display:grid;grid-template-columns:1.2fr 1fr;background:var(--dsw-alias-bg-module-platform);overflow:hidden}
      .dshWbPreviewImage{display:block;width:100%;height:100%;object-fit:cover;background:var(--dsw-alias-bg-module-platform)}
      .dshWbPreview>div{padding:9px;min-width:0;font-size:10px;line-height:15px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:var(--dsw-alias-label-secondary)}.dshWbPreview>div+div{border-left:1px solid var(--dsw-alias-border-l2)}
      .dshWbPreview i{height:3px;background:var(--dsw-alias-border-l2);display:block;border-radius:2px;margin-top:7px;width:80%}.dshWbPreview i:last-child{width:55%}
      .dshWbMeta{display:flex;gap:5px 12px;align-items:center;flex-wrap:wrap;color:var(--dsw-alias-label-secondary);font-size:11px;line-height:17px;font-variant-numeric:tabular-nums;min-width:0}
      .dshWbMeta span{min-width:0;overflow-wrap:anywhere}.dshWbPending{font-weight:600;color:var(--dsw-alias-label-primary)}
      .dshWbGrid[data-tab=mine]{grid-template-columns:1fr;gap:8px}
      .dshWbGrid[data-tab=mine] .dshWbPreview{display:none}
      .dshWbGrid[data-tab=mine] .dshWbCard{display:grid;grid-template-columns:minmax(0,1fr) auto;column-gap:20px;row-gap:4px;padding:13px 15px}
      .dshWbGrid[data-tab=mine] .dshWbCard>h2{grid-column:1;grid-row:1}
      .dshWbGrid[data-tab=mine] .dshWbCard>p{grid-column:1;grid-row:2}
      .dshWbGrid[data-tab=mine] .dshWbCard>.dshWbMeta{grid-column:1;grid-row:3}
      .dshWbGrid[data-tab=mine] .dshWbCard>.dshWbActions{grid-column:2;grid-row:1 / 4;align-self:center;margin:0;padding:0}
      .dshWbGrid[data-tab=mine] .dshWbCard>.dshWbNotice{grid-column:1 / -1;margin-top:8px}
      @container workbench-market (max-width:600px){.dshWbGrid[data-tab=mine] .dshWbCard{grid-template-columns:minmax(0,1fr)}.dshWbGrid[data-tab=mine] .dshWbCard>.dshWbActions{grid-column:1;grid-row:4;margin-top:8px}}
      .dshWbDetail{padding:16px;border:1px solid var(--dsw-alias-border-l2);border-radius:8px;margin-bottom:16px;background:var(--dsw-alias-bg-layer-1)}
      .dshWbDetail h2{font-size:16px;line-height:24px;margin:0 auto 0 0}.dshWbDetail p{font-size:13px;line-height:21px;margin:10px 0 0}
      .dshWbDetailImage{display:block;width:100%;max-height:360px;object-fit:contain;margin-top:12px;border-radius:6px;background:var(--dsw-alias-bg-module-platform)}
      .dshWbFrame{height:100%;min-height:0;display:flex;flex-direction:column}
      .dshWbBody{display:flex;flex:1;min-height:0;min-width:0}.dshWbConversation{container-type:inline-size;container-name:workbench-conversation;overflow:hidden;order:1;flex:1;min-width:0;min-height:0;display:flex;flex-direction:column}
      .dshWbBusiness{order:2;width:var(--workbench-business-width,36%);min-width:220px;border-left:1px solid var(--dsw-alias-border-l2);overflow:auto;padding:18px;box-sizing:border-box}
      .dshWbBusiness[data-side=left]{order:0;border-left:0;border-right:1px solid var(--dsw-alias-border-l2)}
      .dshWbBusiness[data-embedded=true]{padding:0;overflow:hidden;display:flex;flex-direction:column}.dshWbBusiness[data-embedded=true]>div{flex:1;min-height:0}
      .dshWbBusiness h3{margin:0 0 8px;font-size:16px}.dshWbBusiness textarea{display:block;resize:vertical;min-height:260px;width:100%;padding:12px;background:var(--dsw-alias-bg-layer-1);border:1px solid var(--dsw-alias-border-l2);border-radius:8px;line-height:1.7}
      .dshWbInit{padding:32px;max-width:650px;margin:auto}.dshWbInit h2{font-size:21px}.dshWbInit select{padding:9px;max-width:100%;background:var(--dsw-alias-bg-layer-1);border:1px solid var(--dsw-alias-border-l2);border-radius:8px}
      .dshWbNotice{padding:10px 14px;background:var(--dsw-alias-bg-layer-2);font-size:13px;line-height:1.6;overflow-wrap:anywhere}
      .dshWb [hidden]{display:none!important}
      @media(max-width:900px){.dshWbMarket{padding:18px}.dshWbBusiness{min-width:180px}}
      @media(max-width:640px){.dshWbBody{flex-direction:column}.dshWbBusiness,.dshWbBusiness[data-side=left]{order:2;width:100%;max-width:none;min-width:0;max-height:35%;border-left:0;border-top:1px solid var(--dsw-alias-border-l2)}.dshWbBusiness textarea{min-height:100px}.dshWbGrid{grid-template-columns:1fr}.dshWbTabs input{width:100%;margin-left:0}.dshWbSubmitChoices,.dshWbSteps{grid-template-columns:1fr}}
    `
    function useWorkbench(service) { return React.useSyncExternalStore(service.subscribe, service.getSnapshot) }
    function Button({ children, primary, ...props }) { return h('button', { type: 'button', className: `dshWbBtn${primary ? ' dshWbPrimary' : ''}`, ...props }, children) }
    function Notice({ service }) {
      const { error, pending, ready } = useWorkbench(service)
      if (error) return h('div', { className: 'dshWbNotice', role: 'alert' }, error, ' ', h(Button, { disabled: pending > 0, onClick: () => service.run(service.load()) }, '重新加载'))
      if (!ready) return h('div', { className: 'dshWbNotice', role: 'status' }, '正在读取本地工作台…')
      return null
    }
    function ModeIcon({ mode }) {
      return h('svg', { width: 14, height: 14, viewBox: '0 0 16 16', fill: 'none', stroke: 'currentColor', strokeWidth: 1.25, 'aria-hidden': true },
        mode === 'list' ? h('path', { d: 'M2 4h1m3 0h8M2 8h1m3 0h8M2 12h1m3 0h8', strokeLinecap: 'round' })
          : [2, 9].flatMap((x) => [2, 9].map((y) => h('rect', { key: `${x}-${y}`, x, y, width: 5, height: 5, rx: 1 }))))
    }
    function Sidebar({ service, wide }) {
      const { state, catalog, ready, pending } = useWorkbench(service)
      const marketEnabled = React.useSyncExternalStore(marketPreference.subscribe.bind(marketPreference), marketPreference.getSnapshot.bind(marketPreference))
      const [mode, setMode] = React.useState(() => {
        try { return window.localStorage.getItem('dsh-workbench-sidebar-mode') === 'icons' ? 'icons' : 'list' } catch { return 'list' }
      })
      const changeMode = (next) => {
        setMode(next)
        try { window.localStorage.setItem('dsh-workbench-sidebar-mode', next) } catch { /* Preferences remain usable when storage is unavailable. */ }
      }
      const iconMode = wide && mode === 'icons'
      const disabled = !ready || pending > 0 || service.blocked
      return h('nav', { className: 'dshWb dshWbNav', 'data-mode': iconMode ? 'icons' : 'list', 'data-wide': !!wide, 'aria-label': '工作台' },
        marketEnabled && h('div', { className: 'dshWbNavHeader' },
          h('button', { type: 'button', className: 'dshWbNavOpen', title: '工作台市场', 'aria-label': '工作台市场', onClick: () => service.ctx.layout.selectPanel(PANEL) }, h('span', { className: 'dshWbNavIcon', 'aria-hidden': true }, '▦'), wide && h('span', { className: 'dshWbNavLabel' }, '工作台市场')),
          wide && h('div', { className: 'dshWbNavModes', role: 'group', 'aria-label': '工作台显示方式' },
            ...['list', 'icons'].map((value) => h('button', { key: value, type: 'button', className: 'dshWbMode', 'aria-label': value === 'list' ? '列表模式' : '图标模式', title: value === 'list' ? '列表模式' : '图标模式', 'aria-pressed': mode === value, onClick: () => changeMode(value) }, h(ModeIcon, { mode: value }))))),
        h('div', { className: 'dshWbNavItems' }, state.pinned.map((id, index) => {
          const entry = catalog.find((item) => item.id === id)
          const title = entry?.title || `${id}（不可用）`
          return h('div', { key: id, className: 'dshWbNavRow', 'data-active': state.active === id,
            draggable: !disabled, onDragStart: (event) => event.dataTransfer.setData('application/x-dsh-workbench', id),
            onDragOver: (event) => { if (event.dataTransfer.types.includes('application/x-dsh-workbench')) event.preventDefault() },
            onDrop: (event) => { event.preventDefault(); if (!disabled) service.run(service.reorder(event.dataTransfer.getData('application/x-dsh-workbench'), id)) }
          }, h('button', { type: 'button', className: 'dshWbNavOpen', disabled: disabled || !entry, title: `${title}（${state.active === id ? '点击关闭工作台' : '点击打开工作台'}）`, 'aria-label': title, 'aria-pressed': state.active === id, onClick: () => service.run(service.toggle(id)) }, h('span', { className: 'dshWbNavIcon', 'aria-hidden': true }, entry?.icon || '◇'), wide && !iconMode && h('span', { className: 'dshWbNavLabel' }, entry?.title || id)),
          wide && !iconMode && h('button', { type: 'button', className: 'dshWbMove', title: '向上移动', 'aria-label': `${title}向上移动`, disabled: disabled || index === 0, onClick: () => service.run(service.reorder(id, state.pinned[index - 1])) }, '↑'),
          wide && !iconMode && h('button', { type: 'button', className: 'dshWbMove', title: '向下移动', 'aria-label': `${title}向下移动`, disabled: disabled || index === state.pinned.length - 1, onClick: () => service.run(service.reorder(state.pinned[index + 1], id)) }, '↓'))
        })))
    }
    function screenshotFor(entry) {
      return typeof entry?.screenshot === 'string' && entry.screenshot ? entry.screenshot
        : Array.isArray(entry?.screenshots) && typeof entry.screenshots[0] === 'string' ? entry.screenshots[0] : ''
    }
    function compactCount(value) {
      if (!Number.isFinite(value) || value < 0) return '暂无'
      return new Intl.NumberFormat('zh-CN', { notation: 'compact', maximumFractionDigits: 1 }).format(value)
    }
    function EntryMeta({ entry }) {
      return h('div', { className: 'dshWbMeta', 'aria-label': '工作台信息' },
        h('span', null, `作者：${entry.author || '暂无'}`),
        h('span', null, `安装：${compactCount(entry.installations ?? entry.installCount)}`),
        h('span', null, `点赞：${compactCount(entry.likes ?? entry.likeCount)}`),
        entry.pending && h('span', { className: 'dshWbPending' }, '本机待送审'))
    }
    function Preview({ entry, detail = false }) {
      const screenshot = screenshotFor(entry)
      if (screenshot) return h('img', { className: detail ? 'dshWbDetailImage' : 'dshWbPreview dshWbPreviewImage', src: screenshot, alt: `${entry.title || '工作台'}产品截图`, loading: 'lazy' })
      if (detail) return null
      return h('div', { className: 'dshWbPreview', 'aria-label': `${entry.title}布局示意`, style: { gridTemplateColumns: entry.layout?.businessSide === 'left' ? '1.8fr 1fr' : '1.2fr 1fr' } }, h('div', { style: { order: 1 } }, '原生会话', h('i'), h('i')), h('div', { style: { order: entry.layout?.businessSide === 'left' ? 0 : 2 } }, entry.panelTitle || '业务区域', h('i'), h('i')))
    }
    function localWorkbenchAgentPrompt() {
      return `请帮我制作 DSH Desktop 工作台。你可以使用自己的开发流程，DSH 不控制开发过程。

先阅读并遵循公开的工作台开发指南：https://dshdesktop.com/workbench/skills/workbench-development/SKILL.md 。若在 DSH Desktop Agent 内，也可读取 $DSH_WEB_URL/api/desktop-workbenches/development-guide 作为随版本分发的本机副本。核对工作台规范及 SDK；不要覆盖已有的未提交更改。完成工作台功能、界面和必要测试。检查 workbench.json（schemaVersion 1、稳定 id、title、description、version、client、兼容性和能力声明），运行相关测试与构建；若存在 scripts/check-workbench-package.mjs，用它校验工作台包。

完成后，按当前项目已有的插件安装或加载机制，将工作台安装到我这台 DSH Desktop 供自己使用。参照 docs/preset-packages.md 的 Agent 交付方式：在本机 API 可用时由你调用，不让我重新填写项目元数据。确认工作台已注册、出现在“我的工作台”和左侧入口，并实际打开检查。不要向市场投稿或声称已经公开发布。

若当前版本没有可用的本地安装接口，或你不能操作这台 DSH Desktop，请保留经过校验的包，准确报告缺少的安装步骤；不要声称已加载。最后给我文件路径、验证结果和实际加载状态。`
    }
    function reviewSubmissionAgentPrompt() {
      return `请帮我制作并提交 DSH Desktop 工作台。开发过程由你自主完成，DSH 不控制使用哪种 Agent。

先阅读并遵循公开的工作台开发指南：https://dshdesktop.com/workbench/skills/workbench-development/SKILL.md 。若在 DSH Desktop Agent 内，也可读取 $DSH_WEB_URL/api/desktop-workbenches/development-guide 作为随版本分发的本机副本。核对工作台规范及 SDK；不要覆盖已有的未提交更改。完成工作台功能、界面和必要测试。检查 workbench.json（schemaVersion 1、稳定 id、title、description、version、client、兼容性和能力声明），运行相关测试与构建；若存在 scripts/check-workbench-package.mjs，用它校验工作台包。

开发完成后，用 scripts/check-workbench-package.mjs 校验解包后的工作台，再打成不超过 8 MB 的 .tgz 包。参照 docs/preset-packages.md 的 Agent 交付方式，不依赖 GitHub：由你核实 title、description、author，并把 .tgz 转换为 data:application/gzip;base64,...。可选一张不超过 2 MB 的 PNG、JPEG 或 WebP 产品截图，转换成对应 data URL；不要包含密钥或私密数据。准备 JSON：{ title, description, author, package, screenshot? }。如已有 GitHub 仓库，可额外提供 repository，但不是必需。

在 DSH Desktop 本机投稿服务可用时，POST 到 $DSH_WEB_URL/api/desktop-workbenches/submissions，并确认返回 id、packageSha256 和 pending。包和材料当前只在本机保存，尚未传送给平台审核；不要把 pending 说成已送达人工作台广场或正在人工/AI 审核。工作台通过实际安装后可先供我自己使用，只有未来平台审核通过并收录后才会出现在公共工作台广场。

如果本机 API 或本地安装能力不可用，请保留已验证的包与投稿 JSON，准确报告剩余步骤。最后报告文件路径、验证结果、本地使用状态、投稿记录状态及尚未完成的远程送审步骤。`
    }
    function submissionAgentPrompt(mode = 'review') {
      return mode === 'local' ? localWorkbenchAgentPrompt() : reviewSubmissionAgentPrompt()
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
    function Market({ service }) {
      const { state, catalog, submissions, submissionError, ready, pending } = useWorkbench(service)
      const [tab, setTab] = React.useState('market')
      const [search, setSearch] = React.useState('')
      const [detail, setDetail] = React.useState(null)
      const [removing, setRemoving] = React.useState(null)
      const [submitMode, setSubmitMode] = React.useState('local')
      const [copyStatus, setCopyStatus] = React.useState('')
      const prompt = submissionAgentPrompt(submitMode)
      const disabled = !ready || pending > 0 || service.blocked
      const pendingEntries = submissions.filter((entry) => entry.status !== 'approved').map((entry) => ({ ...entry, id: `submission:${entry.id}`, submissionId: entry.id, pending: true, unavailable: true }))
      const allEntries = tab === 'mine' ? state.added.map((id) => catalog.find((entry) => entry.id === id) || { id, title: id, unavailable: true, description: '提供此工作台的插件当前未加载。' }) : tab === 'market' ? [...pendingEntries, ...catalog] : []
      const entries = allEntries.filter((entry) => `${entry.title || ''} ${entry.description || ''} ${entry.author || ''}`.toLowerCase().includes(search.toLowerCase().trim()))
      const selected = allEntries.find((entry) => entry.id === detail)
      const copyPrompt = async () => {
        setCopyStatus('')
        try { await copySubmissionPrompt(prompt); setCopyStatus('已复制，现在可以粘贴给你的 Agent。') }
        catch { setCopyStatus('复制失败，请在下方全选并手动复制。') }
      }
      return h('section', { className: 'dshWb dshWbMarket', 'aria-label': '工作台市场' },
        h('h1', null, '让界面适合你的工作'),
        h('p', { className: 'dshWbMuted' }, '选择工作台，组织会话与资料。打开后可从侧边栏随时切换。'),
        h(Notice, { service }),
        submissionError && h('div', { className: 'dshWbNotice', role: 'status' }, '投稿记录暂时无法读取，其他工作台仍可正常使用。 ', h(Button, { disabled: pending > 0, onClick: () => service.run(service.load()) }, '重试')),
        h('div', { className: 'dshWbTabs' }, h('div', { role: 'tablist', 'aria-label': '工作台分类', className: 'dshWbActions' },
          h(Button, { id: 'dsh-workbench-market-tab', role: 'tab', 'aria-selected': tab === 'market', 'aria-controls': 'dsh-workbench-market-panel', onClick: () => { setTab('market'); setDetail(null); setCopyStatus('') } }, '工作台市场'),
          h(Button, { id: 'dsh-workbench-mine-tab', role: 'tab', 'aria-selected': tab === 'mine', 'aria-controls': 'dsh-workbench-mine-panel', onClick: () => { setTab('mine'); setDetail(null); setCopyStatus('') } }, `我的工作台 (${state.added.length})`),
          h(Button, { id: 'dsh-workbench-submit-tab', role: 'tab', 'aria-selected': tab === 'submit', 'aria-controls': 'dsh-workbench-submit-panel', onClick: () => { setTab('submit'); setDetail(null); setCopyStatus('') } }, '制作我的工作台')),
          tab !== 'submit' && h('input', { type: 'search', placeholder: '搜索工作台', 'aria-label': '搜索工作台', value: search, onChange: (event) => setSearch(event.target.value) })),
        tab === 'submit' && h('section', { id: 'dsh-workbench-submit-panel', role: 'tabpanel', className: 'dshWbSubmit', 'aria-labelledby': 'dsh-workbench-submit-tab', tabIndex: 0 },
          h('h2', null, '制作我的工作台'),
          h('p', { className: 'dshWbMuted' }, '了解规范，交给你自己的 Agent 开发；完成后再由 Agent 交付。'),
          h('div', { className: 'dshWbSteps', 'aria-label': '工作台制作步骤' },
            h('div', { className: 'dshWbStep' }, h('strong', null, '1 · 了解规范'), h('p', null, '让 Agent 阅读公开的 ', h('a', { href: 'https://dshdesktop.com/workbench/skills/workbench-development/SKILL.md', target: '_blank', rel: 'noopener noreferrer' }, '工作台开发指南'), '，再开始开发。')),
            h('div', { className: 'dshWbStep' }, h('strong', null, '2 · 用自己的 Agent 开发'), h('p', null, '任何 Agent 都可以；你决定工作台功能和开发方式。')),
            h('div', { className: 'dshWbStep' }, h('strong', null, '3 · 通过 Agent 交付'), h('p', null, '开发完成后，复制下方指令给 Agent；它负责校验和提交。'))),
          h('h3', null, '开发完成后的去向'),
          h('div', { className: 'dshWbSubmitChoices', role: 'group', 'aria-label': '工作台提交方式' },
            h('button', { type: 'button', className: 'dshWbSubmitChoice', 'aria-pressed': submitMode === 'local', onClick: () => { setSubmitMode('local'); setCopyStatus('') } }, h('strong', null, '先本地加载'), h('span', null, '校验并安装到自己的 DSH Desktop，供自己使用。')),
            h('button', { type: 'button', className: 'dshWbSubmitChoice', 'aria-pressed': submitMode === 'review', onClick: () => { setSubmitMode('review'); setCopyStatus('') } }, h('strong', null, '准备提交审核'), h('span', null, '由 Agent 直接提交工作台包，无需 GitHub；当前仅存本机。'))),
          h('p', { className: 'dshWbMuted dshWbSubmitOutcome' }, '本地可先使用；未来通过平台人工或 AI 审核后，才能进入公共工作台广场。'),
          h('textarea', { className: 'dshWbPrompt', readOnly: true, value: prompt, 'aria-label': `${submitMode === 'local' ? '本地加载' : '提交审核'}工作台给 Agent 的 Prompt`, onFocus: (event) => event.currentTarget.select() }),
          h('div', { className: 'dshWbActions' }, h(Button, { primary: true, onClick: copyPrompt }, `复制“${submitMode === 'local' ? '本地加载' : '投稿准备'}”指令给 Agent`)),
          h('p', { className: 'dshWbCopyStatus', role: 'status', 'aria-live': 'polite' }, copyStatus)),
        tab !== 'submit' && h('section', { id: `dsh-workbench-${tab}-panel`, role: 'tabpanel', 'aria-labelledby': `dsh-workbench-${tab}-tab`, tabIndex: 0 },
          selected && h('article', { className: 'dshWbDetail' }, h('div', { className: 'dshWbActions' }, h('h2', null, selected.title), selected.pending && h('span', { className: 'dshWbPending' }, '本机待送审'), h(Button, { onClick: () => setDetail(null) }, '收起详情')),
            h(Preview, { entry: selected, detail: true }), h('p', null, selected.description), h(EntryMeta, { entry: selected }), !selected.pending && h('p', { className: 'dshWbMuted' }, `适用人群：${selected.audience || '暂无'}。${selected.requirements || ''}`), selected.repository && h('p', { className: 'dshWbMuted' }, `GitHub：${selected.repository}`)),
          h('div', { className: 'dshWbGrid', 'data-tab': tab }, entries.map((entry) => h('article', { key: entry.id, className: 'dshWbCard' },
            h(Preview, { entry }),
            h('h2', null, h('span', { className: 'dshWbCardIcon', 'aria-hidden': true }, entry.icon || '◇'), entry.title), h('p', { className: 'dshWbMuted' }, entry.description),
            h(EntryMeta, { entry }),
            h('div', { className: 'dshWbActions' }, h(Button, { onClick: () => setDetail(entry.id) }, '查看详情'),
              entry.pending ? h(Button, { disabled: true }, '本机待送审') : state.added.includes(entry.id)
                ? h(Button, { primary: true, disabled: disabled || entry.unavailable, onClick: () => service.run(service.open(entry.id)) }, '打开工作台')
                : h(Button, { primary: true, disabled, onClick: () => service.run(service.add(entry.id)) }, '添加'),
              tab === 'mine' && h(Button, { disabled, onClick: () => setRemoving(entry.id) }, '移除')),
            removing === entry.id && h('div', { className: 'dshWbNotice' }, '移除本地工作台和固定入口，会话、项目文件和笔记会保留。', h('div', { className: 'dshWbActions' }, h(Button, { disabled, onClick: () => service.run(service.remove(entry.id).then(() => setRemoving(null))) }, '确认移除'), h(Button, { onClick: () => setRemoving(null) }, '取消')))
          ))), entries.length === 0 && h('p', { className: 'dshWbMuted' }, tab === 'mine' && !search ? '还没有添加工作台，到工作台市场选一个开始。' : '没有找到匹配的工作台。')))
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
      const sessions = React.useSyncExternalStore(React.useCallback((listener) => service.ctx.sessions.list.subscribe(listener), [service]), () => service.ctx.sessions.list.getSnapshot())
      const workspaces = React.useSyncExternalStore(React.useCallback((listener) => service.ctx.workspaces.list.subscribe(listener), [service]), () => service.ctx.workspaces.list.getSnapshot())
      const [workspaceId, setWorkspaceId] = React.useState('')
      const [conversationContainer] = React.useState(() => {
        const node = document.createElement('div')
        Object.assign(node.style, { display: 'flex', flexDirection: 'column', flex: '1', minHeight: '0', minWidth: '0', height: '100%' })
        return node
      })
      const entry = state.active && catalog.find((item) => item.id === state.active)
      const id = entry?.id
      const customFrame = entry?.customFrame === true
      const conversationMount = h(ConversationMount, { container: conversationContainer })
      const hasCurrentSession = sessions.current != null
      const disabled = !ready || pending > 0 || service.blocked
      const chosen = workspaces.items.find((item) => item.workspaceId === workspaceId) || service.defaultWorkspace()
      return h('div', { className: 'dshWb dshWbFrame' }, h(Notice, { service }),
        require('react-dom').createPortal(conversation, conversationContainer),
        ...catalog.filter((item) => item.customFrame === true && state.added.includes(item.id)).map((item) => h('div', { key: item.id, hidden: id !== item.id, style: { position: 'relative', overflow: 'hidden', flex: 1, minHeight: 0, minWidth: 0, width: '100%', maxWidth: '100%', display: 'flex', flexDirection: 'column', boxSizing: 'border-box' } }, h(PanelBoundary, null, h(item.Component, { service, entry: item, active: id === item.id, conversation: id === item.id ? conversationMount : null })))),
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
          ...catalog.filter((item) => !item.customFrame && state.added.includes(item.id)).map((item) => h('aside', { key: item.id, className: 'dshWbBusiness', 'data-side': item.layout?.businessSide, 'data-embedded': item.embedded === true, hidden: id !== item.id, 'aria-label': item.panelTitle }, h(PanelBoundary, null, h(item.Component, { service, entry: item }))))))
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
      ctx.effect(() => service.register({ id: 'research-notebook', icon: '◈', title: '调研记录', author: 'DSH Desktop', panelTitle: '调研笔记', description: '与 Agent 梳理问题，在旁边记录来源、证据和结论。', audience: '研究与产品工作者', requirements: '使用现有模型配置与原生会话能力；笔记可离线编辑。', hint: '记录来源链接、关键事实和需要继续验证的问题。', placeholder: '研究问题\n\n来源与证据\n\n初步结论\n\n待验证问题' }, Notebook), 'workbenches: research template')
      ctx.effect(() => service.register({ id: 'writing-notebook', initialization: 'new-session', icon: '✎', title: '内容创作', author: 'DSH Desktop', panelTitle: '创作草稿', description: '整理选题和素材，在对话旁持续打磨自己的稿件。', audience: '内容创作者', requirements: '使用现有模型配置与原生会话能力；不包含账号发布或数据采集工具。', hint: '将想保留的选题、素材和稿件放在这里。', placeholder: '选题与受众\n\n素材\n\n稿件草稿' }, Notebook), 'workbenches: writing template')
      ctx.slots.inject('main', () => ctx.slots.register({ name: 'main', key: PANEL, inject: () => ({ service }) }, Market))
      ctx.slots.inject('sidebar.footer.action', () => ctx.slots.register({ name: 'sidebar.footer.action', id: PANEL, order: -20, inject: () => ({ service }) }, Sidebar))
      function MarketSetting() {
        const enabled = React.useSyncExternalStore(marketPreference.subscribe.bind(marketPreference), marketPreference.getSnapshot.bind(marketPreference))
        return h('label', { className: 'dshWbSetting' }, h('span', null, h('strong', null, '工作台市场'), h('small', null, '控制侧边栏的市场入口；已安装工作台仍可使用。')),
          h('input', { type: 'checkbox', role: 'switch', checked: enabled, onChange: (event) => { marketPreference.set(event.target.checked); if (!event.target.checked) ctx.layout.selectPanel(null) }, 'aria-label': '打开或关闭工作台市场' }))
      }
      ctx.slots.inject('settings.general.item', () => ctx.slots.register({ name: 'settings.general.item', id: 'desktop-workbench-market', order: 35 }, MarketSetting))
      ctx.slots.inject('desktop.workbench.frame', () => ctx.slots.register({ name: 'desktop.workbench.frame', inject: () => ({ service }) }, Frame))
      ctx.effect(() => ctx.sessions.list.subscribe(() => service.selectionChanged()), 'workbenches: session navigation')
      ctx.effect(() => ctx.uiWorkspace.registerSessionOpener((sessionId) => {
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
    return { apply, inject: ['slots', 'layout', 'sessions', 'workspaces', 'uiWorkspace'], Workbenches, Frame, Market, Notebook, submissionAgentPrompt, localWorkbenchAgentPrompt, reviewSubmissionAgentPrompt, copySubmissionPrompt }
  }
})

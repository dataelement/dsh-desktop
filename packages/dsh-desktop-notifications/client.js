window.__ModuleLoader__.load({
  id: 'dsh-desktop-notifications',
  factory: (require) => {
    const React = require('react')
    const { Switch } = require('@deepseek-ai/dsh-client-ui-primitives')
    const h = React.createElement

    /** Locale namespace and General Settings row owner. */
    const NS = 'dsh-desktop-notifications'
    /** Completed-turn notification modes, in selector order. */
    const MODES = ['unfocused', 'always', 'never']
    // Desktop storage keys. The preload storage bridge persists localStorage
    // into the profile directory, so these preferences survive restarts and
    // upgrades without a Harness settings document the desktop cannot write.
    const MODE_KEY = 'dsh-desktop.turn-notification-mode'
    const WAITING_KEY = 'dsh-desktop.notify-when-waiting'
    const SOUND_KEY = 'dsh-desktop.notification-sound'
    /** Style tag id; injected once per renderer and removed with the plugin. */
    const STYLE_ID = 'dsh-desktop-notifications-style'

    const zh = {
      'notifications.turnMode.title': '轮次完成通知',
      'notifications.turnMode.description': '设置轮次完成后何时提醒你',
      'notifications.turnMode.unfocused': '仅在未聚焦时',
      'notifications.turnMode.always': '始终',
      'notifications.turnMode.never': '从不',
      'notifications.waiting.title': '需要回答时提醒',
      'notifications.waiting.description': '轮次等待回答问题或确认权限时显示提醒',
      'notifications.sound.title': '通知提示音',
      'notifications.sound.description': '显示提醒时播放系统通知音',
      'notifications.notice.title': 'DSH Desktop',
      'notifications.notice.turnBody': '轮次已完成。',
      'notifications.notice.waitingBody': '轮次等待你的回答。'
    }

    const en = {
      'notifications.turnMode.title': 'Turn completion notifications',
      'notifications.turnMode.description': 'Choose when a finished turn notifies you',
      'notifications.turnMode.unfocused': 'Only when unfocused',
      'notifications.turnMode.always': 'Always',
      'notifications.turnMode.never': 'Never',
      'notifications.waiting.title': 'Notify when a turn needs an answer',
      'notifications.waiting.description': 'Show a notification while a turn waits for your answer or a permission decision',
      'notifications.sound.title': 'Notification sound',
      'notifications.sound.description': 'Play the system notification sound with every reminder',
      'notifications.notice.title': 'DSH Desktop',
      'notifications.notice.turnBody': 'The turn is complete.',
      'notifications.notice.waitingBody': 'The turn is waiting for your answer.'
    }

    const STYLES = `
      .dshNotificationsRow {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 24px;
        padding: 16px 0;
        border-bottom: 0.5px solid var(--dsw-alias-border-l2);
      }
      .dshNotificationsRowText { min-width: 0; }
      .dshNotificationsRowTitle {
        color: var(--dsw-alias-label-primary);
        font-size: 14px;
        line-height: 20px;
      }
      .dshNotificationsRowDescription {
        margin-top: 4px;
        color: var(--dsw-alias-label-secondary);
        font-size: 12px;
        line-height: 18px;
      }
      .dshNotificationsMode {
        flex: none;
        max-width: 220px;
        padding: 6px 10px;
        border: 0.5px solid var(--dsw-alias-border-l2);
        border-radius: 8px;
        background: var(--dsw-alias-bg-layer-1);
        color: var(--dsw-alias-label-primary);
        font: inherit;
        font-size: 13px;
        line-height: 18px;
        cursor: pointer;
      }
      .dshNotificationsMode:focus-visible {
        outline: 2px solid var(--dsw-alias-state-business-primary);
        outline-offset: 2px;
      }
    `

    /** Read one raw desktop preference without letting a disabled storage break the plugin. */
    function readStoredText(key) {
      try {
        return window.localStorage?.getItem(key) ?? null
      } catch {
        return null
      }
    }

    /** Stored booleans accept only the two serialized spellings; anything else re-inherits the default. */
    function readStoredBoolean(key, fallback) {
      const value = readStoredText(key)
      if (value === 'true') return true
      if (value === 'false') return false
      return fallback
    }

    function readStoredMode() {
      const value = readStoredText(MODE_KEY)
      return MODES.includes(value) ? value : 'unfocused'
    }

    function writeStored(key, value) {
      try {
        window.localStorage?.setItem(key, value)
      } catch {
        // A renderer frame without storage keeps the in-memory choice for this session.
      }
    }

    /**
     * Desktop-owned notification preferences for the General Settings rows.
     * The snapshot object is replaced on every change so React's
     * useSyncExternalStore sees new state instead of a mutated object.
     */
    class NotificationPreferences {
      constructor() {
        this.mode = readStoredMode()
        this.waiting = readStoredBoolean(WAITING_KEY, true)
        this.sound = readStoredBoolean(SOUND_KEY, true)
        this.listeners = new Set()
        this.snapshot = this.buildSnapshot()
      }

      buildSnapshot() {
        return Object.freeze({ mode: this.mode, waiting: this.waiting, sound: this.sound })
      }

      getSnapshot() {
        return this.snapshot
      }

      subscribe(listener) {
        this.listeners.add(listener)
        return () => { this.listeners.delete(listener) }
      }

      setMode(value) {
        if (!MODES.includes(value) || value === this.mode) return
        this.mode = value
        writeStored(MODE_KEY, value)
        this.publish()
      }

      setWaiting(value) {
        const next = value === true
        if (next === this.waiting) return
        this.waiting = next
        writeStored(WAITING_KEY, String(next))
        this.publish()
      }

      setSound(value) {
        const next = value === true
        if (next === this.sound) return
        this.sound = next
        writeStored(SOUND_KEY, String(next))
        this.publish()
      }

      publish() {
        this.snapshot = this.buildSnapshot()
        for (const listener of [...this.listeners]) listener()
      }
    }

    /**
     * Send one notice to the shell. An ordinary browser page has no desktop
     * bridge, where the preferences stay meaningful and nothing is presented;
     * a rejected call stays contained instead of surfacing as an unhandled
     * rejection in the page.
     */
    function deliverNotification(payload) {
      const bridge = window.dshDesktop
      if (typeof bridge?.notifyTurnComplete !== 'function') return
      void Promise.resolve(bridge.notifyTurnComplete(payload)).catch(() => {})
    }

    /** Direct conversations notify; addressed children and subagent rows stay silent. */
    function isMainSession(row) {
      if (!row) return true
      return !row.parentId && row.origin !== 'subagent'
    }

    /**
     * Turns Harness session facts into desktop notifications.
     *
     * Sessions and their waiting requests are observed here because only the
     * renderer sees Harness state; the shell owns window focus and the native
     * notification centre, so every call is a request that the main process
     * checks again before anything appears. A notice is raised only on a
     * running-to-idle transition, so reconnects never replay history.
     */
    class TurnNotificationPolicy {
      constructor(options) {
        this.preferences = options.preferences
        this.sessions = options.sessions
        this.sessionStatus = options.sessionStatus
        this.notify = options.notify
        this.isFocused = options.isFocused
        this.translate = options.translate
        this.running = new Map()
        this.waiting = new Map()
        this.disposers = []
      }

      start() {
        this.observeSessions()
        this.observeWaiting()
        const list = this.sessions?.list
        if (typeof list?.subscribe === 'function') {
          this.disposers.push(list.subscribe(() => { this.observeSessions() }))
        }
        if (typeof this.sessionStatus?.subscribe === 'function') {
          this.disposers.push(this.sessionStatus.subscribe(() => { this.observeWaiting() }))
        }
        return this
      }

      dispose() {
        for (const dispose of this.disposers.splice(0)) dispose()
      }

      sessionRow(sessionId) {
        const byId = this.sessions?.list?.getSnapshot?.()?.byId
        return byId ? byId[sessionId] : undefined
      }

      observeSessions() {
        const byId = this.sessions?.list?.getSnapshot?.()?.byId
        if (!byId) return
        for (const sessionId of Object.keys(byId)) {
          const row = byId[sessionId]
          const running = row?.running === true
          const previous = this.running.get(sessionId)
          this.running.set(sessionId, running)
          if (previous === true && !running && isMainSession(row)) this.announceTurn(sessionId)
        }
        for (const sessionId of [...this.running.keys()]) {
          if (!(sessionId in byId)) this.running.delete(sessionId)
        }
      }

      observeWaiting() {
        const status = this.sessionStatus?.getSnapshot?.()
        if (!status || typeof status.entries !== 'function') return
        const present = new Set()
        for (const [sessionId, entry] of status.entries()) {
          const key = entry?.pendingInteraction?.key
          if (typeof key !== 'string' || key.length === 0) continue
          present.add(sessionId)
          const previous = this.waiting.get(sessionId)
          this.waiting.set(sessionId, key)
          if (previous === key) continue
          if (!isMainSession(this.sessionRow(sessionId))) continue
          this.announceWaiting(sessionId)
        }
        for (const sessionId of [...this.waiting.keys()]) {
          if (!present.has(sessionId)) this.waiting.delete(sessionId)
        }
      }

      titleFor(sessionId) {
        const displayTitle = this.sessionRow(sessionId)?.displayTitle
        return typeof displayTitle === 'string' && displayTitle.length > 0
          ? displayTitle
          : this.translate('notifications.notice.title')
      }

      announceTurn(sessionId) {
        const { mode, sound } = this.preferences.getSnapshot()
        if (mode === 'never') return
        if (mode === 'unfocused' && this.isFocused()) return
        this.emit({
          title: this.titleFor(sessionId),
          body: this.translate('notifications.notice.turnBody'),
          sound,
          unfocusedOnly: mode === 'unfocused'
        })
      }

      announceWaiting(sessionId) {
        const { waiting, sound } = this.preferences.getSnapshot()
        if (!waiting || this.isFocused()) return
        this.emit({
          title: this.titleFor(sessionId),
          body: this.translate('notifications.notice.waitingBody'),
          sound,
          unfocusedOnly: true
        })
      }

      /** A failed reminder must never break the session observation that produced it. */
      emit(payload) {
        try {
          this.notify(payload)
        } catch (error) {
          console.warn('[dsh-desktop-notifications] notification failed', error)
        }
      }
    }

    /** One General Settings row: copy on the left, its control on the right. */
    function SettingsRow({ title, description, control }) {
      return h('div', { className: 'dshNotificationsRow' },
        h('div', { className: 'dshNotificationsRowText' },
          h('div', { className: 'dshNotificationsRowTitle' }, title),
          h('div', { className: 'dshNotificationsRowDescription' }, description)),
        control)
    }

    /** The notification rows rendered into Settings → General. */
    function NotificationRows({ preferences, t }) {
      const snapshot = React.useSyncExternalStore(
        preferences.subscribe.bind(preferences),
        preferences.getSnapshot.bind(preferences)
      )
      const mode = h('select', {
        className: 'dshNotificationsMode',
        'aria-label': t('notifications.turnMode.title'),
        value: snapshot.mode,
        onChange: (event) => preferences.setMode(event.target.value)
      }, ...MODES.map((value) => h('option', { key: value, value }, t(`notifications.turnMode.${value}`))))
      return h(React.Fragment, null,
        h(SettingsRow, {
          title: t('notifications.turnMode.title'),
          description: t('notifications.turnMode.description'),
          control: mode
        }),
        h(SettingsRow, {
          title: t('notifications.waiting.title'),
          description: t('notifications.waiting.description'),
          control: h(Switch, {
            checked: snapshot.waiting,
            label: t('notifications.waiting.title'),
            onChange: (next) => preferences.setWaiting(next)
          })
        }),
        h(SettingsRow, {
          title: t('notifications.sound.title'),
          description: t('notifications.sound.description'),
          control: h(Switch, {
            checked: snapshot.sound,
            label: t('notifications.sound.title'),
            onChange: (next) => preferences.setSound(next)
          })
        }))
    }

    const inject = ['slots', 'locale', 'sessions', 'uiSession']

    function apply(ctx) {
      ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'dsh-desktop-notifications: dictionaries')
      ctx.effect(() => {
        if (document.getElementById(STYLE_ID)) return
        const style = document.createElement('style')
        style.id = STYLE_ID
        style.textContent = STYLES
        document.head.appendChild(style)
        return () => style.remove()
      }, 'dsh-desktop-notifications: styles')
      const preferences = new NotificationPreferences()
      const t = ctx.locale.bind(NS)
      const policy = new TurnNotificationPolicy({
        preferences,
        sessions: ctx.sessions,
        sessionStatus: ctx.get('uiSession')?.sessionStatus,
        translate: t,
        isFocused: () => typeof document.hasFocus === 'function' && document.hasFocus(),
        notify: deliverNotification
      }).start()
      ctx.effect(() => () => policy.dispose(), 'dsh-desktop-notifications: policy')
      ctx.slots.inject('settings.general.item', () => ctx.slots.register({
        name: 'settings.general.item',
        id: 'desktop-notifications',
        order: 36,
        locale: NS,
        inject: () => ({ preferences })
      }, NotificationRows))
    }

    return { apply, inject, NotificationPreferences, TurnNotificationPolicy, deliverNotification, MODES }
  }
})

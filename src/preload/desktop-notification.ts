import { ipcRenderer } from 'electron'

export function setupDesktopNotificationBridge(): void {
  const injectionScript = `
(function() {
  if (window.__DSH_DESKTOP_NOTIFICATION_INSTALLED__) return;
  window.__DSH_DESKTOP_NOTIFICATION_INSTALLED__ = true;

  let nextId = 1;
  const activeNotifications = new Map();

  class DesktopNotification extends EventTarget {
    constructor(title, options) {
      super();
      const opts = options && typeof options === 'object' ? options : {};
      const id = nextId++;
      this.title = String(title || '');
      this.body = typeof opts.body === 'string' ? opts.body : '';
      this.tag = typeof opts.tag === 'string' ? opts.tag : '';
      this.icon = typeof opts.icon === 'string' ? opts.icon : '';
      this.data = opts.data;
      this.onclick = null;
      this.onclose = null;
      this.onerror = null;
      this.onshow = null;

      activeNotifications.set(id, this);

      window.dispatchEvent(new CustomEvent('__dsh_notification_show__', {
        detail: {
          id,
          title: this.title,
          options: {
            body: this.body,
            tag: this.tag,
            icon: this.icon,
            silent: Boolean(opts.silent)
          }
        }
      }));

      queueMicrotask(() => {
        const ev = new Event('show');
        if (typeof this.onshow === 'function') this.onshow(ev);
        this.dispatchEvent(ev);
      });
    }

    close() {
      for (const [id, instance] of activeNotifications.entries()) {
        if (instance === this) {
          activeNotifications.delete(id);
          window.dispatchEvent(new CustomEvent('__dsh_notification_close__', { detail: { id } }));
          break;
        }
      }
    }

    static get permission() {
      return 'granted';
    }

    static requestPermission(callback) {
      const p = Promise.resolve('granted');
      if (typeof callback === 'function') {
        p.then(callback);
      }
      return p;
    }
  }

  DesktopNotification.permission = 'granted';
  DesktopNotification.maxActions = 2;

  window.Notification = DesktopNotification;

  window.addEventListener('__dsh_notification_clicked__', (event) => {
    const id = event.detail?.id;
    const instance = activeNotifications.get(id);
    if (instance) {
      const ev = new Event('click');
      if (typeof instance.onclick === 'function') {
        instance.onclick(ev);
      }
      instance.dispatchEvent(ev);
    }
  });

  window.addEventListener('__dsh_notification_closed__', (event) => {
    const id = event.detail?.id;
    const instance = activeNotifications.get(id);
    if (instance) {
      const ev = new Event('close');
      if (typeof instance.onclose === 'function') {
        instance.onclose(ev);
      }
      instance.dispatchEvent(ev);
      activeNotifications.delete(id);
    }
  });
})();
`

  function inject(): boolean {
    const container = document.documentElement || document.head
    if (container) {
      const script = document.createElement('script')
      script.textContent = injectionScript
      container.appendChild(script)
      script.remove()
      return true
    }
    return false
  }

  if (!inject()) {
    const observer = new MutationObserver(() => {
      if (inject()) {
        observer.disconnect()
      }
    })
    observer.observe(document, { childList: true })
  }

  window.addEventListener('__dsh_notification_show__', (event: Event) => {
    const detail = (event as CustomEvent).detail
    if (detail && typeof detail === 'object') {
      ipcRenderer.send('dsh:notification-show', detail)
    }
  })

  window.addEventListener('__dsh_notification_close__', (event: Event) => {
    const detail = (event as CustomEvent).detail
    if (detail && typeof detail === 'object') {
      ipcRenderer.send('dsh:notification-close', (detail as { id?: number }).id)
    }
  })

  ipcRenderer.on('dsh:notification-clicked', (_event, id: number) => {
    window.dispatchEvent(new CustomEvent('__dsh_notification_clicked__', { detail: { id } }))
  })

  ipcRenderer.on('dsh:notification-closed', (_event, id: number) => {
    window.dispatchEvent(new CustomEvent('__dsh_notification_closed__', { detail: { id } }))
  })
}

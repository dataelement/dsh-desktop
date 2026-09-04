import { ipcRenderer } from 'electron'

export function setupDesktopStoragePersistence(): void {
  let initialData: Record<string, string> = {}
  try {
    initialData = ipcRenderer.sendSync('dsh:storage-load-sync') ?? {}
  } catch (error) {
    console.warn('[desktop-storage] Failed to load initial storage sync:', error)
  }

  const serializedInitial = JSON.stringify(initialData)

  const injectionScript = `
(function() {
  try {
    const initial = ${serializedInitial};
    const memoryStore = new Map(Object.entries(initial));

    const originalGetItem = Storage.prototype.getItem;
    const originalSetItem = Storage.prototype.setItem;
    const originalRemoveItem = Storage.prototype.removeItem;
    const originalClear = Storage.prototype.clear;
    const originalKey = Storage.prototype.key;

    Object.defineProperty(Storage.prototype, 'length', {
      get: function() {
        if (this === window.localStorage) return memoryStore.size;
        return 0;
      },
      configurable: true
    });

    Storage.prototype.getItem = function(key) {
      if (this === window.localStorage) {
        const k = String(key);
        return memoryStore.has(k) ? memoryStore.get(k) : null;
      }
      return originalGetItem.apply(this, arguments);
    };

    Storage.prototype.setItem = function(key, val) {
      if (this === window.localStorage) {
        const k = String(key);
        const v = String(val);
        memoryStore.set(k, v);
        window.dispatchEvent(new CustomEvent('__dsh_storage_sync__', {
          detail: { type: 'set', key: k, val: v }
        }));
        return;
      }
      return originalSetItem.apply(this, arguments);
    };

    Storage.prototype.removeItem = function(key) {
      if (this === window.localStorage) {
        const k = String(key);
        if (!memoryStore.has(k)) return;
        memoryStore.delete(k);
        window.dispatchEvent(new CustomEvent('__dsh_storage_sync__', {
          detail: { type: 'remove', key: k }
        }));
        return;
      }
      return originalRemoveItem.apply(this, arguments);
    };

    Storage.prototype.clear = function() {
      if (this === window.localStorage) {
        if (memoryStore.size === 0) return;
        memoryStore.clear();
        window.dispatchEvent(new CustomEvent('__dsh_storage_sync__', {
          detail: { type: 'clear' }
        }));
        return;
      }
      return originalClear.apply(this, arguments);
    };

    Storage.prototype.key = function(index) {
      if (this === window.localStorage) {
        const keys = Array.from(memoryStore.keys());
        return keys[index] ?? null;
      }
      return originalKey.apply(this, arguments);
    };

    try {
      const storageProxy = new Proxy(window.localStorage, {
        get(target, prop, receiver) {
          if (
            prop in target ||
            typeof prop === 'symbol' ||
            prop === 'getItem' ||
            prop === 'setItem' ||
            prop === 'removeItem' ||
            prop === 'clear' ||
            prop === 'key' ||
            prop === 'length'
          ) {
            return Reflect.get(target, prop, receiver);
          }
          return target.getItem(String(prop));
        },
        set(target, prop, value, receiver) {
          if (prop in target) {
            return Reflect.set(target, prop, value, receiver);
          }
          target.setItem(String(prop), String(value));
          return true;
        },
        deleteProperty(target, prop) {
          target.removeItem(String(prop));
          return true;
        }
      });

      Object.defineProperty(window, 'localStorage', {
        value: storageProxy,
        configurable: true,
        writable: true
      });
    } catch {
      // Ignore if Object.defineProperty on window.localStorage is restricted;
      // Storage.prototype overrides handle .getItem/.setItem regardless.
    }
  } catch (err) {
    console.error('[desktop-storage] Injected persistence setup failed:', err);
  }
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

  window.addEventListener('__dsh_storage_sync__', (event: Event) => {
    const detail = (event as CustomEvent).detail
    if (detail && typeof detail === 'object') {
      ipcRenderer.send('dsh:storage-sync', detail)
    }
  })
}

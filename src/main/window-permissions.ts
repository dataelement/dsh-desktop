import { systemPreferences, type Session, type WebContents } from 'electron'
import { canGrantWindowPermission } from './security-policy'

type PermissionSession = Pick<Session, 'setPermissionCheckHandler' | 'setPermissionRequestHandler'>
type PermissionOwner = Pick<WebContents, 'getURL' | 'isDestroyed'>
const sessionWindows = new WeakMap<PermissionSession, WeakMap<PermissionOwner, boolean>>()

/** Session handlers are shared: securing a dialog must not replace the main window's policy. */
export function installWindowPermissions(
  session: PermissionSession,
  owner: PermissionOwner,
  allowMicrophone = false
): void {
  const registered = sessionWindows.get(session)
  if (registered) { registered.set(owner, allowMicrophone); return }
  const windows = new WeakMap<PermissionOwner, boolean>()
  windows.set(owner, allowMicrophone)
  sessionWindows.set(session, windows)

  function ownsRequest(contents: WebContents | null, requestingUrl: string, permission: string): boolean {
    if (!contents || !windows.has(contents) || contents.isDestroyed()) return false
    if (permission === 'media' && !windows.get(contents)) return false
    try {
      const requested = new URL(requestingUrl)
      const current = new URL(contents.getURL())
      // Compare protocol/host explicitly: custom-scheme URL.origin can be "null".
      return requested.protocol === current.protocol && requested.host === current.host
        && requested.username === '' && requested.password === ''
    } catch {
      return false
    }
  }

  session.setPermissionCheckHandler((contents, permission, origin, details) => {
    const requestingUrl = details.requestingUrl ?? origin
    if (!ownsRequest(contents, requestingUrl, permission)
      || !canGrantWindowPermission(permission, requestingUrl, details.isMainFrame,
        details.mediaType ? [details.mediaType] : [])) return false
    return permission !== 'media' || process.platform !== 'darwin'
      || systemPreferences.getMediaAccessStatus('microphone') === 'granted'
  })

  session.setPermissionRequestHandler((contents, permission, callback, details) => {
    const allowed = () => ownsRequest(contents, details.requestingUrl, permission)
      && canGrantWindowPermission(permission, details.requestingUrl, details.isMainFrame,
        'mediaTypes' in details ? details.mediaTypes : [])
    if (!allowed()) { callback(false); return }
    if (permission !== 'media' || process.platform !== 'darwin') { callback(true); return }
    void systemPreferences.askForMediaAccess('microphone').then(
      granted => callback(granted && allowed()),
      error => {
        console.warn('Microphone permission request failed', error)
        callback(false)
      }
    )
  })
}

export const DESKTOP_BOOT_PATH = '/api/desktop/boot'

/** Serve the same live injection table as the authenticated Harness index. */
export function registerDesktopBootRoute(ctx) {
  ctx.inject(['webServer', 'connection'], webCtx => {
    webCtx.effect(() => webCtx.webServer.register({
      kind: 'exact',
      path: DESKTOP_BOOT_PATH,
      handler(req, res) {
        res.setHeader('cache-control', 'no-store')
        if (req.method !== 'GET') {
          res.writeHead(405, { allow: 'GET' })
          res.end()
          return
        }
        // Exact routes bypass Connection's /api prefix handler. Reuse index auth
        // because these rows contain the same protected bootstrap data.
        if (!webCtx.connection.authorizeIndex(req, res)) return
        const body = JSON.stringify({ injections: webCtx.webServer.collectIndexInjections() })
        res.writeHead(200, { 'content-type': 'application/json; charset=utf-8' })
        res.end(body)
      }
    }))
  })
}

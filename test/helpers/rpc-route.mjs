import { randomUUID } from 'node:crypto'
import { Readable } from 'node:stream'

export function rpcRouteFixture() {
  const routes = new Map()
  return {
    routes,
    connection: { requestRejection() {} },
    webServer: {
      register(route) {
        routes.set(route.path, route)
        return () => routes.delete(route.path)
      }
    }
  }
}

export async function callRpcRoute(routes, channel, method, payload) {
  const rpcId = randomUUID()
  const request = Readable.from([Buffer.from(JSON.stringify({ type: 'client-request', rpcId, method, payload }))])
  request.method = 'POST'
  request.url = `${channel}/${method}`
  request.headers = { 'content-type': 'application/json' }
  const response = await new Promise((resolve, reject) => {
    let status, headers
    const res = {
      writeHead(value, values = {}) { status = value; headers = values },
      end(value) { resolve({ status, headers, body: Buffer.from(value ?? '').toString('utf8') }) }
    }
    Promise.resolve(routes.get(channel).handler(request, res)).catch(reject)
  })
  if (response.status !== 200) throw new Error(`${channel}/${method} returned HTTP ${response.status}: ${response.body}`)
  const body = JSON.parse(response.body)
  if (body.rpcId !== rpcId) throw new Error(`${channel}/${method} returned another request id`)
  return body.result
}

import type { AddressInfo } from 'node:net'

// Fetch's bad-port list applies to loopback and LAN URLs too. A customized OS
// ephemeral range can include these ports, so listen(0) alone is not sufficient.
// Keep this aligned with https://fetch.spec.whatwg.org/#port-blocking.
const blockedPorts = new Set([
  0, 1, 7, 9, 11, 13, 15, 17, 19, 20, 21, 22, 23, 25, 37, 42, 43, 53, 69, 77, 79,
  87, 95, 101, 102, 103, 104, 109, 110, 111, 113, 115, 117, 119, 123, 135, 137,
  139, 143, 161, 179, 389, 427, 465, 512, 513, 514, 515, 526, 530, 531, 532,
  540, 548, 554, 556, 563, 587, 601, 636, 989, 990, 993, 995, 1719, 1720, 1723,
  2049, 3659, 4045, 4190, 5060, 5061, 6000, 6566, 6665, 6666, 6667, 6668, 6669,
  6679, 6697, 10080
])

interface BrowserListener {
  once(event: 'error', listener: (error: Error) => void): unknown
  off(event: 'error', listener: (error: Error) => void): unknown
  listen(options: { host: string; port: number }, callback: () => void): unknown
  address(): AddressInfo | string | null
  close(callback: (error?: Error) => void): unknown
}

/** Bind an HTTP-facing listener without publishing an origin browsers reject. */
export async function listenOnBrowserPort(
  server: BrowserListener,
  host: string,
  port = 0
): Promise<number> {
  // Zero is a bind request for OS allocation, never a published HTTP port.
  if (port !== 0 && blockedPorts.has(port)) throw new Error(`Port ${port} is blocked by browsers.`)
  for (let attempt = 0; attempt < 20; attempt++) {
    await new Promise<void>((resolve, reject) => {
      const failed = (error: Error) => { server.off('error', failed); reject(error) }
      server.once('error', failed)
      try {
        server.listen({ host, port }, () => { server.off('error', failed); resolve() })
      } catch (error) {
        server.off('error', failed)
        reject(error)
      }
    })
    const address = server.address()
    if (address && typeof address !== 'string' && !blockedPorts.has(address.port)) return address.port
    // Release an unusable ephemeral listener before asking the OS for another.
    // Bound retries also fail clearly if the OS can only supply blocked ports.
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()))
    if (!address || typeof address === 'string') throw new Error('Could not bind a local TCP port.')
  }
  throw new Error('Could not bind a browser-accessible local port after 20 attempts.')
}

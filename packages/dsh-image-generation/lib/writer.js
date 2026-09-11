// This child receives image bytes only. The Host wraps it with its configured
// OS sandbox; filesystem confinement remains effective during path-swap races.
import { materialize } from './storage.js'
import { MAX_IMAGE_BYTES } from './provider.js'
const chunks = []; let length = 0
for await (const chunk of process.stdin) {
  length += chunk.length
  if (length > Math.ceil(MAX_IMAGE_BYTES * 4 / 3) + 4) throw new Error('Image input too large')
  chunks.push(chunk)
}
const data = Buffer.from(Buffer.concat(chunks).toString('utf8'), 'base64')
if (!data.length || data.length > MAX_IMAGE_BYTES) throw new Error('Invalid image input')
process.stdout.write(JSON.stringify(await materialize(process.cwd(), data)))

import { readFile } from 'node:fs/promises'
import React from 'react'
import { resolve } from 'node:path'
const source = await readFile(resolve('packages/dsh-desktop-client-ui/client.js'), 'utf8')
let desktopUi
new Function('window', source)({ __ModuleLoader__: { load({ factory }) {
  desktopUi = factory(name => {
    if (name === 'react') return React
    if (name === '@deepseek-ai/dsh-client-ui-primitives') return {}
    throw new Error(`Unexpected shared UI dependency: ${name}`)
  })
} } })
export { desktopUi }

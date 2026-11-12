import { appendFile, chmod, rm, writeFile } from 'node:fs/promises'
import { randomBytes } from 'node:crypto'
import { execFile as execFileCallback } from 'node:child_process'
import { promisify } from 'node:util'
import path from 'node:path'
import { prepareAppleIntermediateCertificate } from './apple-intermediate-certificate.mjs'

const execFile = promisify(execFileCallback)

function required(name) {
  const value = process.env[name]?.trim()
  if (!value) throw new Error(`${name} is required`)
  return value
}

async function security(...args) {
  return execFile('/usr/bin/security', args, { encoding: 'utf8' })
}

function parseKeychains(stdout) {
  return stdout
    .split('\n')
    .map((line) => line.trim().replace(/^"|"$/g, ''))
    .filter(Boolean)
}

async function writeCertificate(source, destination) {
  if (source.startsWith('https://')) {
    const response = await fetch(source)
    if (!response.ok) throw new Error(`Unable to download signing certificate: ${response.status}`)
    await writeFile(destination, Buffer.from(await response.arrayBuffer()), { mode: 0o600 })
    return
  }

  const dataPrefix = /^data:.*;base64,/.exec(source)?.[0] ?? ''
  await writeFile(destination, Buffer.from(source.slice(dataPrefix.length), 'base64'), {
    mode: 0o600
  })
}

const runnerTemp = required('RUNNER_TEMP')
const githubOutput = required('GITHUB_OUTPUT')
const certificateSource = required('CSC_LINK')
const certificatePassword = required('CSC_KEY_PASSWORD')
const token = randomBytes(12).toString('hex')
const certificatePath = path.join(runnerTemp, `dsh-desktop-signing-${token}.p12`)
const intermediateCertificatePath = path.join(
  runnerTemp,
  `dsh-desktop-developer-id-g2-${token}.cer`
)
const keychainPath = path.join(runnerTemp, `dsh-desktop-signing-${token}.keychain-db`)
const keychainListPath = path.join(runnerTemp, `dsh-desktop-keychains-${token}.txt`)
const keychainPassword = randomBytes(32).toString('base64')
let originalKeychains = []

try {
  await writeCertificate(certificateSource, certificatePath)
  await chmod(certificatePath, 0o600)

  originalKeychains = parseKeychains(
    (await security('list-keychains', '-d', 'user')).stdout
  )
  await writeFile(keychainListPath, originalKeychains.join('\n'), { mode: 0o600 })

  await security('create-keychain', '-p', keychainPassword, keychainPath)
  await security('set-keychain-settings', '-lut', '21600', keychainPath)
  await security('unlock-keychain', '-p', keychainPassword, keychainPath)
  await security(
    'import',
    certificatePath,
    '-k',
    keychainPath,
    '-T',
    '/usr/bin/codesign',
    '-T',
    '/usr/bin/productbuild',
    '-P',
    certificatePassword
  )
  await prepareAppleIntermediateCertificate(intermediateCertificatePath)
  await security('import', intermediateCertificatePath, '-k', keychainPath)
  await rm(intermediateCertificatePath, { force: true })
  await security(
    'set-key-partition-list',
    '-S',
    'apple-tool:,apple:',
    '-s',
    '-k',
    keychainPassword,
    keychainPath
  )
  await security(
    'list-keychains',
    '-d',
    'user',
    '-s',
    keychainPath,
    ...originalKeychains.filter((item) => item !== keychainPath)
  )

  const { stdout } = await security('find-identity', '-v', '-p', 'codesigning', keychainPath)
  if (!/^\s*\d+\)/m.test(stdout)) {
    throw new Error('No valid code-signing identity was imported into the temporary keychain')
  }

  await appendFile(
    githubOutput,
    `keychain=${keychainPath}\ncertificate=${certificatePath}\nkeychain_list=${keychainListPath}\n`
  )
  console.log('Prepared temporary macOS signing keychain.')
} catch (error) {
  if (originalKeychains.length > 0) {
    await security('list-keychains', '-d', 'user', '-s', ...originalKeychains).catch(() => {})
  }
  await security('delete-keychain', keychainPath).catch(() => rm(keychainPath, { force: true }))
  await rm(certificatePath, { force: true })
  await rm(intermediateCertificatePath, { force: true })
  await rm(keychainListPath, { force: true })
  throw error
}

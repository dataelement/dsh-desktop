import { execFile as execFileCallback } from 'node:child_process'
import { copyFile, mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { promisify } from 'node:util'

const execFile = promisify(execFileCallback)
const temporaryPrefix = path.join(path.resolve(tmpdir()), 'sherlock-self-signed-update-')
const root = await mkdtemp(temporaryPrefix)
const keychain = path.join(root, 'fixture.keychain-db')
const key = path.join(root, 'identity.key')
const certificate = path.join(root, 'identity.pem')
const p12 = path.join(root, 'identity.p12')
const first = path.join(root, 'Sherlock-0.5.0')
const second = path.join(root, 'Sherlock-0.6.0')
const keychainPassword = 'temporary-keychain-password'
const certificatePassword = 'temporary-certificate-password'
let originalKeychains = []
let keychainCreated = false
let certificateTrusted = false

function parseKeychains(stdout) {
  return stdout
    .split('\n')
    .map((line) => line.trim().replace(/^"|"$/g, ''))
    .filter(Boolean)
}

async function run(executable, args) {
  return execFile(executable, args, { encoding: 'utf8' })
}

try {
  originalKeychains = parseKeychains(
    (await run('/usr/bin/security', ['list-keychains', '-d', 'user'])).stdout
  )

  await run('/usr/bin/openssl', [
    'req',
    '-x509',
    '-newkey',
    'rsa:2048',
    '-nodes',
    '-keyout',
    key,
    '-out',
    certificate,
    '-days',
    '1',
    '-subj',
    '/CN=Sherlock Update Fixture/O=Sherlock',
    '-addext',
    'keyUsage=critical,digitalSignature',
    '-addext',
    'extendedKeyUsage=codeSigning',
    '-addext',
    'basicConstraints=critical,CA:FALSE'
  ])
  await run('/usr/bin/openssl', [
    'pkcs12',
    '-export',
    '-out',
    p12,
    '-inkey',
    key,
    '-in',
    certificate,
    '-name',
    'Sherlock Update Fixture',
    '-passout',
    `pass:${certificatePassword}`
  ])

  await run('/usr/bin/security', ['create-keychain', '-p', keychainPassword, keychain])
  keychainCreated = true
  await run('/usr/bin/security', ['set-keychain-settings', '-lut', '300', keychain])
  await run('/usr/bin/security', ['unlock-keychain', '-p', keychainPassword, keychain])
  await run('/usr/bin/security', [
    'import',
    p12,
    '-k',
    keychain,
    '-P',
    certificatePassword,
    '-T',
    '/usr/bin/codesign'
  ])
  await run('/usr/bin/security', [
    'set-key-partition-list',
    '-S',
    'apple-tool:,apple:',
    '-s',
    '-k',
    keychainPassword,
    keychain
  ])
  await run('/usr/bin/security', [
    'add-trusted-cert',
    '-r',
    'trustRoot',
    '-p',
    'codeSign',
    '-k',
    keychain,
    certificate
  ])
  certificateTrusted = true
  await run('/usr/bin/security', [
    'list-keychains',
    '-d',
    'user',
    '-s',
    keychain,
    ...originalKeychains.filter((item) => item !== keychain)
  ])

  const identities = await run('/usr/bin/security', [
    'find-identity',
    '-v',
    '-p',
    'codesigning',
    keychain
  ])
  if (process.env.SHERLOCK_SIGNING_DEBUG === '1') {
    const certificateDetails = await run('/usr/bin/openssl', [
      'x509',
      '-in',
      certificate,
      '-noout',
      '-subject',
      '-issuer',
      '-purpose'
    ])
    console.error(`[identity]\n${identities.stdout.trim()}\n[certificate]\n${certificateDetails.stdout.trim()}`)
  }
  const identity = /^\s*\d+\)\s+([0-9A-F]{40})\s+"Sherlock Update Fixture"/m.exec(
    identities.stdout
  )?.[1]
  if (!identity) throw new Error('Temporary self-signed code-signing identity is not valid.')

  await Promise.all([copyFile('/usr/bin/true', first), copyFile('/usr/bin/true', second)])
  for (const binary of [first, second]) {
    await run('/usr/bin/codesign', [
      '--force',
      '--sign',
      identity,
      '--keychain',
      keychain,
      '--identifier',
      'io.sherlock.update.fixture',
      '--timestamp=none',
      binary
    ])
    await run('/usr/bin/codesign', ['--verify', '--strict', binary])
  }

  const requirementOutput = await run('/usr/bin/codesign', ['-d', '-r-', first])
  if (process.env.SHERLOCK_SIGNING_DEBUG === '1') {
    console.error(`[requirement]\n${requirementOutput.stdout.trim()}`)
  }
  const requirement = /^designated => (.+)$/m.exec(requirementOutput.stdout)?.[1]?.trim()
  if (!requirement) throw new Error('Unable to extract the first fixture designated requirement.')

  await run('/usr/bin/codesign', ['--verify', '--strict', `-R=${requirement}`, second])
  process.stdout.write('SELF_SIGNED_UPDATE_IDENTITY_OK\n')
} finally {
  if (originalKeychains.length > 0) {
    await run('/usr/bin/security', [
      'list-keychains',
      '-d',
      'user',
      '-s',
      ...originalKeychains
    ]).catch(() => {})
  }
  if (certificateTrusted) {
    await run('/usr/bin/security', ['remove-trusted-cert', certificate]).catch(() => {})
  }
  if (keychainCreated) {
    await run('/usr/bin/security', ['delete-keychain', keychain]).catch(() => {})
  }
  if (!path.resolve(root).startsWith(temporaryPrefix)) {
    throw new Error('Refusing to clean an unexpected self-signed update fixture path.')
  }
  await rm(root, { recursive: true, force: true })
}

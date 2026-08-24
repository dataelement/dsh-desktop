import { execFile as execFileCallback } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { copyFile, mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { promisify } from 'node:util'

const execFile = promisify(execFileCallback)
const identityName = 'Sherlock Desktop Update Signing'
const temporaryPrefix = path.join(path.resolve(tmpdir()), 'sherlock-signing-provision-')

async function run(executable, args) {
  return execFile(executable, args, { encoding: 'utf8' })
}

async function findIdentity() {
  const { stdout } = await run('/usr/bin/security', [
    'find-identity',
    '-v',
    '-p',
    'codesigning'
  ])
  return /^\s*\d+\)\s+([0-9A-F]{40})\s+"Sherlock Desktop Update Signing"$/m.exec(
    stdout
  )?.[1]
}

if (process.platform !== 'darwin') throw new Error('Sherlock macOS signing requires macOS.')

const existingIdentity = await findIdentity()
if (existingIdentity) {
  process.stdout.write(`SHERLOCK_SIGNING_IDENTITY_READY ${existingIdentity}\n`)
  process.exit(0)
}

const existingCertificate = await run('/usr/bin/security', [
  'find-certificate',
  '-c',
  identityName,
  '-a'
]).catch(() => undefined)
if (existingCertificate?.stdout) {
  throw new Error(
    'A Sherlock signing certificate exists without a usable private key. Refusing to replace the update identity.'
  )
}

const { stdout: defaultKeychainOutput } = await run('/usr/bin/security', [
  'default-keychain',
  '-d',
  'user'
])
const defaultKeychain = defaultKeychainOutput.trim().replace(/^"|"$/g, '')
if (!defaultKeychain) throw new Error('The default macOS user keychain was not found.')

const root = await mkdtemp(temporaryPrefix)
const key = path.join(root, 'identity.key')
const certificate = path.join(root, 'identity.pem')
const p12 = path.join(root, 'identity.p12')
const probe = path.join(root, 'Sherlock-signing-probe')
const certificatePassword = randomBytes(36).toString('base64url')

try {
  await run('/usr/bin/openssl', [
    'req',
    '-x509',
    '-newkey',
    'rsa:3072',
    '-nodes',
    '-keyout',
    key,
    '-out',
    certificate,
    '-days',
    '3650',
    '-subj',
    `/CN=${identityName}/O=Sherlock`,
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
    identityName,
    '-passout',
    `pass:${certificatePassword}`
  ])
  await run('/usr/bin/security', [
    'import',
    p12,
    '-k',
    defaultKeychain,
    '-P',
    certificatePassword,
    '-T',
    '/usr/bin/codesign',
    '-T',
    '/usr/bin/productbuild'
  ])
  await run('/usr/bin/security', [
    'add-trusted-cert',
    '-r',
    'trustRoot',
    '-p',
    'codeSign',
    '-k',
    defaultKeychain,
    certificate
  ])

  const identity = await findIdentity()
  if (!identity) throw new Error('The Sherlock signing identity was imported but is not valid.')

  await copyFile('/usr/bin/true', probe)
  await run('/usr/bin/codesign', [
    '--force',
    '--sign',
    identity,
    '--identifier',
    'io.dsh.desktop.signing-probe',
    '--timestamp=none',
    probe
  ])
  await run('/usr/bin/codesign', ['--verify', '--strict', probe])
  process.stdout.write(`SHERLOCK_SIGNING_IDENTITY_READY ${identity}\n`)
} finally {
  if (!path.resolve(root).startsWith(temporaryPrefix)) {
    throw new Error('Refusing to clean an unexpected signing provision path.')
  }
  await rm(root, { recursive: true, force: true })
}

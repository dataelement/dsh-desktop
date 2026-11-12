/**
 * Desktop's metadata-only view command. The pinned pnpm adapter supplies its
 * configuration, authentication, semver and HTTP implementation; this module
 * does not read credentials itself or launch npm. Keep install-time networking
 * and this query on the same pnpm configuration boundary.
 */
function failure(code, message) {
  return Object.assign(new Error(message), { code })
}

function parseArguments(args) {
  const config = {}
  const positionals = []
  let json = false
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index]
    if (!argument.startsWith('--')) {
      if (argument.startsWith('-')) throw failure('EUSAGE', 'Unsupported metadata query option.')
      positionals.push(argument)
      continue
    }
    const equal = argument.indexOf('=')
    let key = argument.slice(2, equal < 0 ? undefined : equal).replace(/^config\./u, '')
    let value = equal < 0 ? undefined : argument.slice(equal + 1)
    if (key === 'json') {
      json = value !== 'false'
      continue
    }
    if (key.startsWith('no-')) {
      key = key.slice(3)
      value = false
    } else if (value === undefined) {
      if (key === 'strict-ssl') value = true
      else value = args[++index]
    }
    if (value === undefined || (typeof value === 'string' && value.startsWith('--'))) {
      throw failure('EUSAGE', 'A metadata query option is missing its value.')
    }
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
      throw failure('EUSAGE', 'Invalid metadata query option.')
    }
    config[key] = value === 'false' ? false : value === 'true' ? true : value
  }
  const [spec, ...fields] = positionals
  if (!spec) throw failure('EUSAGE', 'A registry package name is required.')
  const separator = spec.lastIndexOf('@')
  const name = separator > 0 ? spec.slice(0, separator) : spec
  const selector = separator > 0 ? spec.slice(separator + 1) : 'latest'
  if (!/^(?:@[a-z0-9._~-]+\/)?[a-z0-9._~-]+$/iu.test(name) || !selector) {
    throw failure('EUSAGE', 'Only named registry packages are supported by metadata queries.')
  }
  return { config, json, name, selector, fields }
}

function fieldValue(manifest, metadata, field) {
  const parts = field.replace(/\[(\d+)\]/gu, '.$1').split('.')
  let value = Object.hasOwn(metadata, parts[0]) && ['versions', 'dist-tags', 'time', 'readme'].includes(parts[0])
    ? { [parts[0]]: metadata[parts[0]] }
    : manifest
  for (const part of parts) {
    if (value === null || typeof value !== 'object' || !Object.hasOwn(value, part)) return undefined
    value = value[part]
  }
  return value
}

/**
 * Called only by the version-pinned pnpm patch, with pnpm-owned capabilities.
 * @param {string[]} args - Registry spec, requested fields and pnpm config flags.
 * @param {object} adapter - Configuration/network/semver capabilities from pnpm 10.34.5.
 * @returns {Promise<string>} npm-compatible JSON for the metadata fields used by Desktop.
 */
export async function registryView(args, { loadConfig, createFetch, createAuth, semver }) {
  const request = parseArguments(args)
  const config = await loadConfig(request.config)
  const scope = request.name.startsWith('@') ? request.name.split('/')[0] : undefined
  const registry = new URL(config.registries?.[scope] ?? config.registries?.default ?? config.registry)
  if (!['http:', 'https:'].includes(registry.protocol)) throw failure('EUSAGE', 'Registry must use HTTP or HTTPS.')
  registry.pathname = registry.pathname.replace(/\/?$/u, '/') + encodeURIComponent(request.name)
  const getAuth = createAuth({ allSettings: config.rawConfig, userSettings: config.userConfig })
  const fetchRegistry = createFetch({
    ca: config.ca, cert: config.cert, key: config.key,
    httpProxy: config.httpProxy, httpsProxy: config.httpsProxy, noProxy: config.noProxy,
    localAddress: config.localAddress, maxSockets: config.maxSockets,
    strictSsl: config.strictSsl, sslConfigs: config.sslConfigs, userAgent: config.userAgent
  })
  let metadata
  try {
    const response = await fetchRegistry(registry.href, {
      authHeaderValue: getAuth(registry.href), fullMetadata: true, compress: true,
      retry: { retries: 0 }, timeout: Math.min(Number(config.fetchTimeout) || 20000, 20000)
    })
    if (response.status !== 200) {
      response.body?.destroy()
      throw failure(`E${response.status}`, `Registry metadata request for ${request.name} returned HTTP ${response.status}.`)
    }
    metadata = await response.json()
  } catch (error) {
    // Never print response bodies, registry credentials or fetch errors containing URLs.
    const code = typeof error?.code === 'string' && /^(?:E[A-Z0-9_]+|ERR_[A-Z0-9_]+)$/u.test(error.code)
      ? error.code : 'ERR_REGISTRY_METADATA'
    throw failure(code, `Unable to read registry metadata for ${request.name} (${code}).`)
  }
  if (metadata === null || typeof metadata !== 'object' || metadata.versions === null
    || typeof metadata.versions !== 'object' || Array.isArray(metadata.versions)) {
    throw failure('ERR_REGISTRY_METADATA', `Invalid registry metadata for ${request.name}.`)
  }
  const tag = metadata['dist-tags']?.[request.selector]
  const exact = tag ?? semver.valid(request.selector)
  const versions = exact ? [exact] : Object.keys(metadata.versions)
    .filter(version => semver.valid(version) && semver.satisfies(version, request.selector))
    .sort(semver.compare)
  if (versions.length === 0) throw failure('ETARGET', `No matching version for ${request.name}.`)
  const viewMetadata = { ...metadata, versions: Object.keys(metadata.versions).filter(semver.valid).sort(semver.compare) }
  const values = versions.map(version => {
    const manifest = metadata.versions[version]
    if (!manifest || manifest.name !== request.name || manifest.version !== version) {
      throw failure('ETARGET', `Registry did not return the requested identity for ${request.name}.`)
    }
    if (request.fields.length === 0) return manifest
    if (request.fields.length === 1) return fieldValue(manifest, viewMetadata, request.fields[0])
    return Object.fromEntries(request.fields.map(field => [field, fieldValue(manifest, viewMetadata, field)]))
  })
  const result = values.length === 1 ? values[0] : values
  if (result === undefined) return ''
  return request.json || typeof result !== 'string' ? JSON.stringify(result, null, 2) + '\n' : result + '\n'
}

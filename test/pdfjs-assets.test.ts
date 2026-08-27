import { createHash } from 'node:crypto'
import { execFile as execFileCallback } from 'node:child_process'
import { mkdir, mkdtemp, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { promisify } from 'node:util'
import { afterEach, describe, expect, it } from 'vitest'

const execFile = promisify(execFileCallback)
const projectRoot = path.resolve(import.meta.dirname, '..')
const temporaryDirectories: string[] = []

async function temporaryDirectory(): Promise<string> {
  const directory = await mkdtemp(path.join(tmpdir(), 'sherlock-pdfjs-assets-'))
  temporaryDirectories.push(directory)
  return directory
}

async function treeHash(root: string): Promise<string> {
  const digest = createHash('sha256')
  async function visit(directory: string): Promise<void> {
    for (const entry of (await readdir(directory, { withFileTypes: true }))
      .sort((left, right) => left.name.localeCompare(right.name))) {
      const absolute = path.join(directory, entry.name)
      const relative = path.relative(root, absolute)
      digest.update(relative)
      if (entry.isDirectory()) await visit(absolute)
      else digest.update(await readFile(absolute))
    }
  }
  await visit(root)
  return digest.digest('hex')
}

async function ownedStagingDirectories(destination: string): Promise<string[]> {
  const prefix = `${path.basename(destination)}.staging-`
  return (await readdir(path.dirname(destination), { withFileTypes: true }))
    .filter((entry) => entry.isDirectory() && entry.name.startsWith(prefix) &&
      /^\d+$/.test(entry.name.slice(prefix.length)))
    .map((entry) => entry.name)
    .sort()
}

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) =>
    rm(directory, { recursive: true, force: true })
  ))
})

describe('PDF.js packaged assets', () => {
  it('stages stable library, worker, CMap, and standard-font paths idempotently', async () => {
    const root = await temporaryDirectory()
    const source = path.join(root, 'pdfjs-dist')
    const destination = path.join(root, 'web', 'sherlock-pdfjs')
    await mkdir(path.join(source, 'build'), { recursive: true })
    await mkdir(path.join(source, 'cmaps'), { recursive: true })
    await mkdir(path.join(source, 'standard_fonts'), { recursive: true })
    await writeFile(path.join(source, 'build', 'pdf.min.mjs'), 'export const getDocument = () => {}')
    await writeFile(path.join(source, 'build', 'pdf.worker.min.mjs'), 'export const WorkerMessageHandler = {}')
    await writeFile(path.join(source, 'cmaps', 'Adobe-GB1.bcmap'), 'cmap')
    await writeFile(path.join(source, 'standard_fonts', 'FoxitSans.pfb'), 'font')
    await writeFile(path.join(source, 'LICENSE'), 'Apache License 2.0')
    const staleOwned = `${destination}.staging-123456`
    const similarlyNamed = `${destination}.staging-user-data`
    await mkdir(staleOwned, { recursive: true })
    await mkdir(similarlyNamed, { recursive: true })

    const command = [
      path.join(projectRoot, 'scripts', 'install-pdfjs-assets.mjs'),
      '--source', source,
      '--destination', destination
    ]
    await execFile(process.execPath, command, { cwd: projectRoot })
    await expect(stat(staleOwned)).rejects.toMatchObject({ code: 'ENOENT' })
    expect((await stat(similarlyNamed)).isDirectory()).toBe(true)
    const firstHash = await treeHash(destination)
    await writeFile(path.join(destination, 'stale.js'), 'stale')
    await execFile(process.execPath, command, { cwd: projectRoot })

    expect(await treeHash(destination)).toBe(firstHash)
    expect(await readFile(path.join(destination, 'pdf.min.js'), 'utf8'))
      .toContain('getDocument')
    expect(await readFile(path.join(destination, 'pdf.worker.min.js'), 'utf8'))
      .toContain('WorkerMessageHandler')
    expect(await readFile(path.join(destination, 'cmaps', 'Adobe-GB1.bcmap'), 'utf8'))
      .toBe('cmap')
    expect(await readFile(path.join(destination, 'standard_fonts', 'FoxitSans.pfb'), 'utf8'))
      .toBe('font')
    expect(await readFile(path.join(destination, 'LICENSE'), 'utf8'))
      .toBe('Apache License 2.0')
    const loader = await readFile(path.join(destination, 'loader.js'), 'utf8')
    expect(loader).toContain("from './pdf.min.js'")
    expect(loader).toContain("workerSrc = '/sherlock-pdfjs/pdf.worker.min.js'")
  })

  it('removes its current staging directory when asset copying fails', async () => {
    const root = await temporaryDirectory()
    const source = path.join(root, 'incomplete-pdfjs-dist')
    const destination = path.join(root, 'web', 'sherlock-pdfjs')
    await mkdir(path.join(source, 'build'), { recursive: true })
    await mkdir(path.join(source, 'cmaps'), { recursive: true })
    await mkdir(path.join(source, 'standard_fonts'), { recursive: true })
    await writeFile(path.join(source, 'build', 'pdf.min.mjs'), 'export const getDocument = () => {}')
    await writeFile(path.join(source, 'cmaps', 'Adobe-GB1.bcmap'), 'cmap')
    await writeFile(path.join(source, 'standard_fonts', 'FoxitSans.pfb'), 'font')
    await writeFile(path.join(source, 'LICENSE'), 'Apache License 2.0')

    await expect(execFile(process.execPath, [
      path.join(projectRoot, 'scripts', 'install-pdfjs-assets.mjs'),
      '--source', source,
      '--destination', destination
    ], { cwd: projectRoot })).rejects.toBeDefined()

    expect(await ownedStagingDirectories(destination)).toEqual([])
  })

  it('pins and stages the real PDF.js package into the packaged web input', async () => {
    const packageJson = JSON.parse(await readFile(path.join(projectRoot, 'package.json'), 'utf8')) as {
      dependencies: Record<string, string>
      devDependencies: Record<string, string>
      scripts: Record<string, string>
      build: { files: string[] }
    }
    expect(packageJson.dependencies['pdfjs-dist']).toBeUndefined()
    expect(packageJson.devDependencies['pdfjs-dist']).toBe('4.10.38')
    expect(packageJson.scripts.postinstall).toContain('node scripts/install-pdfjs-assets.mjs')
    expect(packageJson.scripts.build).toContain('node scripts/install-pdfjs-assets.mjs')
    expect(packageJson.build.files).toContain('!node_modules/pdfjs-dist/**')
    expect(packageJson.build.files).toContain('!node_modules/@napi-rs/canvas/**')
    expect(packageJson.build.files).toContain('!node_modules/@napi-rs/canvas-*/**')

    await execFile(process.execPath, [
      path.join(projectRoot, 'scripts', 'install-pdfjs-assets.mjs')
    ], { cwd: projectRoot })
    const destination = path.join(
      projectRoot, 'node_modules', '@deepseek-ai', 'dsh-web-frontend', 'dist', 'sherlock-pdfjs'
    )
    for (const relative of ['loader.js', 'pdf.min.js', 'pdf.worker.min.js', 'LICENSE']) {
      expect((await stat(path.join(destination, relative))).size).toBeGreaterThan(0)
    }
    expect((await readdir(path.join(destination, 'cmaps'))).length).toBeGreaterThan(100)
    expect((await readdir(path.join(destination, 'standard_fonts'))).length).toBeGreaterThan(10)
  })

  it('serves the staged module and worker as JavaScript bytes instead of SPA fallback HTML', async () => {
    const { serveStatic } = await import('@deepseek-ai/dsh-host-frontend-static')
    const distRoot = path.join(
      projectRoot, 'node_modules', '@deepseek-ai', 'dsh-web-frontend', 'dist'
    )
    const distIndex = path.join(distRoot, 'index.html')
    const server = createServer((request, response) => {
      void serveStatic(
        new URL(request.url ?? '/', 'http://127.0.0.1').pathname,
        response,
        distRoot,
        distIndex,
        () => readFile(distIndex, 'utf8')
      )
    })
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
    try {
      const address = server.address()
      if (address === null || typeof address === 'string') throw new Error('HTTP test server unavailable')
      for (const relative of ['loader.js', 'pdf.min.js', 'pdf.worker.min.js']) {
        const response = await fetch(
          `http://127.0.0.1:${address.port}/sherlock-pdfjs/${relative}`
        )
        const bytes = Buffer.from(await response.arrayBuffer())
        expect(response.status, relative).toBe(200)
        expect(response.headers.get('content-type'), relative)
          .toBe('text/javascript; charset=utf-8')
        expect(bytes, relative).toEqual(await readFile(path.join(distRoot, 'sherlock-pdfjs', relative)))
        expect(bytes.subarray(0, 64).toString('utf8'), relative).not.toContain('<!doctype html>')
      }
    } finally {
      await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()))
    }
  })
})

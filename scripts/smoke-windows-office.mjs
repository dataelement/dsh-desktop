import { createRequire } from 'node:module'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const appRoot = path.resolve(process.argv[2])
const requirePackaged = createRequire(path.join(appRoot, 'node_modules', 'dsh-ppt', 'package.json'))
const { default: PptxGenJS } = await import(pathToFileURL(requirePackaged.resolve('pptxgenjs')).href)
const { createConverter, discoverRuntime } = await import(
  pathToFileURL(requirePackaged.resolve('@deepseek-ai/libreoffice-kit')).href
)
const directory = await mkdtemp(path.join(tmpdir(), 'dsh-office-smoke-'))

try {
  const inputPath = path.join(directory, 'source.pptx')
  const outputPath = path.join(directory, 'converted.pdf')
  const pptx = new PptxGenJS()
  pptx.addSlide().addText('DSH Office preview smoke', { x: 1, y: 1, w: 6, h: 1 })
  await pptx.writeFile({ fileName: inputPath })
  console.log('Packaged Office engine:', JSON.stringify(await discoverRuntime()))
  const converter = await createConverter({ timeoutMs: 60_000 })
  try {
    const result = await converter.render({ inputPath, outputPath })
    const pdf = await readFile(outputPath)
    if (!pdf.subarray(0, 5).equals(Buffer.from('%PDF-'))) {
      throw new Error('Office converter did not produce a PDF')
    }
    console.log('Packaged Office PPTX to PDF passed:', result.backend, pdf.length)
  } finally {
    await converter.dispose()
  }
} catch (error) {
  for (let current = error, depth = 0; current && depth < 5; current = current.cause, depth++) {
    console.error(`Office conversion error ${depth}:`, current.code, current.message, current.stack)
  }
  process.exitCode = 1
} finally {
  await rm(directory, { recursive: true, force: true })
}

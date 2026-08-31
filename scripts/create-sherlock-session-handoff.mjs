#!/usr/bin/env node
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { buildFeatureHandoff, handoffOutputPath, writeFeatureHandoff } from './lib/sherlock-integration-model.mjs'

function usage() {
  return '用法：create-sherlock-session-handoff --repo <feature-worktree> --base <full-sha> --metadata <metadata.json> [--output <path>] [--format text|json]'
}

function parseArguments(argv) {
  if (argv.length === 1 && argv[0] === '--help') return { help: true }
  const values = new Map()
  for (let index = 0; index < argv.length; index += 1) {
    const option = argv[index]
    if (!['--repo', '--base', '--metadata', '--output', '--format'].includes(option)) {
      throw new Error(`${usage()}\n未知参数：${option}`)
    }
    if (values.has(option)) throw new Error(`${usage()}\n参数不能重复：${option}`)
    const value = argv[index + 1]
    if (!value || value.startsWith('--')) throw new Error(`${usage()}\n参数缺少值：${option}`)
    values.set(option, value)
    index += 1
  }
  for (const required of ['--repo', '--base', '--metadata']) {
    if (!values.has(required)) throw new Error(`${usage()}\n缺少必填参数：${required}`)
  }
  const format = values.get('--format') ?? 'text'
  if (format !== 'text' && format !== 'json') throw new Error(`${usage()}\n--format 只能是 text 或 json。`)
  return {
    repository: values.get('--repo'),
    baseCommit: values.get('--base'),
    metadataPath: values.get('--metadata'),
    outputPath: values.get('--output'),
    format
  }
}

function main() {
  const options = parseArguments(process.argv.slice(2))
  if (options.help) {
    process.stdout.write(`${usage()}\n`)
    return
  }
  const metadata = JSON.parse(readFileSync(options.metadataPath, 'utf8'))
  const handoff = buildFeatureHandoff({
    repository: options.repository,
    baseCommit: options.baseCommit,
    metadata,
    generatedAt: metadata.generatedAt
  })
  const outputPath = options.outputPath
    ? path.resolve(options.outputPath)
    : handoffOutputPath(options.repository, handoff)
  const bytes = writeFeatureHandoff(outputPath, handoff)
  if (options.format === 'json') process.stdout.write(bytes)
  else process.stdout.write(`${outputPath}\n`)
}

try {
  main()
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`)
  process.exitCode = 2
}

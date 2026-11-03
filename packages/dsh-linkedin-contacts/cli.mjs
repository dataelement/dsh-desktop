#!/usr/bin/env node
import { homedir } from 'node:os'
import { join } from 'node:path'
import { connect, openPage } from './chrome.mjs'
import { assessCandidate, normalizeName, readLedger, recordReview, selectBatch, summarize, writeLedger, STATUS } from './ledger.mjs'
import { readProfile, searchPeople, sendInvite } from './linkedin.mjs'

const DEFAULT_LEDGER = process.env.DSH_LINKEDIN_LEDGER ?? join(homedir(), '.dsh/automations/linkedin-contact-add/state.json')

function parseArgs(argv) {
  const [command = 'status', ...rest] = argv
  const flags = {}
  for (let i = 0; i < rest.length; i++) {
    const arg = rest[i]
    if (!arg.startsWith('--')) continue
    const key = arg.slice(2)
    const next = rest[i + 1]
    if (next && !next.startsWith('--')) {
      flags[key] = next
      i++
    } else flags[key] = true
  }
  return { command, flags }
}

/** Contacts carry the vCard organization when the export had one; it is the only corroborating field we hold. */
function contactFor(row) {
  return { name: row.name, org: row.org ?? '' }
}

async function review(cdp, page, row, { send }) {
  const candidates = await searchPeople(cdp, page.sessionId, row.name)
  const named = candidates.filter((c) => normalizeName(c.name).includes(normalizeName(row.name).split(' ')[0]))
  if (!named.length) return { status: STATUS.ambiguous, evidence: 'no LinkedIn search result' }

  const best = named[0]
  const profile = await readProfile(cdp, page.sessionId, best.href)
  const verdict = assessCandidate(contactFor(row), {
    name: profile.name || best.name,
    headline: best.headline,
    degree: profile.degree === '1st' ? 1 : best.degree,
    connected: profile.degree === '1st',
    pending: profile.hasPending,
    mutual: best.mutual
  })

  if (verdict.verdict === 'existing') {
    return { status: STATUS.existing, profile: best.href, evidence: verdict.reason }
  }
  if (verdict.verdict === 'ambiguous') {
    return { status: STATUS.ambiguous, profile: best.href, evidence: verdict.reason }
  }
  if (!send) return { status: STATUS.reviewed, profile: best.href, evidence: `would send: ${verdict.reason}` }
  if (!profile.hasConnect) {
    return { status: STATUS.blocked, profile: best.href, evidence: 'confirmed match but no Connect control' }
  }

  await sendInvite(cdp, page.sessionId)
  return { status: STATUS.sent, profile: best.href, evidence: verdict.reason, verified: true }
}

async function run({ flags, send }) {
  const ledgerPath = flags.ledger ?? DEFAULT_LEDGER
  const ledger = await readLedger(ledgerPath)
  const limit = Number(flags.limit ?? 20)
  const batch = selectBatch(ledger, limit)
  if (!batch.length) {
    console.log('queue is exhausted; nothing left to review')
    return
  }

  const unresolved = new Set(
    (ledger.current_request.possible_duplicates ?? []).filter((p) => p.status !== 'merged').map((p) => normalizeName(p.apple_contact))
  )
  const cdp = await connect()
  const page = await openPage(cdp, 'https://www.linkedin.com/feed/')
  try {
    for (const [index, row] of batch.entries()) {
      const label = `${index + 1}/${batch.length} ${row.name}`
      if (unresolved.has(normalizeName(row.name))) {
        console.log(`${label}: held — unresolved duplicate pair, merge it first`)
        recordReview(ledger, { name: row.name, status: STATUS.ambiguous, evidence: 'unresolved possible duplicate' })
        await writeLedger(ledgerPath, ledger)
        continue
      }
      try {
        const result = await review(cdp, page, row, { send })
        recordReview(ledger, { name: row.name, ...result })
        console.log(`${label}: ${result.status} — ${result.evidence}`)
      } catch (error) {
        recordReview(ledger, { name: row.name, status: STATUS.ambiguous, evidence: `review failed: ${error.message}` })
        console.log(`${label}: error — ${error.message}`)
      }
      ledger.checked_at = new Date().toISOString()
      await writeLedger(ledgerPath, ledger)
      await new Promise((r) => setTimeout(r, 2500))
    }
  } finally {
    await page.close().catch(() => {})
    cdp.close()
  }
  console.log(JSON.stringify(summarize(ledger), null, 1))
}

const { command, flags } = parseArgs(process.argv.slice(2))

if (command === 'status') {
  const ledger = await readLedger(flags.ledger ?? DEFAULT_LEDGER)
  console.log(JSON.stringify(summarize(ledger), null, 1))
  for (const row of selectBatch(ledger, Number(flags.limit ?? 5))) console.log(`next: ${row.name} (${row.source})`)
} else if (command === 'scan') {
  await run({ flags, send: false })
} else if (command === 'run') {
  await run({ flags, send: true })
} else {
  console.error(`unknown command: ${command}\nusage: dsh-linkedin-contacts [status|scan|run] [--ledger FILE] [--limit N]`)
  process.exit(1)
}

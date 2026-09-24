// Looks up a listing pull request on dataelement/awesome-dsh-workbench.
//
// Opening the pull request is the submission, so Desktop stores nothing: the
// user pastes the link and this reads its current state from GitHub. Only
// pull requests in the market repository are accepted, so the route cannot be
// used to query arbitrary URLs.

export const MARKET_REPOSITORY = 'dataelement/awesome-dsh-workbench'
const PULL_URL = /^https:\/\/github\.com\/dataelement\/awesome-dsh-workbench\/pull\/(\d{1,9})\/?(?:[?#].*)?$/i
const TIMEOUT_MS = 15_000

export class SubmissionStatusError extends Error {
  constructor(message, status = 400) {
    super(message)
    this.name = 'SubmissionStatusError'
    this.status = status
  }
}

/** The pull request number in a market-repository PR link, or an error for anything else. */
export function pullNumberFrom(link) {
  const match = PULL_URL.exec(typeof link === 'string' ? link.trim() : '')
  if (!match) throw new SubmissionStatusError(`Paste a pull request link from github.com/${MARKET_REPOSITORY}.`)
  return Number(match[1])
}

async function github(path, fetchImpl) {
  let response
  try {
    response = await fetchImpl(`https://api.github.com/repos/${MARKET_REPOSITORY}${path}`, {
      headers: { accept: 'application/vnd.github+json', 'x-github-api-version': '2022-11-28' },
      signal: AbortSignal.timeout(TIMEOUT_MS)
    })
  } catch (error) {
    throw new SubmissionStatusError(`Could not reach GitHub: ${error instanceof Error ? error.message : String(error)}`, 502)
  }
  if (response.status === 404) throw new SubmissionStatusError('This pull request was not found.', 404)
  if (response.status === 403 || response.status === 429) {
    throw new SubmissionStatusError('GitHub is limiting requests from this network. Try again later, or open the pull request on GitHub.', 503)
  }
  if (!response.ok) throw new SubmissionStatusError(`GitHub returned HTTP ${response.status}.`, 502)
  return response.json()
}

/**
 * The listing status of one pull request:
 * `merged`, `closed` (without merging), `changes-requested`, `draft` or `open`.
 * A review asking for changes counts only while it is the reviewer's latest word.
 */
export async function readSubmissionStatus(link, { fetchImpl = fetch } = {}) {
  const number = pullNumberFrom(link)
  const pull = await github(`/pulls/${number}`, fetchImpl)
  const summary = {
    number,
    url: pull.html_url,
    title: pull.title,
    author: pull.user?.login ?? '',
    updatedAt: pull.updated_at ?? null
  }
  if (pull.merged_at || pull.merged) return { ...summary, status: 'merged' }
  if (pull.state === 'closed') return { ...summary, status: 'closed' }
  if (pull.draft) return { ...summary, status: 'draft' }
  const reviews = await github(`/pulls/${number}/reviews?per_page=100`, fetchImpl)
  const latest = new Map()
  for (const review of Array.isArray(reviews) ? reviews : []) {
    if (review?.user?.login && ['APPROVED', 'CHANGES_REQUESTED', 'DISMISSED'].includes(review.state)) latest.set(review.user.login, review.state)
  }
  return { ...summary, status: [...latest.values()].includes('CHANGES_REQUESTED') ? 'changes-requested' : 'open' }
}

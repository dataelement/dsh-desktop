export type SearchEngineId = 'bing' | 'duckduckgo'

export interface SearchResultCandidate {
  title?: unknown
  url?: unknown
  snippet?: unknown
}

export interface SearchSource {
  url: string
  title?: string
  snippet?: string
}

const SEARCH_HOSTS: Record<SearchEngineId, ReadonlySet<string>> = {
  bing: new Set(['www.bing.com', 'cn.bing.com']),
  duckduckgo: new Set(['html.duckduckgo.com', 'duckduckgo.com', 'www.duckduckgo.com'])
}

function cleanText(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const cleaned = value.replace(/\s+/gu, ' ').trim()
  return cleaned.length > 0 ? cleaned : undefined
}

function publicHttpUrl(value: unknown): string | undefined {
  if (typeof value !== 'string' || !URL.canParse(value)) return undefined
  const parsed = new URL(value)
  return parsed.protocol === 'https:' || parsed.protocol === 'http:' ? parsed.href : undefined
}

export function buildSearchUrl(engine: SearchEngineId, query: string): string {
  const url = new URL(
    engine === 'bing' ? 'https://www.bing.com/search' : 'https://html.duckduckgo.com/html/'
  )
  url.searchParams.set('q', query)
  return url.href
}

export function isAllowedSearchLocation(engine: SearchEngineId, url: string): boolean {
  if (!URL.canParse(url)) return false
  const parsed = new URL(url)
  return parsed.protocol === 'https:' && SEARCH_HOSTS[engine].has(parsed.hostname.toLowerCase())
}

export function normalizeSearchResults(
  candidates: SearchResultCandidate[],
  maxResults: number
): SearchSource[] {
  const limit = Math.max(0, Math.floor(maxResults))
  const seen = new Set<string>()
  const sources: SearchSource[] = []
  for (const candidate of candidates) {
    const url = publicHttpUrl(candidate.url)
    if (!url || seen.has(url)) continue
    seen.add(url)
    const title = cleanText(candidate.title)
    const snippet = cleanText(candidate.snippet)
    sources.push({
      url,
      ...(title ? { title } : {}),
      ...(snippet ? { snippet } : {})
    })
    if (sources.length >= limit) break
  }
  return sources
}

export function isSearchChallenge(page: {
  url: string
  title: string
  text: string
}): boolean {
  const haystack = `${page.url}\n${page.title}\n${page.text}`.toLowerCase()
  return /(?:captcha|challenge|human verification|verify you are a human|unusual traffic)/u.test(
    haystack
  )
}

export function orderedSearchEngines(query: string): SearchEngineId[] {
  return /[\p{Script=Han}]/u.test(query)
    ? ['bing', 'duckduckgo']
    : ['duckduckgo', 'bing']
}

function textOf(element: Element | null): string | undefined {
  return cleanText(element?.textContent)
}

export function extractSearchResults(
  engine: SearchEngineId,
  document: Document
): SearchResultCandidate[] {
  const rows =
    engine === 'bing'
      ? document.querySelectorAll('#b_results .b_algo')
      : document.querySelectorAll('.result')
  return Array.from(rows).flatMap((row) => {
    const link = row.querySelector<HTMLAnchorElement>(
      engine === 'bing' ? 'h2 a[href]' : 'a.result__a[href]'
    )
    if (!link) return []
    const snippet = textOf(
      row.querySelector(engine === 'bing' ? '.b_caption p' : '.result__snippet')
    )
    return [
      {
        url: link.href,
        ...(textOf(link) ? { title: textOf(link) } : {}),
        ...(snippet ? { snippet } : {})
      }
    ]
  })
}

export function searchExtractionScript(engine: SearchEngineId): string {
  const rowSelector = engine === 'bing' ? '#b_results .b_algo' : '.result'
  const linkSelector = engine === 'bing' ? 'h2 a[href]' : 'a.result__a[href]'
  const snippetSelector = engine === 'bing' ? '.b_caption p' : '.result__snippet'
  return `(() => {
    const clean = (value) => {
      if (typeof value !== 'string') return undefined
      const text = value.replace(/\\s+/gu, ' ').trim()
      return text.length > 0 ? text : undefined
    }
    return Array.from(document.querySelectorAll(${JSON.stringify(rowSelector)})).flatMap((row) => {
      const link = row.querySelector(${JSON.stringify(linkSelector)})
      if (!link) return []
      const title = clean(link.textContent)
      const snippet = clean(row.querySelector(${JSON.stringify(snippetSelector)})?.textContent)
      return [{
        url: link.href,
        ...(title ? { title } : {}),
        ...(snippet ? { snippet } : {})
      }]
    })
  })()`
}

import { Window } from 'happy-dom'
import { describe, expect, it } from 'vitest'
import {
  buildSearchUrl,
  extractSearchResults,
  isAllowedSearchLocation,
  isSearchChallenge,
  normalizeSearchResults,
  orderedSearchEngines,
  searchExtractionScript
} from '../src/main/search/search-engines'

describe('local browser search engines', () => {
  it('builds encoded Bing and DuckDuckGo search URLs without carrying user state', () => {
    expect(buildSearchUrl('bing', '英伟达 2026 财报')).toBe(
      'https://www.bing.com/search?q=%E8%8B%B1%E4%BC%9F%E8%BE%BE+2026+%E8%B4%A2%E6%8A%A5'
    )
    expect(buildSearchUrl('duckduckgo', 'open source AI')).toBe(
      'https://html.duckduckgo.com/html/?q=open+source+AI'
    )
  })

  it('allows only the configured engine hosts over HTTPS', () => {
    expect(isAllowedSearchLocation('bing', 'https://www.bing.com/search?q=test')).toBe(true)
    expect(isAllowedSearchLocation('bing', 'https://cn.bing.com/search?q=test')).toBe(true)
    expect(isAllowedSearchLocation('duckduckgo', 'https://html.duckduckgo.com/html/?q=test')).toBe(true)
    expect(isAllowedSearchLocation('duckduckgo', 'https://duckduckgo.com/verify')).toBe(true)
    expect(isAllowedSearchLocation('bing', 'http://www.bing.com/search?q=test')).toBe(false)
    expect(isAllowedSearchLocation('bing', 'https://bing.com.example.test/search')).toBe(false)
    expect(isAllowedSearchLocation('duckduckgo', 'https://example.test/')).toBe(false)
  })

  it('normalizes safe public results, removes duplicates, and honors the limit', () => {
    expect(
      normalizeSearchResults(
        [
          {
            title: ' First result ',
            url: 'https://example.com/report',
            snippet: '  Useful summary.  '
          },
          {
            title: 'Duplicate',
            url: 'https://example.com/report',
            snippet: 'ignored'
          },
          { title: 'Unsafe', url: 'javascript:alert(1)', snippet: 'ignored' },
          { title: '', url: 'https://example.org/news', snippet: '' },
          { title: 'Third', url: 'https://third.example/item', snippet: 'third' }
        ],
        2
      )
    ).toEqual([
      {
        title: 'First result',
        url: 'https://example.com/report',
        snippet: 'Useful summary.'
      },
      { url: 'https://example.org/news' }
    ])
  })

  it('detects verification pages from the URL, title, or visible page marker', () => {
    expect(
      isSearchChallenge({
        url: 'https://www.bing.com/turing/captcha/challenge',
        title: 'Bing',
        text: ''
      })
    ).toBe(true)
    expect(
      isSearchChallenge({
        url: 'https://html.duckduckgo.com/html/?q=test',
        title: 'Human Verification',
        text: ''
      })
    ).toBe(true)
    expect(
      isSearchChallenge({
        url: 'https://www.bing.com/search?q=test',
        title: 'test - Search',
        text: 'Please verify you are a human before continuing.'
      })
    ).toBe(true)
    expect(
      isSearchChallenge({
        url: 'https://www.bing.com/search?q=test',
        title: 'test - Search',
        text: 'Ordinary search results'
      })
    ).toBe(false)
  })

  it('prefers Bing for Chinese queries and DuckDuckGo otherwise', () => {
    expect(orderedSearchEngines('苹果公司最新财报')).toEqual(['bing', 'duckduckgo'])
    expect(orderedSearchEngines('Apple latest earnings')).toEqual(['duckduckgo', 'bing'])
  })

  it('extracts Bing result titles, links, and snippets from the rendered page', () => {
    const window = new Window({ url: 'https://www.bing.com/search?q=test' })
    window.document.body.innerHTML = `
      <ol id="b_results">
        <li class="b_algo">
          <h2><a href="https://example.com/a">Result A</a></h2>
          <div class="b_caption"><p>Summary A</p></div>
        </li>
      </ol>
    `

    expect(extractSearchResults('bing', window.document as unknown as Document)).toEqual([
      { title: 'Result A', url: 'https://example.com/a', snippet: 'Summary A' }
    ])
  })

  it('extracts DuckDuckGo result titles, links, and snippets from the rendered page', () => {
    const window = new Window({ url: 'https://html.duckduckgo.com/html/?q=test' })
    window.document.body.innerHTML = `
      <div class="result">
        <h2 class="result__title">
          <a class="result__a" href="https://example.org/b">Result B</a>
        </h2>
        <a class="result__snippet">Summary B</a>
      </div>
    `

    expect(
      extractSearchResults('duckduckgo', window.document as unknown as Document)
    ).toEqual([{ title: 'Result B', url: 'https://example.org/b', snippet: 'Summary B' }])
  })

  it('provides a self-contained extraction script for Electron web contents', () => {
    const window = new Window({ url: 'https://www.bing.com/search?q=test' })
    window.document.body.innerHTML = `
      <ol id="b_results">
        <li class="b_algo">
          <h2><a href="https://example.net/c">Result C</a></h2>
          <div class="b_caption"><p>Summary C</p></div>
        </li>
      </ol>
    `

    expect(window.eval(searchExtractionScript('bing'))).toEqual([
      { title: 'Result C', url: 'https://example.net/c', snippet: 'Summary C' }
    ])
  })
})

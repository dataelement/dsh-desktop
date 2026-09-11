#!/usr/bin/env node
/**
 * Build dshmarket.com from the published catalog.
 *
 * Data comes from awesome-dsh-plugin, which is the list's home and stays that
 * way: `data/registry-snapshot.json` is its /plugins.json, and
 * `data/readmes-snapshot.json` is its /readmes.json. Both are refreshed by
 * `npm run snapshot`. Nothing here re-probes GitHub — one probe, one copy of
 * the truth, no drift between the two sites.
 *
 * Output is docs/, which is generated in full and git-ignored: a from-scratch
 * build on an empty docs/ produces the complete site.
 *
 * Usage: node scripts/build-site.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import { Marked } from 'marked'
import LOCALES from '../site/locales.mjs'
import COMMENTS from '../site/comments.mjs'

const ORIGIN = 'https://dshmarket.com'
const CATALOG = 'https://awesome-dsh-plugin.com'
const REGISTRY_FILE = 'data/registry-snapshot.json'
const READMES_FILE = 'data/readmes-snapshot.json'
const OUT = 'docs'

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const ldSafe = (s) => s.replaceAll('<', '\\u003c')

// ── advertising ─────────────────────────────────────────────────────────────
// One AdSense head tag, gated behind a build variable. Unset — the default —
// emits nothing at all, so an unconfigured build is byte-identical to an
// ad-free one and no third-party script is requested.
//
// Auto ads decide placement from this tag alone, so there is no slot markup to
// write and no reserved height to get wrong. The publisher id is a `vars`
// entry rather than a secret because it ships in the HTML either way.
const ADSENSE_CLIENT = process.env.ADSENSE_CLIENT || ''
const adHead = () =>
  ADSENSE_CLIENT
    ? `<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${esc(ADSENSE_CLIENT)}" crossorigin="anonymous"></script>\n`
    : ''
// The token sits on its own line in every template, so the match takes the
// newline with it. Otherwise an unconfigured build leaves a blank line behind
// and "identical to an ad-free build" stops being literally true — which is
// the one claim about this feature worth being able to check by diffing.
const AD_HEAD_TOKEN = '__AD_HEAD__\n'

// A missing id here does not fail the build, it ships 1884 pages whose comment
// box silently talks to the wrong repository — so check the shape up front and
// stop, rather than discovering it from a user's report.
if (typeof COMMENTS.enabled !== 'boolean') {
  console.error('site/comments.mjs: `enabled` must be a boolean')
  process.exit(1)
}
if (COMMENTS.enabled) {
  for (const key of ['repo', 'repoId', 'category', 'categoryId']) {
    if (typeof COMMENTS[key] !== 'string' || !COMMENTS[key]) {
      console.error(`site/comments.mjs: \`${key}\` must be a non-empty string when comments are enabled`)
      process.exit(1)
    }
  }
}

if (!fs.existsSync(REGISTRY_FILE)) {
  console.error(`${REGISTRY_FILE} is missing — run \`npm run snapshot\` first`)
  process.exit(1)
}
const registry = JSON.parse(fs.readFileSync(REGISTRY_FILE, 'utf8'))
// Optional: without it, pages still build, they just carry no README body.
// Missing is a warning rather than an error so a catalog outage degrades the
// pages instead of failing the deploy that would have refreshed them.
const readmes = fs.existsSync(READMES_FILE)
  ? JSON.parse(fs.readFileSync(READMES_FILE, 'utf8')).readmes ?? {}
  : (console.warn(`${READMES_FILE} is missing — building without README bodies`), {})

const plugins = registry.plugins ?? []
if (!plugins.length) {
  console.error(`${REGISTRY_FILE} lists no plugins — refusing to build an empty site`)
  process.exit(1)
}
// Category order and names come from the registry too, so a category added
// upstream appears here without a code change on this side.
const CATS = Object.keys(registry.categories ?? {})
const catName = (id, loc) => registry.categories?.[id]?.[loc.code] ?? id

// Slug matches awesome-dsh-plugin's, derived from the same repo path. Keeping
// them identical means /p/<slug>/ on either host is the same plugin — which is
// what makes a cross-domain canonical (or, later, a redirect) a pure host swap
// with nothing to map.
function slugOf(p) {
  const repoPath = p.url.replace('https://github.com/', '')
  const repo = repoPath.split('/').slice(0, 2).join('/')
  const sub = repoPath.includes('/tree/') ? repoPath.split('/tree/')[1].replace(/^[^/]+\//, '') : null
  return sub ? `${repo}--${sub.replaceAll('/', '-')}` : repo
}
for (const p of plugins) {
  p.slug = slugOf(p)
  p.displayName = p.owner ? `${p.owner}/${p.name}` : p.name
}

fs.mkdirSync(OUT, { recursive: true })
for (const f of fs.readdirSync('site/assets')) {
  fs.mkdirSync(`${OUT}/assets`, { recursive: true })
  fs.copyFileSync(`site/assets/${f}`, `${OUT}/assets/${f}`)
}
// ads.txt ships unconditionally, unlike the ad tag above. It is a claim about
// who is allowed to sell this domain's inventory, which stays true whether or
// not a tag is currently live, and AdSense verifies site ownership from it — so
// it has to exist before the review, not after.
for (const f of ['CNAME', 'robots.txt', 'ads.txt']) fs.copyFileSync(`site/${f}`, `${OUT}/${f}`)

// ── README rendering ────────────────────────────────────────────────────────
// Same image policy as the catalog site, for the same reason: a README is
// third-party markdown, and an <img> in it is a request the visitor's browser
// makes to a host we do not control. Restricted to GitHub's own hosting, which
// adds nobody new — these pages are served from GitHub Pages already.
const IMG_HOSTS = new Set([
  'raw.githubusercontent.com',
  'user-images.githubusercontent.com',
  'camo.githubusercontent.com',
  'github.com',
])
const imgAllowed = (href) => {
  if (/^data:/i.test(href)) return true
  try { return IMG_HOSTS.has(new URL(href).hostname) } catch { return false }
}
function renderReadme(rm) {
  const abs = (href, base, allowData = false) => {
    if (!href || /^(https?:|mailto:|#)/i.test(href)) return href
    if (/^data:/i.test(href)) return allowData ? href : '#'
    return base + href.replace(/^\.\//, '').replace(/^\//, '')
  }
  const md = new Marked({
    walkTokens(t) {
      if (t.type === 'heading') t.depth = Math.min(t.depth + 1, 6)
      else if (t.type === 'image') t.href = abs(t.href, rm.base, true)
      else if (t.type === 'link') t.href = abs(t.href, rm.blobBase)
    },
    renderer: {
      html: () => '',
      image({ href, title, text }) {
        if (!href || !imgAllowed(href)) return ''
        const t = title ? ` title="${esc(title)}"` : ''
        return `<img src="${esc(href)}" alt="${esc(text ?? '')}"${t} loading="lazy" decoding="async" referrerpolicy="no-referrer">`
      },
    },
  })
  try {
    let html = md.parse(rm.md.replace(/^\s*# .*\n/, ''))
    // Dropping an image can empty the link that wrapped it and then the
    // paragraph that held the link; loop until nothing more collapses.
    for (let prev = null; prev !== html;) {
      prev = html
      html = html.replace(/<a\b[^>]*>\s*<\/a>/g, '').replace(/<p>\s*<\/p>\s*/g, '')
    }
    return html
  } catch {
    return null
  }
}

// ── shared page furniture ───────────────────────────────────────────────────
const applyStrings = (page, loc) => {
  for (const [k, v] of Object.entries(loc.strings)) page = page.replaceAll(`__T_${k}__`, () => v)
  return page
}
const localeLinks = (loc, pathFor) => LOCALES.filter((l) => l.code !== loc.code)
  .map((l) => `<a href="${pathFor(l)}" hreflang="${l.code}" rel="alternate">${l.label}</a>`).join('\n  ')
const hreflangs = (pathFor) => [
  ...LOCALES.map((l) => `<link rel="alternate" hreflang="${l.code}" href="${ORIGIN}${pathFor(l)}">`),
  `<link rel="alternate" hreflang="x-default" href="${ORIGIN}${pathFor(LOCALES[0])}">`,
].join('\n')
const write = (urlPath, html) => {
  const dir = path.join(OUT, urlPath.replace(/^\//, '').replace(/\/$/, ''))
  fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(path.join(dir, 'index.html'), html)
}

const pluginPath = (loc, slug) => `${loc.urlPath}p/${slug}/`

// ── landing-page catalog ────────────────────────────────────────────────────
// The front door used to be a 1.4 KB marketing page while /browse/ carried the
// whole index; 83% of visits landed on the thin one. This puts a real slice of
// the catalog on it — categories, what people actually install, what shipped
// recently — and leaves /browse/ as the complete flat index it already is.
//
// Only a slice: rendering all 1,700 entries here would just be a second copy
// of /browse/ at half a megabyte.
const POPULAR_N = 48
const SHOTS_N = 12
const FRESH_N = 24
// Our own listing tops the download chart. Ranking ourselves first on our own
// site reads as self-promotion rather than data, so it sits out both grids.
const SELF_URL = 'https://github.com/dsh-market/dsh-market'

const num = (n) => new Intl.NumberFormat('en-US').format(n)
const descOf = (p, loc) => esc(p.description?.[loc.code] ?? p.description?.en ?? '')

const metaRow = (p, loc) => {
  const bits = []
  if (p.stars) bits.push(`<span>★ ${num(p.stars)}</span>`)
  if (p.downloads) bits.push(`<span>${num(p.downloads)}${esc(loc.strings.HOME_WEEK)}</span>`)
  bits.push(`<span class="pc">${esc(catName(p.category, loc))}</span>`)
  return `<div class="pmeta">${bits.join('')}</div>`
}

const textCard = (p, loc) =>
  `    <li class="pcard"><a class="pname" href="${pluginPath(loc, p.slug)}"><span class="owner">${esc(p.owner)}/</span>${esc(p.name)}</a><p>${descOf(p, loc)}</p>${metaRow(p, loc)}</li>`

// Screenshots are third-party URLs from the catalog, so they go through the
// same allowlist the README images do. aspect-ratio reserves the box before
// the image lands, which is why these cards carry no width/height: the source
// dimensions are unknown and vary per plugin.
const shotCard = (p, loc) => {
  const src = (p.screenshots ?? []).find(imgAllowed)
  return `    <li class="scard"><a href="${pluginPath(loc, p.slug)}"><span class="shot"><img src="${esc(src)}" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer"></span><span class="pname"><span class="owner">${esc(p.owner)}/</span>${esc(p.name)}</span></a><p>${descOf(p, loc)}</p>${metaRow(p, loc)}</li>`
}

const homeSection = (id, title, lead, cls, cards) => `<section class="hs" id="${id}">
  <h2>${esc(title)}</h2>
  <p class="lead">${esc(lead)}</p>
  <ul class="${cls}">
${cards.join('\n')}
  </ul>
</section>`

function homeCatalog(loc) {
  const s = loc.strings
  const counts = CATS
    .map((id) => ({ id, name: catName(id, loc), n: plugins.filter((p) => p.category === id).length }))
    .filter((c) => c.n)

  const popular = plugins
    .filter((p) => p.downloads && p.url !== SELF_URL)
    .sort((a, b) => b.downloads - a.downloads)
    .slice(0, POPULAR_N)
  const shots = plugins
    .filter((p) => p.url !== SELF_URL && (p.screenshots ?? []).some(imgAllowed))
    .sort((a, b) => (b.downloads ?? 0) - (a.downloads ?? 0))
    .slice(0, SHOTS_N)
  const fresh = [...plugins]
    .sort((a, b) => String(b.added ?? '').localeCompare(String(a.added ?? '')))
    .slice(0, FRESH_N)

  const out = [
    `<nav class="cats" aria-label="${esc(s.HOME_CATS)}">${counts
      .map((c) => `<a href="${loc.browsePath}#${c.id}">${esc(c.name)}<small>${c.n}</small></a>`)
      .join('')}</nav>`,
  ]
  // Every section is conditional on having rows. `downloads` and `screenshots`
  // are newer catalog fields, and a snapshot that predates either one (or a
  // catalog that stops publishing them) should drop the section rather than
  // render a heading over an empty list.
  if (popular.length) out.push(homeSection('popular', s.HOME_POPULAR, s.HOME_POPULAR_LEAD, 'cards', popular.map((p) => textCard(p, loc))))
  // A gallery only looks like one when every card has an image; 228 of 1,733
  // plugins ship screenshots, so this is its own section rather than a ragged
  // mix inside the grid above.
  if (shots.length) out.push(homeSection('shots', s.HOME_SHOTS, s.HOME_SHOTS_LEAD, 'shots', shots.map((p) => shotCard(p, loc))))
  if (fresh.length) out.push(homeSection('fresh', s.HOME_NEW, s.HOME_NEW_LEAD, 'cards', fresh.map((p) => textCard(p, loc))))
  out.push(`<p class="allmore"><a href="${loc.browsePath}">${esc(s.HOME_ALL.replace('{N}', num(plugins.length)))}</a></p>`)
  return out.join('\n')
}

const homeCss = () => `<style>
/* The base sheet only clears underlines on header/footer links, so every new
   link here has to opt out explicitly. */
.cats a,.pcard a,.scard a,.allmore a{text-decoration:none;color:inherit}
.cats{display:flex;flex-wrap:wrap;gap:.4rem;margin:.6rem 0 0}
.cats a{display:inline-flex;align-items:baseline;gap:.35rem;font-size:.82rem;color:var(--ink2);background:var(--card);border:1px solid var(--line);border-radius:999px;padding:.3rem .8rem}
.cats a:hover{border-color:var(--accent);color:var(--accent)}
.cats small{color:var(--ink3);font-size:.72rem}
.hs{margin-top:2.4rem}
.hs h2{font-size:1.15rem;margin:0}
.hs .lead{color:var(--ink2);font-size:.88rem;margin:.25rem 0 1rem}
ul.cards,ul.shots{list-style:none;padding:0;margin:0;display:grid;gap:.85rem}
ul.cards{grid-template-columns:repeat(auto-fill,minmax(17rem,1fr))}
ul.shots{grid-template-columns:repeat(auto-fill,minmax(20rem,1fr))}
.pcard,.scard{background:var(--card);border:1px solid var(--line);border-radius:10px}
.pcard{padding:.85rem .95rem}
.scard{overflow:hidden}
.pname{font-weight:650;font-size:.92rem}
.pcard a.pname:hover,.scard a:hover .pname{color:var(--accent)}
.owner{color:var(--ink3);font-weight:400}
.pcard p,.scard p{color:var(--ink2);font-size:.84rem;line-height:1.45}
.pcard p{margin:.35rem 0 .5rem}
.scard .shot{display:block;aspect-ratio:16/9;background:var(--bg);overflow:hidden}
.scard .shot img{width:100%;height:100%;object-fit:cover;display:block}
.scard .pname{display:block;padding:.7rem .95rem 0}
.scard p{margin:.3rem 0 .5rem;padding:0 .95rem}
.pmeta{display:flex;flex-wrap:wrap;gap:.5rem;font-size:.75rem;color:var(--ink3)}
.scard .pmeta{padding:0 .95rem .85rem}
.pmeta .pc{color:var(--accent)}
.allmore{margin-top:1.6rem;font-weight:600}
.allmore a{color:var(--accent)}
</style>`

// ── landing + privacy pages (hand-written, copied with the count synced) ────
for (const loc of LOCALES) {
  for (const [src, urlPath] of [[loc.index, loc.urlPath], [loc.privacy, loc.privacyPath]]) {
    if (!fs.existsSync(src)) { console.error(`${src} is missing`); process.exit(1) }
    // The privacy page carries no catalog and no ad — it is the page that
    // describes what the other pages load, so it stays plain. Resolving the
    // tokens to '' there (rather than leaving them unhandled) means a token
    // pasted into it by mistake renders as nothing instead of an ad.
    const landing = src === loc.index
    let page = fs.readFileSync(src, 'utf8')
      .replaceAll('__COUNT__', () => String(plugins.length))
      .replaceAll('__BROWSE__', () => loc.browsePath)
      .replaceAll('__HOME_CSS__', () => (landing ? homeCss() : ''))
      .replaceAll('__HOME_CATALOG__', () => (landing ? homeCatalog(loc) : ''))
      .replaceAll(AD_HEAD_TOKEN, () => (landing ? adHead() : ''))
    page = applyStrings(page, loc)
    if (urlPath === '/') fs.writeFileSync(`${OUT}/index.html`, page)
    else write(urlPath, page)
  }
}

// ── browse index ────────────────────────────────────────────────────────────
for (const loc of LOCALES) {
  const byCat = CATS.map((id) => ({
    id,
    name: catName(id, loc),
    items: plugins.filter((p) => p.category === id).sort((a, b) => (b.stars ?? -1) - (a.stars ?? -1)),
  })).filter((c) => c.items.length)

  const jump = byCat.map((c) => `<a href="#${c.id}">${esc(c.name)}<small>${c.items.length}</small></a>`).join('\n    ')
  const sections = byCat.map((c) => `<section class="cat" id="${c.id}">
  <h2>${esc(c.name)}<small>${c.items.length}</small></h2>
  <ul class="list">
${c.items.map((p) => `    <li><a href="${pluginPath(loc, p.slug)}"><span class="owner">${esc(p.owner)}/</span>${esc(p.name)}</a><p>${esc(p.description?.[loc.code] ?? p.description?.en ?? '')}</p></li>`).join('\n')}
  </ul>
</section>`).join('\n')

  let page = fs.readFileSync('site/browse-template.html', 'utf8')
    .replaceAll('__LANG__', () => loc.htmlLang)
    .replaceAll('__TITLE__', () => esc(loc.BROWSE_TITLE.replaceAll('{N}', plugins.length)))
    .replaceAll('__DESC__', () => esc(loc.BROWSE_DESC.replaceAll('{N}', plugins.length)))
    .replaceAll('__URL__', () => ORIGIN + loc.browsePath)
    .replaceAll('__HREFLANGS__', () => hreflangs((l) => l.browsePath))
    .replaceAll('__OG_IMAGE__', () => `${ORIGIN}/assets/demo-${loc.code}.png`)
    .replaceAll('__HOME__', () => loc.urlPath)
    .replaceAll('__PRIVACY__', () => loc.privacyPath)
    .replaceAll('__LOCALE_LINKS__', () => localeLinks(loc, (l) => l.browsePath))
    .replaceAll('__JUMP__', () => jump)
    .replaceAll('__SECTIONS__', () => sections)
    .replaceAll(AD_HEAD_TOKEN, () => adHead())
  write(loc.browsePath, applyStrings(page, loc))
}

// ── plugin pages ────────────────────────────────────────────────────────────
const pluginMaster = fs.readFileSync('site/plugin-template.html', 'utf8')
let readmeCount = 0
let mismatchCount = 0
for (const loc of LOCALES) {
  for (const p of plugins) {
    const url = ORIGIN + pluginPath(loc, p.slug)
    const desc = p.description?.[loc.code] ?? p.description?.en ?? ''
    const metaDesc = desc.length > 155 ? desc.slice(0, 152).trimEnd() + '…' : desc

    const facts = [
      p.stars != null ? `<span>${loc.strings.P_STARS} <b>★ ${p.stars}</b></span>` : '',
      `<span>${loc.strings.P_CAT} <b>${esc(catName(p.category, loc))}</b></span>`,
      p.added ? `<span>${loc.strings.P_ADDED} <b>${esc(p.added)}</b></span>` : '',
      p.npm ? `<span>${loc.strings.P_NPM} <b>${esc(p.npm)}</b></span>` : '',
    ].filter(Boolean).join('\n    ')

    const cmd = (c, note) => `<p class="note">${note}</p>
      <div class="cmd"><pre>${esc(c)}</pre><button type="button" data-cmd="${esc(c)}" data-copied="${esc(loc.strings.COPIED)}">${esc(loc.strings.COPY)}</button></div>`
    const install = [
      cmd('dsh plugin --profile web add dshmarket', loc.strings.P_INSTALL_MARKET),
      cmd(p.install, loc.strings.P_INSTALL_CLI),
    ].join('\n      ')

    const shots = (p.screenshots ?? []).filter((s) => imgAllowed(s))
    const shotSection = shots.length ? `<section class="panel">
      <h2>${loc.strings.P_SHOTS}</h2>
      <div class="shots">
${shots.map((s) => `        <img src="${esc(s)}" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer">`).join('\n')}
      </div>
    </section>` : ''

    const links = [
      `<p><a href="${esc(p.url)}" rel="noopener">${loc.strings.P_GH}</a></p>`,
      p.npm ? `<p><a href="https://www.npmjs.com/package/${esc(p.npm)}" rel="noopener">${loc.strings.P_NPM_LINK}</a></p>` : '',
      `<p><a href="${CATALOG}${loc.urlPath}p/${p.slug}/" rel="noopener">${loc.strings.P_CATALOG}</a></p>`,
    ].filter(Boolean).join('\n      ')

    // Cut the sidebar blurbs at a word rather than mid-token: "cloudflared
    // tunne" reads as a broken page, not as a shortened sentence. CJK has no
    // spaces, so there the hard cut stands and an ellipsis carries the meaning.
    const blurb = (s, n = 90) => {
      if (s.length <= n) return s
      const head = s.slice(0, n)
      const sp = head.lastIndexOf(' ')
      return (sp > n * 0.6 ? head.slice(0, sp) : head).trimEnd() + '…'
    }
    const related = plugins
      .filter((r) => r.category === p.category && r.url !== p.url)
      .sort((a, b) => (b.stars ?? -1) - (a.stars ?? -1))
      .slice(0, 6)
    const relSection = related.length ? `<section class="panel">
      <h2>${loc.strings.P_RELATED}</h2>
      <ul class="rel">
${related.map((r) => `        <li><a href="${pluginPath(loc, r.slug)}">${esc(r.displayName)}</a><p>${esc(blurb(r.description?.[loc.code] ?? r.description?.en ?? ''))}</p></li>`).join('\n')}
      </ul>
    </section>` : ''

    // README: prefer this page's language, fall back to whatever exists, and
    // mark the block with its real lang when they differ. A page that claims
    // lang="en" around Chinese prose misinforms every consumer that reads it.
    const entry = readmes[p.url]
    let rm = null
    let rmLang = null
    if (entry) {
      for (const code of [loc.code, ...LOCALES.map((l) => l.code)]) {
        if (entry[code]) { rm = entry[code]; rmLang = code; break }
      }
    }
    const readmeHtml = rm ? renderReadme(rm) : null
    const mismatch = rm != null && rmLang !== loc.code
    if (readmeHtml) readmeCount++
    if (mismatch) mismatchCount++
    const rmLocale = LOCALES.find((l) => l.code === rmLang)
    const readmeSection = readmeHtml ? `<section class="panel">
      <h2>${loc.strings.P_README}</h2>${mismatch ? `\n      <p class="note">${esc(loc.strings.P_README_ONLY.replace('{LANG}', loc.langNames[rmLang] ?? rmLang))}</p>` : ''}
      <div class="md" lang="${rmLocale?.htmlLang ?? loc.htmlLang}">
${readmeHtml}
      </div>
      <p class="note"><a href="${esc(rm.htmlUrl)}" rel="noopener">${loc.strings.P_README_SRC}</a></p>
    </section>` : ''

    // `mapping: specific` with the shared slug is what makes this page, the
    // catalog's page and the market's drawer land on one discussion instead of
    // three. `strict` hashes the term, so a slug that merely contains another
    // cannot collide with it.
    const commentsId = `comments-${p.slug.replace(/[^a-z0-9-]/gi, '-')}`
    const commentsConfig = {
      repo: COMMENTS.repo,
      repoId: COMMENTS.repoId,
      category: COMMENTS.category,
      categoryId: COMMENTS.categoryId,
      term: `plugin:${p.slug}`,
      lang: loc.giscusLang,
    }
    const commentsSection = COMMENTS.enabled ? `<section class="panel" aria-labelledby="${commentsId}-title">
      <h2 id="${commentsId}-title">${loc.strings.P_COMMENTS}</h2>
      <p class="note">${loc.strings.P_COMMENTS_NOTE}</p>
      <p class="comments-status" role="status" aria-live="polite"></p>
      <div class="comments-mount giscus" id="${commentsId}-mount" data-comments="${esc(JSON.stringify(commentsConfig))}" data-loading="${esc(loc.strings.P_COMMENTS_LOADING)}" data-ready="${esc(loc.strings.P_COMMENTS_READY)}" data-error="${esc(loc.strings.P_COMMENTS_ERROR)}" data-retry="${esc(loc.strings.P_COMMENTS_RETRY)}"></div>
      <noscript><p class="note"><a href="https://github.com/${COMMENTS.repo}/discussions" rel="noopener">${loc.strings.P_COMMENTS_FALLBACK}</a></p></noscript>
    </section>` : ''

    const jsonld = JSON.stringify([{
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      name: p.displayName,
      url,
      description: desc,
      applicationCategory: 'DeveloperApplication',
      operatingSystem: 'DeepSeek Harness',
      offers: { '@type': 'Offer', price: 0, priceCurrency: 'USD' },
      sameAs: [p.url, p.npm ? `https://www.npmjs.com/package/${p.npm}` : null].filter(Boolean),
    }, {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: loc.strings.CRUMB_HOME, item: ORIGIN + loc.urlPath },
        { '@type': 'ListItem', position: 2, name: loc.strings.CRUMB_BROWSE, item: ORIGIN + loc.browsePath },
        { '@type': 'ListItem', position: 3, name: p.displayName, item: url },
      ],
    }])

    let page = pluginMaster
      .replaceAll('__P_README_SECTION__', () => readmeSection)
      .replaceAll('__P_COMMENTS__', () => commentsSection)
      .replaceAll('__LANG__', () => loc.htmlLang)
      .replaceAll('__TITLE__', () => esc(loc.P_TITLE.replace('{NAME}', p.displayName)))
      .replaceAll('__DESC__', () => esc(metaDesc))
      .replaceAll('__URL__', () => url)
      .replaceAll('__HREFLANGS__', () => hreflangs((l) => pluginPath(l, p.slug)))
      .replaceAll('__OG_IMAGE__', () => `${ORIGIN}/assets/demo-${loc.code}.png`)
      .replaceAll('__JSONLD__', () => ldSafe(jsonld))
      .replaceAll('__HOME__', () => loc.urlPath)
      .replaceAll('__BROWSE__', () => loc.browsePath)
      .replaceAll('__PRIVACY__', () => loc.privacyPath)
      .replaceAll('__LOCALE_LINKS__', () => localeLinks(loc, (l) => pluginPath(l, p.slug)))
      .replaceAll('__P_SHORT__', () => esc(p.name))
      .replaceAll('__P_H1__', () => `<span class="owner">${esc(p.owner)}/</span>${esc(p.name)}`)
      .replaceAll('__P_DESC__', () => esc(desc))
      .replaceAll('__P_FACTS__', () => facts)
      .replaceAll('__P_INSTALL__', () => install)
      .replaceAll('__P_SHOTS__', () => shotSection)
      .replaceAll('__P_LINKS__', () => links)
      .replaceAll('__P_RELATED__', () => relSection)
      .replaceAll(AD_HEAD_TOKEN, () => adHead())
    write(pluginPath(loc, p.slug), applyStrings(page, loc))
  }
}

// ── sitemap ─────────────────────────────────────────────────────────────────
// lastmod is the date the underlying data last changed, not the date this file
// was written: a lastmod that moves nightly without the page changing teaches a
// crawler to stop believing every lastmod on the site.
const alt = (pathFor) => [
  ...LOCALES.map((l) => `      <xhtml:link rel="alternate" hreflang="${l.code}" href="${ORIGIN}${pathFor(l)}"/>`),
  `      <xhtml:link rel="alternate" hreflang="x-default" href="${ORIGIN}${pathFor(LOCALES[0])}"/>`,
].join('\n')
const urlEntry = (pathFor, lastmod, freq) => LOCALES.map((l) => `  <url>
    <loc>${ORIGIN}${pathFor(l)}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${freq}</changefreq>
${alt(pathFor)}
  </url>`).join('\n')

const updated = registry.updated ?? new Date().toISOString().slice(0, 10)
fs.writeFileSync(`${OUT}/sitemap.xml`, `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urlEntry((l) => l.urlPath, updated, 'weekly')}
${urlEntry((l) => l.browsePath, updated, 'daily')}
${plugins.map((p) => urlEntry((l) => pluginPath(l, p.slug), p.added ?? updated, 'weekly')).join('\n')}
${urlEntry((l) => l.privacyPath, updated, 'yearly')}
</urlset>
`)

const pages = plugins.length * LOCALES.length + LOCALES.length * 3
console.log(`site built: ${plugins.length} plugins × ${LOCALES.length} locales = ${pages} pages`)
console.log(`  README bodies rendered: ${readmeCount} (${mismatchCount} in a fallback language)`)

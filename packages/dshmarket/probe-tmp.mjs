import { chromium } from 'playwright'
const BLACKHOLE = /(github\.com|githubusercontent\.com|weserv\.nl|awesome-dsh-plugin\.com)/
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1231, height: 768 } })
// Hang, don't fail: an unreachable host on a censored path stalls until
// timeout, which is the condition the report describes.
let stalled = 0
await page.route('**/*', async (route) => {
  if (BLACKHOLE.test(route.request().url())) { stalled += 1; return }  // never fulfil
  await route.continue()
})
const t0 = Date.now()
await page.goto('http://127.0.0.1:3000', { waitUntil: 'domcontentloaded', timeout: 60000 })
const domReady = Date.now() - t0
const passes = /^(Continue|继续|Configure later|稍后配置)$/
for (let r = 0; r < 6; r++) {
  const b = page.getByRole('button', { name: passes }).first()
  try { await b.waitFor({ timeout: r === 0 ? 30000 : 2500 }); await b.click() } catch { break }
}
const t1 = Date.now()
await page.getByRole('button', { name: /^(设置|Settings)$/ }).first().click({ timeout: 30000 })
const settingsMs = Date.now() - t1
// Is the main thread responsive while all those requests hang?
const t2 = Date.now()
await page.evaluate(() => new Promise(r => requestAnimationFrame(() => r(null))))
const rafMs = Date.now() - t2
console.log(JSON.stringify({ domReady, settingsMs, rafMs, stalledRequests: stalled }))
await browser.close()

import { expect, it } from 'vitest'
import { readFile } from 'node:fs/promises'

const PRIMITIVES = 'node_modules/@deepseek-ai/dsh-client-ui-primitives/lib/index.js'
/**
 * The desktop UI bundles that render a brand mark. The onboarding bundle this
 * list used to carry no longer ships, so the list follows the tree.
 */
const UI_SEATS = ['packages/dsh-desktop-client-ui/client.js']

/**
 * The geometry Harness itself renders, read from the primitive the UI imports.
 * @returns the official silhouette path and its viewBox.
 */
async function officialGeometry(): Promise<{ path: string; viewBox: string }> {
  const source = await readFile(PRIMITIVES, 'utf8')
  const path = /const FISH_LOGO_PATH = "([^"]+)"/u.exec(source)?.[1]
  const box = /const FISH_LOGO_VIEWBOX = \{[\s\S]*?width:\s*([\d.]+),\s*height:\s*([\d.]+)/u.exec(source)
  expect(path, 'FISH_LOGO_PATH').toBeDefined()
  expect(box, 'FISH_LOGO_VIEWBOX').not.toBeNull()
  return { path: path as string, viewBox: `0 0 ${box?.[1]} ${box?.[2]}` }
}

it('draws the splash mark from the same geometry the UI renders', async () => {
  const [svg, official] = await Promise.all([readFile('build/brand-mark.svg', 'utf8'), officialGeometry()])
  expect(/\sd="([^"]+)"/u.exec(svg)?.[1]).toBe(official.path)
  expect(svg).toContain(`viewBox="${official.viewBox}"`)
})

it('leaves no copy of the retired window mark in the desktop UI', async () => {
  for (const file of UI_SEATS) {
    const source = await readFile(file, 'utf8')
    // The retired DSH Desktop mark was a whale drawn as a window with a tail;
    // its path data began here. The seat renders the shared primitive instead
    // of a private copy.
    expect(source, file).not.toContain('M478.318')
    expect(source, file).not.toContain('BRAND_MARK_PATH')
    expect(source, file).toContain('FishLogo')
    // Sized by the width the retired mark occupied in that seat, not by its
    // height: the whale is a narrower silhouette, so height-matching shrank it.
    expect(source, file).toContain('BRAND_MARK_WIDTH')
    expect(source, file).toMatch(/FishLogo, \{ size: [^}]*BRAND_MARK_WIDTH[^}]*\}/u)
  }
})

it('keeps the sidebar brand seat registered against the desktop mark', async () => {
  const source = await readFile('packages/dsh-desktop-client-ui/client.js', 'utf8')
  expect(source).toContain("'sidebar.brand.mark' }, DesktopBrandMark")
  expect(source).toContain("'sidebar.brand.name' }, DesktopBrandName")
})

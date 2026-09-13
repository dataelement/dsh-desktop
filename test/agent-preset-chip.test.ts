import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { patchPath, projectRoot } from './patch-path'

const agentPresetClient = path.join(
  projectRoot,
  'node_modules',
  '@deepseek-ai',
  'dsh-client-ui-agent-preset',
  'lib',
  'client.js'
)

const SEAT_SELECTED = 'border:1px solid var(--dsw-alias-state-business-primary)'
const SEAT_LABEL = 'color:var(--dsw-alias-label-primary)'

/* cSpell:ignore MYBq */

/** Parse a `#rrggbb` or `#rrggbbaa` literal into channels plus alpha. */
function color(literal: string): { rgb: [number, number, number]; alpha: number } {
  const hex = literal.replace('#', '')
  const channel = (offset: number) => Number.parseInt(hex.slice(offset, offset + 2), 16)
  return {
    rgb: [channel(0), channel(2), channel(4)],
    alpha: hex.length === 8 ? channel(6) / 255 : 1
  }
}

/** WCAG relative luminance. */
function luminance([r, g, b]: [number, number, number]): number {
  const linear = [r, g, b].map((value) => {
    const channel = value / 255
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * linear[0]! + 0.7152 * linear[1]! + 0.0722 * linear[2]!
}

/** WCAG contrast ratio between two opaque colours. */
function contrast(left: [number, number, number], right: [number, number, number]): number {
  const [high, low] = [luminance(left), luminance(right)].sort((a, b) => b - a)
  return (high! + 0.05) / (low! + 0.05)
}

/** Composite a translucent colour over an opaque surface. */
function over(
  foreground: { rgb: [number, number, number]; alpha: number },
  surface: [number, number, number]
): [number, number, number] {
  return foreground.rgb.map((value, index) =>
    Math.round(value * foreground.alpha + surface[index]! * (1 - foreground.alpha))
  ) as [number, number, number]
}

/** Read one declaration out of a CSS rule body. */
function declaration(body: string, property: string): string {
  const match = body.match(new RegExp(`(?:^|;)${property}:([^;]+)`, 'u'))
  if (match?.[1] === undefined) throw new Error(`no ${property} in rule: ${body}`)
  return match[1]
}

/**
 * Menu surfaces the footer row floats over: white and the near-white light-theme
 * menu, and the dark-theme menu surface the app actually paints.
 */
const LIGHT_SURFACE: [number, number, number] = [255, 255, 255]
const LIGHT_MENU: [number, number, number] = [230, 230, 230]
const DARK_MENU: [number, number, number] = [30, 33, 45]


/**
 * The new-session agent-preset chip sits beside the composer's mode chips. It
 * reads as the session's current mode, so its label is the standard theme text
 * colour in both colour modes and the accent is carried by a 1px border ring
 * instead of by coloured type.
 */
describe('DSH Desktop agent-preset chip', () => {
  it('paints the seat label with the theme text colour and rings it with the accent border', async () => {
    const client = await readFile(agentPresetClient, 'utf8')
    const seat = client.match(/\.[A-Za-z0-9_-]+_seat\{[^}]*\}/u)?.[0]

    expect(seat).toBeDefined()
    expect(seat).toContain(SEAT_LABEL)
    expect(seat).toContain(SEAT_SELECTED)
    expect(seat).not.toContain('border:none')
    // A 1px ring is paid for out of the old horizontal padding so the chip's
    // width and its alignment with the neighbouring chips do not move.
    expect(seat).toContain('padding:0 7px')
    expect(seat).not.toContain('padding:0 8px')
  })

  it('keeps the ring on the trigger only, never on the popup rows', async () => {
    const client = await readFile(agentPresetClient, 'utf8')

    expect(client).toContain('.YgMYBq_item{box-sizing:border-box')
    expect(client).toContain('.YgMYBq_selectedItem{background:#4d6bfe12}')
  })

  it('carries the ring in the reproducible dependency patch', async () => {
    const patch = await readFile(patchPath('@deepseek-ai/dsh-client-ui-agent-preset'), 'utf8')

    expect(patch).toContain(SEAT_SELECTED)
    expect(patch).toContain(`${SEAT_LABEL};white-space:nowrap`)
    expect(patch).toContain('padding:0 7px')
  })
})

/**
 * The preset menu's "Browse Awesome Presets…" footer is the one row in that
 * menu painted in accent blue. It shipped a fixed dark-mode-blind blue
 * (`#3154df`) over a translucent accent tint, which measured 2.64:1 on the
 * dark-theme menu — visibly wrong blue-on-dark, and far under the 4.5:1 floor
 * for body text. The row now takes a blue per colour mode.
 */
describe('DSH Desktop preset menu footer contrast', () => {
  /** The rule bodies the footer row paints with: base and hover in both modes. */
  async function footerRules(): Promise<{ base: string; hover: string; dark: string; darkHover: string }> {
    const client = await readFile(agentPresetClient, 'utf8')

    /**
     * Read the body of the first rule for one selector. The reduced-motion block
     * restates `.YgMYBq_awesome` with `transition:none` and no colour, so the
     * painted base rule is the one that declares a transition duration.
     */
    const body = (selector: string, painted = false): string => {
      for (let at = client.indexOf(`${selector}{`); at >= 0; at = client.indexOf(`${selector}{`, at + 1)) {
        const open = at + selector.length + 1
        const close = client.indexOf('}', open)
        if (close < 0) throw new Error(`unterminated ${selector} rule`)
        const found = client.slice(open, close)
        if (painted && found === 'transition:none') continue
        return found
      }
      throw new Error(`no ${selector} rule in the bundle`)
    }

    return {
      base: body('.YgMYBq_awesome', true),
      hover: body('.YgMYBq_awesome:hover'),
      dark: body('body[data-ds-dark-theme] .YgMYBq_awesome'),
      darkHover: body('body[data-ds-dark-theme] .YgMYBq_awesome:hover')
    }
  }

  it('no longer ships the dark-mode-blind hardcoded blue on that row', async () => {
    const rules = await footerRules()

    for (const body of Object.values(rules)) {
      expect(body).not.toContain('#3154df')
    }
    // The old rule was fixed dark; its replacement has to differ per mode.
    expect(rules.base).not.toBe(rules.dark)
  })

  it('clears AA contrast on the dark-theme menu surface', async () => {
    const rules = await footerRules()

    const text = color(declaration(rules.dark, 'color'))
    const background = color(declaration(rules.dark, 'background'))

    expect(contrast(text.rgb, over(background, DARK_MENU))).toBeGreaterThanOrEqual(4.5)
    // The old value is kept as an explicit floor, not just a passing number.
    expect(contrast(color('#3154df').rgb, DARK_MENU)).toBeLessThan(3)
    // Hover has to read as a change of the row, not of its text colour.
    expect(luminance(over(color(declaration(rules.darkHover, 'background')), DARK_MENU))).toBeGreaterThan(
      luminance(over(background, DARK_MENU))
    )
  })

  it('clears AA contrast on the light-theme menu surfaces', async () => {
    const rules = await footerRules()

    const text = color(declaration(rules.base, 'color'))
    const background = color(declaration(rules.base, 'background'))

    for (const surface of [LIGHT_SURFACE, LIGHT_MENU]) {
      expect(contrast(text.rgb, over(background, surface))).toBeGreaterThanOrEqual(4.5)
    }
  })

  it('selects the blue from the theme attribute the app actually sets', async () => {
    const client = await readFile(agentPresetClient, 'utf8')

    // The app never declares `color-scheme`, so `light-dark()` would silently
    // resolve to its light branch in the dark theme.
    expect(client).toContain('body[data-ds-dark-theme] .YgMYBq_awesome{color:')
    expect(client).not.toContain('light-dark(')
  })

  it('carries the per-mode blues in the reproducible dependency patch', async () => {
    const patch = await readFile(patchPath('@deepseek-ai/dsh-client-ui-agent-preset'), 'utf8')

    expect(patch).toContain('body[data-ds-dark-theme] .YgMYBq_awesome{color:#679efe')
    expect(patch).toContain('.YgMYBq_awesome{box-sizing:border-box;width:336px;color:#3a58c4')
    expect(patch).not.toContain('#3154df')
  })
})

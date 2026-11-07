import { evaluate, waitFor } from './chrome.mjs'

const DEGREE = /\b(1st|2nd|3rd\+?)\b/

/** Parse one search-result card into the fields identity review needs. */
export function parseSearchCard({ href, text }) {
  const [head = '', ...restParts] = String(text).split(' • ')
  const rest = restParts.join(' • ')
  const degree = DEGREE.exec(rest)?.[1] ?? null
  const mutual = /(\d+)\s+(?:other\s+)?mutual connections?/i.exec(rest)?.[1]
  const headline = rest
    .replace(DEGREE, '')
    .replace(/\bConnect\b.*$/, '')
    .replace(/(\d+)\s+(?:other\s+)?mutual connections?.*$/i, '')
    .replace(/Levi S\. Lian.*$/i, '')
    .trim()
  return {
    href,
    name: head.replace(/\s*•.*$/, '').trim(),
    headline,
    degree: degree === '1st' ? 1 : degree === '2nd' ? 2 : degree ? 3 : null,
    mutual: mutual ? Number(mutual) : 0
  }
}

export async function searchPeople(cdp, sessionId, name) {
  const url = 'https://www.linkedin.com/search/results/people/?keywords=' + encodeURIComponent(name)
  await cdp.send('Page.navigate', { url }, sessionId)
  await waitFor(cdp, sessionId, 'document.querySelector(\'a[href*="/in/"]\') !== null', 25_000)
  const cards = await evaluate(
    cdp,
    sessionId,
    `(() => {
      const seen = new Set(); const rows = [];
      // The result card is not always an <li>; walk up to the nearest container that
      // holds exactly one profile link, otherwise siblings inherit the first card's text.
      const card = (a) => {
        let el = a;
        for (let i = 0; i < 6 && el; i++) {
          el = el.parentElement;
          if (!el) break;
          const links = el.querySelectorAll('a[href*="/in/"]');
          if (links.length === 1 && (el.innerText ?? '').includes('•')) return el;
        }
        return a.parentElement;
      };
      for (const a of document.querySelectorAll('a[href*="/in/"]')) {
        const href = a.href.split('?')[0];
        if (seen.has(href)) continue;
        const text = (card(a)?.innerText ?? '').replace(/\\s+/g, ' ').trim();
        if (!text.includes('•')) continue;
        seen.add(href); rows.push({ href, text });
        if (rows.length >= 8) break;
      }
      return rows;
    })()`
  )
  return (cards ?? []).map(parseSearchCard)
}

export async function readProfile(cdp, sessionId, url) {
  await cdp.send('Page.navigate', { url }, sessionId)
  await waitFor(cdp, sessionId, 'document.querySelector("main") !== null', 25_000)
  return evaluate(
    cdp,
    sessionId,
    `(() => {
      const main = document.querySelector('main');
      const text = (main?.innerText ?? '').replace(/\\s+/g, ' ');
      const controls = [...main.querySelectorAll('button, a, [role="button"]')]
        .map((el) => (el.getAttribute('aria-label') ?? el.innerText ?? '').replace(/\\s+/g, ' ').trim())
        .filter(Boolean);
      const name = document.querySelector('h1')?.innerText?.trim() ?? '';
      const degree = (text.match(/·\\s*(1st|2nd|3rd\\+?)/) ?? [])[1] ?? null;
      return {
        name,
        text: text.slice(0, 1200),
        degree,
        hasConnect: controls.some((b) => /^Connect$/i.test(b) || /^Connect to /i.test(b)),
        hasPending: controls.some((b) => /^Pending$/i.test(b)),
        hasMessage: controls.some((b) => /^Message$/i.test(b))
      };
    })()`
  )
}

/** Click the top-level Connect control, then confirm the no-note dialog. */
export async function sendInvite(cdp, sessionId) {
  const clicked = await evaluate(
    cdp,
    sessionId,
    `(() => {
      const target = [...document.querySelectorAll('main button, main a, main [role="button"]')]
        .find((el) => /^Connect/i.test((el.getAttribute('aria-label') ?? el.innerText ?? '').trim()));
      if (!target) return false;
      target.click();
      return true;
    })()`
  )
  if (!clicked) throw new Error('no Connect control on profile')

  await waitFor(
    cdp,
    sessionId,
    `(() => [...document.querySelectorAll('button')].some((b) => /Send without a note/i.test(b.innerText)))()`,
    15_000
  )
  await evaluate(
    cdp,
    sessionId,
    `(() => {
      const b = [...document.querySelectorAll('button')].find((x) => /Send without a note/i.test(x.innerText));
      if (!b) return false;
      b.click();
      return true;
    })()`
  )
  return waitFor(
    cdp,
    sessionId,
    `(() => [...document.querySelectorAll('main button, main a, main [role="button"]')].some((el) => /^Pending/i.test((el.getAttribute('aria-label') ?? el.innerText ?? '').trim())))()`,
    15_000
  )
}

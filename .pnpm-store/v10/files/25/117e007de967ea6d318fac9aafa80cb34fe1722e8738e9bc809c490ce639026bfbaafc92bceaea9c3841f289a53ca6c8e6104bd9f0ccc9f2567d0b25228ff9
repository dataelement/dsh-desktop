/**
 * The comment thread for one plugin, rendered inside the market.
 *
 * Opening this is the request to read the comments, so it loads on open —
 * there is no second click to confirm what the first one already said. What
 * the reader does have to be told, once and plainly, is that reading here
 * contacts giscus.app and GitHub: nothing else in the market talks to a third
 * party at the reader's request, and a comment box that quietly opens that
 * connection would be a surprise, not a feature.
 *
 * The thread itself lives in GitHub Discussions, keyed on the same
 * `plugin:<slug>` term the two websites use — see comments.ts.
 */

import { useEffect, useRef, useState } from 'react'
import { Button, Modal } from '@deepseek-ai/dsh-client-ui-primitives'
import css from './Market.module.css'
import { GISCUS, commentsDiscussionUrl, commentsTerm, giscusLang } from './comments.ts'

/**
 * Whether the host is currently showing a dark theme.
 *
 * Read off the rendered page rather than from `prefers-color-scheme`: the host
 * lets the reader pick a theme (including custom ones) independently of the
 * OS, and a light comment box dropped into a dark window is the kind of seam
 * that makes an embed look bolted on.
 */
function hostIsDark(): boolean {
  if (typeof window === 'undefined') return false
  const bg = getComputedStyle(document.body).backgroundColor
  const m = /rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)/.exec(bg)
  if (!m) return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false
  const [r, g, b] = [Number(m[1]), Number(m[2]), Number(m[3])]
  return (0.299 * r + 0.587 * g + 0.114 * b) < 128
}

export function CommentsModal(props: {
  name: string
  url: string
  lang: string
  onClose: () => void
  t: (k: string) => string
}) {
  const { name, url, lang, onClose, t } = props
  const mount = useRef<HTMLDivElement | null>(null)
  const [state, setState] = useState<'loading' | 'ready' | 'failed'>('loading')
  // Bumping this re-runs the effect, which is what "retry" means here.
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const host = mount.current
    if (host === null) return
    host.replaceChildren()
    setState('loading')

    const script = document.createElement('script')
    script.src = 'https://giscus.app/client.js'
    script.async = true
    script.crossOrigin = 'anonymous'
    Object.assign(script.dataset, {
      repo: GISCUS.repo,
      repoId: GISCUS.repoId,
      category: GISCUS.category,
      categoryId: GISCUS.categoryId,
      mapping: 'specific',
      term: commentsTerm(url),
      // `strict` hashes the term, so `owner/repo` cannot collide with a
      // `owner/repo--sub` entry from the same repository.
      strict: '1',
      reactionsEnabled: '1',
      emitMetadata: '0',
      inputPosition: 'bottom',
      theme: hostIsDark() ? 'dark' : 'light',
      lang: giscusLang(lang),
      loading: 'lazy',
    })
    script.onload = () => setState('ready')
    script.onerror = () => { script.remove(); setState('failed') }
    host.append(script)

    return () => { host.replaceChildren() }
  }, [url, lang, attempt])

  return (
    <Modal
      open
      onClose={onClose}
      title={t('commentsTitle') + ' — ' + name}
    >
      <p className={css.commentsNote}>{t('commentsNote')}</p>
      <div className={css.commentsGithubPrompt}>
        <p className={css.commentsGithubHint}>{t('commentsLoginHint')}</p>
        <a
          className={css.commentsGithubAction}
          href={commentsDiscussionUrl(url)}
          target="_blank"
          rel="noreferrer"
        >
          {t('commentsOnGitHub')}
        </a>
      </div>
      {state === 'failed'
        ? (
            <div className={css.commentsFail}>
              <p className={css.commentsError}>{t('commentsError')}</p>
              <Button variant="outline" size="sm" onClick={() => setAttempt(n => n + 1)}>
                {t('commentsRetry')}
              </Button>
            </div>
          )
        : (
            <p className={css.commentsStatus} role="status" aria-live="polite">
              {state === 'loading' ? t('commentsLoading') : ''}
            </p>
          )}
      <div ref={mount} className={css.commentsMount} aria-busy={state === 'loading'} />
    </Modal>
  )
}

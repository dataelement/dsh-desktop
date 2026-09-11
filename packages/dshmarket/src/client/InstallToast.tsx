/**
 * Post-reload confirmation via the official Toast primitive: shown once after
 * the refresh that follows a hot install or theme switch, so the user lands
 * back in their flow with visible proof.
 */
import { useState } from 'react'
import { IconSparkle16, Toast } from '@deepseek-ai/dsh-client-ui-primitives'
import { readSession } from './market-data.ts'
import type { Translate } from './market-data.ts'

export function InstallToast(props: { t: Translate }) {
  const t = props.t
  const [mode] = useState(() => {
    const value = sessionStorage.getItem('dshm-toast-mode')
    sessionStorage.removeItem('dshm-toast-mode')
    return value
  })
  const [names, setNames] = useState<string[]>(() => {
    const value = readSession('dshm-toast')
    sessionStorage.removeItem('dshm-toast')
    return Array.isArray(value) ? value : []
  })
  if (names.length === 0) return null
  return (
    <Toast
      text={names.join(', ') + ' ' + t(mode === 'theme' ? 'toastTheme' : 'toastReady')}
      icon={<IconSparkle16 size={14} />}
      onDone={() => setNames([])}
    />
  )
}

/**
 * Diagnostics sub-panel — issue #98 phase 3 (snapshots & rollback).
 *
 * Rendered at the bottom of the Diagnostics tab inside a collapsible section
 * (the parent keeps it mounted and passes `open`, so it lazy-loads on first
 * expand and keeps its state across collapses). Lists profile snapshots
 * (GET /dsh-market/snapshots), creates one (POST /dsh-market/snapshots) and
 * restores one after an inline double confirmation
 * (POST /dsh-market/restore-snapshot {snapshot}).
 *
 * The list payload is read defensively (bare array or {snapshots: [...]});
 * `files` entries are {path, json|lines} objects, from which only `path` is
 * displayed.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { Button } from '@deepseek-ai/dsh-client-ui-primitives'
import css from './Market.module.css'
import { api } from './market-data.ts'
import type { Translate } from './market-data.ts'

/** One snapshot from GET /dsh-market/snapshots. */
export interface Snapshot {
  id: string
  createdAt: string | number
  files: string[]
}

interface SnapshotPanelProps {
  t: Translate
  /** True while the parent collapsible section is expanded (lazy-load gate). */
  open: boolean
  /** Re-fetch the check report after a successful restore. */
  onRefresh: () => void
}

interface JsonBody { ok?: unknown; error?: unknown }

async function postJson(url: string, body: unknown): Promise<{ status: number; body: JsonBody | null }> {
  let res: Response
  try {
    res = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
  } catch {
    return { status: 0, body: null }
  }
  let payload: JsonBody | null = null
  try { payload = (await res.json()) as JsonBody } catch { /* non-JSON body */ }
  return { status: res.status, body: payload }
}

/** Snapshot file entries may be plain names or {path, json|lines} objects. */
function fileNames(files: unknown): string[] {
  if (!Array.isArray(files)) return []
  const names: string[] = []
  for (const file of files) {
    if (typeof file === 'string') {
      names.push(file)
    } else if (file !== null && typeof file === 'object') {
      const path = (file as Record<string, unknown>).path
      if (typeof path === 'string') names.push(path)
    }
  }
  return names
}

function snapshotOf(value: unknown): Snapshot | null {
  if (value === null || typeof value !== 'object') return null
  const item = value as Record<string, unknown>
  if (typeof item.id !== 'string' && typeof item.id !== 'number') return null
  return {
    id: String(item.id),
    createdAt: typeof item.createdAt === 'string' || typeof item.createdAt === 'number' ? item.createdAt : 0,
    files: fileNames(item.files),
  }
}

function formatTime(value: string | number): string {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString()
}

export function SnapshotPanel(props: SnapshotPanelProps) {
  const { t, open, onRefresh } = props
  const [snapshots, setSnapshots] = useState<Snapshot[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  /** Snapshot id awaiting the second confirm click (restore), or null. */
  const [confirmId, setConfirmId] = useState<string | null>(null)
  /** Snapshot id awaiting the second confirm click (delete), or null. */
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const loaded = useRef(false)

  const load = useCallback(() => {
    fetch(api('/dsh-market/snapshots'), { cache: 'no-store' })
      .then(res => res.json())
      .then(body => {
        const list: unknown[] = Array.isArray(body) ? body : Array.isArray(body.snapshots) ? body.snapshots : []
        setSnapshots(list.map(snapshotOf).filter((snap): snap is Snapshot => snap !== null))
        setError(null)
        // Mark loaded only on success so a transient failure retries on the
        // next expand (review M3).
        loaded.current = true
      })
      .catch(() => setError(t('snapListFail') + 'network'))
  }, [t])

  useEffect(() => {
    if (open && !loaded.current) {
      load()
    }
  }, [open, load])

  const create = useCallback(() => {
    if (busy !== null) return
    setBusy('create')
    setMsg(null)
    setError(null)
    postJson(api('/dsh-market/snapshots'), {})
      .then(({ status, body }) => {
        if (status >= 200 && status < 300 && body?.ok === true) {
          setMsg(t('snapCreated'))
          load()
        } else {
          const detail = body !== null && typeof body.error === 'string'
            ? body.error
            : status === 0 ? 'network error' : `HTTP ${String(status)}`
          setError(t('snapCreateFail') + detail)
        }
      })
      .catch(() => setError(t('snapCreateFail') + 'network'))
      .finally(() => setBusy(null))
  }, [busy, load, t])

  const restore = useCallback((id: string) => {
    if (busy !== null) return
    setBusy('restore')
    setMsg(null)
    setError(null)
    postJson(api('/dsh-market/restore-snapshot'), { snapshot: id })
      .then(({ status, body }) => {
        if (status >= 200 && status < 300 && body?.ok === true) {
          setConfirmId(null)
          setMsg(t('snapRestored'))
          onRefresh()
        } else {
          const detail = body !== null && typeof body.error === 'string'
            ? body.error
            : status === 0 ? 'network error' : `HTTP ${String(status)}`
          setError(t('snapRestoreFail') + detail)
        }
      })
      .catch(() => setError(t('snapRestoreFail') + 'network'))
      .finally(() => setBusy(null))
  }, [busy, onRefresh, t])

  /** Delete one snapshot after inline double confirmation. */
  const remove = useCallback((id: string) => {
    if (busy !== null) return
    setBusy('delete')
    setMsg(null)
    setError(null)
    postJson(api('/dsh-market/delete-snapshot'), { snapshot: id })
      .then(({ status, body }) => {
        if (status >= 200 && status < 300 && body?.ok === true) {
          setConfirmDeleteId(null)
          setMsg(t('snapDeleted'))
          load()
        } else {
          const detail = body !== null && typeof body.error === 'string'
            ? body.error
            : status === 0 ? 'network error' : `HTTP ${String(status)}`
          setError(t('snapDeleteFail') + detail)
        }
      })
      .catch(() => setError(t('snapDeleteFail') + 'network'))
      .finally(() => setBusy(null))
  }, [busy, load, t])

  return (
    <div className={css.orderPanel}>
      <p className={css.panelNote}>{t('snapHint')}</p>

      <div className={css.panelActions}>
        <Button variant="primary" size="sm" disabled={busy !== null} onClick={create}>
          {busy === 'create' ? t('snapCreating') : t('snapCreate')}
        </Button>
      </div>

      {error !== null && <div className={css.err}>{error}</div>}

      {snapshots === null || snapshots.length === 0
        ? <div className={css.diagEmpty}>{t('snapEmpty')}</div>
        : (
            <div className={css.snapList}>
              {snapshots.map(snap => (
                <div key={snap.id} className={css.snapRow}>
                  {confirmId === snap.id ? (
                    <>
                      <p className={css.snapConfirmText}>{t('snapRestoreConfirmText')}</p>
                      <div className={css.confirmRow}>
                        <Button variant="primary" size="sm" disabled={busy !== null} onClick={() => restore(snap.id)}>
                          {busy === 'restore' ? t('snapRestoring') : t('snapRestoreConfirm')}
                        </Button>
                        <Button variant="ghost" size="sm" disabled={busy !== null} onClick={() => setConfirmId(null)}>{t('cancel')}</Button>
                      </div>
                    </>
                  ) : confirmDeleteId === snap.id ? (
                    <>
                      <p className={css.snapConfirmText}>{t('snapDeleteConfirmText')}</p>
                      <div className={css.confirmRow}>
                        <Button variant="primary" size="sm" disabled={busy !== null} onClick={() => remove(snap.id)}>
                          {busy === 'delete' ? t('snapDeleting') : t('snapDeleteConfirm')}
                        </Button>
                        <Button variant="ghost" size="sm" disabled={busy !== null} onClick={() => setConfirmDeleteId(null)}>{t('cancel')}</Button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className={css.snapMeta}>
                        <span className={css.diagVal}>{formatTime(snap.createdAt)}</span>
                        <span className={css.spec}>{snap.id}</span>
                        {snap.files.length > 0 && (
                          <span className={css.spec}>{t('snapFiles')}: {snap.files.join(', ')}</span>
                        )}
                      </div>
                      <div className={css.confirmRow}>
                        <Button variant="outline" size="sm" disabled={busy !== null} onClick={() => setConfirmId(snap.id)}>
                          {t('snapRestore')}
                        </Button>
                        <Button variant="ghost" size="sm" disabled={busy !== null} onClick={() => setConfirmDeleteId(snap.id)}>
                          {t('snapDelete')}
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}

      {msg !== null && <div className={css.okState}>{msg}</div>}
    </div>
  )
}

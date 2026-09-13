import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Playlist } from '../types'
import { getMyPlaylists } from '../api'
import { API_BASE } from '../api/client'
import { useAuth } from '../store/auth'
import { useToast } from '../store/ui'
import { useT } from '../i18n'
import { Icon } from '../components/Icon'
import { PageHead, Spinner } from '../components/ui'

type Source = 'netease' | 'qq'
type TrackStatus = 'downloading' | 'matching' | 'imported' | 'existed' | 'failed'

interface TrackItem {
  index: number
  title: string
  artist: string
  status: TrackStatus
  musicId: number | null
  message: string | null
}

interface StartInfo {
  source: string
  total: number
  targetPlaylistId: number
  targetPlaylistCreated: boolean
}

interface DoneInfo {
  total: number
  imported: number
  existed: number
  failed: number
}

/** 解析 SSE 事件 data（JSON），失败返回 null */
function parseSSE<T>(e: Event): T | null {
  try {
    return JSON.parse((e as MessageEvent).data) as T
  } catch {
    return null
  }
}

/** 外部歌单导入：QQ / 网易云 → /loser/{qq|netease}/pull，SSE 实时进度 */
export function ImportPlaylist() {
  const t = useT()
  const navigate = useNavigate()
  const token = useAuth((s) => s.token)
  const toast = useToast((s) => s.toast)

  const [source, setSource] = useState<Source>('netease')
  const [plId, setPlId] = useState('')
  const [targetMode, setTargetMode] = useState<'existing' | 'new'>('new')
  const [targetId, setTargetId] = useState<number | null>(null)
  const [newName, setNewName] = useState('')
  const [myPlaylists, setMyPlaylists] = useState<Playlist[]>([])

  const [running, setRunning] = useState(false)
  const [startInfo, setStartInfo] = useState<StartInfo | null>(null)
  const [tracks, setTracks] = useState<TrackItem[]>([])
  const [current, setCurrent] = useState<{ index: number; total: number; percent: number | null } | null>(null)
  const [summary, setSummary] = useState<DoneInfo | null>(null)
  const [targetPid, setTargetPid] = useState<number | null>(null)

  const esRef = useRef<EventSource | null>(null)

  useEffect(() => {
    if (!token) return
    getMyPlaylists()
      .then((r) => setMyPlaylists(r.playlists))
      .catch(() => {})
    return () => {
      // 离开页面时断开 SSE
      esRef.current?.close()
    }
  }, [token])

  const upsertTrack = (d: TrackItem) => {
    setTracks((list) => {
      const i = list.findIndex((x) => x.index === d.index)
      if (i === -1) return [...list, d]
      const next = [...list]
      next[i] = { ...next[i], ...d }
      return next
    })
  }

  const start = () => {
    const id = plId.trim()
    if (!id) {
      toast('import.needId', 'info')
      return
    }
    if (targetMode === 'existing' && targetId == null) {
      toast('import.needTarget', 'info')
      return
    }
    if (targetMode === 'new' && !newName.trim()) {
      toast('import.needTarget', 'info')
      return
    }
    if (!token) {
      toast('common.loginRequired', 'info')
      return
    }

    const params = new URLSearchParams()
    params.set(source === 'netease' ? 'playlistId' : 'disstid', id)
    if (targetMode === 'existing' && targetId != null) {
      params.set('targetPlaylistId', String(targetId))
    } else {
      params.set('targetPlaylistName', newName.trim())
    }
    // EventSource 无法自定义请求头，令牌走查询参数
    params.set('token', token)

    setRunning(true)
    setStartInfo(null)
    setTracks([])
    setCurrent(null)
    setSummary(null)
    setTargetPid(null)

    const es = new EventSource(`${API_BASE}/loser/${source}/pull?${params.toString()}`)
    esRef.current = es

    es.addEventListener('start', (e) => {
      const d = parseSSE<StartInfo>(e)
      if (!d) return
      setStartInfo(d)
      setTargetPid(d.targetPlaylistId)
    })
    es.addEventListener('track', (e) => {
      const d = parseSSE<TrackItem>(e)
      if (d) upsertTrack(d)
    })
    es.addEventListener('progress', (e) => {
      const d = parseSSE<{ index: number; total: number; percent: number }>(e)
      if (d) setCurrent({ index: d.index, total: d.total, percent: d.percent })
    })
    es.addEventListener('done', (e) => {
      const d = parseSSE<DoneInfo>(e)
      if (d) setSummary(d)
      setRunning(false)
      es.close()
    })
    es.addEventListener('error', (e) => {
      es.close()
      setRunning(false)
      // 服务端推送的 error 事件带 data；原生连接错误没有
      const d = e instanceof MessageEvent && e.data ? parseSSE<{ message: string }>(e) : null
      toast(d?.message ?? 'err.network', 'error')
    })
  }

  const stop = () => {
    esRef.current?.close()
    setRunning(false)
  }

  const statusIcon = (s: TrackStatus) =>
    s === 'imported' ? 'check' : s === 'existed' ? 'check' : s === 'failed' ? 'x' : 'clock'
  const statusText = (s: TrackStatus) =>
    t(`import.status${s.charAt(0).toUpperCase()}${s.slice(1)}`)

  if (!token) {
    return (
      <div className="page">
        <PageHead onBack={() => navigate(-1)} title={t('import.title')} />
        <p className="sheet-note">{t('common.loginRequired')}</p>
      </div>
    )
  }

  return (
    <div className="page import-page">
      <PageHead onBack={() => navigate(-1)} title={t('import.title')} />

      {/* 表单 */}
      <section className="list-section">
        <h3 className="list-section-title">{t('import.source')}</h3>
        <div className="segmented">
          <button className={`seg ${source === 'netease' ? 'active' : ''}`} onClick={() => setSource('netease')}>
            {t('import.netease')}
          </button>
          <button className={`seg ${source === 'qq' ? 'active' : ''}`} onClick={() => setSource('qq')}>
            {t('import.qq')}
          </button>
        </div>
        <div className="form">
          <label className="field">
            <span>{source === 'netease' ? t('import.playlistId') : t('import.disstid')}</span>
            <input
              className="input"
              inputMode="numeric"
              value={plId}
              onChange={(e) => setPlId(e.target.value)}
              placeholder={source === 'netease' ? '7011264340' : '8054321001'}
              disabled={running}
            />
          </label>
          <p className="settings-lang-hint">{t('import.idHint')}</p>
        </div>
      </section>

      <section className="list-section">
        <h3 className="list-section-title">{t('import.target')}</h3>
        <div className="segmented">
          <button
            className={`seg ${targetMode === 'new' ? 'active' : ''}`}
            onClick={() => setTargetMode('new')}
            disabled={running}
          >
            {t('import.targetNew')}
          </button>
          <button
            className={`seg ${targetMode === 'existing' ? 'active' : ''}`}
            onClick={() => setTargetMode('existing')}
            disabled={running}
          >
            {t('import.targetExisting')}
          </button>
        </div>
        <div className="form">
          {targetMode === 'new' ? (
            <label className="field">
              <span>{t('import.newName')}</span>
              <input
                className="input"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                maxLength={255}
                placeholder={t('playlist.name')}
                disabled={running}
              />
            </label>
          ) : myPlaylists.length > 0 ? (
            <label className="field">
              <span>{t('playlist.my')}</span>
              <select
                className="input"
                value={targetId ?? ''}
                onChange={(e) => setTargetId(Number(e.target.value) || null)}
                disabled={running}
              >
                <option value="" disabled>
                  {t('import.targetExisting')}
                </option>
                {myPlaylists.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}（{p.musicCount}）
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <p className="settings-lang-hint">{t('playlist.myEmpty')}</p>
          )}
        </div>
      </section>

      {!running ? (
        <button className="btn btn-primary btn-lg" onClick={start}>
          <Icon name="download" size={18} />
          {t('import.start')}
        </button>
      ) : (
        <button className="btn btn-ghost btn-lg" onClick={stop}>
          <Icon name="x" size={18} />
          {t('common.cancel')}
        </button>
      )}

      {/* 实时进度 */}
      {(running || summary) && (
        <section className="list-section">
          {running && startInfo && (
            <div className="import-progress-line">
              {current && current.total > 0 ? (
                <>
                  <span>{t('import.current', { i: current.index + 1, total: current.total })}</span>
                  {current.percent != null && current.percent >= 0 && <span>{current.percent}%</span>}
                </>
              ) : (
                <>
                  <Spinner size={16} />
                  <span>{t('import.running')}</span>
                </>
              )}
            </div>
          )}

          {tracks.length > 0 && (
            <div className="import-log">
              {tracks.map((tr) => (
                <div key={tr.index} className={`import-row is-${tr.status}`}>
                  <Icon name={statusIcon(tr.status)} size={16} />
                  <div className="import-row-meta">
                    <span className="truncate">{tr.title}</span>
                    {tr.message && <span className="import-row-msg truncate">{tr.message}</span>}
                  </div>
                  <span className="import-row-status">{statusText(tr.status)}</span>
                </div>
              ))}
            </div>
          )}

          {summary && (
            <div className="import-summary">
              <p className="import-summary-title">
                <Icon name="check" size={18} />
                {t('import.done')}
              </p>
              <p>{t('import.statImported', { n: summary.imported })}</p>
              <p>{t('import.statExisted', { n: summary.existed })}</p>
              {summary.failed > 0 && <p className="import-failed">{t('import.statFailed', { n: summary.failed })}</p>}
              {targetPid != null && (
                <button className="btn btn-primary" onClick={() => navigate(`/playlist/${targetPid}`)}>
                  {t('import.viewPlaylist')}
                </button>
              )}
            </div>
          )}
        </section>
      )}
    </div>
  )
}

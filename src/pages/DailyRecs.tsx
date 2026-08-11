import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Music, Recommendation } from '../types'
import { dailyRecommendations } from '../api'
import { useAuth } from '../store/auth'
import { usePlayer, toTrack } from '../store/player'
import { useT } from '../i18n'
import { Icon } from '../components/Icon'
import { Cover } from '../components/Cover'
import { PageHead, EmptyState, ListSkeleton } from '../components/ui'
import { formatDur } from '../utils/format'

/** 每日推荐歌单页：可勾选想听的曲目再播放，也可单曲播放 / 全部播放 */
export function DailyRecs() {
  const t = useT()
  const navigate = useNavigate()
  const token = useAuth((s) => s.token)
  const playQueue = usePlayer((s) => s.playQueue)
  const addToQueue = usePlayer((s) => s.addToQueue)
  const currentId = usePlayer((s) => s.queue[s.index]?.id)
  const playing = usePlayer((s) => s.playing)

  const [recs, setRecs] = useState<Recommendation[] | null>(null)
  const [picked, setPicked] = useState<Set<number>>(new Set())
  const [selectMode, setSelectMode] = useState(false)

  const load = useCallback(() => {
    if (!token) {
      setRecs([])
      return
    }
    setRecs(null)
    dailyRecommendations()
      .then(setRecs)
      .catch(() => setRecs([]))
  }, [token])

  useEffect(() => {
    load()
  }, [load])

  const tracks: Music[] = (recs ?? []).map((r) => ({
    id: r.musicId,
    title: r.title,
    artist: r.artist,
    album: r.album,
    duration: 0,
    coverUrl: `/api/music/cover/${r.musicId}`,
    tags: r.tags,
  }))

  const togglePick = (id: number) => {
    setPicked((s) => {
      const n = new Set(s)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })
  }

  const allPicked = tracks.length > 0 && picked.size === tracks.length

  const playPicked = () => {
    const list = tracks.filter((x) => picked.has(x.id))
    if (list.length === 0) return
    playQueue(list.map(toTrack))
  }

  const playAll = () => {
    if (tracks.length === 0) return
    playQueue(tracks.map(toTrack))
  }

  /** 点击一行：选择模式下勾选，否则从该曲开始播放整张推荐 */
  const onRow = (i: number, id: number) => {
    if (selectMode) {
      togglePick(id)
      return
    }
    playQueue(tracks.map(toTrack), i)
  }

  return (
    <div className="page">
      <PageHead
        title={t('home.dailyRec')}
        onBack={() => navigate(-1)}
        right={
          tracks.length > 0 ? (
            <button
              className={`icon-btn ${selectMode ? 'active' : ''}`}
              onClick={() => {
                setSelectMode((v) => !v)
                setPicked(new Set())
              }}
              aria-label={t('daily.select')}
            >
              <Icon name="check" size={20} />
            </button>
          ) : undefined
        }
      />

      {recs === null && <ListSkeleton rows={8} />}

      {recs && !token && <EmptyState text={t('common.loginRequired')} />}

      {recs && token && tracks.length === 0 && (
        <EmptyState text={t('home.dailyEmpty')} action={
          <button className="btn btn-ghost" onClick={load}>
            {t('common.retry')}
          </button>
        } />
      )}

      {tracks.length > 0 && (
        <>
          <p className="daily-page-sub">{t('daily.sub', { count: tracks.length })}</p>

          <div className="daily-page-actions">
            <button className="btn btn-primary" onClick={playAll}>
              <Icon name="play" size={18} />
              {t('common.playAll')}
            </button>
            {selectMode && (
              <button
                className="btn btn-ghost"
                onClick={() => setPicked(allPicked ? new Set() : new Set(tracks.map((x) => x.id)))}
              >
                {allPicked ? t('daily.unselectAll') : t('daily.selectAll')}
              </button>
            )}
          </div>

          <div className="track-list">
            {tracks.map((m, i) => {
              const isCur = currentId === m.id
              const checked = picked.has(m.id)
              return (
                <div
                  key={m.id}
                  className={`track-row ${isCur && playing ? 'is-playing' : ''} ${checked ? 'is-picked' : ''}`}
                  onClick={() => onRow(i, m.id)}
                >
                  {selectMode ? (
                    <div className={`daily-check ${checked ? 'on' : ''}`}>
                      {checked && <Icon name="check" size={14} />}
                    </div>
                  ) : (
                    <Cover src={m.coverUrl} musicId={m.id} className="track-cover" rounded={8} />
                  )}
                  <div className="track-meta">
                    <div className="track-title">
                      <span className="truncate">{m.title}</span>
                    </div>
                    <div className="track-artist truncate">{m.artist || t('common.unknown')}</div>
                  </div>
                  {recs?.[i]?.reason && !selectMode && (
                    <span className="daily-reason truncate">{recs[i].reason}</span>
                  )}
                  {m.duration > 0 && <div className="track-dur">{formatDur(m.duration)}</div>}
                  <button
                    className="icon-btn"
                    onClick={(e) => {
                      e.stopPropagation()
                      navigate(`/music/${m.id}`)
                    }}
                    aria-label={t('track.info')}
                  >
                    <Icon name="info" size={18} />
                  </button>
                </div>
              )
            })}
          </div>
        </>
      )}

      {/* 选择模式底部操作条 */}
      {selectMode && picked.size > 0 && (
        <div className="daily-bar">
          <span className="daily-bar-count">{t('daily.picked', { n: picked.size })}</span>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => tracks.filter((x) => picked.has(x.id)).forEach((x) => addToQueue(toTrack(x)))}
          >
            <Icon name="plus" size={16} />
            {t('track.addQueue')}
          </button>
          <button className="btn btn-primary btn-sm" onClick={playPicked}>
            <Icon name="play" size={16} />
            {t('common.play')}
          </button>
        </div>
      )}
    </div>
  )
}

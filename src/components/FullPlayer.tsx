import { useEffect, useRef, useState } from 'react'
import { usePlayer, type PlayMode } from '../store/player'
import { useFavorites } from '../store/favorites'
import { getLyrics } from '../api'
import { parseLrc, currentLine, type LrcLine } from '../utils/lrc'
import { useT } from '../i18n'
import { apiUrl } from '../api/client'
import { Icon } from './Icon'
import { Cover } from './Cover'
import { Sheet, EmptyState } from './ui'
import { useBodyLock } from '../hooks/useBodyLock'
import { formatDur } from '../utils/format'

const lyricCache = new Map<number, LrcLine[]>()

/** 进度条（手机版渲染于底部 fp-foot，平板版渲染于左侧封面列下方） */
function PlayerProgress() {
  const currentTime = usePlayer((s) => s.currentTime)
  const duration = usePlayer((s) => s.duration)
  const seek = usePlayer((s) => s.seek)
  const t = useT()
  const pct = duration > 0 ? (currentTime / duration) * 100 : 0
  return (
    <div className="fp-progress">
      <span className="fp-time">{formatDur(currentTime)}</span>
      <input
        type="range"
        min={0}
        max={duration || 0}
        step={0.5}
        value={Math.min(currentTime, duration || 0)}
        onChange={(e) => seek(Number(e.target.value))}
        className="range"
        style={{
          background: `linear-gradient(to right, var(--accent) ${pct}%, var(--range-track) ${pct}%)`,
        }}
        aria-label={t('player.progress')}
      />
      <span className="fp-time">{formatDur(duration)}</span>
    </div>
  )
}

/** 播放控制（模式 / 上一首 / 播放 / 下一首 / 队列），同样双份渲染 */
function PlayerControls() {
  const playing = usePlayer((s) => s.playing)
  const loading = usePlayer((s) => s.loading)
  const mode = usePlayer((s) => s.mode)
  const setMode = usePlayer((s) => s.setMode)
  const toggle = usePlayer((s) => s.toggle)
  const prev = usePlayer((s) => s.prev)
  const next = usePlayer((s) => s.next)
  const setShowQueue = usePlayer((s) => s.setShowQueue)
  const t = useT()

  const modes: { m: PlayMode; icon: string; label: string }[] = [
    { m: 'order', icon: 'repeat', label: t('player.modeOrder') },
    { m: 'repeat', icon: 'repeatOne', label: t('player.modeRepeat') },
    { m: 'shuffle', icon: 'shuffle', label: t('player.modeShuffle') },
  ]
  const modeCur = modes.find((x) => x.m === mode) ?? modes[0]
  const cycleMode = () => {
    const order = ['order', 'repeat', 'shuffle'] as PlayMode[]
    const i = order.indexOf(mode)
    setMode(order[(i + 1) % order.length])
  }

  return (
    <div className="fp-controls">
      <button className="fp-ctl" onClick={cycleMode} title={modeCur.label}>
        <Icon name={modeCur.icon} size={20} />
      </button>
      <button className="fp-ctl" onClick={prev} aria-label={t('common.prev')}>
        <Icon name="prev" size={30} />
      </button>
      <button
        className="fp-play"
        onClick={toggle}
        aria-label={playing ? t('common.pause') : t('common.play')}
      >
        {loading ? <span className="fp-loading" /> : <Icon name={playing ? 'pause' : 'play'} size={30} />}
      </button>
      <button className="fp-ctl" onClick={next} aria-label={t('common.next')}>
        <Icon name="next" size={30} />
      </button>
      <button className="fp-ctl" onClick={() => setShowQueue(true)} aria-label={t('player.queue')}>
        <Icon name="list" size={20} />
      </button>
    </div>
  )
}

export function FullPlayer() {
  const t = useT()
  const expanded = usePlayer((s) => s.expanded)
  useBodyLock(expanded)
  const view = usePlayer((s) => s.view)
  const setView = usePlayer((s) => s.setView)
  const showQueue = usePlayer((s) => s.showQueue)
  const setShowQueue = usePlayer((s) => s.setShowQueue)
  const queue = usePlayer((s) => s.queue)
  const index = usePlayer((s) => s.index)
  const currentTime = usePlayer((s) => s.currentTime)
  const loading = usePlayer((s) => s.loading)
  const setExpanded = usePlayer((s) => s.setExpanded)
  const playQueue = usePlayer((s) => s.playQueue)
  const removeFromQueue = usePlayer((s) => s.removeFromQueue)
  const favIds = useFavorites((s) => s.ids)
  const toggleFav = useFavorites((s) => s.toggle)

  const [lyrics, setLyrics] = useState<LrcLine[]>([])
  const lyricBoxRef = useRef<HTMLDivElement>(null)

  const track = queue[index]
  const trackId = track?.id

  useEffect(() => {
    if (!trackId) {
      setLyrics([])
      return
    }
    if (lyricCache.has(trackId)) {
      setLyrics(lyricCache.get(trackId)!)
      return
    }
    setLyrics([])
    getLyrics(trackId)
      .then((raw) => {
        const parsed = parseLrc(raw)
        lyricCache.set(trackId, parsed)
        setLyrics(parsed)
      })
      .catch(() => setLyrics([]))
  }, [trackId])

  const activeLine = currentLine(lyrics, currentTime)
  useEffect(() => {
    // 手机：仅歌词视图滚动；平板（≥768px 并排分栏）：始终跟随播放
    const wide = window.matchMedia('(min-width: 768px)').matches
    if (activeLine < 0) return
    if (!wide && view !== 'lyrics') return
    const box = lyricBoxRef.current
    const el = box?.querySelector(`[data-line="${activeLine}"]`) as HTMLElement | null
    if (box && el) {
      // 只滚动歌词容器本身（scrollTo 不会向上冒泡）。
      // 注意：不要用 scrollIntoView —— 它会继续滚动所有可滚动祖先，
      // 把 .full-player（overflow:hidden 的可编程滚动容器）也滚掉，
      // 导致整个播放器内容上移、顶部收起/收藏按钮被裁掉点不到。
      const target = el.offsetTop - box.clientHeight / 2 + el.offsetHeight / 2
      box.scrollTo({ top: target, behavior: 'smooth' })
    }
  }, [activeLine, view])

  if (!expanded) return null

  return (
    <div className="full-player">
      {/* 封面氛围背景 */}
      {track && (
        <div className="fp-blur" aria-hidden="true">
          <img src={apiUrl(track.coverUrl ?? `/api/music/cover/${track.id}`)} alt="" onError={(e) => ((e.target as HTMLImageElement).style.display = 'none')} />
        </div>
      )}

      <div className="fp-head">
        <button className="icon-btn" onClick={() => setExpanded(false)} aria-label={t('common.close')}>
          <Icon name="chevronDown" size={24} />
        </button>
        {track && (
          <div className="fp-head-meta">
            <span className="fp-title truncate">{track.title}</span>
            <span className="fp-artist truncate">{track.artist || t('common.unknown')}</span>
          </div>
        )}
        <button
          className={`icon-btn ${favIds.includes(trackId ?? -1) ? 'is-fav' : ''}`}
          onClick={() => trackId != null && toggleFav(trackId)}
          aria-label={t('fav.like')}
        >
          <Icon name={favIds.includes(trackId ?? -1) ? 'heartFill' : 'heart'} size={22} />
        </button>
      </div>

      {track ? (
        <>
          <div className="fp-body">
            {/* 左侧：封面 + 进度条 + 控制（手机仅显示封面，平板并排全显） */}
            <div className={`fp-cover-col ${view === 'cover' ? '' : 'hide'}`}>
              <div className="fp-cover-wrap">
                <div className="fp-cover">
                  <Cover src={track.coverUrl} musicId={track.id} rounded={22} />
                  {loading && <div className="fp-cover-loading" />}
                </div>
              </div>
              <PlayerProgress />
              <PlayerControls />
            </div>
            {/* 右侧：歌词（手机按 view 显隐，平板并排常显） */}
            <div className={`fp-lyrics-col ${view === 'lyrics' ? '' : 'hide'}`}>
              <div className="lyrics" ref={lyricBoxRef}>
                {lyrics.length > 0 ? (
                  <div className="lyrics-inner">
                    {lyrics.map((l, i) => (
                      <p
                        key={i}
                        data-line={i}
                        className={`lyric-line ${i === activeLine ? 'active' : ''} ${l.text ? '' : 'empty'}`}
                      >
                        {l.text || '♪'}
                      </p>
                    ))}
                  </div>
                ) : (
                  <p className="no-lyrics">{t('player.noLyrics')}</p>
                )}
              </div>
            </div>
          </div>

          {/* 底部栏（手机版）：封面/歌词切换 + 进度条 + 控制 */}
          <div className="fp-foot">
            <div className="fp-tabs">
              <button
                className={`fp-tab ${view === 'cover' ? 'active' : ''}`}
                onClick={() => setView('cover')}
              >
                <Icon name="disc" size={18} />
              </button>
              <button
                className={`fp-tab ${view === 'lyrics' ? 'active' : ''}`}
                onClick={() => setView('lyrics')}
              >
                <Icon name="lyrics" size={18} />
              </button>
            </div>

            <PlayerProgress />
            <PlayerControls />
          </div>
        </>
      ) : (
        <div className="fp-empty">
          <EmptyState text={t('player.queueEmpty')} />
          <button className="btn btn-ghost" onClick={() => setExpanded(false)}>
            {t('common.close')}
          </button>
        </div>
      )}

      {/* 播放队列 */}
      <Sheet open={showQueue} onClose={() => setShowQueue(false)} title={`${t('player.queue')} · ${queue.length}`}>
        <div className="queue-list">
          {queue.map((tr, i) => (
            <div
              key={`${tr.id}-${i}`}
              className={`queue-item ${i === index ? 'current' : ''}`}
              onClick={() => {
                playQueue(queue, i)
                setShowQueue(false)
              }}
            >
              <Cover src={tr.coverUrl} musicId={tr.id} className="queue-cover" rounded={6} />
              <div className="queue-meta">
                <div className="truncate">{tr.title}</div>
                <div className="truncate">{tr.artist}</div>
              </div>
              {i === index && <Icon name="play" size={16} />}
              <button
                className="icon-btn queue-remove"
                onClick={(e) => {
                  e.stopPropagation()
                  removeFromQueue(i)
                }}
                aria-label={t('common.delete')}
              >
                <Icon name="x" size={16} />
              </button>
            </div>
          ))}
          {queue.length === 0 && <p className="queue-empty">{t('player.queueEmpty')}</p>}
        </div>
      </Sheet>
    </div>
  )
}

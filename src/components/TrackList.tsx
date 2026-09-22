import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Music, Playlist, Track } from '../types'
import { usePlayer, toTrack } from '../store/player'
import { useFavorites } from '../store/favorites'
import { useToast, type TrackAction } from '../store/ui'
import { addMusicToPlaylist, createPlaylist, getMyPlaylists } from '../api'
import { apiUrl } from '../api/client'
import { useAuth } from '../store/auth'
import { useT } from '../i18n'
import { formatDur } from '../utils/format'
import { Icon } from './Icon'
import { Cover } from './Cover'
import { Sheet } from './ui'
import { VideoShareSheet } from './VideoShareSheet'

// ---------- 播放中均衡器 ----------

export function EqBars() {
  return (
    <span className="eq" aria-hidden="true">
      <i />
      <i />
      <i />
    </span>
  )
}

// ---------- 单行 ----------

interface TrackRowProps {
  track: Track
  index?: number
  playing: boolean
  favorited?: boolean
  showIndex?: boolean
  onPlay: () => void
  onToggleFav?: () => void
  onMore: () => void
}

export function TrackRow({
  track,
  index,
  playing,
  favorited,
  showIndex,
  onPlay,
  onToggleFav,
  onMore,
}: TrackRowProps) {
  const t = useT()
  const openContextMenu = useToast((s) => s.openContextMenu)
  const closeContextMenu = useToast((s) => s.closeContextMenu)
  const setContextHighlight = useToast((s) => s.setContextHighlight)
  const commitContext = useToast((s) => s.commitContext)

  // ---- 长按手势：350ms 弹出上下文菜单，按住滑动选择、松手执行 ----
  const holdTimer = useRef<number | null>(null)
  const startPos = useRef<{ x: number; y: number } | null>(null)
  const longFired = useRef(false)
  const suppressClick = useRef(false)

  const clearHold = () => {
    if (holdTimer.current != null) {
      window.clearTimeout(holdTimer.current)
      holdTimer.current = null
    }
  }

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return
    // 落点在行内按钮（收藏/更多）上时不启动长按，避免与按钮点击冲突
    if ((e.target as HTMLElement).closest('button')) return
    startPos.current = { x: e.clientX, y: e.clientY }
    longFired.current = false
    clearHold()
    holdTimer.current = window.setTimeout(() => {
      longFired.current = true
      suppressClick.current = true
      openContextMenu(track, e.clientX, e.clientY)
    }, 350)
  }

  const onPointerMove = (e: React.PointerEvent) => {
    if (longFired.current) {
      // 手指滑动：命中测试菜单项，中继高亮（触摸事件被行隐式捕获，需经此转发）
      const el = document.elementFromPoint(e.clientX, e.clientY)
      const item = el?.closest('[data-ctx-item]')
      setContextHighlight(item ? Number(item.getAttribute('data-ctx-item')) : -1)
      return
    }
    // 未触发长按前的移动：判定为滚动，取消长按
    const s = startPos.current
    if (s && Math.hypot(e.clientX - s.x, e.clientY - s.y) > 10) clearHold()
  }

  const onPointerUp = () => {
    if (longFired.current) commitContext()
    clearHold()
    startPos.current = null
  }

  const onPointerCancel = () => {
    if (longFired.current) closeContextMenu()
    clearHold()
    startPos.current = null
  }

  return (
    <div
      className={`track-row ${playing ? 'is-playing' : ''}`}
      onClick={() => {
        // 长按手势结束后的合成 click 不触发播放
        if (suppressClick.current) {
          suppressClick.current = false
          return
        }
        onPlay()
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      onContextMenu={(e) => e.preventDefault()}
    >
      {showIndex ? (
        <div className="track-rank">
          {playing ? <EqBars /> : <span className={index !== undefined && index < 3 ? 'rank-top' : ''}>{index !== undefined ? index + 1 : ''}</span>}
        </div>
      ) : (
        <Cover src={track.coverUrl} musicId={track.id} className="track-cover" rounded={8} />
      )}
      <div className="track-meta">
        <div className="track-title">
          {playing && <EqBars />}
          <span className="truncate">{track.title}</span>
        </div>
        <div className="track-artist truncate">{track.artist || t('common.unknown')}</div>
      </div>
      <div className="track-dur">{formatDur(track.duration)}</div>
      {onToggleFav && (
        <button
          className={`icon-btn ${favorited ? 'is-fav' : ''}`}
          onClick={(e) => {
            e.stopPropagation()
            onToggleFav()
          }}
          aria-label={favorited ? t('fav.remove') : t('fav.like')}
        >
          <Icon name={favorited ? 'heartFill' : 'heart'} size={20} />
        </button>
      )}
      <button
        className="icon-btn"
        onClick={(e) => {
          e.stopPropagation()
          onMore()
        }}
        aria-label={t('common.more')}
      >
        <Icon name="more" size={20} />
      </button>
    </div>
  )
}

// ---------- 列表 ----------

interface TrackListProps {
  tracks: (Music | Track)[]
  startIndex?: number
  showIndex?: boolean
  /** 自定义播放（默认 playQueue） */
  onPlayAll?: (tracks: Track[], start: number) => void
  /** 追加到操作菜单的项（如歌单管理的“移除”） */
  extraActions?: (track: Track) => TrackAction[]
  /** 关掉收藏按钮 */
  noHeart?: boolean
}

export function TrackList({
  tracks,
  startIndex = 0,
  showIndex,
  onPlayAll,
  extraActions,
  noHeart,
}: TrackListProps) {
  const t = useT()
  const list = tracks.map(toTrack)
  const playQueue = usePlayer((s) => s.playQueue)
  const current = usePlayer((s) => s.queue[s.index]?.id)
  const isPlaying = usePlayer((s) => s.playing)
  const favIds = useFavorites((s) => s.ids)
  const toggleFav = useFavorites((s) => s.toggle)
  const openTrackActions = useToast((s) => s.openTrackActions)

  const play = (i: number) => {
    if (onPlayAll) onPlayAll(list, i)
    else playQueue(list, i)
  }

  return (
    <div className="track-list">
      {list.map((tr, i) => (
        <TrackRow
          key={`${tr.id}-${i}`}
          track={tr}
          index={showIndex ? startIndex + i : undefined}
          playing={isPlaying && tr.id === current}
          favorited={noHeart ? undefined : favIds.includes(tr.id)}
          showIndex={showIndex}
          onPlay={() => play(i)}
          onToggleFav={noHeart ? undefined : () => toggleFav(tr.id)}
          onMore={() => openTrackActions(tr, extraActions?.(tr) ?? [])}
        />
      ))}
      {list.length === 0 && <div className="list-empty-note">{t('common.empty')}</div>}
    </div>
  )
}

// ---------- 歌曲操作弹层 ----------

export function TrackActionSheets() {
  const t = useT()
  const navigate = useNavigate()
  const trackActions = useToast((s) => s.trackActions)
  const close = useToast((s) => s.closeTrackActions)
  const openPicker = useToast((s) => s.openPlaylistPicker)
  const playQueue = usePlayer((s) => s.playQueue)
  const playNextTrack = usePlayer((s) => s.playNextTrack)
  const addToQueue = usePlayer((s) => s.addToQueue)
  const setExpanded = usePlayer((s) => s.setExpanded)
  const favIds = useFavorites((s) => s.ids)
  const toggleFav = useFavorites((s) => s.toggle)
  const [shareTrack, setShareTrack] = useState<Track | null>(null)

  const track = trackActions?.track
  if (!track) return null

  const isFav = favIds.includes(track.id)

  const download = () => {
    // iOS Safari 对 fetch blob + a.click() 下载不可靠（长音频会被"吞"），
    // 改为直接打开音频 API 地址新页面，由 Safari 播放/下载该文件
    const a = document.createElement('a')
    a.href = apiUrl(`/api/music/file/${track.id}`)
    a.target = '_blank'
    a.rel = 'noopener'
    a.click()
    close()
  }

  const actions: TrackAction[] = [
    {
      key: 'play',
      label: t('track.play'),
      icon: 'play',
      onClick: () => {
        playQueue([track])
        close()
      },
    },
    {
      key: 'playNext',
      label: t('track.playNext'),
      icon: 'next',
      onClick: () => {
        playNextTrack(track)
        close()
      },
    },
    {
      key: 'addQueue',
      label: t('track.addQueue'),
      icon: 'plus',
      onClick: () => {
        addToQueue(track)
        close()
      },
    },
    {
      key: 'fav',
      label: isFav ? t('track.unfavorite') : t('track.favorite'),
      icon: 'heart',
      onClick: () => {
        toggleFav(track.id)
        close()
      },
    },
    {
      key: 'addToPlaylist',
      label: t('track.addToPlaylist'),
      icon: 'list',
      onClick: () => {
        close()
        openPicker(track)
      },
    },
    {
      key: 'viewArtist',
      label: t('track.viewArtist'),
      icon: 'mic',
      onClick: () => {
        close()
        // 从全屏播放器打开菜单时，跳页前先收起播放器，否则目标页被盖住
        setExpanded(false)
        navigate(`/artist/${encodeURIComponent(track.artist)}`)
      },
    },
    {
      key: 'download',
      label: t('player.download'),
      icon: 'download',
      onClick: download,
    },
    {
      key: 'info',
      label: t('track.info'),
      icon: 'info',
      onClick: () => {
        close()
        setExpanded(false)
        navigate(`/music/${track.id}`)
      },
    },
    {
      key: 'shareVideo',
      label: t('track.shareVideo'),
      icon: 'video',
      onClick: () => {
        close()
        setShareTrack(track)
      },
    },
  ]

  return (
    <>
      <Sheet open onClose={close} title={track.title}>
        <div className="sheet-actions">
          {actions.map((a) => (
            <button key={a.key} className={`sheet-action ${a.danger ? 'danger' : ''}`} onClick={a.onClick}>
              <Icon name={a.icon} size={20} />
              <span>{a.label}</span>
            </button>
          ))}
          {(trackActions?.extras ?? []).map((a) => (
            <button key={a.key} className={`sheet-action ${a.danger ? 'danger' : ''}`} onClick={a.onClick}>
              <Icon name={a.icon} size={20} />
              <span>{a.label}</span>
            </button>
          ))}
        </div>
      </Sheet>
      {shareTrack && <VideoShareSheet track={shareTrack} onClose={() => setShareTrack(null)} />}
    </>
  )
}

// ---------- 添加到歌单弹层 ----------

export function PlaylistPickerSheet() {
  const t = useT()
  const toast = useToast((s) => s.toast)
  const track = useToast((s) => s.playlistPicker)
  const close = useToast((s) => s.closePlaylistPicker)
  const token = useAuth((s) => s.token)
  const [playlists, setPlaylists] = useState<Playlist[]>([])
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!track || !token) return
    getMyPlaylists().then((r) => setPlaylists(r.playlists)).catch(() => {})
  }, [track, token])

  if (!track) return null

  const add = async (pid: number, pname: string) => {
    setBusy(true)
    try {
      await addMusicToPlaylist(pid, [track.id])
      toast('playlist.added', 'success', { name: pname })
      close()
    } catch (e) {
      toast(String((e as Error).message), 'error')
    } finally {
      setBusy(false)
    }
  }

  const create = async () => {
    if (!name.trim()) {
      toast('playlist.nameRequired', 'info')
      return
    }
    setBusy(true)
    try {
      const p = await createPlaylist(name.trim())
      setPlaylists((s) => [p, ...s])
      setName('')
      setCreating(false)
      await add(p.id, p.name)
    } catch (e) {
      toast(String((e as Error).message), 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Sheet open onClose={close} title={t('playlist.addTo')}>
      {!token ? (
        <div className="sheet-note">{t('common.loginRequired')}</div>
      ) : (
        <>
          {creating ? (
            <div className="playlist-create">
              <input
                className="input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('playlist.name')}
                autoFocus
              />
              <div className="playlist-create-actions">
                <button className="btn btn-ghost" onClick={() => setCreating(false)}>
                  {t('common.cancel')}
                </button>
                <button className="btn btn-primary" onClick={create} disabled={busy}>
                  {t('common.save')}
                </button>
              </div>
            </div>
          ) : (
            <button className="sheet-action" onClick={() => setCreating(true)}>
              <Icon name="plus" size={20} />
              <span>{t('playlist.new')}</span>
            </button>
          )}
          <div className="sheet-list">
            {playlists.map((p) => (
              <button
                key={p.id}
                className="sheet-action"
                onClick={() => add(p.id, p.name)}
                disabled={busy}
              >
                <Icon name="folder" size={20} />
                <span className="truncate">{p.name}</span>
                <span className="sheet-count">{p.musicCount}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </Sheet>
  )
}

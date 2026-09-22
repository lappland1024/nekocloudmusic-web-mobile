import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Track } from '../types'
import { usePlayer } from '../store/player'
import { useFavorites } from '../store/favorites'
import { useToast } from '../store/ui'
import { useT } from '../i18n'
import { Icon } from './Icon'

/**
 * 长按上下文菜单（iOS 式）：
 * 歌曲行长按 350ms 后在手指位置弹出，按住上下滑动经 elementFromPoint
 * 中继高亮菜单项，松手执行选中项（commit 信号驱动）。
 */
export function TrackContextMenu() {
  const t = useT()
  const navigate = useNavigate()
  const ctx = useToast((s) => s.contextMenu)
  const close = useToast((s) => s.closeContextMenu)
  const highlight = useToast((s) => s.contextHighlight)
  const commit = useToast((s) => s.contextCommit)
  const playQueue = usePlayer((s) => s.playQueue)
  const playNextTrack = usePlayer((s) => s.playNextTrack)
  const addToQueue = usePlayer((s) => s.addToQueue)
  const favIds = useFavorites((s) => s.ids)
  const toggleFav = useFavorites((s) => s.toggle)
  const openPicker = useToast((s) => s.openPlaylistPicker)
  const setExpanded = usePlayer((s) => s.setExpanded)
  const lastCommit = useRef(0)

  const track: Track | null = ctx?.track ?? null
  const isFav = track ? favIds.includes(track.id) : false

  useEffect(() => {
    if (!ctx) return
    // 菜单打开期间阻止页面滚动（手势行持有 pointer 事件流）
    const prevent = (e: TouchEvent) => e.preventDefault()
    document.addEventListener('touchmove', prevent, { passive: false })
    return () => document.removeEventListener('touchmove', prevent)
  }, [ctx])

  const exec = (i: number) => {
    if (!track) return
    menuItems()[i]?.onClick()
  }

  // 松手提交：执行当前高亮项（ref 去重，StrictMode 下 updater 双调用不会重复执行）
  useEffect(() => {
    if (commit === 0 || !ctx) return
    if (lastCommit.current === commit) return
    lastCommit.current = commit
    if (highlight >= 0) exec(highlight)
    close()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [commit])

  const done = () => {
    close()
  }

  const menuItems = () => {
    if (!track) return []
    const go = (fn: () => void) => {
      // 从全屏播放器上方长按时先收起播放器
      setExpanded(false)
      fn()
    }
    return [
      {
        key: 'play',
        label: t('track.play'),
        icon: 'play',
        onClick: () => playQueue([track]),
      },
      {
        key: 'playNext',
        label: t('track.playNext'),
        icon: 'next',
        onClick: () => playNextTrack(track),
      },
      {
        key: 'addQueue',
        label: t('track.addQueue'),
        icon: 'plus',
        onClick: () => addToQueue(track),
      },
      {
        key: 'fav',
        label: isFav ? t('track.unfavorite') : t('track.favorite'),
        icon: 'heart',
        onClick: () => toggleFav(track.id),
      },
      {
        key: 'addToPlaylist',
        label: t('track.addToPlaylist'),
        icon: 'list',
        onClick: () => openPicker(track),
      },
      {
        key: 'viewArtist',
        label: t('track.viewArtist'),
        icon: 'mic',
        onClick: () => go(() => navigate(`/artist/${encodeURIComponent(track.artist)}`)),
      },
      {
        key: 'info',
        label: t('track.info'),
        icon: 'info',
        onClick: () => go(() => navigate(`/music/${track.id}`)),
      },
    ]
  }

  if (!ctx || !track) return null

  // 菜单出现在手指上方，横向夹在视口内
  const menuW = 216
  const left = Math.min(Math.max(ctx.x - menuW / 2, 12), window.innerWidth - menuW - 12)
  const top = Math.max(ctx.y - 8 - menuItems().length * 42 - 12, 12)

  return (
    <div className="ctx-overlay" onPointerDown={close}>
      <div
        className="ctx-menu"
        style={{ left, top, width: menuW }}
        onClick={(e) => e.stopPropagation()}
      >
        {menuItems().map((item, i) => (
          <button
            key={item.key}
            data-ctx-item={i}
            className={`ctx-item ${i === highlight ? 'highlight' : ''}`}
            onClick={() => {
              exec(i)
              done()
            }}
          >
            <Icon name={item.icon} size={18} />
            <span className="truncate">{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

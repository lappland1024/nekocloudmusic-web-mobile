import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import type { MusicInfo } from '../types'
import { getLyrics, getMusicInfo } from '../api'
import { apiUrl } from '../api/client'
import { usePlayer, toTrack } from '../store/player'
import { useFavorites } from '../store/favorites'
import { useToast } from '../store/ui'
import { useT } from '../i18n'
import { parseLrc, type LrcLine } from '../utils/lrc'
import { formatDur } from '../utils/format'
import { Icon } from '../components/Icon'
import { Cover } from '../components/Cover'
import { PageHead, EmptyState, ListSkeleton } from '../components/ui'
import { VideoShareSheet } from '../components/VideoShareSheet'

/** 歌曲详情页：封面 + 元信息 + 歌词全文 + 播放/收藏/下载/加歌单/分享 */
export function MusicDetail() {
  const t = useT()
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const musicId = Number(id)

  const playQueue = usePlayer((s) => s.playQueue)
  const addToQueue = usePlayer((s) => s.addToQueue)
  const setExpanded = usePlayer((s) => s.setExpanded)
  const currentId = usePlayer((s) => s.queue[s.index]?.id)
  const playing = usePlayer((s) => s.playing)
  const toggle = usePlayer((s) => s.toggle)
  const favIds = useFavorites((s) => s.ids)
  const toggleFav = useFavorites((s) => s.toggle)
  const openPicker = useToast((s) => s.openPlaylistPicker)
  const toast = useToast((s) => s.toast)

  const [info, setInfo] = useState<MusicInfo | null>(null)
  const [rawLyrics, setRawLyrics] = useState('')
  const [lyrics, setLyrics] = useState<LrcLine[]>([])
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)

  useEffect(() => {
    if (!Number.isFinite(musicId)) {
      setFailed(true)
      setLoading(false)
      return
    }
    let alive = true
    setLoading(true)
    setFailed(false)
    // 详情接口实测不返回歌词（字段缺失），歌词走独立的 /api/music/lyrics/{id}
    getMusicInfo(musicId)
      .then((d) => {
        if (!alive) return
        setInfo(d)
      })
      .catch(() => alive && setFailed(true))
      .finally(() => alive && setLoading(false))
    getLyrics(musicId)
      .then((raw) => {
        if (!alive) return
        setRawLyrics(raw)
        setLyrics(parseLrc(raw))
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [musicId])

  const isFav = favIds.includes(musicId)
  const isCurrent = currentId === musicId

  const track = info
    ? toTrack({
        id: info.id,
        title: info.title,
        artist: info.artist,
        album: info.album,
        duration: info.duration,
        coverUrl: info.coverUrl,
      })
    : null

  const play = () => {
    if (!track) return
    if (isCurrent) {
      toggle()
    } else {
      playQueue([track])
    }
  }

  const download = () => {
    // iOS Safari 对 blob 下载不可靠，直接打开音频 API 地址新页面
    const a = document.createElement('a')
    a.href = apiUrl(`/api/music/file/${musicId}`)
    a.target = '_blank'
    a.rel = 'noopener'
    a.click()
  }

  return (
    <div className="page music-page">
      <PageHead
        title={info?.title ?? t('common.song')}
        onBack={() => navigate(-1)}
        right={
          track ? (
            <button className="icon-btn" onClick={() => setShareOpen(true)} aria-label={t('track.shareVideo')}>
              <Icon name="video" size={20} />
            </button>
          ) : undefined
        }
      />

      {loading && <ListSkeleton rows={6} />}
      {!loading && failed && <EmptyState text={t('common.error')} sub={t('common.retryLater')} />}

      {info && track && (
        <>
          <div className="music-hero">
            <div className="music-hero-cover" onClick={() => isCurrent && setExpanded(true)}>
              <Cover src={info.coverUrl} musicId={info.id} rounded={20} />
            </div>
            <div className="music-hero-info">
              <h2 className="truncate2">{info.title}</h2>
              {info.artist ? (
                <button
                  className="music-hero-artist truncate"
                  onClick={() => navigate(`/artist/${encodeURIComponent(info.artist)}`)}
                >
                  {info.artist}
                  <Icon name="chevronRight" size={14} />
                </button>
              ) : (
                <span className="music-hero-artist truncate">{t('common.unknown')}</span>
              )}
              <p className="music-hero-meta truncate">
                {info.album || t('common.unknown')}
                {info.duration > 0 ? ` · ${formatDur(info.duration)}` : ''}
              </p>
            </div>
          </div>

          <div className="music-actions">
            <button className="btn btn-primary" onClick={play}>
              <Icon name={isCurrent && playing ? 'pause' : 'play'} size={18} />
              {isCurrent && playing ? t('common.pause') : t('common.play')}
            </button>
            <button
              className={`btn ${isFav ? 'btn-fav' : 'btn-ghost'}`}
              onClick={() => toggleFav(musicId)}
            >
              <Icon name={isFav ? 'heartFill' : 'heart'} size={18} />
              {isFav ? t('fav.remove') : t('fav.like')}
            </button>
          </div>

          <div className="music-actions-row">
            <button className="music-act" onClick={() => addToQueue(track)}>
              <Icon name="plus" size={20} />
              <span>{t('track.addQueue')}</span>
            </button>
            <button className="music-act" onClick={() => openPicker(track)}>
              <Icon name="list" size={20} />
              <span>{t('track.addToPlaylist')}</span>
            </button>
            <button className="music-act" onClick={download}>
              <Icon name="download" size={20} />
              <span>{t('player.download')}</span>
            </button>
            <button
              className="music-act"
              onClick={() => {
                // 分享 = 复制本页链接（/music/:id），不调系统分享面板
                navigator.clipboard
                  .writeText(location.href)
                  .then(() => toast('common.linkCopied', 'success'))
                  .catch(() => toast('common.retryLater', 'info'))
              }}
            >
              <Icon name="share" size={20} />
              <span>{t('common.copyLink')}</span>
            </button>
          </div>

          {/* 歌词全文 */}
          <section className="home-section">
            <div className="section-head">
              <div>
                <h3>{t('player.lyrics')}</h3>
              </div>
            </div>
            {lyrics.length > 0 ? (
              <div className="music-lyrics">
                {lyrics.map((l, i) => (
                  <p key={i} className="music-lyric-line">
                    {l.text || '♪'}
                  </p>
                ))}
              </div>
            ) : rawLyrics ? (
              <pre className="music-info-lyrics">{rawLyrics}</pre>
            ) : (
              <p className="no-lyrics">{t('player.noLyrics')}</p>
            )}
          </section>
        </>
      )}

      {shareOpen && track && <VideoShareSheet track={track} onClose={() => setShareOpen(false)} />}
    </div>
  )
}

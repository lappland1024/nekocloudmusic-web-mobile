import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import type { Music, Playlist } from '../types'
import { searchArtist, searchMusic, searchPlaylists } from '../api'
import { useT } from '../i18n'
import { Icon } from '../components/Icon'
import { Cover } from '../components/Cover'
import { Logo } from '../components/Logo'
import { TrackList } from '../components/TrackList'
import { ListSkeleton } from '../components/ui'

type Tab = 'song' | 'playlist' | 'artist'

const HISTORY_KEY = 'neko-search-history'

function loadHistory(): string[] {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) ?? '[]')
  } catch {
    return []
  }
}
function saveHistory(q: string) {
  const list = [q, ...loadHistory().filter((x) => x !== q)].slice(0, 10)
  localStorage.setItem(HISTORY_KEY, JSON.stringify(list))
}

export function Search() {
  const t = useT()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [q, setQ] = useState(params.get('q') ?? '')
  const [tab, setTab] = useState<Tab>('song')
  const [history, setHistory] = useState<string[]>(loadHistory)
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)

  const [songs, setSongs] = useState<Music[] | null>(null)
  const [playlists, setPlaylists] = useState<Playlist[] | null>(null)
  const [artist, setArtist] = useState<{ name: string; musicCount: number; musicList: Music[] } | null>(null)

  const inputRef = useRef<HTMLInputElement>(null)
  // 自增请求序号：丢弃过期响应，防止快速连续搜索时旧结果覆盖新结果
  const searchSeq = useRef(0)

  const search = async (keyword?: string) => {
    const kw = (keyword ?? q).trim()
    if (!kw) return
    const seq = ++searchSeq.current
    setQ(kw)
    setBusy(true)
    setDone(false)
    setSongs(null)
    setPlaylists(null)
    setArtist(null)
    saveHistory(kw)
    setHistory(loadHistory())

    try {
      const [s, p, a] = await Promise.all([
        searchMusic(kw),
        searchPlaylists(kw),
        searchArtist(kw),
      ])
      if (seq !== searchSeq.current) return // 已过期，丢弃
      setSongs(s)
      setPlaylists(p)
      setArtist(a)
    } catch {
      if (seq !== searchSeq.current) return
      setSongs([])
      setPlaylists([])
      setArtist({ name: '', musicCount: 0, musicList: [] })
    } finally {
      if (seq === searchSeq.current) {
        setBusy(false)
        setDone(true)
      }
    }
  }

  useEffect(() => {
    const q0 = params.get('q')
    if (q0) {
      setQ(q0)
      void search(q0)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="page search">
      <div className="search-bar-wrap">
        <div className="search-bar">
          <Icon name="search" size={20} />
          <input
            ref={inputRef}
            className="search-input"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t('search.placeholder')}
            onKeyDown={(e) => e.key === 'Enter' && search()}
          />
          {q && (
            <button
              className="icon-btn"
              onClick={() => {
                setQ('')
                searchSeq.current++ // 使进行中的请求过期
                setSongs(null)
                setPlaylists(null)
                setArtist(null)
                setBusy(false)
                setDone(false)
                inputRef.current?.focus()
              }}
              aria-label="clear"
            >
              <Icon name="x" size={18} />
            </button>
          )}
          <button className="icon-btn" onClick={() => navigate('/recognize')} aria-label={t('recognize.title')}>
            <Icon name="mic" size={20} />
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => search()} disabled={busy}>
            {t('common.search')}
          </button>
        </div>

        <div className="search-tabs">
          {(['song', 'playlist', 'artist'] as Tab[]).map((k) => (
            <button key={k} className={`search-tab ${tab === k ? 'active' : ''}`} onClick={() => setTab(k)}>
              {t(`search.tab.${k}`)}
            </button>
          ))}
        </div>
      </div>

      {/* 历史 */}
      {!done && !busy && history.length > 0 && (
        <div className="search-history">
          <div className="search-history-head">
            <span>{t('search.history')}</span>
            <button className="link-btn" onClick={() => { localStorage.removeItem(HISTORY_KEY); setHistory([]) }}>
              {t('search.clearHistory')}
            </button>
          </div>
          <div className="search-history-tags">
            {history.map((h) => (
              <button key={h} className="tag" onClick={() => { setQ(h); search(h) }}>
                {h}
              </button>
            ))}
          </div>
        </div>
      )}

      {busy && <ListSkeleton rows={6} />}

      {done && !busy && (
        <>
          {tab === 'song' && (
            songs && songs.length > 0 ? (
              <TrackList tracks={songs} />
            ) : (
              <SearchEmpty text={t('search.noResult')} />
            )
          )}

          {tab === 'playlist' && (
            playlists && playlists.length > 0 ? (
              <div className="playlist-grid">
                {playlists.map((p) => (
                  <button key={p.id} className="pl-card" onClick={() => navigate(`/playlist/${p.id}`)}>
                    <Cover
                      src={p.firstMusicCover}
                      musicId={p.firstMusicId}
                      className="pl-card-cover"
                      rounded={14}
                    />
                    <span className="pl-card-name truncate2">{p.name}</span>
                    <span className="pl-card-meta truncate">
                      {p.creator?.username ? `${p.creator.username} · ` : ''}
                      {p.musicCount} {t('common.song')}
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <SearchEmpty text={t('search.noResult')} />
            )
          )}

          {tab === 'artist' && (
            artist && artist.name ? (
              <div className="artist-result">
                <div className="artist-hero">
                  <div className="artist-avatar">
                    <Icon name="mic" size={30} />
                  </div>
                  <div>
                    <h3>{artist.name}</h3>
                    <p>{t('search.artist.count', { count: artist.musicCount })}</p>
                  </div>
                </div>
                <div className="artist-list-title">{t('search.artist.works')}</div>
                <TrackList tracks={artist.musicList} />
              </div>
            ) : (
              <SearchEmpty text={t('search.noResult')} />
            )
          )}
        </>
      )}

      {!done && !busy && history.length === 0 && (
        <div className="search-idle">
          <Logo size={88} />
          <p>{t('search.hint')}</p>
        </div>
      )}
    </div>
  )
}

function SearchEmpty({ text }: { text: string }) {
  return (
    <div className="empty">
      <Logo size={92} />
      <p className="empty-text">{text}</p>
    </div>
  )
}

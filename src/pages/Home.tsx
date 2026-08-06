import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import type { Music, Recommendation } from '../types'
import { dailyRecommendations, getLatest, getRanking } from '../api'
import { apiUrl } from '../api/client'
import { useAuth } from '../store/auth'
import { useFavorites } from '../store/favorites'
import { usePlayer, toTrack } from '../store/player'
import { useT, greetingKey } from '../i18n'
import { Logo } from '../components/Logo'
import { Icon } from '../components/Icon'
import { Cover } from '../components/Cover'
import { TrackList } from '../components/TrackList'
import { ListSkeleton } from '../components/ui'

export function Home() {
  const t = useT()
  const navigate = useNavigate()
  const user = useAuth((s) => s.user)
  const token = useAuth((s) => s.token)
  const playQueue = usePlayer((s) => s.playQueue)
  const ensureFavs = useFavorites((s) => s.ensureLoaded)

  const [ranking, setRanking] = useState<Music[] | null>(null)
  const [latest, setLatest] = useState<Music[] | null>(null)
  const [recs, setRecs] = useState<Recommendation[] | null>(null)
  const [error, setError] = useState(false)

  const load = useCallback(async () => {
    setError(false)
    try {
      const [rk, lt] = await Promise.all([getRanking(50), getLatest(20)])
      setRanking(rk)
      setLatest(lt)
    } catch {
      setError(true)
      setRanking([])
      setLatest([])
    }
    if (token) {
      ensureFavs()
      dailyRecommendations()
        .then(setRecs)
        .catch(() => setRecs([]))
    } else {
      setRecs([])
    }
  }, [token, ensureFavs])

  useEffect(() => {
    load()
  }, [load])

  const recTracks: Music[] = (recs ?? []).map((r) => ({
    id: r.musicId,
    title: r.title,
    artist: r.artist,
    album: r.album,
    duration: 0,
    coverUrl: `/api/music/cover/${r.musicId}`,
    tags: r.tags,
  }))

  const playDaily = () => {
    if (recTracks.length === 0) return
    playQueue(recTracks.map(toTrack))
  }

  return (
    <div className="page home">
      <header className="home-head">
        <div className="home-brand">
          <Logo size={44} />
          <div>
            <h1>{t('app.name')}</h1>
            <p className="home-slogan">{t('app.slogan')}</p>
          </div>
        </div>
        <button className="avatar-btn" onClick={() => navigate('/me')} aria-label={t('nav.me')}>
          {user ? (
            <img
              key={user.id}
              src={apiUrl(`/api/user/avatar/${user.id}`)}
              alt={user.username}
              onError={(e) => ((e.target as HTMLImageElement).style.visibility = 'hidden')}
            />
          ) : (
            <Icon name="user" size={22} />
          )}
        </button>
      </header>

      <div className="home-hello">
        <p className="hello-line">
          {t(greetingKey())}
          {user ? `，${user.username}` : ''}
        </p>
        <h2>{t('home.today')}</h2>
      </div>

      {/* 每日推荐 */}
      {recs && recs.length > 0 && (
        <section className="daily-card">
          <div className="daily-glow" aria-hidden="true" />
          <div className="daily-cat" aria-hidden="true">
            <Logo size={72} />
          </div>
          <div className="daily-info">
            <p className="daily-title">{t('home.dailyRec')}</p>
            <p className="daily-sub">{t('home.dailySub')}</p>
            <div className="daily-pick">
              {recTracks.slice(0, 3).map((r) => (
                <span key={r.id} className="truncate">
                  {r.title}
                </span>
              ))}
            </div>
          </div>
          <button className="btn btn-play" onClick={playDaily}>
            <Icon name="play" size={18} />
            {t('home.playDaily')}
          </button>
        </section>
      )}
      {recs && recs.length === 0 && token && (
        <section className="daily-card daily-empty">
          <div className="daily-info">
            <p className="daily-title">{t('home.dailyRec')}</p>
            <p className="daily-sub">{t('home.dailyEmpty')}</p>
          </div>
        </section>
      )}

      {/* 热门排行 */}
      <section className="home-section">
        <div className="section-head">
          <div>
            <h3>{t('home.ranking')}</h3>
            <p className="section-sub">{t('home.rankingSub')}</p>
          </div>
        </div>
        {ranking === null ? (
          <ListSkeleton rows={6} />
        ) : (
          <TrackList tracks={ranking} showIndex startIndex={0} />
        )}
      </section>

      {/* 最新上架 */}
      <section className="home-section">
        <div className="section-head">
          <div>
            <h3>{t('home.latest')}</h3>
            <p className="section-sub">{t('home.latestSub')}</p>
          </div>
          <Link className="section-more" to="/search">
            {t('home.viewAll')}
            <Icon name="chevronRight" size={16} />
          </Link>
        </div>
        {latest === null ? (
          <div className="hscroll-skeleton">
            {Array.from({ length: 5 }).map((_, i) => (
              <div className="hs-card" key={i}>
                <div className="skeleton skeleton-cover-lg" />
              </div>
            ))}
          </div>
        ) : (
          <div className="hscroll">
            {latest.map((m) => (
              <button
                key={m.id}
                className="hs-card"
                onClick={() => playQueue([toTrack(m)])}
              >
                <Cover src={m.coverUrl} musicId={m.id} rounded={14} />
                <span className="hs-title truncate2">{m.title}</span>
                <span className="hs-artist truncate">{m.artist}</span>
              </button>
            ))}
          </div>
        )}
      </section>

      {error && (
        <button className="btn btn-ghost" onClick={load}>
          {t('common.retry')}
        </button>
      )}
    </div>
  )
}

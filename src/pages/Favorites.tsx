import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Music } from '../types'
import { getFavorites } from '../api'
import { useAuth } from '../store/auth'
import { usePlayer, toTrack } from '../store/player'
import { useT } from '../i18n'
import { Icon } from '../components/Icon'
import { TrackList } from '../components/TrackList'
import { EmptyState, ListSkeleton, PageHead } from '../components/ui'

export function Favorites() {
  const t = useT()
  const navigate = useNavigate()
  const token = useAuth((s) => s.token)
  const playQueue = usePlayer((s) => s.playQueue)
  const [list, setList] = useState<Music[] | null>(null)

  useEffect(() => {
    if (!token) {
      setList([])
      return
    }
    let alive = true
    getFavorites()
      .then((l) => alive && setList(l))
      .catch(() => alive && setList([]))
    return () => {
      alive = false
    }
  }, [token])

  if (!token) {
    return (
      <div className="page">
        <PageHead onBack={() => navigate(-1)} title={t('fav.title')} />
        <EmptyState
          text={t('common.loginRequired')}
          action={
            <button className="btn btn-primary" onClick={() => navigate('/me')}>
              {t('auth.toLogin')}
            </button>
          }
        />
      </div>
    )
  }

  return (
    <div className="page">
      <PageHead onBack={() => navigate(-1)} title={t('fav.title')} />
      {list === null ? (
        <ListSkeleton rows={6} />
      ) : list.length > 0 ? (
        <>
          <div className="list-toolbar">
            <button className="btn btn-primary btn-sm" onClick={() => playQueue(list.map(toTrack))}>
              <Icon name="play" size={16} />
              {t('common.playAll')}
            </button>
          </div>
          <TrackList tracks={list} />
        </>
      ) : (
        <EmptyState text={t('fav.empty')} />
      )}
    </div>
  )
}

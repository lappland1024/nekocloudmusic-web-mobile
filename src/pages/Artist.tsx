import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import type { ArtistResult, Music } from '../types'
import { searchArtist } from '../api'
import { useToast } from '../store/ui'
import { useT } from '../i18n'
import { Icon } from '../components/Icon'
import { Logo } from '../components/Logo'
import { TrackList } from '../components/TrackList'
import { ListSkeleton, PageHead } from '../components/ui'

export function Artist() {
  const t = useT()
  const navigate = useNavigate()
  const { name = '' } = useParams<{ name: string }>()
  const toast = useToast((s) => s.toast)

  const [artist, setArtist] = useState<ArtistResult | null>(null)
  const [works, setWorks] = useState<Music[]>([])

  useEffect(() => {
    let alive = true
    const query = decodeURIComponent(name)
    searchArtist(query)
      .then((r) => {
        if (!alive) return
        if (r.name && r.musicList) {
          setArtist(r)
          setWorks(r.musicList)
        } else {
          setArtist(null)
          setWorks([])
        }
      })
      .catch((e) => {
        if (!alive) return
        setArtist(null)
        setWorks([])
        toast(String((e as Error).message), 'error')
      })
    return () => {
      alive = false
    }
  }, [name, toast])

  return (
    <div className="page">
      <PageHead onBack={() => navigate(-1)} title={artist?.name ?? t('track.viewArtist')} />

      {artist === null ? (
        <ListSkeleton rows={6} />
      ) : (
        <>
          <div className="artist-hero">
          <div className="artist-avatar">
            <Logo size={64} />
          </div>
            <h2 className="artist-name">{artist.name}</h2>
            <p className="artist-count">
              <Icon name="mic" size={14} />
              {t('search.artist.count', { count: artist.musicCount })}
            </p>
          </div>

          <h3 className="list-section-title">{t('search.artist.works')}</h3>
          {works.length > 0 ? (
            <TrackList tracks={works} />
          ) : (
            <div className="empty">
              <Logo size={80} />
              <p className="empty-text">{t('search.noResult')}</p>
            </div>
          )}
        </>
      )}
    </div>
  )
}

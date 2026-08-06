import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import type { Music, Playlist as PlaylistType } from '../types'
import {
  deletePlaylist,
  favoritePlaylist,
  getFavoritePlaylists,
  getPlaylistDetail,
  getPlaylistMusic,
  removeMusicFromPlaylist,
  unfavoritePlaylist,
  updatePlaylist,
} from '../api'
import { useAuth } from '../store/auth'
import { usePlayer, toTrack } from '../store/player'
import { useToast } from '../store/ui'
import { useT } from '../i18n'
import { Icon } from '../components/Icon'
import { Cover } from '../components/Cover'
import { TrackList } from '../components/TrackList'
import { ListSkeleton, PageHead, Sheet, EmptyState } from '../components/ui'

export function Playlist() {
  const t = useT()
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const pid = Number(id)

  const user = useAuth((s) => s.user)
  const token = useAuth((s) => s.token)
  const playQueue = usePlayer((s) => s.playQueue)
  const toast = useToast((s) => s.toast)
  const askConfirm = useToast((s) => s.askConfirm)

  const [detail, setDetail] = useState<PlaylistType | null>(null)
  const [music, setMusic] = useState<Music[] | null>(null)
  const [fav, setFav] = useState(false)
  const [manage, setManage] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [name, setName] = useState('')
  const [desc, setDesc] = useState('')

  useEffect(() => {
    let alive = true
    setDetail(null)
    setMusic(null)
    setManage(false)
    Promise.all([getPlaylistDetail(pid), getPlaylistMusic(pid)])
      .then(([d, m]) => {
        if (!alive) return
        setDetail(d)
        setMusic(m)
        setName(d.name)
        setDesc(d.description ?? '')
      })
      .catch((e) => toast(String((e as Error).message), 'error'))
    if (token) {
      getFavoritePlaylists()
        .then((list) => alive && setFav(list.some((p) => p.id === pid)))
        .catch(() => {})
    } else {
      setFav(false)
    }
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pid, token])

  const isOwner = !!user && detail?.userId === user.id

  const toggleFav = async () => {
    if (!token) {
      toast('common.loginRequired', 'info')
      return
    }
    try {
      if (fav) {
        await unfavoritePlaylist(pid)
        toast('playlist.unfavorite', 'success')
        setFav(false)
      } else {
        await favoritePlaylist(pid)
        toast('playlist.favorite', 'success')
        setFav(true)
      }
    } catch (e) {
      toast(String((e as Error).message), 'error')
    }
  }

  const saveEdit = async () => {
    if (!name.trim()) {
      toast('playlist.nameRequired', 'info')
      return
    }
    try {
      await updatePlaylist(pid, name.trim(), desc.trim() || undefined)
      setDetail((d) => (d ? { ...d, name: name.trim(), description: desc.trim() } : d))
      setEditOpen(false)
      toast('playlist.renamed', 'success')
    } catch (e) {
      toast(String((e as Error).message), 'error')
    }
  }

  const removeTrack = (trackId: number) => async () => {
    try {
      await removeMusicFromPlaylist(pid, [trackId])
      setMusic((m) => (m ? m.filter((x) => x.id !== trackId) : m))
      setDetail((d) => (d ? { ...d, musicCount: Math.max(0, d.musicCount - 1) } : d))
      toast('playlist.removed', 'success')
    } catch (e) {
      toast(String((e as Error).message), 'error')
    }
  }

  const del = async () => {
    try {
      await deletePlaylist(pid)
      toast('playlist.deleted', 'success')
      navigate('/my-playlists', { replace: true })
    } catch (e) {
      toast(String((e as Error).message), 'error')
    }
  }

  const loading = !detail || !music

  return (
    <div className="page playlist-page">
      <PageHead
        onBack={() => navigate(-1)}
        title={detail?.name}
        right={
          isOwner && detail && music ? (
            <button
              className={`icon-btn ${manage ? 'active' : ''}`}
              onClick={() => setManage((v) => !v)}
              aria-label={t('playlist.manage')}
            >
              <Icon name="sliders" size={20} />
            </button>
          ) : undefined
        }
      />

      {detail && music && (
        <>
          <div className="pl-hero">
            <div className="pl-hero-cover">
              {music.length > 0 ? (
                <Cover src={music[0].coverUrl} musicId={music[0].id} rounded={18} />
              ) : (
                <div className="cover cover-fallback pl-hero-placeholder">
                  <Icon name="folder" size={48} />
                </div>
              )}
            </div>
            <div className="pl-hero-info">
              <h2 className="truncate2">{detail.name}</h2>
              <p>
                {detail.creator?.username ?? ''}
                {detail.creator?.username ? ' · ' : ''}
                {t('playlist.tracks', { count: detail.musicCount })}
              </p>
              {detail.description && <p className="pl-desc truncate2">{detail.description}</p>}
            </div>
          </div>

          <div className="pl-actions">
            <button
              className="btn btn-primary"
              onClick={() => music.length > 0 && playQueue(music.map(toTrack))}
              disabled={music.length === 0}
            >
              <Icon name="play" size={18} />
              {t('common.playAll')}
            </button>
            <button className={`btn ${fav ? 'btn-fav' : 'btn-ghost'}`} onClick={toggleFav}>
              <Icon name={fav ? 'heartFill' : 'heart'} size={18} />
              {fav ? t('playlist.favorited') : t('playlist.favorite')}
            </button>
            {isOwner && (
              <button className="btn btn-ghost" onClick={() => setManage((v) => !v)}>
                <Icon name="sliders" size={18} />
                {t('playlist.manage')}
              </button>
            )}
          </div>

          {isOwner && manage && (
            <div className="pl-manage-bar">
              <button className="link-btn" onClick={() => { setName(detail.name); setDesc(detail.description ?? ''); setEditOpen(true) }}>
                <Icon name="edit" size={16} />
                {t('playlist.rename')}
              </button>
              <button
                className="link-btn danger"
                onClick={() =>
                  askConfirm({
                    title: t('playlist.delete'),
                    text: t('playlist.deleteConfirm'),
                    danger: true,
                    okText: t('common.delete'),
                    onOk: del,
                  })
                }
              >
                <Icon name="trash" size={16} />
                {t('playlist.delete')}
              </button>
            </div>
          )}

          {music.length > 0 ? (
            <TrackList
              tracks={music}
              extraActions={(tr) =>
                isOwner && manage
                  ? [
                      {
                        key: 'remove',
                        label: t('playlist.removeFrom'),
                        icon: 'trash',
                        danger: true,
                        onClick: () =>
                          askConfirm({
                            text: t('playlist.removeConfirm'),
                            danger: true,
                            okText: t('common.delete'),
                            onOk: removeTrack(tr.id),
                          }),
                      },
                    ]
                  : []
              }
            />
          ) : (
            <EmptyState text={t('playlist.empty')} />
          )}
        </>
      )}

      {loading && <ListSkeleton rows={8} />}

      {/* 重命名弹层 */}
      <Sheet open={editOpen} onClose={() => setEditOpen(false)} title={t('playlist.rename')}>
        <div className="form">
          <label className="field">
            <span>{t('playlist.name')}</span>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} maxLength={255} />
          </label>
          <label className="field">
            <span>{t('playlist.desc')}</span>
            <textarea className="input" value={desc} onChange={(e) => setDesc(e.target.value)} maxLength={500} rows={3} />
          </label>
          <button className="btn btn-primary" onClick={saveEdit}>
            {t('common.save')}
          </button>
        </div>
      </Sheet>
    </div>
  )
}

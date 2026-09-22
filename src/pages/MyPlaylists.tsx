import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Playlist } from '../types'
import {
  createPlaylist,
  deletePlaylist,
  getFavoritePlaylists,
  getMyPlaylists,
  unfavoritePlaylist,
} from '../api'
import { useAuth } from '../store/auth'
import { useToast } from '../store/ui'
import { useT } from '../i18n'
import { Icon } from '../components/Icon'
import { Cover } from '../components/Cover'
import { EmptyState, ListSkeleton, PageHead, Sheet } from '../components/ui'

export function MyPlaylists() {
  const t = useT()
  const navigate = useNavigate()
  const token = useAuth((s) => s.token)
  const toast = useToast((s) => s.toast)
  const askConfirm = useToast((s) => s.askConfirm)

  const [mine, setMine] = useState<Playlist[] | null>(null)
  const [favs, setFavs] = useState<Playlist[] | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [name, setName] = useState('')
  const [desc, setDesc] = useState('')
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    if (!token) {
      setMine([])
      setFavs([])
      return
    }
    try {
      const [m, f] = await Promise.all([getMyPlaylists(), getFavoritePlaylists()])
      setMine(m.playlists)
      setFavs(f)
    } catch (e) {
      toast(String((e as Error).message), 'error')
    }
  }, [token, toast])

  useEffect(() => {
    load()
  }, [load])

  const create = async () => {
    if (!name.trim()) {
      toast('playlist.nameRequired', 'info')
      return
    }
    setBusy(true)
    try {
      const p = await createPlaylist(name.trim(), desc.trim() || undefined)
      toast('playlist.created', 'success')
      setCreateOpen(false)
      setName('')
      setDesc('')
      setMine((s) => (s ? [p, ...s] : [p]))
    } catch (e) {
      toast(String((e as Error).message), 'error')
    } finally {
      setBusy(false)
    }
  }

  const removeMine = (p: Playlist) => {
    askConfirm({
      title: p.name,
      text: t('playlist.deleteConfirm'),
      danger: true,
      okText: t('common.delete'),
      onOk: async () => {
        try {
          await deletePlaylist(p.id)
          setMine((s) => (s ? s.filter((x) => x.id !== p.id) : s))
          toast('playlist.deleted', 'success')
        } catch (e) {
          toast(String((e as Error).message), 'error')
        }
      },
    })
  }

  const unfav = (p: Playlist) => {
    unfavoritePlaylist(p.id)
      .then(() => {
        setFavs((s) => (s ? s.filter((x) => x.id !== p.id) : s))
        toast('playlist.unfavorite', 'success')
      })
      .catch((e) => toast(String((e as Error).message), 'error'))
  }

  if (!token) {
    return (
      <div className="page">
        <PageHead onBack={() => navigate(-1)} title={t('playlist.my')} />
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
      <PageHead
        onBack={() => navigate(-1)}
        title={t('playlist.my')}
        right={
          <div className="page-head-btns">
            <button className="icon-btn" onClick={() => navigate('/import')} aria-label={t('import.title')}>
              <Icon name="download" size={20} />
            </button>
            <button className="icon-btn" onClick={() => setCreateOpen(true)} aria-label={t('playlist.new')}>
              <Icon name="plus" size={22} />
            </button>
          </div>
        }
      />

      {mine === null || favs === null ? (
        <ListSkeleton rows={6} />
      ) : (
        <>
          <section className="list-section">
            <h3 className="list-section-title">{t('playlist.my')}</h3>
            {mine.length > 0 ? (
              <div className="playlist-grid">
                {mine.map((p) => (
                  <div key={p.id} className="pl-card" onClick={() => navigate(`/playlist/${p.id}`)}>
                    <Cover src={p.firstMusicCover} musicId={p.firstMusicId} className="pl-card-cover" rounded={14} />
                    <button
                      className="icon-btn pl-card-action"
                      onClick={(e) => {
                        e.stopPropagation()
                        // 直接走带完整文案的删除确认，避免空正文二次弹窗
                        removeMine(p)
                      }}
                      aria-label={t('playlist.delete')}
                    >
                      <Icon name="trash" size={15} />
                    </button>
                    <span className="pl-card-name truncate2">{p.name}</span>
                    <span className="pl-card-meta truncate">
                      {p.musicCount} {t('common.song')}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="list-empty-note">
                {t('playlist.myEmpty')}
                <button className="link-btn" onClick={() => setCreateOpen(true)}>
                  {t('playlist.createFirst')}
                </button>
              </p>
            )}
          </section>

          <section className="list-section">
            <h3 className="list-section-title">{t('me.favPlaylists')}</h3>
            {favs.length > 0 ? (
              <div className="playlist-grid">
                {favs.map((p) => (
                  <div key={p.id} className="pl-card" onClick={() => navigate(`/playlist/${p.id}`)}>
                    <Cover src={p.firstMusicCover} musicId={p.firstMusicId} className="pl-card-cover" rounded={14} />
                    <button
                      className="icon-btn pl-card-action"
                      onClick={(e) => {
                        e.stopPropagation()
                        unfav(p)
                      }}
                      aria-label={t('playlist.unfavorite')}
                    >
                      <Icon name="heartFill" size={15} />
                    </button>
                    <span className="pl-card-name truncate2">{p.name}</span>
                    <span className="pl-card-meta truncate">
                      {p.creator?.username ? `${p.creator.username} · ` : ''}
                      {p.musicCount} {t('common.song')}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="list-empty-note">{t('playlist.favEmpty')}</p>
            )}
          </section>
        </>
      )}

      <Sheet open={createOpen} onClose={() => setCreateOpen(false)} title={t('playlist.new')}>
        <div className="form">
          <p className="sheet-note">{t('playlist.newHint')}</p>
          <label className="field">
            <span>{t('playlist.name')}</span>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} maxLength={255} autoFocus />
          </label>
          <label className="field">
            <span>{t('playlist.desc')}</span>
            <textarea className="input" value={desc} onChange={(e) => setDesc(e.target.value)} maxLength={500} rows={3} />
          </label>
          <button className="btn btn-primary" onClick={create} disabled={busy}>
            {t('common.save')}
          </button>
        </div>
      </Sheet>
    </div>
  )
}

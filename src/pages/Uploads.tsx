import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Music } from '../types'
import { getUploadedMusic, uploadMusic } from '../api'
import { useAuth } from '../store/auth'
import { useToast } from '../store/ui'
import { useT } from '../i18n'
import { Icon } from '../components/Icon'
import { TrackList } from '../components/TrackList'
import { EmptyState, ListSkeleton, PageHead } from '../components/ui'

const LANGUAGES: { value: string; key: string }[] = [
  { value: '中文', key: 'upload.language.zh' },
  { value: '粤语', key: 'upload.language.yue' },
  { value: '上海语', key: 'upload.language.sh' },
  { value: '英文', key: 'upload.language.en' },
  { value: '日语', key: 'upload.language.jp' },
  { value: '韩语', key: 'upload.language.kr' },
  { value: '法语', key: 'upload.language.fr' },
  { value: '德语', key: 'upload.language.de' },
  { value: '俄语', key: 'upload.language.ru' },
  { value: '纯音乐', key: 'upload.language.instrumental' },
]

export function Uploads() {
  const t = useT()
  const navigate = useNavigate()
  const user = useAuth((s) => s.user)
  const token = useAuth((s) => s.token)
  const toast = useToast((s) => s.toast)

  const [tab, setTab] = useState<'list' | 'form'>('list')
  const [list, setList] = useState<Music[] | null>(null)

  const [title, setTitle] = useState('')
  const [artist, setArtist] = useState('')
  const [album, setAlbum] = useState('')
  const [language, setLanguage] = useState('中文')
  const [tags, setTags] = useState('')
  const [duration, setDuration] = useState(0)
  const [musicFile, setMusicFile] = useState<File | null>(null)
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [lyricsFile, setLyricsFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [readingDur, setReadingDur] = useState(false)

  const audioRef = useRef<HTMLAudioElement | null>(null)
  // 记录当前待读取的 object URL，换文件/卸载时释放，避免泄漏
  const objectUrlRef = useRef<string | null>(null)

  useEffect(() => {
    if (!token) return
    getUploadedMusic()
      .then(setList)
      .catch(() => setList([]))
  }, [token])

  // 卸载时释放未完成的 object URL
  useEffect(() => {
    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current)
        objectUrlRef.current = null
      }
    }
  }, [])

  const onPickFile = (f: File | null) => {
    setMusicFile(f)
    if (!f) return
    // 换文件时先释放上一个未读完的 object URL
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current)
      objectUrlRef.current = null
    }
    setReadingDur(true)
    const url = URL.createObjectURL(f)
    objectUrlRef.current = url
    const a = audioRef.current ?? new Audio()
    audioRef.current = a
    a.preload = 'metadata'
    a.src = url
    a.onloadedmetadata = () => {
      setDuration(Math.round(a.duration))
      setReadingDur(false)
      if (objectUrlRef.current === url) {
        URL.revokeObjectURL(url)
        objectUrlRef.current = null
      }
    }
    a.onerror = () => {
      setReadingDur(false)
      if (objectUrlRef.current === url) {
        URL.revokeObjectURL(url)
        objectUrlRef.current = null
      }
    }
  }

  const submit = async () => {
    if (!musicFile) {
      toast('upload.needFile', 'info')
      return
    }
    if (!title.trim()) {
      toast('upload.needTitle', 'info')
      return
    }
    if (!artist.trim()) {
      toast('upload.needArtist', 'info')
      return
    }
    if (!user) {
      toast('common.loginRequired', 'info')
      return
    }
    const fd = new FormData()
    fd.append('title', title.trim())
    fd.append('artist', artist.trim())
    fd.append('language', language)
    if (album.trim()) fd.append('album', album.trim())
    if (tags.trim()) fd.append('tags', tags.trim())
    fd.append('duration', String(duration))
    fd.append('uploadUserId', String(user.id))
    fd.append('musicFile', musicFile)
    if (coverFile) fd.append('coverFile', coverFile)
    if (lyricsFile) fd.append('lyricsFile', lyricsFile)

    setBusy(true)
    try {
      await uploadMusic(fd)
      toast('upload.success', 'success')
      setTitle('')
      setArtist('')
      setAlbum('')
      setTags('')
      setDuration(0)
      setMusicFile(null)
      setCoverFile(null)
      setLyricsFile(null)
      setTab('list')
      const l = await getUploadedMusic()
      setList(l)
    } catch (e) {
      toast(String((e as Error).message), 'error')
    } finally {
      setBusy(false)
    }
  }

  if (!token) {
    return (
      <div className="page">
        <PageHead onBack={() => navigate(-1)} title={t('upload.myUploads')} />
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
      <PageHead onBack={() => navigate(-1)} title={t('upload.myUploads')} />
      <div className="segmented">
        <button className={`seg ${tab === 'list' ? 'active' : ''}`} onClick={() => setTab('list')}>
          {t('upload.myUploads')}
        </button>
        <button className={`seg ${tab === 'form' ? 'active' : ''}`} onClick={() => setTab('form')}>
          {t('upload.title')}
        </button>
      </div>

      {tab === 'list' ? (
        list === null ? (
          <ListSkeleton rows={5} />
        ) : list.length > 0 ? (
          <TrackList tracks={list} />
        ) : (
          <EmptyState
            text={t('upload.empty')}
            action={
              <button className="btn btn-primary" onClick={() => setTab('form')}>
                <Icon name="upload" size={18} />
                {t('upload.title')}
              </button>
            }
          />
        )
      ) : (
        <div className="form upload-form">
          <p className="sheet-note">{t('upload.subtitle')}</p>

          <label className="field">
            <span>{t('upload.form.title')}</span>
            <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} />
          </label>
          <label className="field">
            <span>{t('upload.form.artist')}</span>
            <input className="input" value={artist} onChange={(e) => setArtist(e.target.value)} maxLength={120} />
          </label>
          <label className="field">
            <span>{t('upload.form.album')}</span>
            <input className="input" value={album} onChange={(e) => setAlbum(e.target.value)} maxLength={120} />
          </label>

          <div className="field-row">
            <label className="field">
              <span>{t('upload.form.language')}</span>
              <select className="input" value={language} onChange={(e) => setLanguage(e.target.value)}>
                {LANGUAGES.map((l) => (
                  <option key={l.value} value={l.value}>
                    {t(l.key)}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>
                {t('upload.form.duration')}
                {readingDur ? ` · ${t('upload.readingDuration')}` : ''}
              </span>
              <input
                className="input"
                type="number"
                min={1}
                value={duration || ''}
                onChange={(e) => setDuration(Number(e.target.value) || 0)}
              />
            </label>
          </div>

          <label className="field">
            <span>{t('upload.form.tags')}</span>
            <input className="input" value={tags} onChange={(e) => setTags(e.target.value)} maxLength={200} />
          </label>

          <div className="field">
            <span>{t('upload.form.file')} *</span>
            <label className="file-input">
              <input type="file" accept=".mp3,.flac,.wav,audio/*" onChange={(e) => onPickFile(e.target.files?.[0] ?? null)} />
              <Icon name="music" size={20} />
              <span className="truncate">{musicFile ? musicFile.name : t('upload.form.filePlaceholder')}</span>
            </label>
          </div>

          <div className="field">
            <span>{t('upload.form.cover')}</span>
            <label className="file-input">
              <input type="file" accept="image/*" onChange={(e) => setCoverFile(e.target.files?.[0] ?? null)} />
              <Icon name="disc" size={20} />
              <span className="truncate">{coverFile ? coverFile.name : t('upload.form.coverPlaceholder')}</span>
            </label>
          </div>

          <div className="field">
            <span>{t('upload.form.lyrics')}</span>
            <label className="file-input">
              <input type="file" accept=".lrc,text/plain" onChange={(e) => setLyricsFile(e.target.files?.[0] ?? null)} />
              <Icon name="lyrics" size={20} />
              <span className="truncate">{lyricsFile ? lyricsFile.name : t('upload.form.lyricsPlaceholder')}</span>
            </label>
          </div>

          <button className="btn btn-primary btn-lg" onClick={submit} disabled={busy}>
            <Icon name="upload" size={20} />
            {busy ? t('common.loading') : t('upload.submit')}
          </button>
        </div>
      )}
    </div>
  )
}

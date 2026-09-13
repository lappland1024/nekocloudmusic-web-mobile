import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { RecognizedTrack } from '../types'
import { recognizeMusic } from '../api'
import { usePlayer, toTrack } from '../store/player'
import { useToast } from '../store/ui'
import { useT } from '../i18n'
import { Icon } from '../components/Icon'
import { Cover } from '../components/Cover'
import { PageHead, Spinner } from '../components/ui'

type Phase = 'idle' | 'recording' | 'recognizing' | 'result' | 'nomatch'

const MAX_SECONDS = 15
const MIN_SECONDS = 3

/** 听歌识曲：MediaRecorder 录音（或本地文件）→ POST /api/music/recognize */
export function Recognize() {
  const t = useT()
  const navigate = useNavigate()
  const playQueue = usePlayer((s) => s.playQueue)
  const addToQueue = usePlayer((s) => s.addToQueue)
  const toast = useToast((s) => s.toast)

  const [phase, setPhase] = useState<Phase>('idle')
  const [elapsed, setElapsed] = useState(0)
  const [result, setResult] = useState<RecognizedTrack | null>(null)

  const recorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<number | null>(null)
  const startedAtRef = useRef(0)

  // 卸载时释放麦克风与计时器
  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current)
      streamRef.current?.getTracks().forEach((tr) => tr.stop())
    }
  }, [])

  const cleanupRecording = () => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current)
      timerRef.current = null
    }
    streamRef.current?.getTracks().forEach((tr) => tr.stop())
    streamRef.current = null
    recorderRef.current = null
  }

  const recognize = async (blob: Blob, filename: string) => {
    setPhase('recognizing')
    try {
      const { matched, data } = await recognizeMusic(blob, filename)
      if (matched && data) {
        setResult(data)
        setPhase('result')
      } else {
        setResult(null)
        setPhase('nomatch')
      }
    } catch (e) {
      toast(String((e as Error).message), 'error')
      setPhase('idle')
    }
  }

  const startRecording = async () => {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      toast('recognize.micUnsupported', 'info')
      return
    }
    let stream: MediaStream
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch {
      toast('recognize.micDenied', 'error')
      return
    }
    streamRef.current = stream
    chunksRef.current = []
    // iOS Safari 只支持 audio/mp4，其他走 audio/webm
    const mime = MediaRecorder.isTypeSupported('audio/mp4')
      ? 'audio/mp4'
      : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : ''
    const recorder = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream)
    const ext = mime.includes('mp4') ? 'm4a' : 'webm'
    recorderRef.current = recorder
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data)
    }
    recorder.onstop = () => {
      const seconds = (Date.now() - startedAtRef.current) / 1000
      const type = recorder.mimeType || mime || 'audio/webm'
      const blob = new Blob(chunksRef.current, { type })
      cleanupRecording()
      if (seconds < MIN_SECONDS || blob.size === 0) {
        toast('recognize.tooShort', 'info')
        setPhase('idle')
        return
      }
      void recognize(blob, `record.${ext}`)
    }
    startedAtRef.current = Date.now()
    setElapsed(0)
    setPhase('recording')
    recorder.start()
    timerRef.current = window.setInterval(() => {
      setElapsed((s) => {
        const next = s + 1
        if (next >= MAX_SECONDS && recorderRef.current?.state === 'recording') recorder.stop()
        return next
      })
    }, 1000)
  }

  const stopRecording = () => {
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop()
  }

  const toggle = () => {
    if (phase === 'recording') stopRecording()
    else if (phase === 'idle' || phase === 'nomatch') void startRecording()
  }

  const onPickFile = (f: File | null) => {
    if (!f) return
    if (f.size > 8 * 1024 * 1024) {
      toast('recognize.tooShort', 'info')
      return
    }
    void recognize(f, f.name)
  }

  const reset = () => {
    setResult(null)
    setElapsed(0)
    setPhase('idle')
  }

  const track = result ? toTrack(result) : null

  return (
    <div className="page recognize-page">
      <PageHead title={t('recognize.title')} onBack={() => navigate(-1)} />

      {phase === 'idle' && (
        <div className="recognize-center">
          <p className="recognize-hint">{t('recognize.hint')}</p>
          <button className="recognize-mic" onClick={toggle} aria-label={t('recognize.tapToStart')}>
            <Icon name="mic" size={44} />
          </button>
          <span className="recognize-status">{t('recognize.tapToStart')}</span>
          <label className="recognize-file">
            <input
              type="file"
              accept="audio/*,.mp3,.m4a,.wav,.flac,.webm,.ogg,.aac"
              hidden
              onChange={(e) => onPickFile(e.target.files?.[0] ?? null)}
            />
            <Icon name="folder" size={16} />
            {t('recognize.fromFile')}
          </label>
        </div>
      )}

      {phase === 'recording' && (
        <div className="recognize-center">
          <p className="recognize-hint">{t('recognize.listening')}</p>
          <button className="recognize-mic is-active" onClick={stopRecording} aria-label={t('recognize.tapToStop')}>
            <Icon name="mic" size={44} />
          </button>
          <span className="recognize-status">{MAX_SECONDS - elapsed}s</span>
        </div>
      )}

      {phase === 'recognizing' && (
        <div className="recognize-center">
          <div className="recognize-loading">
            <Spinner size={40} />
          </div>
          <span className="recognize-status">{t('recognize.searching')}</span>
        </div>
      )}

      {phase === 'nomatch' && (
        <div className="recognize-center">
          <div className="empty">
            <Icon name="search" size={40} />
            <p className="empty-text">{t('recognize.noMatch')}</p>
          </div>
          <button className="btn btn-primary" onClick={reset}>
            {t('recognize.retry')}
          </button>
          <label className="recognize-file">
            <input
              type="file"
              accept="audio/*,.mp3,.m4a,.wav,.flac,.webm,.ogg,.aac"
              hidden
              onChange={(e) => onPickFile(e.target.files?.[0] ?? null)}
            />
            <Icon name="folder" size={16} />
            {t('recognize.fromFile')}
          </label>
        </div>
      )}

      {phase === 'result' && result && track && (
        <div className="recognize-result">
          <p className="recognize-match-badge">
            <Icon name="check" size={16} />
            {t('recognize.matched')}
            {result.confidence != null && (
              <span className="recognize-confidence">
                {t('recognize.confidence', { pct: Math.round(result.confidence * 100) })}
              </span>
            )}
          </p>
          <div className="music-hero">
            <div className="music-hero-cover">
              <Cover src={result.coverUrl} musicId={result.id} rounded={20} />
            </div>
            <div className="music-hero-info">
              <h2 className="truncate2">{result.title}</h2>
              {result.artist && (
                <button
                  className="music-hero-artist truncate"
                  onClick={() => navigate(`/artist/${encodeURIComponent(result.artist)}`)}
                >
                  {result.artist}
                  <Icon name="chevronRight" size={14} />
                </button>
              )}
              <p className="music-hero-meta truncate">{result.album || t('common.unknown')}</p>
            </div>
          </div>
          <div className="daily-page-actions">
            <button className="btn btn-primary" onClick={() => playQueue([track])}>
              <Icon name="play" size={18} />
              {t('common.play')}
            </button>
            <button className="btn btn-ghost" onClick={() => addToQueue(track)}>
              <Icon name="plus" size={18} />
              {t('track.addQueue')}
            </button>
            <button className="btn btn-ghost" onClick={() => navigate(`/music/${result.id}`)}>
              <Icon name="info" size={18} />
              {t('track.info')}
            </button>
          </div>
          <button className="btn btn-ghost btn-lg" onClick={reset}>
            <Icon name="refresh" size={18} />
            {t('recognize.retry')}
          </button>
        </div>
      )}
    </div>
  )
}

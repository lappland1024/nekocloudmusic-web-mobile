import { useEffect, useState } from 'react'
import type { MusicInfo, Track } from '../types'
import { getMusicInfo } from '../api'
import { apiUrl } from '../api/client'
import { useT } from '../i18n'
import { formatDur } from '../utils/format'
import { Sheet } from './ui'

interface Props {
  track: Track
  onClose: () => void
}

/** 歌曲信息弹层：展示 GET /api/music/info/{id} 返回的详情与原始歌词 */
export function MusicInfoSheet({ track, onClose }: Props) {
  const t = useT()
  const [info, setInfo] = useState<MusicInfo | null>(null)

  useEffect(() => {
    let alive = true
    setInfo(null)
    getMusicInfo(track.id)
      .then((d) => {
        if (alive) setInfo(d)
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [track.id])

  return (
    <Sheet open onClose={onClose} title={t('track.info')}>
      {info ? (
        <div className="music-info">
          <div className="music-info-head">
            <img
              className="music-info-cover"
              src={apiUrl(info.coverUrl)}
              alt=""
              onError={(e) => ((e.target as HTMLImageElement).style.display = 'none')}
            />
            <div className="music-info-meta">
              <div className="music-info-title truncate2">{info.title}</div>
              <div className="truncate">{info.artist || t('common.unknown')}</div>
              <div className="truncate">{info.album || t('common.unknown')}</div>
              <div className="music-info-dur">{formatDur(info.duration)}</div>
            </div>
          </div>
          {info.lyrics ? (
            <pre className="music-info-lyrics">{info.lyrics}</pre>
          ) : (
            <p className="no-lyrics">{t('player.noLyrics')}</p>
          )}
        </div>
      ) : (
        <p className="sheet-note">{t('common.loading')}</p>
      )}
    </Sheet>
  )
}

import { useState } from 'react'
import type { Track, VideoRenderJob } from '../types'
import { createVideoRender } from '../api'
import { useAuth } from '../store/auth'
import { useToast } from '../store/ui'
import { useT } from '../i18n'
import { Icon } from './Icon'
import { Sheet } from './ui'

interface Props {
  track: Track
  onClose: () => void
}

/** 生成分享视频：水印确认 → 提交任务 → 提示邮件查收（含剩余次数） */
export function VideoShareSheet({ track, onClose }: Props) {
  const t = useT()
  const token = useAuth((s) => s.token)
  const isVip = useAuth((s) => !!s.user?.isVip)
  const toast = useToast((s) => s.toast)
  const [watermarked, setWatermarked] = useState(false)
  const [result, setResult] = useState<VideoRenderJob | null>(null)
  const [busy, setBusy] = useState(false)

  const submit = async () => {
    if (!token) return
    setBusy(true)
    try {
      // 非会员必须带水印（文档要求，后端也会 403）
      const r = await createVideoRender(track.id, 0, isVip ? watermarked : true)
      setResult(r)
    } catch (e) {
      toast(String((e as Error).message), 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Sheet open onClose={onClose} title={t('track.shareVideo')}>
      {!token ? (
        <div className="sheet-note">{t('common.loginRequired')}</div>
      ) : result ? (
        <div className="video-share-result">
          <p className="video-share-done">
            <Icon name="check" size={18} />
            {t('video.submitted')}
          </p>
          {result.remainingToday != null && (
            <p className="video-share-remaining">{t('video.remaining', { n: result.remainingToday })}</p>
          )}
        </div>
      ) : (
        <div className="video-share-form">
          <p className="sheet-note truncate2">
            {track.title} · {track.artist || t('common.unknown')}
          </p>
          {isVip ? (
            <label className="video-share-wm">
              <input
                type="checkbox"
                checked={watermarked}
                onChange={(e) => setWatermarked(e.target.checked)}
              />
              <span>{t('video.watermarkOn')}</span>
            </label>
          ) : (
            <p className="video-share-wm-note">
              <Icon name="info" size={14} />
              {t('video.watermarkHint')}
            </p>
          )}
          <button className="btn btn-primary" onClick={submit} disabled={busy}>
            {busy ? t('common.loading') : t('video.submit')}
          </button>
        </div>
      )}
    </Sheet>
  )
}

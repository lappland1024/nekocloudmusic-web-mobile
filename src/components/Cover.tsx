import { useState } from 'react'
import { apiUrl } from '../api/client'
import { Icon } from './Icon'

interface CoverProps {
  src?: string
  alt?: string
  className?: string
  /** 依据音乐 id 兜底拼接封面 */
  musicId?: number
  rounded?: number
}

/**
 * 封面图：失败/缺失时显示渐变占位 + 音符图标。
 */
export function Cover({ src, alt = '', className, musicId, rounded }: CoverProps) {
  const [failed, setFailed] = useState(false)
  const url = src
    ? src
    : musicId != null
      ? `/api/music/cover/${musicId}`
      : undefined

  const show = url && !failed

  return (
    <div
      className={`cover ${className ?? ''}`}
      style={rounded != null ? { borderRadius: rounded } : undefined}
    >
      {show ? (
        <img
          src={apiUrl(url!)}
          alt={alt}
          loading="lazy"
          onError={() => setFailed(true)}
          draggable={false}
        />
      ) : (
        <div className="cover-fallback">
          <Icon name="music" size={30} />
        </div>
      )}
    </div>
  )
}

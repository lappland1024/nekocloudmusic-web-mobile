/** 与 Neko歌姬计划 API 对齐的数据类型 */

export interface Music {
  id: number
  title: string
  artist: string
  album: string
  duration: number // 秒
  uploadUserId?: number
  createdAt?: string | number
  coverUrl?: string
  coverPath?: string | null
  language?: string
  tags?: string
  fileFormat?: string
  playCount?: number
  lrc?: boolean
  position?: number
}

/** 播放器队列条目（来源可以是搜索、排行榜、歌单等） */
export interface Track {
  id: number
  title: string
  artist: string
  album?: string
  duration: number
  coverUrl?: string
}

export interface User {
  id: number
  username: string
  email?: string
  createdAt?: string
  isVip?: boolean
  vipExpiresAt?: string | null
}

export interface Playlist {
  id: number
  userId: number
  name: string
  description?: string
  musicCount: number
  createdAt: string | number
  updatedAt?: string | number
  favoriteTime?: number
  firstMusicId?: number
  firstMusicCover?: string
  creator?: { id: number; username: string }
}

export interface Recommendation {
  rank: number
  musicId: number
  title: string
  artist: string
  album: string
  language?: string
  tags?: string
  score?: number
  source?: 'ai' | 'rule'
  reason?: string
}

export interface CaptchaChallenge {
  captchaToken: string
  bgImage: string
  sliderImage: string
  puzzleY: number
  bgWidth: number
  bgHeight: number
  sliderWidth: number
  sliderHeight: number
}

export interface VipPlan {
  id: number
  months: number
  days: number
  priceYuan: number
  sortOrder: number
  updatedAt: string
}

/** VIP 购买下单结果（outTradeNo 订单号 / payurl 收银台 / qrcode 二维码） */
export interface VipPayOrder {
  outTradeNo: string
  payurl: string
  qrcode: string
}

/** 分享视频渲染任务 */
export interface VideoRenderJob {
  jobId: string
  status: 'pending' | 'processing' | 'done' | 'failed'
  isVip?: boolean
  musicId?: number
  durationSec?: number
  watermarked?: boolean
  /** 仅非 VIP 返回：今日剩余免费次数 */
  remainingToday?: number
  downloadUrl?: string
  error?: string
}

/** 音乐详情（GET /api/music/info/{id}） */
export interface MusicInfo {
  id: number
  title: string
  artist: string
  album: string
  duration: number
  coverUrl: string
  fileUrl: string
  lyrics: string
}

export interface ArtistResult {
  name: string
  musicCount: number
  musicList: Music[]
}

/** 通用响应包裹 */
export interface ApiResponse<T = unknown> {
  success: boolean
  message?: string
  data?: T
}

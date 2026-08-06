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

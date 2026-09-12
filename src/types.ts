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

/** VIP 购买下单结果（Z-Pay 网关）
 *  注意：qrcode 与 payurl 都是**支付链接**（不是图片），
 *  真正的二维码图片是 img；payurl2 是 H5 收银台地址。 */
export interface VipPayOrder {
  outTradeNo: string
  /** 网关订单号 */
  O_id?: string
  trade_no?: string
  /** 支付链接（PC/扫码用） */
  payurl: string
  /** H5 收银台链接（移动端浏览器直接跳转用） */
  payurl2?: string
  /** 同为支付链接，不是图片 */
  qrcode?: string
  /** 二维码图片地址 */
  img?: string
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

/** 音乐详情（GET /api/music/info/{id}）
 *  注意：实测该接口不返回歌词字段（文档与实际不符），歌词需另调 /api/music/lyrics/{id} */
export interface MusicInfo {
  id: number
  title: string
  artist: string
  album: string
  duration: number
  filePath?: string
  coverUrl?: string
  language?: string
  tags?: string
  uploadUserId?: number
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

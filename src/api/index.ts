import { request } from './client'
import type {
  ApiResponse,
  ArtistResult,
  CaptchaChallenge,
  Music,
  Playlist,
  Recommendation,
  User,
  VipPlan,
} from '../types'

interface LoginResult {
  user: User
  token: string
}

type Raw<T> = ApiResponse<T>

// ---------- 用户 ----------

export const login = (username: string, password: string) =>
  request<Raw<LoginResult>>('/api/user/login', { method: 'POST', body: { username, password }, auth: false })

export const register = (body: {
  username: string
  password: string
  email: string
  verificationCode: string
}) => request<Raw<LoginResult>>('/api/user/register', { method: 'POST', body, auth: false })

export const sendVerification = (body: {
  email: string
  username?: string
  captchaPassToken: string
}) => request<Raw<null>>('/api/user/send-verification', { method: 'POST', body, auth: false })

export const sendResetCode = (email: string) =>
  request<Raw<null>>('/api/user/send-reset-code', { method: 'POST', body: { email }, auth: false })

export const resetPassword = (body: { email: string; code: string; newPassword: string }) =>
  request<Raw<null>>('/api/user/reset-password', { method: 'POST', body, auth: false })

export const changePassword = (oldPassword: string, newPassword: string) =>
  request<Raw<null>>('/api/user/password/change', {
    method: 'POST',
    body: { oldPassword, newPassword },
  })

export const uploadAvatar = (file: File) => {
  const formData = new FormData()
  formData.append('avatar', file)
  return request<Raw<{ avatarPath: string }>>('/api/user/avatar/upload', {
    method: 'POST',
    formData,
  })
}

export const avatarUrl = (userId: number) => `/api/user/avatar/${userId}`

export const uploadMusic = (formData: FormData) =>
  request<Raw<{ id: number; status: string; createdAt: string }>>('/api/user/upload', {
    method: 'POST',
    formData,
  })

interface UploadedMusicResp extends ApiResponse {
  musicList?: Music[]
}

export const getUploadedMusic = async () => {
  const r = await request<UploadedMusicResp>('/api/user/uploaded-music')
  return r.musicList ?? []
}

// ---------- 收藏 ----------

interface FavoritesResp extends ApiResponse {
  favorites?: Music[]
}

export const getFavorites = async () => {
  const r = await request<FavoritesResp>('/api/user/favorites')
  return r.favorites ?? []
}

export const addFavorite = (musicIds: number[]) =>
  request<ApiResponse & { addedCount?: number }>('/api/user/favorites', {
    method: 'POST',
    body: { musicIds },
  })

export const removeFavorite = (musicId: number) =>
  request<Raw<null>>(`/api/user/favorites/${musicId}`, { method: 'DELETE' })

interface FavoritePlaylistsResp extends ApiResponse {
  playlists?: Playlist[]
}

export const getFavoritePlaylists = async () => {
  const r = await request<FavoritePlaylistsResp>('/api/user/favorite-playlists')
  return r.playlists ?? []
}

export const favoritePlaylist = (playlistId: number) =>
  request<Raw<null>>('/api/user/favorite-playlists', { method: 'POST', body: { playlistId } })

export const unfavoritePlaylist = (playlistId: number) =>
  request<Raw<null>>(`/api/user/favorite-playlists/${playlistId}`, { method: 'DELETE' })

interface FavoritePlaylistMusicResp extends ApiResponse {
  music?: Music[]
}

export const getFavoritePlaylistMusic = async (playlistId: number) => {
  const r = await request<FavoritePlaylistMusicResp>(
    `/api/user/favorite-playlists/${playlistId}`,
  )
  return r.music ?? []
}

interface DailyRecResp extends ApiResponse {
  data?: Recommendation[]
}

export const dailyRecommendations = async () => {
  const r = await request<DailyRecResp>('/api/user/recommendations/daily')
  return r.data ?? []
}

// ---------- 歌单 ----------

interface PlaylistsSearchResp extends ApiResponse {
  results?: Playlist[]
}

export const searchPlaylists = async (query: string) => {
  const r = await request<PlaylistsSearchResp>('/api/playlists/search', {
    method: 'POST',
    body: { query },
  })
  return r.results ?? []
}

interface PlaylistDetailResp extends ApiResponse {
  playlist?: Playlist
}

export const getPlaylistDetail = async (id: number) => {
  const r = await request<PlaylistDetailResp>(`/api/playlist/${id}`)
  return r.playlist!
}

interface PlaylistMusicResp extends ApiResponse {
  musicList?: Music[]
}

export const getPlaylistMusic = async (playlistId: number) => {
  const r = await request<PlaylistMusicResp>(`/api/user/playlist/music/${playlistId}`)
  return r.musicList ?? []
}

interface MyPlaylistsResp extends ApiResponse {
  playlists?: Playlist[]
  isVip?: boolean
  vipExpiresAt?: string | null
}

export const getMyPlaylists = async () => {
  const r = await request<MyPlaylistsResp>('/api/user/playlists')
  return { playlists: r.playlists ?? [], isVip: r.isVip, vipExpiresAt: r.vipExpiresAt }
}

interface CreatePlaylistResp extends ApiResponse {
  playlist?: Playlist
}

export const createPlaylist = async (name: string, description?: string) => {
  const r = await request<CreatePlaylistResp>('/api/user/playlist/create', {
    method: 'POST',
    body: { name, description },
  })
  return r.playlist!
}

export const updatePlaylist = async (id: number, name: string, description?: string) => {
  const r = await request<CreatePlaylistResp>('/api/user/playlist/update', {
    method: 'POST',
    body: { id, name, description },
  })
  return r.playlist!
}

export const deletePlaylist = (id: number) =>
  request<Raw<null>>('/api/user/playlist/delete', { method: 'POST', body: { id } })

export const addMusicToPlaylist = (playlistId: number, musicIds: number[]) =>
  request<ApiResponse & { addedCount?: number }>('/api/user/playlist/music/add', {
    method: 'POST',
    body: { playlistId, musicIds },
  })

export const removeMusicFromPlaylist = (playlistId: number, musicIds: number[]) =>
  request<ApiResponse & { removedCount?: number }>('/api/user/playlist/music/remove', {
    method: 'POST',
    body: { playlistId, musicIds },
  })

// ---------- 音乐 ----------

interface SearchMusicResp extends ApiResponse {
  results?: (Music | null)[]
}

export const searchMusic = async (query: string) => {
  const r = await request<SearchMusicResp>('/api/music/search', {
    method: 'POST',
    body: { query },
  })
  return (r.results ?? []).filter((m): m is Music => m != null)
}

interface SearchArtistResp extends ApiResponse {
  artist?: ArtistResult
}

export const searchArtist = async (query: string) => {
  const r = await request<SearchArtistResp>('/api/artists/search', {
    method: 'POST',
    body: { query },
  })
  return (
    r.artist ?? { name: '', musicCount: 0, musicList: [] }
  )
}

interface MusicInfoResp extends ApiResponse {
  data?: {
    id: number
    title: string
    artist: string
    album: string
    duration: number
    coverUrl: string
    fileUrl: string
    lyrics: string
  }
}

export const getMusicInfo = async (id: number) => {
  const r = await request<MusicInfoResp>(`/api/music/info/${id}`)
  return r.data!
}

interface LyricsResp extends ApiResponse {
  data?: string
}

export const getLyrics = async (id: number) => {
  const r = await request<LyricsResp>(`/api/music/lyrics/${id}`)
  return r.data ?? ''
}

interface MusicListResp extends ApiResponse {
  data?: Music[]
}

export const getRanking = async (limit = 50) => {
  const r = await request<MusicListResp>(`/api/music/ranking?limit=${limit}`)
  return r.data ?? []
}

export const getLatest = async (limit = 30) => {
  const r = await request<MusicListResp>(`/api/music/latest?limit=${limit}`)
  return r.data ?? []
}

// ---------- VIP ----------

interface VipPricingResp extends ApiResponse {
  data?: VipPlan[]
}

export const getVipPricing = async () => {
  const r = await request<VipPricingResp>('/api/vip/pricing')
  return r.data ?? []
}

// ---------- 人机验证 ----------

interface CaptchaResp extends ApiResponse {
  data?: CaptchaChallenge
}

export const getCaptcha = async () => {
  const r = await request<CaptchaResp>('/api/captcha/slider', { auth: false })
  return r.data!
}

interface CaptchaVerifyResp extends ApiResponse {
  data?: { captchaPassToken: string }
}

export const verifyCaptcha = async (captchaToken: string, captchaOffsetX: number) => {
  const r = await request<CaptchaVerifyResp>('/api/captcha/slider/verify', {
    method: 'POST',
    body: { captchaToken, captchaOffsetX },
    auth: false,
  })
  return r.data!
}

// ---------- 分享视频 ----------

interface VideoRenderResp extends ApiResponse {
  data?: {
    jobId: string
    status: string
    isVip: boolean
    durationSec: number
    watermarked: boolean
    musicId: number
    remainingToday?: number
  }
}

export const createVideoRender = async (musicId: number, startSec = 0, watermarked = true) => {
  const r = await request<VideoRenderResp>('/api/video/render/create', {
    method: 'POST',
    body: { musicId, startSec, watermarked },
  })
  return r.data!
}

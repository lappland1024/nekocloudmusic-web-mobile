import { create } from 'zustand'
import { useAuth } from './auth'
import { addFavorite, getFavorites, removeFavorite } from '../api'
import { useToast } from './ui'

interface FavState {
  ids: number[]
  loaded: boolean
  loading: boolean
  ensureLoaded: () => Promise<void>
  isFav: (id: number) => boolean
  toggle: (id: number) => Promise<void>
  reset: () => void
}

export const useFavorites = create<FavState>()((set, get) => ({
  ids: [],
  loaded: false,
  loading: false,

  ensureLoaded: async () => {
    const { loaded, loading } = get()
    if (loaded || loading) return
    const token = useAuth.getState().token
    if (!token) return
    set({ loading: true })
    try {
      const list = await getFavorites()
      // 请求期间登出/换账号：丢弃过期响应，避免把上一用户的收藏灌回状态
      if (useAuth.getState().token !== token) return
      set({ ids: list.map((m) => m.id), loaded: true })
    } catch {
      // 静默失败，下次再试
    } finally {
      // 仅当仍是同一账号时复位 loading（登出会走 reset 复位）
      if (useAuth.getState().token === token) set({ loading: false })
    }
  },

  isFav: (id) => get().ids.includes(id),

  toggle: async (id) => {
    const token = useAuth.getState().token
    const toast = useToast.getState().toast
    if (!token) {
      toast('common.loginRequired', 'info')
      return
    }
    const { ids } = get()
    const isFav = ids.includes(id)
    // 乐观更新
    set({ ids: isFav ? ids.filter((x) => x !== id) : [id, ...ids] })
    try {
      if (isFav) {
        await removeFavorite(id)
        toast('fav.removed', 'success')
      } else {
        await addFavorite([id])
        toast('fav.added', 'success')
      }
    } catch (e) {
      set({ ids }) // 回滚
      toast(String((e as Error).message), 'error')
    }
  },

  reset: () => set({ ids: [], loaded: false, loading: false }),
}))

// 登出时清空收藏缓存
useAuth.subscribe((s, prev) => {
  if (prev.token && !s.token) useFavorites.getState().reset()
})

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface AppearanceState {
  /** 自定义背景图外部 URL（空字符串表示不启用） */
  bgUrl: string
  /** 背景图不透明度 0–1 */
  bgOpacity: number
  setBgUrl: (u: string) => void
  setBgOpacity: (o: number) => void
  clearBg: () => void
}

export const useAppearance = create<AppearanceState>()(
  persist(
    (set) => ({
      bgUrl: '',
      bgOpacity: 0.35,
      setBgUrl: (bgUrl) => set({ bgUrl: bgUrl.trim() }),
      setBgOpacity: (bgOpacity) => set({ bgOpacity: Math.min(Math.max(bgOpacity, 0), 1) }),
      clearBg: () => set({ bgUrl: '' }),
    }),
    { name: 'neko-appearance' },
  ),
)

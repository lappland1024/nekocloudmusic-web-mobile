import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/** 主题风格：Neko 暖色 / iOS 液态玻璃 / 苹果官网风 */
export type ThemeStyle = 'neko' | 'ios' | 'apple'
/** 深浅模式：白天 / 黑夜 / 跟随系统 */
export type ThemeMode = 'light' | 'dark' | 'system'

interface ThemeState {
  style: ThemeStyle
  mode: ThemeMode
  setStyle: (s: ThemeStyle) => void
  setMode: (m: ThemeMode) => void
}

/** 解析 system 模式为实际深浅 */
export function resolveMode(mode: ThemeMode): 'light' | 'dark' {
  if (mode !== 'system') return mode
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

/** 生成写入 <html data-theme> 的复合值，如 neko-dark / ios-light */
export function resolveTheme(style: ThemeStyle, mode: ThemeMode): string {
  return `${style}-${resolveMode(mode)}`
}

export const useTheme = create<ThemeState>()(
  persist(
    (set) => ({
      style: 'ios',
      mode: 'system',
      setStyle: (style) => set({ style }),
      setMode: (mode) => set({ mode }),
    }),
    {
      name: 'neko-theme',
      // 兼容旧格式 { theme: 'dark'|'light'|'ios' } → { style, mode }
      // 注意：zustand v5 persist 传给 merge 的 persisted 是解包后的内层 state
      //（如 { style:'apple', mode:'system' } 或旧 { theme:'ios' }），不含 { state, version } 包装；
      // 为稳妥仍兼容带包装的形态。
      merge: (persisted, current) => {
        const p = persisted as
          | { state?: { theme?: string; style?: ThemeStyle; mode?: ThemeMode }; theme?: string; style?: ThemeStyle; mode?: ThemeMode }
          | undefined
        const s = p?.state ?? p
        const old = s?.theme
        if (old === 'dark' || old === 'light' || old === 'ios') {
          return {
            ...current,
            style: old === 'ios' ? 'ios' : 'neko',
            mode: old === 'ios' ? 'system' : old,
          }
        }
        return {
          ...current,
          style: (s?.style as ThemeStyle | undefined) ?? current.style,
          mode: (s?.mode as ThemeMode | undefined) ?? current.mode,
        }
      },
    },
  ),
)

import { create } from 'zustand'
import type { Track } from '../types'
import { translate, useLang } from '../i18n'

export type ToastType = 'info' | 'success' | 'error'

interface ToastItem {
  id: number
  text: string
  type: ToastType
}

interface ConfirmOpts {
  title?: string
  text: string
  okText?: string
  danger?: boolean
  onOk?: () => void | Promise<void>
}

export type TrackAction = {
  key: string
  label: string
  icon: string
  danger?: boolean
  onClick: () => void
}

/** 长按弹出的上下文菜单（iOS 式：按住滑动选择、松手执行） */
export interface ContextMenuState {
  track: Track
  x: number
  y: number
}

interface UIState {
  toasts: ToastItem[]
  toast: (keyOrText: string, type?: ToastType, vars?: Record<string, string | number>) => void
  dismissToast: (id: number) => void

  confirm: ConfirmOpts | null
  askConfirm: (opts: ConfirmOpts) => void
  closeConfirm: () => void

  trackActions: { track: Track; extras?: TrackAction[] } | null
  openTrackActions: (track: Track, extras?: TrackAction[]) => void
  closeTrackActions: () => void

  playlistPicker: Track | null
  openPlaylistPicker: (track: Track) => void
  closePlaylistPicker: () => void

  contextMenu: ContextMenuState | null
  openContextMenu: (track: Track, x: number, y: number) => void
  closeContextMenu: () => void
  /** 当前滑动高亮的菜单项下标（-1 = 未选中），由手势行通过 elementFromPoint 中继 */
  contextHighlight: number
  setContextHighlight: (i: number) => void
  /** 松手提交信号（自增计数），菜单组件监听它执行高亮项 */
  contextCommit: number
  commitContext: () => void

  loading: boolean
  setLoading: (v: boolean) => void
}

let toastId = 0

export const useToast = create<UIState>()((set, get) => ({
  toasts: [],
  toast: (keyOrText, type = 'info', vars) => {
    const lang = useLang.getState().lang
    const text = translate(lang, keyOrText, vars)
    const id = ++toastId
    set((s) => ({ toasts: [...s.toasts, { id, text, type }] }))
    setTimeout(() => get().dismissToast(id), 2600)
  },
  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

  confirm: null,
  askConfirm: (opts) => set({ confirm: opts }),
  closeConfirm: () => set({ confirm: null }),

  trackActions: null,
  openTrackActions: (track, extras) => set({ trackActions: { track, extras } }),
  closeTrackActions: () => set({ trackActions: null }),

  playlistPicker: null,
  openPlaylistPicker: (track) => set({ playlistPicker: track }),
  closePlaylistPicker: () => set({ playlistPicker: null }),

  contextMenu: null,
  openContextMenu: (track, x, y) => set({ contextMenu: { track, x, y }, contextHighlight: -1 }),
  closeContextMenu: () => set({ contextMenu: null }),
  contextHighlight: -1,
  setContextHighlight: (contextHighlight) => set({ contextHighlight }),
  contextCommit: 0,
  commitContext: () => set((s) => ({ contextCommit: s.contextCommit + 1 })),

  loading: false,
  setLoading: (v) => set({ loading: v }),
}))

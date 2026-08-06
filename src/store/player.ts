import { create } from 'zustand'
import type { Track } from '../types'
import { apiUrl } from '../api/client'
import { useToast } from './ui'

export type PlayMode = 'order' | 'repeat' | 'shuffle'

interface PlayerState {
  queue: Track[]
  index: number
  playing: boolean
  mode: PlayMode
  currentTime: number
  duration: number
  loading: boolean
  expanded: boolean
  view: 'cover' | 'lyrics'
  showQueue: boolean

  playQueue: (tracks: Track[], startIndex?: number) => void
  playNextTrack: (track: Track) => void
  addToQueue: (track: Track) => void
  toggle: () => void
  next: () => void
  prev: () => void
  seek: (t: number) => void
  setMode: (m: PlayMode) => void
  setExpanded: (v: boolean) => void
  setView: (v: 'cover' | 'lyrics') => void
  setShowQueue: (v: boolean) => void
  removeFromQueue: (i: number) => void
}

let audio: HTMLAudioElement | null = null

function getAudio(): HTMLAudioElement {
  if (!audio) {
    audio = new Audio()
    audio.preload = 'auto'
    audio.setAttribute('playsinline', '')
    audio.setAttribute('webkit-playsinline', '')
  }
  return audio
}

/** 从任意 Music 形状归一化出播放器队列条目 */
export function toTrack(m: {
  id: number
  title: string
  artist?: string
  album?: string
  duration?: number
  coverUrl?: string
}): Track {
  return {
    id: m.id,
    title: m.title,
    artist: m.artist ?? '',
    album: m.album ?? '',
    duration: m.duration ?? 0,
    coverUrl: m.coverUrl,
  }
}

function pickNext(queue: Track[], mode: PlayMode, current: number, forward: boolean): number {
  const n = queue.length
  if (n <= 1) return 0
  if (mode === 'shuffle') {
    let i = current
    while (i === current) i = Math.floor(Math.random() * n)
    return i
  }
  return forward ? (current + 1) % n : (current - 1 + n) % n
}

function setupMediaSession(usePlayer: () => PlayerState) {
  if (!('mediaSession' in navigator)) return
  const ms = navigator.mediaSession
  ms.setActionHandler('play', () => usePlayer().toggle())
  ms.setActionHandler('pause', () => usePlayer().toggle())
  ms.setActionHandler('previoustrack', () => usePlayer().prev())
  ms.setActionHandler('nexttrack', () => usePlayer().next())
  try {
    ms.setActionHandler('seekto', (d) => {
      if (d.seekTime != null) usePlayer().seek(d.seekTime)
    })
  } catch {
    // 个别平台不支持 seekto
  }
}

let mediaSessionReady = false

export const usePlayer = create<PlayerState>((set, get) => {
  const el = getAudio()

  const load = (track: Track, autoplay: boolean) => {
    el.src = apiUrl(`/api/music/file/${track.id}`)
    set({ currentTime: 0, duration: track.duration || 0, loading: true })
    if (autoplay) {
      el.play().then(
        () => set({ playing: true, loading: false }),
        () => set({ playing: false, loading: false }),
      )
    } else {
      set({ loading: false })
    }

    if (!mediaSessionReady) {
      mediaSessionReady = true
      setupMediaSession(() => usePlayer.getState())
    }
    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: track.title,
        artist: track.artist || 'Neko歌姬计划',
        album: track.album || '',
        artwork: track.coverUrl
          ? [{ src: apiUrl(track.coverUrl), sizes: '512x512', type: 'image/jpeg' }]
          : [],
      })
    }
  }

  el.addEventListener('timeupdate', () => set({ currentTime: el.currentTime }))
  el.addEventListener('loadedmetadata', () => {
    if (Number.isFinite(el.duration) && el.duration > 0) set({ duration: el.duration })
  })
  el.addEventListener('durationchange', () => {
    if (Number.isFinite(el.duration) && el.duration > 0) set({ duration: el.duration })
  })
  el.addEventListener('playing', () => set({ playing: true, loading: false }))
  el.addEventListener('pause', () => set({ playing: false, loading: false }))
  el.addEventListener('waiting', () => set({ loading: true }))
  el.addEventListener('error', () => {
    set({ playing: false, loading: false })
    useToast.getState().toast('common.playFailed', 'error')
  })
  el.addEventListener('ended', () => {
    const { mode, queue, index } = get()
    if (queue.length === 0) return
    if (mode === 'repeat') {
      load(queue[index], true)
      return
    }
    const ni = pickNext(queue, mode, index, true)
    if (mode === 'order' && ni <= index && queue.length > 1) {
      // 顺序播放到队尾，停止
      set({ playing: false, currentTime: el.duration || 0 })
      return
    }
    set({ index: ni })
    load(queue[ni], true)
  })

  return {
    queue: [],
    index: -1,
    playing: false,
    mode: 'order',
    currentTime: 0,
    duration: 0,
    loading: false,
    expanded: false,
    view: 'cover',
    showQueue: false,

    playQueue: (tracks, startIndex = 0) => {
      if (tracks.length === 0) return
      set({ queue: tracks, index: startIndex })
      load(tracks[startIndex], true)
    },

    playNextTrack: (track) => {
      const { queue, index } = get()
      if (index === -1) {
        set({ queue: [track], index: 0 })
        load(track, true)
        return
      }
      const q = [...queue]
      q.splice(index + 1, 0, track)
      set({ queue: q })
    },

    addToQueue: (track) => {
      const { queue, index } = get()
      if (index === -1) {
        set({ queue: [track], index: 0 })
        load(track, true)
        return
      }
      set({ queue: [...queue, track] })
    },

    toggle: () => {
      const { playing } = get()
      if (playing) {
        el.pause()
        set({ playing: false })
      } else {
        if (!el.src) {
          const { queue, index } = get()
          const t = queue[index]
          if (t) {
            load(t, true)
            return
          }
        }
        el.play().then(
          () => set({ playing: true }),
          () => set({ playing: false }),
        )
      }
    },

    next: () => {
      const { queue, index, mode } = get()
      if (queue.length === 0) return
      const ni = pickNext(queue, mode, index, true)
      set({ index: ni })
      load(queue[ni], true)
    },

    prev: () => {
      const { queue, index, currentTime } = get()
      if (queue.length === 0) return
      if (currentTime > 3) {
        el.currentTime = 0
        set({ currentTime: 0 })
        return
      }
      const ni = pickNext(queue, 'order', index, false)
      set({ index: ni })
      load(queue[ni], true)
    },

    seek: (t) => {
      if (Number.isFinite(t)) {
        el.currentTime = t
        set({ currentTime: t })
      }
    },

    setMode: (m) => set({ mode: m }),
    setExpanded: (v) => set({ expanded: v }),
    setView: (v) => set({ view: v }),
    setShowQueue: (v) => set({ showQueue: v }),

    removeFromQueue: (i) => {
      const { queue, index, playing } = get()
      if (queue.length === 0) return
      const q = queue.filter((_, k) => k !== i)
      if (i < index) {
        set({ queue: q, index: index - 1 })
      } else if (i > index) {
        set({ queue: q })
      } else {
        // 删掉的是当前播放项
        if (q.length === 0) {
          el.pause()
          el.removeAttribute('src')
          set({ queue: [], index: -1, playing: false, currentTime: 0, duration: 0 })
          return
        }
        const ni = Math.min(index, q.length - 1)
        set({ queue: q, index: ni })
        load(q[ni], playing)
      }
    },
  }
})

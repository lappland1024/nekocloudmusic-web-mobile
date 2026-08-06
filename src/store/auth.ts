import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User } from '../types'
import { bindTokenSource, bindUnauthorizedHandler } from '../api/client'
import { useToast } from './ui'

interface AuthState {
  token: string | null
  user: User | null
  setAuth: (token: string, user: User) => void
  setUser: (user: User) => void
  logout: () => void
}

export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      setAuth: (token, user) => set({ token, user }),
      setUser: (user) => set({ user }),
      logout: () => set({ token: null, user: null }),
    }),
    { name: 'neko-auth', partialize: (s) => ({ token: s.token, user: s.user }) },
  ),
)

bindTokenSource(() => useAuth.getState().token)
bindUnauthorizedHandler(() => {
  const state = useAuth.getState()
  if (state.token) {
    state.logout()
    useToast.getState().toast('err.unauthorized', 'info')
  }
})

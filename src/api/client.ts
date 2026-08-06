/**
 * 轻量 fetch 封装：统一 baseURL、JSON、Authorization 头与错误归一化。
 * 文档：https://github.com/FantasyNetworkCN/NekoMusicDocs
 */
import { translate, useLang } from '../i18n'

export const API_BASE: string =
  (import.meta.env.VITE_API_BASE as string | undefined) ?? 'https://music.cnmsb.xin'

export class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

// 由 auth store 注入，避免循环依赖
let getToken: () => string | null = () => null
let onUnauthorized: (() => void) | null = null

export function bindTokenSource(fn: () => string | null) {
  getToken = fn
}
export function bindUnauthorizedHandler(fn: () => void) {
  onUnauthorized = fn
}

/** 把相对路径拼成完整 URL（封面/音频等资源同理） */
export function apiUrl(p: string): string {
  if (/^https?:\/\//.test(p)) return p
  return API_BASE + p
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'DELETE' | 'PUT'
  body?: unknown
  auth?: boolean // 默认 true，false 则不带 token
  formData?: FormData
}

export async function request<T = unknown>(
  path: string,
  opts: RequestOptions = {},
): Promise<T> {
  const headers: Record<string, string> = {}
  let body: BodyInit | undefined

  if (opts.formData) {
    body = opts.formData
  } else if (opts.body !== undefined) {
    headers['Content-Type'] = 'application/json'
    body = JSON.stringify(opts.body)
  }
  if (opts.auth !== false) {
    const token = getToken()
    if (token) headers['Authorization'] = token
  }

  let res: Response
  try {
    res = await fetch(API_BASE + path, {
      method: opts.method ?? 'GET',
      headers,
      body,
    })
  } catch {
    throw new ApiError(translate(useLang.getState().lang, 'err.network'), 0)
  }

  let data: any = null
  try {
    data = await res.json()
  } catch {
    // 非 JSON（如文件流）
  }

  if (res.status === 401 && opts.auth !== false) {
    onUnauthorized?.()
  }
  if (!res.ok && !data) {
    throw new ApiError(`请求失败（HTTP ${res.status}）`, res.status)
  }
  if (data && data.success === false) {
    throw new ApiError(
      String(data.message ?? data.error ?? `请求失败（HTTP ${res.status}）`),
      res.status,
    )
  }
  return data as T
}

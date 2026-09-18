import { useEffect, useRef } from 'react'

/**
 * 液态玻璃折射（双平台自适应）：
 *
 * - Chromium（Chrome/Edge/Android）：物理位移贴图路线。
 *   squircle 高度场 → Snell 定律 sinθ₁=n·sinθ₂ → 边缘位移 m(x)=tan(θ₁−θ₂)·T(x)，
 *   Canvas 逐像素生成贴图（R=X/G=Y，128=不动），经
 *   `backdrop-filter: url(#id) blur() saturate()` 折射元素背后的真实页面。
 *
 * - WebKit（iOS Safari / macOS Safari）：环形透镜近似路线。
 *   Safari 不支持 SVG 滤镜进 backdrop-filter，但完整支持
 *   clip-path + transform + backdrop-filter 组合——把玻璃面切成同心环，
 *   外环的 backdrop 层按级放大（scale>1），外圈背景被逐级"拉入"，
 *   分片逼近边缘折射。中心图标文字浮在最上层保持清晰。
 *
 * 其他浏览器：不做任何事，CSS 磨砂兜底。
 */

const SUPPORTED = (() => {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent
  const isIOS = /iP(hone|ad|od)/.test(ua) || (/Macintosh/.test(ua) && 'ontouchend' in document)
  if (isIOS || /Firefox|Fxi\//.test(ua)) return false
  return /Chrom(e|ium)|Edg\//.test(ua)
})()

/** WebKit（Safari 全家，含 iOS）走环形透镜近似 */
const WEBKIT = (() => {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent
  return /Safari\//.test(ua) && !/Chrom(e|ium)|Edg\//.test(ua)
})()

let uid = 0

interface GlassMap {
  url: string
  maxDisp: number
}

/** 圆角矩形 SDF（内部为负），返回到边缘的有向距离 */
function makeSdf(w: number, h: number, radius: number) {
  const cx = w / 2
  const cy = h / 2
  const hw = w / 2 - 0.5
  const hh = h / 2 - 0.5
  const rr = Math.min(radius, hw, hh)
  return (x: number, y: number): number => {
    const qx = Math.abs(x - cx) - (hw - rr)
    const qy = Math.abs(y - cy) - (hh - rr)
    const dx = Math.max(qx, 0)
    const dy = Math.max(qy, 0)
    return Math.hypot(dx, dy) + Math.min(Math.max(qx, qy), 0) - rr
  }
}

/** squircle 高度场 + Snell 定律 → 位移贴图（Chromium 路线） */
function buildMap(w: number, h: number, radius: number): GlassMap {
  const bezel = Math.max(6, Math.min(w, h) * 0.32) // 边缘折射区宽度
  const curveH = bezel * 1.15 // 曲面高度
  const thickness = Math.max(2, Math.min(w, h) * 0.18) // 基础厚度
  const N = 1.5 // 玻璃折射率
  const sdf = makeSdf(w, h, radius)

  // 边缘距离 → 折射位移大小（px）。edgeDist: 0=最外缘，bezel=进入平坦区
  const dispAt = (edgeDist: number): number => {
    const x = Math.min(1, edgeDist / bezel)
    if (x <= 0) return 0
    const f = curveH * (1 - Math.pow(1 - x, 3)) // squircle 高度（斜率平滑归零）
    const dfd = (3 * curveH * Math.pow(1 - x, 2)) / bezel // 表面斜率
    const theta1 = Math.atan(dfd)
    const theta2 = Math.asin(Math.sin(theta1) / N)
    return Math.tan(theta1 - theta2) * (thickness + f)
  }

  let maxDisp = 0
  for (let i = 0; i <= 100; i++) maxDisp = Math.max(maxDisp, dispAt((i / 100) * bezel))
  if (maxDisp <= 0) maxDisp = 1

  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) return { url: '', maxDisp }
  const img = ctx.createImageData(w, h)
  const px = img.data
  const e = 1

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4
      const d = -sdf(x + 0.5, y + 0.5) // 内部为正
      if (d <= 0 || d >= bezel) {
        px[i] = 128
        px[i + 1] = 128
        px[i + 2] = 128
        px[i + 3] = 255
        continue
      }
      // 数值梯度（指向外）；采样偏移取其反方向（指向中心）
      const gx = sdf(x + 0.5 + e, y + 0.5) - sdf(x + 0.5 - e, y + 0.5)
      const gy = sdf(x + 0.5, y + 0.5 + e) - sdf(x + 0.5, y + 0.5 - e)
      const gl = Math.hypot(gx, gy) || 1
      const m = dispAt(d)
      const ox = (-gx / gl) * m
      const oy = (-gy / gl) * m
      px[i] = Math.max(0, Math.min(255, Math.round(128 + (ox / maxDisp) * 127)))
      px[i + 1] = Math.max(0, Math.min(255, Math.round(128 + (oy / maxDisp) * 127)))
      px[i + 2] = 128
      px[i + 3] = 255
    }
  }
  ctx.putImageData(img, 0, 0)
  return { url: canvas.toDataURL('image/png'), maxDisp }
}

/** 圆角矩形（inset 内缩、半径 r）的近似多边形点集，用于环形 clip-path */
function roundedRectPoints(inset: number, w: number, h: number, r: number): string[] {
  const x0 = inset
  const y0 = inset
  const x1 = w - inset
  const y1 = h - inset
  const rr = Math.max(0, Math.min(r, (x1 - x0) / 2, (y1 - y0) / 2))
  const pts: string[] = []
  const corners: [number, number, number][] = [
    // cx, cy, 起始角
    [x1 - rr, y0 + rr, -Math.PI / 2], // 右上
    [x1 - rr, y1 - rr, 0], // 右下
    [x0 + rr, y1 - rr, Math.PI / 2], // 左下
    [x0 + rr, y0 + rr, Math.PI], // 左上
  ]
  for (const [cx, cy, a0] of corners) {
    for (let i = 0; i <= 4; i++) {
      const a = a0 + (i / 4) * (Math.PI / 2)
      pts.push(`${(cx + rr * Math.cos(a)).toFixed(1)} ${(cy + rr * Math.sin(a)).toFixed(1)}`)
    }
  }
  return pts
}

/** 圆角环形 clip-path（evenodd：外圈 + 内圈两个子路径） */
function donutClip(w: number, h: number, r: number, insetOuter: number, insetInner: number): string {
  const outer = roundedRectPoints(insetOuter, w, h, r - insetOuter)
  const inner = roundedRectPoints(insetInner, w, h, r - insetInner)
  return `polygon(evenodd, ${[...outer, ...inner].join(',')})`
}

interface Ring {
  span: HTMLSpanElement
}

/** WebKit 路线：同心环透镜层（scale 分级放大 → 边缘背景被逐级拉入） */
function buildRings(el: HTMLElement, w: number, h: number, radius: number): Ring[] {
  const rings: Ring[] = []
  const bezel = Math.max(6, Math.min(w, h) * 0.32)
  // 内→外两级环：[bezel/2, bezel] 与 [0, bezel/2]（距边缘），放大率递增
  const bands: [number, number, number][] = [
    [bezel / 2, bezel, 1.025],
    [0, bezel / 2, 1.06],
  ]
  for (const [insetOuter, insetInner, k] of bands) {
    const span = document.createElement('span')
    span.className = 'lg-ring'
    // 预缩放几何：scale(k) 后恰好落在目标环带
    span.style.clipPath = donutClip(w / k, h / k, radius / k, insetOuter / k, insetInner / k)
    span.style.transform = `scale(${k})`
    el.appendChild(span)
    rings.push({ span })
  }
  return rings
}

/**
 * 玻璃折射总入口：
 * - Chromium：生成物理位移贴图，设置 `--lg-bdf: url(#id) blur() saturate()` 供 CSS 消费
 * - WebKit：注入同心环透镜层（.lg-ring）
 * 两者仅在 iOS 液态玻璃主题下生效；ResizeObserver 监听尺寸变化自动重建。
 */
export function useLiquidGlass<T extends HTMLElement>() {
  const ref = useRef<T | null>(null)

  useEffect(() => {
    const el = ref.current
    if (!el || (!SUPPORTED && !WEBKIT)) return
    let filterHost: SVGSVGElement | null = null
    let rings: Ring[] = []
    const id = `lg-f-${++uid}`

    const cleanup = () => {
      filterHost?.remove()
      filterHost = null
      rings.forEach((r) => r.span.remove())
      rings = []
    }

    const apply = () => {
      // 仅 iOS 液态玻璃主题消费
      if (!document.documentElement.dataset.theme?.startsWith('ios')) return
      const w = Math.round(el.offsetWidth)
      const h = Math.round(el.offsetHeight)
      if (w < 8 || h < 8 || w * h > 260000) return
      const cs = getComputedStyle(el)
      const radii = [
        cs.borderTopLeftRadius,
        cs.borderTopRightRadius,
        cs.borderBottomRightRadius,
        cs.borderBottomLeftRadius,
      ].map((v) => parseFloat(v) || 0)
      const r = Math.min(...radii, w / 2, h / 2)
      cleanup()

      if (SUPPORTED) {
        const { url, maxDisp } = buildMap(w, h, r)
        if (!url) return
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
        svg.setAttribute('aria-hidden', 'true')
        svg.setAttribute('focusable', 'false')
        svg.style.position = 'absolute'
        svg.style.width = '0'
        svg.style.height = '0'
        svg.style.overflow = 'hidden'
        svg.innerHTML =
          `<filter id="${id}" x="-20%" y="-20%" width="140%" height="140%" color-interpolation-filters="sRGB">` +
          `<feImage x="0" y="0" width="100%" height="100%" result="map" href="${url}" preserveAspectRatio="none"/>` +
          `<feDisplacementMap in="SourceGraphic" in2="map" xChannelSelector="R" yChannelSelector="G" scale="${(maxDisp * 2).toFixed(2)}"/>` +
          `</filter>`
        document.body.appendChild(svg)
        filterHost = svg
        // 折射链里 blur 取小值（8px）：磨砂过重会把折射细节糊掉
        el.style.setProperty('--lg-bdf', `url(#${id}) blur(8px) saturate(var(--glass-saturate))`)
      } else if (WEBKIT) {
        rings = buildRings(el, w, h, r)
      }
    }

    apply()
    const ro = new ResizeObserver(() => apply())
    ro.observe(el)
    return () => {
      ro.disconnect()
      cleanup()
      el.style.removeProperty('--lg-bdf')
    }
  }, [])

  return ref
}

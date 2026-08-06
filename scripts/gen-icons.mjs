// 由官方 favicon（WebP）生成全套应用图标与站内 logo。
// 用法：node scripts/gen-icons.mjs
// 依赖：sharp（devDependency，自带 win32 预编译二进制）
// 输入：scripts/favicon-source.webp（官方 logo 原图，首次运行自动下载）
// 输出：public/logo.png + public/icons/*.png
import sharp from 'sharp'
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

// 首次运行：如果还没有源文件，从官方站点拉一份
const SRC = join(root, 'scripts', 'favicon-source.webp')
const SRC_URL = 'https://music.cnmsb.xin/favicon.ico'
if (!existsSync(SRC)) {
  console.log('下载官方 logo → scripts/favicon-source.webp')
  const res = await fetch(SRC_URL)
  if (!res.ok) throw new Error(`下载失败: ${res.status}`)
  writeFileSync(SRC, Buffer.from(await res.arrayBuffer()))
}

const src = readFileSync(SRC)
const OUT = join(root, 'public', 'icons')
mkdirSync(OUT, { recursive: true })

// 与主题一致的梅子底色（浅色主题下也作为徽章底色）
const BG = { r: 0x16, g: 0x12, b: 0x1c, alpha: 1 }

/**
 * 把 logo 等比居中放到 size×size 的画布上。
 * @param size 画布边长
 * @param bg 背景色（null = 透明）
 * @param scale logo 占画布的比例
 */
async function badge(size, { bg = BG, scale = 0.8 } = {}) {
  const img = sharp(src)
  const meta = await img.metadata()
  const s = Math.min((size * scale) / meta.width, (size * scale) / meta.height)
  const rw = Math.max(1, Math.round(meta.width * s))
  const rh = Math.max(1, Math.round(meta.height * s))
  const left = Math.round((size - rw) / 2)
  const top = Math.round((size - rh) / 2)
  const canvas = sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: bg ?? { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
  const layer = await img.resize(rw, rh, { fit: 'fill' }).toBuffer()
  return canvas.composite([{ input: layer, left, top }]).png().toBuffer()
}

console.log('生成中…')
writeFileSync(join(root, 'public', 'logo.png'), await badge(512, { scale: 0.82 }))
writeFileSync(join(OUT, 'icon-192.png'), await badge(192, { scale: 0.82 }))
writeFileSync(join(OUT, 'icon-512.png'), await badge(512, { scale: 0.82 }))
// maskable：内容缩进安全区（中央 80%）
writeFileSync(join(OUT, 'icon-maskable-512.png'), await badge(512, { scale: 0.62 }))
// iOS 桌面图标（系统自行圆角）
writeFileSync(join(OUT, 'apple-touch-icon-180.png'), await badge(180, { scale: 0.72 }))
// 浏览器标签页 favicon（深底保证浅色标签页也清晰）
writeFileSync(join(OUT, 'favicon-64.png'), await badge(64, { scale: 0.86 }))
console.log('完成：public/logo.png + public/icons/ 下 5 个 PNG')

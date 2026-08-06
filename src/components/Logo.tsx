/**
 * 站内品牌 logo：官方 NekoMusic 图标（梅子底 + 奶油猫徽章）。
 * 与 PWA 图标 / favicon 同源，全部由 scripts/gen-icons.mjs 生成。
 */
interface LogoProps {
  size?: number
  className?: string
  alt?: string
}

export function Logo({ size = 44, className, alt = 'Neko歌姬计划' }: LogoProps) {
  return (
    <img
      src="/logo.png"
      width={size}
      height={size}
      alt={alt}
      className={`logo ${className ?? ''}`}
      draggable={false}
    />
  )
}

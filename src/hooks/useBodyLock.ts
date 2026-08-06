import { useEffect } from 'react'

// 弹层/全屏层打开时锁定背景信息流滚动。
// 用计数处理多个弹层叠加（如操作菜单 → 添加到歌单），避免提前解锁。

let lockDepth = 0

function lockBody() {
  lockDepth++
  document.body.classList.add('body-locked')
}

function unlockBody() {
  lockDepth = Math.max(0, lockDepth - 1)
  if (lockDepth === 0) document.body.classList.remove('body-locked')
}

/** active 为 true 时给 body 加 .body-locked（配合 CSS 锁定 .page 滚动） */
export function useBodyLock(active: boolean) {
  useEffect(() => {
    if (!active) return
    lockBody()
    return unlockBody
  }, [active])
}

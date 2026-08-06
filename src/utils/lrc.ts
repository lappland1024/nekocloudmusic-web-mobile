export interface LrcLine {
  time: number // 秒
  text: string
}

/** 解析 LRC 文本，返回按时间排序的歌词行 */
export function parseLrc(raw: string): LrcLine[] {
  const lines: LrcLine[] = []
  const tagRe = /\[\d{1,2}:\d{1,2}(?:[.:]\d{1,3})?\]/g
  for (const rawLine of raw.split(/\r?\n/)) {
    const matches = rawLine.match(tagRe)
    if (!matches || matches.length === 0) continue
    const text = rawLine.replace(tagRe, '').trim()
    for (const m of matches) {
      const mm = m.match(/\[(\d{1,2}):(\d{1,2})(?:[.:](\d{1,3}))?\]/)
      if (!mm) continue
      const min = Number(mm[1])
      const sec = Number(mm[2])
      const frac = mm[3] ? Number(mm[3].padEnd(3, '0')) : 0
      lines.push({ time: min * 60 + sec + frac / 1000, text })
    }
  }
  return lines.sort((a, b) => a.time - b.time)
}

/** 给定时间（秒），返回当前应高亮的歌词行下标；无则 -1 */
export function currentLine(lines: LrcLine[], t: number): number {
  let idx = -1
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].time <= t) idx = i
    else break
  }
  return idx
}

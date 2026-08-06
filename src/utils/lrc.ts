export interface LrcLine {
  time: number // 秒
  text: string
}

/** 清洗歌词文本：兼容 {"翻译"} 这种"花括号 + JSON 字符串"包装。
 *  注意 `{"内容"}` 并非合法 JSON 对象（缺冒号），只是语法包装，
 *  花括号与引号都不应显示，只保留内层内容。 */
function normalizeText(s: string): string {
  let t = s.trim()
  if (t.startsWith('{') && t.endsWith('}')) {
    const inner = t.slice(1, -1).trim()
    if (inner.startsWith('"') && inner.endsWith('"')) {
      // {"内容"} → 内容
      t = inner.slice(1, -1)
    } else {
      // 兜底：真 JSON（{"k": v} 等）或其它花括号内容
      try {
        t = JSON.parse(t)
      } catch {
        t = inner
      }
    }
  }
  return t.trim()
}

/** 解析 LRC 文本，返回按时间排序的歌词行。
 *  兼容双语歌词的"换行格式"：带时间标签的原文行后面紧跟一行无标签的翻译/续行
 *  （如 `{"中文翻译"}`），会并入上一句，用 \n 连接，渲染时同时间戳内换行显示。 */
export function parseLrc(raw: string): LrcLine[] {
  const lines: LrcLine[] = []
  const tagRe = /\[\d{1,2}:\d{1,2}(?:[.:]\d{1,3})?\]/g
  let pending: LrcLine | null = null // 最近一个带时间标签的行，用于承接无标签翻译行
  for (const rawLine of raw.split(/\r?\n/)) {
    const matches = rawLine.match(tagRe)
    if (!matches || matches.length === 0) {
      // 无时间标签：非空且不是元数据（如 ar:/ti:）时，作为上一句的翻译/续行并入
      const t = normalizeText(rawLine)
      if (t && pending && !/^\w{1,5}:/.test(rawLine.trim())) {
        pending.text = pending.text ? `${pending.text}\n${t}` : t
      }
      continue
    }
    const text = normalizeText(rawLine.replace(tagRe, ''))
    for (const m of matches) {
      const mm = m.match(/\[(\d{1,2}):(\d{1,2})(?:[.:](\d{1,3}))?\]/)
      if (!mm) continue
      const min = Number(mm[1])
      const sec = Number(mm[2])
      const frac = mm[3] ? Number(mm[3].padEnd(3, '0')) : 0
      pending = { time: min * 60 + sec + frac / 1000, text }
      lines.push(pending)
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

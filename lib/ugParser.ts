import { Song } from './types'

const DIFFICULTY_MAP: Record<string, 1 | 2 | 3 | 4 | 5> = {
  novice: 1,
  beginner: 1,
  intermediate: 3,
  advanced: 4,
  hard: 4,
  expert: 5,
}

function isChordOnlyLine(line: string): boolean {
  if (!line.trim()) return false
  const stripped = line.replace(/\[[A-G][#b]?[^\]]*\]/g, '').trim()
  return stripped === '' && /\[[A-G]/.test(line)
}

function mergeChordLyric(chordLine: string, lyricLine: string): string {
  const chords: { pos: number; name: string }[] = []
  const re = /\[([^\]]+)\]/g
  let m
  let charsRemoved = 0
  while ((m = re.exec(chordLine)) !== null) {
    const visualPos = m.index - charsRemoved
    chords.push({ pos: visualPos, name: m[1] })
    charsRemoved += m[1].length + 2
  }
  if (chords.length === 0) return lyricLine
  let result = lyricLine
  for (let i = chords.length - 1; i >= 0; i--) {
    const { pos, name } = chords[i]
    while (result.length < pos) result += ' '
    result = result.slice(0, pos) + `[${name}]` + result.slice(pos)
  }
  return result
}

export function parseUGContent(raw: string): string {
  // Remove guitar tab notation blocks
  let text = raw.replace(/\[tab\][\s\S]*?\[\/tab\]/gi, '')

  // Convert [ch]CHORD[/ch] → [CHORD]
  text = text.replace(/\[ch\](.*?)\[\/ch\]/gi, '[$1]')

  // Convert section headers [Verse 1] → # Verse 1
  // Distinguish from chord brackets: section headers contain non-chord text
  text = text.replace(/^\[([^\]]+)\]$/gm, (_, inner) => {
    if (/^[A-G][#b]?[^\s]*$/.test(inner.trim())) return `[${inner}]`
    return `# ${inner}`
  })

  // Merge chord-only lines with following lyric lines
  const lines = text.split('\n')
  const result: string[] = []
  let i = 0
  while (i < lines.length) {
    const line = lines[i]
    const next = lines[i + 1] ?? null
    if (isChordOnlyLine(line) && next !== null && !isChordOnlyLine(next) && !next.startsWith('#')) {
      result.push(mergeChordLyric(line, next))
      i += 2
    } else {
      result.push(line)
      i++
    }
  }

  return result.join('\n').replace(/\n{3,}/g, '\n\n').trim()
}

export function extractJsStore(html: string): Record<string, unknown> | null {
  const match = html.match(/class="js-store"[^>]*data-content="([^"]*)"/)
  if (!match) return null
  try {
    const decoded = match[1]
      .replace(/&quot;/g, '"')
      .replace(/&amp;/g, '&')
      .replace(/&#039;/g, "'")
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
    return JSON.parse(decoded)
  } catch {
    return null
  }
}

export interface UGSearchResult {
  id: number
  song_name: string
  artist_name: string
  type: string
  version: number
  votes: number
  rating: number
  tab_url: string
  tonality_name?: string
  difficulty?: string
}

export function extractSearchResults(store: Record<string, unknown>): UGSearchResult[] {
  try {
    // UG embeds data at different paths depending on page version
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const s = store as any
    const data: UGSearchResult[] =
      s?.store?.page?.data?.results ??
      s?.data?.results ??
      s?.results ??
      []

    return data.filter((r: UGSearchResult) => {
      const t = (r.type ?? '').toLowerCase()
      return t.includes('chord') || t === '300'
    })
  } catch {
    return []
  }
}

export function ugTabToSong(store: Record<string, unknown>, tabUrl: string): Partial<Song> | null {
  try {
    const data = (store as {
      store: {
        page: {
          data: {
            tab: {
              song_name: string
              artist_name: string
              tonality_name?: string
              difficulty?: string
              bpm?: number
              type?: string
            }
            tab_view: {
              wiki_tab: { content: string }
              meta?: { capo?: number; key?: string }
            }
          }
        }
      }
    }).store.page.data

    const tab = data.tab
    const view = data.tab_view
    const content = view?.wiki_tab?.content ?? ''
    const capo = view?.meta?.capo ?? 0
    const key = tab.tonality_name ?? view?.meta?.key ?? ''
    const difficulty = DIFFICULTY_MAP[tab.difficulty?.toLowerCase() ?? ''] ?? 2

    return {
      id: `ug-${tabUrl.split('/').pop() ?? Date.now()}`,
      title: tab.song_name,
      artist: tab.artist_name,
      key,
      capo,
      difficulty,
      bpm: tab.bpm,
      genre: 'Rock',
      content: parseUGContent(content),
      source: 'user',
      createdAt: Date.now(),
    }
  } catch {
    return null
  }
}

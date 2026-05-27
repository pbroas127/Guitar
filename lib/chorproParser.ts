import { Song } from './types'

const DIFFICULTY_MAP: Record<string, 1 | 2 | 3 | 4 | 5> = {
  easy: 1, beginner: 1, novice: 1,
  medium: 2, moderate: 2,
  intermediate: 3,
  hard: 4, advanced: 4,
  expert: 5,
}

// Parse a ChordPro file (.chopro / .cho) into our Song format
export function parseChordPro(raw: string, fallbackTitle = 'Unknown'): Partial<Song> {
  const lines = raw.split('\n')
  const meta: Record<string, string> = {}
  const body: string[] = []

  for (const line of lines) {
    const trimmed = line.trim()

    // Directives: {key: value} or {key}
    const directive = trimmed.match(/^\{([^:}]+)(?::([^}]*))?\}$/)
    if (directive) {
      const key = directive[1].trim().toLowerCase()
      const val = (directive[2] ?? '').trim()

      // Map common aliases
      const aliases: Record<string, string> = {
        t: 'title', st: 'subtitle', su: 'subtitle',
        key: 'key', capo: 'capo', difficulty: 'difficulty',
        bpm: 'bpm', tempo: 'bpm', artist: 'subtitle',
        composer: 'subtitle',
        sov: 'start_of_verse', eov: 'end_of_verse',
        soc: 'start_of_chorus', eoc: 'end_of_chorus',
        sob: 'start_of_bridge', eob: 'end_of_bridge',
      }
      const resolved = aliases[key] ?? key

      if (['title', 'subtitle', 'key', 'capo', 'difficulty', 'bpm'].includes(resolved)) {
        meta[resolved] = val
      } else if (resolved.startsWith('start_of_')) {
        const section = resolved.replace('start_of_', '')
        body.push(`# ${val || section.charAt(0).toUpperCase() + section.slice(1)}`)
      }
      // Skip end_of_* directives
      continue
    }

    // Comment lines
    if (trimmed.startsWith('#') && !trimmed.match(/^#\s*\[/)) {
      body.push(trimmed)
      continue
    }

    body.push(line)
  }

  const title = meta.title || fallbackTitle
  const artist = meta.subtitle || ''
  const capo = parseInt(meta.capo ?? '0') || 0
  const difficulty = DIFFICULTY_MAP[meta.difficulty?.toLowerCase() ?? ''] ?? 2
  const bpm = parseInt(meta.bpm ?? '0') || undefined

  const content = body.join('\n').replace(/\n{3,}/g, '\n\n').trim()

  return {
    id: `gh-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    title,
    artist,
    key: meta.key ?? '',
    capo,
    difficulty,
    bpm,
    genre: 'Rock',
    content,
    source: 'user',
    createdAt: Date.now(),
  }
}

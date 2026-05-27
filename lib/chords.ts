const SHARPS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
const FLATS  = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B']

function noteIndex(note: string): number {
  const i = SHARPS.indexOf(note)
  return i !== -1 ? i : FLATS.indexOf(note)
}

export function transposeChord(chord: string, semitones: number): string {
  if (semitones === 0) return chord
  const match = chord.match(/^([A-G][#b]?)(.*)$/)
  if (!match) return chord
  const [, root, suffix] = match
  const idx = noteIndex(root)
  if (idx === -1) return chord
  const newIdx = ((idx + semitones) % 12 + 12) % 12
  const newRoot = root.includes('b') ? FLATS[newIdx] : SHARPS[newIdx]
  return newRoot + suffix
}

export function transposeContent(content: string, semitones: number): string {
  if (semitones === 0) return content
  return content.replace(/\[([^\]]+)\]/g, (_, chord) => `[${transposeChord(chord, semitones)}]`)
}

export function parseChordLine(line: string): { chord: string; text: string }[] {
  const parts = line.split(/\[([^\]]+)\]/)
  const result: { chord: string; text: string }[] = []
  if (parts[0]) result.push({ chord: '', text: parts[0] })
  for (let i = 1; i < parts.length; i += 2) {
    result.push({ chord: parts[i] ?? '', text: parts[i + 1] ?? '' })
  }
  return result
}

'use client'
import { parseChordLine, transposeContent } from '@/lib/chords'

interface Props {
  content: string
  capoOffset: number
}

export default function ChordLyrics({ content, capoOffset }: Props) {
  const transposed = transposeContent(content, capoOffset)
  const lines = transposed.split('\n')

  return (
    <div className="font-mono text-base leading-none select-text">
      {lines.map((line, i) => {
        if (line.startsWith('# ')) {
          return (
            <div key={i} className="mt-6 mb-2 text-amber-400 font-bold text-sm uppercase tracking-widest">
              {line.slice(2)}
            </div>
          )
        }

        if (line.trim() === '') {
          return <div key={i} className="h-3" />
        }

        const hasChords = /\[/.test(line)

        if (!hasChords) {
          return (
            <div key={i} className="text-zinc-200 mb-2 whitespace-pre leading-6">
              {line}
            </div>
          )
        }

        const segments = parseChordLine(line)
        return (
          <div key={i} className="flex flex-wrap mb-2 items-end">
            {segments.map((seg, j) => {
              // Pad chord label so it's at least as wide as the lyric text beneath it
              const chordLabel = seg.chord || ''
              const lyricText = seg.text || (seg.chord ? ' ' : '')
              // Always add a trailing space to the chord to prevent adjacent chords running together
              const chordDisplay = seg.chord
                ? chordLabel + (lyricText.length > chordLabel.length ? '' : ' ')
                : ' '.repeat(lyricText.length)

              return (
                <span key={j} className="inline-block" style={{ verticalAlign: 'bottom' }}>
                  <span className="block text-amber-400 font-bold text-sm leading-5 whitespace-pre">
                    {chordDisplay}
                  </span>
                  <span className="block text-zinc-100 leading-6 whitespace-pre">
                    {lyricText}
                  </span>
                </span>
              )
            })}
          </div>
        )
      })}
    </div>
  )
}

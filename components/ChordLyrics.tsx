'use client'
import { parseChordLine, transposeContent } from '@/lib/chords'

interface Props {
  content: string
  capoOffset: number // song.capo - selectedCapo
}

export default function ChordLyrics({ content, capoOffset }: Props) {
  const transposed = transposeContent(content, capoOffset)
  const lines = transposed.split('\n')

  return (
    <div className="font-mono text-base leading-none">
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
            <div key={i} className="text-zinc-200 mb-1 whitespace-pre">
              {line}
            </div>
          )
        }
        const segments = parseChordLine(line)
        return (
          <div key={i} className="flex flex-wrap mb-1">
            {segments.map((seg, j) => (
              <span key={j} className="inline-flex flex-col mr-0">
                <span className="text-amber-400 font-bold text-sm leading-5 whitespace-pre">
                  {seg.chord ? seg.chord : seg.text ? ' '.repeat(seg.text.length) : ''}
                </span>
                <span className="text-zinc-100 leading-6 whitespace-pre">
                  {seg.text || (seg.chord ? ' ' : '')}
                </span>
              </span>
            ))}
          </div>
        )
      })}
    </div>
  )
}

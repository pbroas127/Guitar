import Link from 'next/link'
import { Song } from '@/lib/types'

const DIFF_LABELS = ['', 'Beginner', 'Easy', 'Intermediate', 'Advanced', 'Expert']
const DIFF_COLORS = ['', 'text-green-400', 'text-lime-400', 'text-yellow-400', 'text-orange-400', 'text-red-400']

export default function SongCard({ song }: { song: Song }) {
  return (
    <Link href={`/song/${song.id}`}>
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 active:bg-zinc-800 transition-colors">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="text-white font-semibold text-base truncate">{song.title}</h3>
            <p className="text-zinc-400 text-sm truncate">{song.artist}</p>
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            <span className="bg-zinc-800 text-zinc-300 text-xs px-2 py-0.5 rounded-full">
              {song.genre}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3 mt-3 text-xs">
          <span className="text-zinc-400">Key: <span className="text-white font-medium">{song.key}</span></span>
          {song.capo > 0 && (
            <span className="text-zinc-400">Capo: <span className="text-white font-medium">{song.capo}</span></span>
          )}
          {song.bpm && (
            <span className="text-zinc-400">{song.bpm} BPM</span>
          )}
          <span className={`ml-auto font-medium ${DIFF_COLORS[song.difficulty]}`}>
            {DIFF_LABELS[song.difficulty]}
          </span>
        </div>
      </div>
    </Link>
  )
}

'use client'
import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getSong, deleteSong } from '@/lib/storage'
import { Song } from '@/lib/types'
import ChordLyrics from '@/components/ChordLyrics'
import Link from 'next/link'

const DIFF_LABELS = ['', 'Beginner', 'Easy', 'Intermediate', 'Advanced', 'Expert']
const DIFF_COLORS = ['', 'text-green-400', 'text-lime-400', 'text-yellow-400', 'text-orange-400', 'text-red-400']

export default function SongPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [song, setSong] = useState<Song | null>(null)
  const [capo, setCapo] = useState(0)
  const [autoScroll, setAutoScroll] = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const scrollInterval = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    const s = getSong(id)
    if (s) {
      setSong(s)
      setCapo(s.capo)
    }
  }, [id])

  useEffect(() => {
    if (autoScroll) {
      scrollInterval.current = setInterval(() => {
        scrollRef.current?.scrollBy({ top: 1, behavior: 'instant' })
      }, 50)
    } else {
      if (scrollInterval.current) clearInterval(scrollInterval.current)
    }
    return () => {
      if (scrollInterval.current) clearInterval(scrollInterval.current)
    }
  }, [autoScroll])

  if (!song) return (
    <div className="flex items-center justify-center min-h-screen">
      <p className="text-zinc-500">Song not found</p>
    </div>
  )

  const capoOffset = song.capo - capo

  const handleDelete = () => {
    if (song.source === 'builtin') return
    deleteSong(song.id)
    router.push('/')
  }

  return (
    <div ref={scrollRef} className="max-w-lg mx-auto px-4 overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 bg-zinc-950 pt-12 pb-3 z-10 border-b border-zinc-900">
        <div className="flex items-start gap-3 mb-3">
          <button onClick={() => router.back()} className="mt-0.5 text-zinc-400 active:text-white">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-white truncate">{song.title}</h1>
            <p className="text-zinc-400 text-sm">{song.artist}</p>
          </div>
          {song.source === 'user' && (
            <div className="flex gap-2">
              <Link href={`/add?id=${song.id}`} className="text-zinc-400 active:text-white p-1">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </Link>
              <button onClick={() => setShowDelete(true)} className="text-zinc-400 active:text-red-400 p-1">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          )}
        </div>

        {/* Meta row */}
        <div className="flex items-center gap-3 text-xs mb-3">
          <span className="bg-zinc-800 text-zinc-300 px-2 py-1 rounded-md">{song.genre}</span>
          <span className="text-zinc-400">Key: <span className="text-white font-semibold">{song.key}</span></span>
          {song.bpm && <span className="text-zinc-400">{song.bpm} BPM</span>}
          <span className={`ml-auto font-medium ${DIFF_COLORS[song.difficulty]}`}>
            {DIFF_LABELS[song.difficulty]}
          </span>
        </div>

        {/* Capo control */}
        <div className="flex items-center gap-4">
          <span className="text-zinc-400 text-sm w-12">Capo</span>
          <button
            onClick={() => setCapo(c => Math.max(0, c - 1))}
            className="w-8 h-8 rounded-full bg-zinc-800 text-white flex items-center justify-center active:bg-zinc-700 text-lg font-bold"
          >−</button>
          <span className="text-white font-bold text-lg w-6 text-center">{capo}</span>
          <button
            onClick={() => setCapo(c => Math.min(7, c + 1))}
            className="w-8 h-8 rounded-full bg-zinc-800 text-white flex items-center justify-center active:bg-zinc-700 text-lg font-bold"
          >+</button>
          {capo !== song.capo && (
            <button
              onClick={() => setCapo(song.capo)}
              className="ml-2 text-xs text-amber-400 border border-amber-500/30 px-2 py-1 rounded-full"
            >
              Reset
            </button>
          )}
          <button
            onClick={() => setAutoScroll(a => !a)}
            className={`ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              autoScroll
                ? 'bg-amber-500 text-black border-amber-500'
                : 'bg-transparent text-zinc-400 border-zinc-700'
            }`}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
            Scroll
          </button>
        </div>
      </div>

      {/* Chord sheet */}
      <div className="py-6 overflow-x-auto">
        <ChordLyrics content={song.content} capoOffset={capoOffset} />
      </div>

      {/* Delete confirm */}
      {showDelete && (
        <div className="fixed inset-0 bg-black/70 flex items-end z-20" onClick={() => setShowDelete(false)}>
          <div className="w-full bg-zinc-900 rounded-t-2xl p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-white font-bold text-lg mb-1">Delete song?</h3>
            <p className="text-zinc-400 text-sm mb-6">This cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowDelete(false)} className="flex-1 py-3 rounded-xl bg-zinc-800 text-white font-medium">Cancel</button>
              <button onClick={handleDelete} className="flex-1 py-3 rounded-xl bg-red-600 text-white font-medium">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

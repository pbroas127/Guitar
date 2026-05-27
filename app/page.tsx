'use client'
import { useState, useEffect, useMemo } from 'react'
import SongCard from '@/components/SongCard'
import { getAllSongs } from '@/lib/storage'
import { Song } from '@/lib/types'

const DIFFICULTIES = [
  { label: 'All', value: 0 },
  { label: 'Beginner', value: 1 },
  { label: 'Easy', value: 2 },
  { label: 'Intermediate', value: 3 },
  { label: 'Advanced', value: 4 },
  { label: 'Expert', value: 5 },
]

export default function CatalogPage() {
  const [songs, setSongs] = useState<Song[]>([])
  const [search, setSearch] = useState('')
  const [difficulty, setDifficulty] = useState(0)
  const [genre, setGenre] = useState('All')

  useEffect(() => {
    setSongs(getAllSongs())
  }, [])

  const genres = useMemo(() => {
    const all = Array.from(new Set(songs.map(s => s.genre))).sort()
    return ['All', ...all]
  }, [songs])

  const filtered = useMemo(() => {
    return songs.filter(s => {
      const q = search.toLowerCase()
      const matchSearch = !q || s.title.toLowerCase().includes(q) || s.artist.toLowerCase().includes(q)
      const matchDiff = difficulty === 0 || s.difficulty === difficulty
      const matchGenre = genre === 'All' || s.genre === genre
      return matchSearch && matchDiff && matchGenre
    })
  }, [songs, search, difficulty, genre])

  return (
    <div className="max-w-lg mx-auto px-4">
      <div className="pt-12 pb-4">
        <h1 className="text-2xl font-bold text-white">Songs</h1>
        <p className="text-zinc-500 text-sm mt-1">{songs.length} songs in catalog</p>
      </div>

      {/* Search */}
      <div className="relative mb-3">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          placeholder="Search songs or artists..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-10 pr-4 py-3 text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-amber-500"
        />
      </div>

      {/* Difficulty filter */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-2 scrollbar-none">
        {DIFFICULTIES.map(d => (
          <button
            key={d.value}
            onClick={() => setDifficulty(d.value)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              difficulty === d.value
                ? 'bg-amber-500 text-black'
                : 'bg-zinc-900 text-zinc-400 border border-zinc-800'
            }`}
          >
            {d.label}
          </button>
        ))}
      </div>

      {/* Genre filter */}
      <div className="flex gap-2 overflow-x-auto pb-3 scrollbar-none">
        {genres.map(g => (
          <button
            key={g}
            onClick={() => setGenre(g)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              genre === g
                ? 'bg-zinc-700 text-white'
                : 'bg-zinc-900 text-zinc-500 border border-zinc-800'
            }`}
          >
            {g}
          </button>
        ))}
      </div>

      {/* Results */}
      <div className="flex flex-col gap-3 pb-4">
        {filtered.length === 0 ? (
          <div className="text-center text-zinc-500 py-12">
            {search ? 'No songs found' : 'No songs yet'}
          </div>
        ) : (
          filtered.map(song => <SongCard key={song.id} song={song} />)
        )}
      </div>
    </div>
  )
}

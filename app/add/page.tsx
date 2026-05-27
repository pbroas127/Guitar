'use client'
import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { saveSong, getSong } from '@/lib/storage'
import { Song } from '@/lib/types'
import ChordLyrics from '@/components/ChordLyrics'
import { Suspense } from 'react'

const GENRES = ['Rock', 'Pop', 'Folk', 'Country', 'Blues', 'Jazz', 'Soul', 'Classical', 'Other']

function AddForm() {
  const router = useRouter()
  const params = useSearchParams()
  const editId = params.get('id')

  const [title, setTitle] = useState('')
  const [artist, setArtist] = useState('')
  const [key, setKey] = useState('G')
  const [capo, setCapo] = useState(0)
  const [difficulty, setDifficulty] = useState<1|2|3|4|5>(2)
  const [bpm, setBpm] = useState('')
  const [genre, setGenre] = useState('Rock')
  const [content, setContent] = useState('')
  const [preview, setPreview] = useState(false)

  useEffect(() => {
    if (editId) {
      const song = getSong(editId)
      if (song) {
        setTitle(song.title)
        setArtist(song.artist)
        setKey(song.key)
        setCapo(song.capo)
        setDifficulty(song.difficulty)
        setBpm(song.bpm?.toString() ?? '')
        setGenre(song.genre)
        setContent(song.content)
      }
    }
  }, [editId])

  const handleSave = () => {
    if (!title.trim() || !artist.trim()) return
    const song: Song = {
      id: editId ?? `user-${Date.now()}`,
      title: title.trim(),
      artist: artist.trim(),
      key,
      capo,
      difficulty,
      bpm: bpm ? parseInt(bpm) : undefined,
      genre,
      content,
      source: 'user',
      createdAt: Date.now(),
    }
    saveSong(song)
    router.push(`/song/${song.id}`)
  }

  return (
    <div className="max-w-lg mx-auto px-4 pt-12 pb-6">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="text-zinc-400">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-xl font-bold text-white">{editId ? 'Edit Song' : 'Add Song'}</h1>
      </div>

      <div className="flex flex-col gap-4">
        <div>
          <label className="text-zinc-400 text-xs uppercase tracking-wide mb-1.5 block">Title *</label>
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Song title"
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white placeholder-zinc-600 text-sm focus:outline-none focus:border-amber-500"
          />
        </div>

        <div>
          <label className="text-zinc-400 text-xs uppercase tracking-wide mb-1.5 block">Artist *</label>
          <input
            value={artist}
            onChange={e => setArtist(e.target.value)}
            placeholder="Artist name"
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white placeholder-zinc-600 text-sm focus:outline-none focus:border-amber-500"
          />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="text-zinc-400 text-xs uppercase tracking-wide mb-1.5 block">Key</label>
            <input
              value={key}
              onChange={e => setKey(e.target.value)}
              placeholder="G"
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-3 text-white text-sm focus:outline-none focus:border-amber-500"
            />
          </div>
          <div>
            <label className="text-zinc-400 text-xs uppercase tracking-wide mb-1.5 block">Capo</label>
            <input
              type="number"
              min={0}
              max={7}
              value={capo}
              onChange={e => setCapo(parseInt(e.target.value) || 0)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-3 text-white text-sm focus:outline-none focus:border-amber-500"
            />
          </div>
          <div>
            <label className="text-zinc-400 text-xs uppercase tracking-wide mb-1.5 block">BPM</label>
            <input
              type="number"
              value={bpm}
              onChange={e => setBpm(e.target.value)}
              placeholder="120"
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-3 text-white placeholder-zinc-600 text-sm focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>

        <div>
          <label className="text-zinc-400 text-xs uppercase tracking-wide mb-1.5 block">Difficulty</label>
          <div className="flex gap-2">
            {([1,2,3,4,5] as const).map(d => (
              <button
                key={d}
                onClick={() => setDifficulty(d)}
                className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  difficulty === d ? 'bg-amber-500 text-black' : 'bg-zinc-900 text-zinc-400 border border-zinc-800'
                }`}
              >
                {d}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-zinc-400 text-xs uppercase tracking-wide mb-1.5 block">Genre</label>
          <div className="flex flex-wrap gap-2">
            {GENRES.map(g => (
              <button
                key={g}
                onClick={() => setGenre(g)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  genre === g ? 'bg-zinc-700 text-white' : 'bg-zinc-900 text-zinc-500 border border-zinc-800'
                }`}
              >
                {g}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-zinc-400 text-xs uppercase tracking-wide">Chord Sheet</label>
            <button
              onClick={() => setPreview(p => !p)}
              className="text-xs text-amber-400"
            >
              {preview ? 'Edit' : 'Preview'}
            </button>
          </div>
          {preview ? (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 min-h-40 overflow-x-auto">
              <ChordLyrics content={content} capoOffset={0} />
            </div>
          ) : (
            <>
              <textarea
                value={content}
                onChange={e => setContent(e.target.value)}
                placeholder={`# Verse 1\n[G]Words with [C]chords above\n[D]Like this [Em]example\n\n# Chorus\n[G]Use # for sections`}
                rows={10}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white placeholder-zinc-600 text-sm focus:outline-none focus:border-amber-500 font-mono resize-none"
              />
              <p className="text-zinc-600 text-xs mt-1">Put chords in [brackets] inline with lyrics. Use # for sections.</p>
            </>
          )}
        </div>

        <button
          onClick={handleSave}
          disabled={!title.trim() || !artist.trim()}
          className="w-full py-4 rounded-xl bg-amber-500 text-black font-bold text-base disabled:opacity-40 disabled:cursor-not-allowed active:bg-amber-400 transition-colors"
        >
          {editId ? 'Save Changes' : 'Add Song'}
        </button>
      </div>
    </div>
  )
}

export default function AddPage() {
  return (
    <Suspense>
      <AddForm />
    </Suspense>
  )
}

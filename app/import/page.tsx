'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { saveSong } from '@/lib/storage'
import { Song } from '@/lib/types'
import { UGSearchResult } from '@/lib/ugParser'
import ChordLyrics from '@/components/ChordLyrics'

type Step = 'search' | 'preview'

const DIFF_LABELS: Record<string, string> = {
  novice: 'Beginner', beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced', hard: 'Advanced', expert: 'Expert',
}

export default function ImportPage() {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<UGSearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState<Step>('search')
  const [preview, setPreview] = useState<Partial<Song> | null>(null)
  const [fetchingTab, setFetchingTab] = useState(false)
  const [error, setError] = useState('')

  const search = async () => {
    if (!query.trim()) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/ug-search?q=${encodeURIComponent(query)}`)
      const data = await res.json()
      if (data.results?.length === 0) setError('No chord tabs found. Try a different search.')
      setResults(data.results ?? [])
    } catch {
      setError('Search failed. Check your connection.')
    } finally {
      setLoading(false)
    }
  }

  const importTab = async (tabUrl: string) => {
    setFetchingTab(true)
    setError('')
    try {
      const res = await fetch(`/api/ug-tab?url=${encodeURIComponent(tabUrl)}`)
      const data = await res.json()
      if (data.error) {
        setError(`Could not import: ${data.error}`)
        return
      }
      setPreview(data.song)
      setStep('preview')
    } catch {
      setError('Import failed. Try again.')
    } finally {
      setFetchingTab(false)
    }
  }

  const saveAndGo = () => {
    if (!preview) return
    saveSong(preview as Song)
    router.push(`/song/${preview.id}`)
  }

  if (step === 'preview' && preview) {
    return (
      <div className="max-w-lg mx-auto px-4 pt-12 pb-6">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => setStep('search')} className="text-zinc-400">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-lg font-bold text-white">Preview</h1>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 mb-4">
          <h2 className="text-white font-bold text-xl">{preview.title}</h2>
          <p className="text-zinc-400">{preview.artist}</p>
          <div className="flex gap-3 mt-2 text-xs text-zinc-400">
            {preview.key && <span>Key: <span className="text-white">{preview.key}</span></span>}
            {(preview.capo ?? 0) > 0 && <span>Capo: <span className="text-white">{preview.capo}</span></span>}
          </div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 mb-6 overflow-x-auto max-h-96 overflow-y-auto">
          <ChordLyrics content={preview.content ?? ''} capoOffset={0} />
        </div>

        <button
          onClick={saveAndGo}
          className="w-full py-4 rounded-xl bg-amber-500 text-black font-bold text-base active:bg-amber-400"
        >
          Add to My Catalog
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto px-4 pt-12 pb-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Import from UG</h1>
        <p className="text-zinc-500 text-sm mt-1">Search millions of songs on Ultimate Guitar</p>
      </div>

      {/* Search bar */}
      <div className="flex gap-2 mb-4">
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && search()}
          placeholder="Song or artist name..."
          className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-amber-500"
        />
        <button
          onClick={search}
          disabled={loading || !query.trim()}
          className="px-5 py-3 rounded-xl bg-amber-500 text-black font-bold text-sm disabled:opacity-40 active:bg-amber-400"
        >
          {loading ? '...' : 'Go'}
        </button>
      </div>

      {error && (
        <div className="bg-red-900/30 border border-red-800 rounded-xl px-4 py-3 mb-4 text-red-300 text-sm">
          {error}
        </div>
      )}

      {fetchingTab && (
        <div className="text-center text-zinc-400 py-8">Loading tab...</div>
      )}

      {/* Results */}
      <div className="flex flex-col gap-3">
        {results.map(r => (
          <button
            key={r.id}
            onClick={() => importTab(r.tab_url)}
            disabled={fetchingTab}
            className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-left active:bg-zinc-800 disabled:opacity-50 transition-colors"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-white font-semibold text-base truncate">{r.song_name}</p>
                <p className="text-zinc-400 text-sm truncate">{r.artist_name}</p>
              </div>
              <div className="shrink-0 flex flex-col items-end gap-1">
                <span className="text-amber-400 text-xs">
                  {'★'.repeat(Math.round(r.rating))}{'☆'.repeat(5 - Math.round(r.rating))}
                </span>
                <span className="text-zinc-500 text-xs">{r.votes} votes</span>
              </div>
            </div>
            <div className="flex items-center gap-3 mt-2 text-xs text-zinc-500">
              {r.tonality_name && <span>Key: <span className="text-zinc-300">{r.tonality_name}</span></span>}
              {r.difficulty && <span>{DIFF_LABELS[r.difficulty] ?? r.difficulty}</span>}
              <span className="ml-auto text-zinc-600">v{r.version}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

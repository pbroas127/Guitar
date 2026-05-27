'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { saveSong } from '@/lib/storage'
import { Song } from '@/lib/types'
import { UGSearchResult } from '@/lib/ugParser'
import { GHResult } from '@/app/api/gh-search/route'
import { parseChordPro } from '@/lib/chorproParser'
import ChordLyrics from '@/components/ChordLyrics'

type Tab = 'search' | 'paste'
type Step = 'browse' | 'preview'

export default function ImportPage() {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('search')
  const [query, setQuery] = useState('')
  const [ugResults, setUgResults] = useState<UGSearchResult[]>([])
  const [ghResults, setGhResults] = useState<GHResult[]>([])
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState<Step>('browse')
  const [preview, setPreview] = useState<Partial<Song> | null>(null)
  const [fetchingTab, setFetchingTab] = useState(false)
  const [error, setError] = useState('')
  const [pasteContent, setPasteContent] = useState('')
  const [ugBlocked, setUgBlocked] = useState(false)

  const search = async () => {
    if (!query.trim()) return
    setLoading(true)
    setError('')
    setUgResults([])
    setGhResults([])

    // Fire both searches in parallel
    const [ugRes, ghRes] = await Promise.allSettled([
      fetch(`/api/ug-search?q=${encodeURIComponent(query)}`).then(r => r.json()),
      fetch(`/api/gh-search?q=${encodeURIComponent(query)}`).then(r => r.json()),
    ])

    const ugData = ugRes.status === 'fulfilled' ? ugRes.value : { results: [], blocked: true }
    const ghData = ghRes.status === 'fulfilled' ? ghRes.value : { results: [] }

    setUgResults(ugData.results ?? [])
    setGhResults(ghData.results ?? [])
    setUgBlocked(!!ugData.blocked)

    const total = (ugData.results?.length ?? 0) + (ghData.results?.length ?? 0)
    if (total === 0) {
      setError(ugData.blocked
        ? 'Ultimate Guitar is not accessible from this server. Showing GitHub results only — or try the Paste tab.'
        : 'No results found. Try the Paste tab to import directly from Ultimate Guitar.')
    }

    setLoading(false)
  }

  const importUGTab = async (tabUrl: string) => {
    setFetchingTab(true)
    setError('')
    try {
      const res = await fetch(`/api/ug-tab?url=${encodeURIComponent(tabUrl)}`)
      const data = await res.json()
      if (data.error) { setError(`Could not fetch tab: ${data.error}`); return }
      setPreview(data.song)
      setStep('preview')
    } catch { setError('Import failed.') }
    finally { setFetchingTab(false) }
  }

  const importGHTab = async (rawUrl: string, name: string) => {
    setFetchingTab(true)
    setError('')
    try {
      const res = await fetch(rawUrl)
      if (!res.ok) { setError('Could not fetch file.'); return }
      const text = await res.text()
      const song = parseChordPro(text, name)
      setPreview(song)
      setStep('preview')
    } catch { setError('Import failed.') }
    finally { setFetchingTab(false) }
  }

  const importPaste = () => {
    if (!pasteContent.trim()) return
    // Auto-detect: if it has {title or looks like ChordPro, parse as ChordPro
    // Otherwise treat as UG-style tab
    const isChordPro = pasteContent.includes('{title') || pasteContent.includes('{t:')
    let song: Partial<Song>
    if (isChordPro) {
      song = parseChordPro(pasteContent)
    } else {
      // Import as raw UG-style content
      const { parseUGContent } = require('@/lib/ugParser')
      song = {
        id: `paste-${Date.now()}`,
        title: 'Imported Song',
        artist: '',
        key: '',
        capo: 0,
        difficulty: 2,
        genre: 'Rock',
        content: parseUGContent(pasteContent),
        source: 'user',
        createdAt: Date.now(),
      }
    }
    setPreview(song)
    setStep('preview')
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
          <button onClick={() => setStep('browse')} className="text-zinc-400">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-lg font-bold text-white">Preview</h1>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 mb-4">
          <h2 className="text-white font-bold text-xl">{preview.title || 'Untitled'}</h2>
          {preview.artist && <p className="text-zinc-400">{preview.artist}</p>}
          <div className="flex gap-3 mt-2 text-xs text-zinc-400">
            {preview.key && <span>Key: <span className="text-white">{preview.key}</span></span>}
            {(preview.capo ?? 0) > 0 && <span>Capo: <span className="text-white">{preview.capo}</span></span>}
          </div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 mb-4 overflow-x-auto max-h-96 overflow-y-auto">
          <ChordLyrics content={preview.content ?? ''} capoOffset={0} />
        </div>
        <p className="text-zinc-500 text-xs mb-3">You can edit the title, artist, key and other details after saving.</p>
        <button onClick={saveAndGo} className="w-full py-4 rounded-xl bg-amber-500 text-black font-bold text-base active:bg-amber-400">
          Add to My Catalog
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto px-4 pt-12 pb-6">
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-white">Import Song</h1>
        <p className="text-zinc-500 text-sm mt-1">Search or paste from Ultimate Guitar</p>
      </div>

      {/* Tab switcher */}
      <div className="flex bg-zinc-900 border border-zinc-800 rounded-xl p-1 mb-5">
        {(['search', 'paste'] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors capitalize ${
              tab === t ? 'bg-zinc-700 text-white' : 'text-zinc-500'
            }`}
          >
            {t === 'search' ? 'Search' : 'Paste Content'}
          </button>
        ))}
      </div>

      {tab === 'search' && (
        <>
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
            <div className="bg-zinc-900 border border-amber-900/50 rounded-xl px-4 py-3 mb-4 text-amber-200/80 text-sm">
              {error}
            </div>
          )}

          {fetchingTab && <div className="text-center text-zinc-400 py-6">Loading tab...</div>}

          {/* UG Results */}
          {ugResults.length > 0 && (
            <div className="mb-4">
              <p className="text-zinc-500 text-xs uppercase tracking-wide mb-2">Ultimate Guitar</p>
              <div className="flex flex-col gap-2">
                {ugResults.map(r => (
                  <button key={r.id} onClick={() => importUGTab(r.tab_url)} disabled={fetchingTab}
                    className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-left active:bg-zinc-800 disabled:opacity-50">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-white font-semibold truncate">{r.song_name}</p>
                        <p className="text-zinc-400 text-sm truncate">{r.artist_name}</p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-amber-400 text-xs">{'★'.repeat(Math.round(r.rating || 0))}</p>
                        <p className="text-zinc-600 text-xs">{r.votes} votes</p>
                      </div>
                    </div>
                    <div className="flex gap-3 mt-1.5 text-xs text-zinc-500">
                      {r.tonality_name && <span>Key: <span className="text-zinc-300">{r.tonality_name}</span></span>}
                      {r.difficulty && <span className="capitalize">{r.difficulty}</span>}
                      <span className="ml-auto">v{r.version}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* GitHub Results */}
          {ghResults.length > 0 && (
            <div>
              <p className="text-zinc-500 text-xs uppercase tracking-wide mb-2">
                GitHub ChordPro Files {ugBlocked && '(UG unavailable)'}
              </p>
              <div className="flex flex-col gap-2">
                {ghResults.map(r => (
                  <button key={r.raw_url} onClick={() => importGHTab(r.raw_url, r.name)} disabled={fetchingTab}
                    className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-left active:bg-zinc-800 disabled:opacity-50">
                    <p className="text-white font-semibold capitalize truncate">{r.name}</p>
                    <p className="text-zinc-500 text-xs mt-0.5 truncate">{r.repo}</p>
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {tab === 'paste' && (
        <div>
          <p className="text-zinc-400 text-sm mb-3">
            Open <span className="text-white font-medium">ultimate-guitar.com</span> in Safari, find your song,
            select all the tab text, copy it, then paste below.
          </p>
          <textarea
            value={pasteContent}
            onChange={e => setPasteContent(e.target.value)}
            placeholder="Paste tab content here..."
            rows={10}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white placeholder-zinc-600 text-sm focus:outline-none focus:border-amber-500 font-mono resize-none mb-4"
          />
          <button
            onClick={importPaste}
            disabled={!pasteContent.trim()}
            className="w-full py-4 rounded-xl bg-amber-500 text-black font-bold disabled:opacity-40 active:bg-amber-400"
          >
            Preview & Import
          </button>
        </div>
      )}
    </div>
  )
}

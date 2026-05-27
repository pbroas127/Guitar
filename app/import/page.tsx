'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { saveSong } from '@/lib/storage'
import { Song } from '@/lib/types'
import { parseUGContent, ugTabToSong, extractJsStore } from '@/lib/ugParser'
import { parseChordPro } from '@/lib/chorproParser'
import ChordLyrics from '@/components/ChordLyrics'

type Step = 'input' | 'preview'

export default function ImportPage() {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [url, setUrl] = useState('')
  const [pasteContent, setPasteContent] = useState('')
  const [step, setStep] = useState<Step>('input')
  const [preview, setPreview] = useState<Partial<Song> | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const ugSearchUrl = query.trim()
    ? `https://www.ultimate-guitar.com/search.php?search_type=title&value=${encodeURIComponent(query.trim())}&type=300`
    : 'https://www.ultimate-guitar.com'

  const fetchUrl = async () => {
    if (!url.trim()) return
    if (!url.includes('ultimate-guitar.com')) {
      setError('Please paste a URL from ultimate-guitar.com')
      return
    }
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/ug-tab?url=${encodeURIComponent(url.trim())}`)
      const data = await res.json()
      if (data.error || !data.song) {
        setError('Could not fetch that tab — try the Paste method below instead.')
        return
      }
      setPreview(data.song)
      setStep('preview')
    } catch {
      setError('Fetch failed — try the Paste method below instead.')
    } finally {
      setLoading(false)
    }
  }

  const importPaste = () => {
    if (!pasteContent.trim()) return
    let song: Partial<Song>
    if (pasteContent.includes('{title') || pasteContent.includes('{t:')) {
      song = parseChordPro(pasteContent)
    } else {
      song = {
        id: `paste-${Date.now()}`,
        title: 'Imported Song',
        artist: '',
        key: '',
        capo: 0,
        difficulty: 2 as const,
        genre: 'Rock',
        content: parseUGContent(pasteContent),
        source: 'user' as const,
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
          <button onClick={() => setStep('input')} className="text-zinc-400">
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

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 mb-4 overflow-x-auto max-h-80 overflow-y-auto">
          <ChordLyrics content={preview.content ?? ''} capoOffset={0} />
        </div>

        <p className="text-zinc-500 text-xs mb-3">You can edit title, artist, key and capo after saving.</p>
        <button onClick={saveAndGo} className="w-full py-4 rounded-xl bg-amber-500 text-black font-bold active:bg-amber-400">
          Add to My Catalog
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto px-4 pt-12 pb-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Import Song</h1>
        <p className="text-zinc-500 text-sm mt-1">From Ultimate Guitar</p>
      </div>

      {/* Step 1 */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 mb-4">
        <p className="text-amber-400 text-xs font-bold uppercase tracking-widest mb-3">Step 1 — Find your song</p>
        <div className="flex gap-2">
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Song or artist name..."
            className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-amber-500"
          />
          <a
            href={ugSearchUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2.5 rounded-lg bg-amber-500 text-black font-bold text-sm whitespace-nowrap active:bg-amber-400"
          >
            Open UG ↗
          </a>
        </div>
        <p className="text-zinc-600 text-xs mt-2">Opens Ultimate Guitar in a new tab. Find your song, tap "Chords".</p>
      </div>

      {/* Step 2 */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 mb-4">
        <p className="text-amber-400 text-xs font-bold uppercase tracking-widest mb-3">Step 2 — Import it</p>
        <p className="text-zinc-400 text-sm mb-3">Choose whichever method works:</p>

        {/* Method A: URL */}
        <div className="mb-4">
          <p className="text-zinc-300 text-sm font-medium mb-1">A) Paste the tab URL</p>
          <p className="text-zinc-600 text-xs mb-2">Copy the URL from your browser's address bar on the UG tab page.</p>
          <div className="flex gap-2">
            <input
              type="url"
              value={url}
              onChange={e => setUrl(e.target.value)}
              placeholder="https://tabs.ultimate-guitar.com/..."
              className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-white placeholder-zinc-500 text-xs focus:outline-none focus:border-amber-500"
            />
            <button
              onClick={fetchUrl}
              disabled={loading || !url.trim()}
              className="px-4 py-2.5 rounded-lg bg-zinc-700 text-white font-bold text-sm disabled:opacity-40 active:bg-zinc-600"
            >
              {loading ? '...' : 'Go'}
            </button>
          </div>
          {error && <p className="text-red-400 text-xs mt-2">{error}</p>}
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 h-px bg-zinc-800" />
          <span className="text-zinc-600 text-xs">or</span>
          <div className="flex-1 h-px bg-zinc-800" />
        </div>

        {/* Method B: Paste */}
        <div>
          <p className="text-zinc-300 text-sm font-medium mb-1">B) Paste the tab text</p>
          <p className="text-zinc-600 text-xs mb-2">On the UG tab page, long-press the chord sheet, "Select All", copy, then paste below.</p>
          <textarea
            value={pasteContent}
            onChange={e => setPasteContent(e.target.value)}
            placeholder="Paste tab content here..."
            rows={5}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-white placeholder-zinc-600 text-sm focus:outline-none focus:border-amber-500 font-mono resize-none mb-2"
          />
          <button
            onClick={importPaste}
            disabled={!pasteContent.trim()}
            className="w-full py-3 rounded-lg bg-amber-500 text-black font-bold text-sm disabled:opacity-40 active:bg-amber-400"
          >
            Preview & Import
          </button>
        </div>
      </div>
    </div>
  )
}

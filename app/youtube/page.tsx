'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { saveSong } from '@/lib/storage'
import { Song } from '@/lib/types'
import { transposeChord } from '@/lib/chords'

interface Video {
  id: string
  title: string
  channel: string
  duration: number
  thumbnail: string
  url: string
}

interface Segment {
  chord: string
  start: number
  end: number
}

interface AnalysisResult {
  youtube_title: string
  channel: string
  key: string
  mode: string
  capo: number
  tempo: number
  segments: Segment[]
  unique_chords: string[]
}

type Step = 'search' | 'video' | 'analyzing' | 'review'

function formatDuration(s: number) {
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${m}:${String(sec).padStart(2, '0')}`
}

function buildChordSheet(segments: Segment[], capo: number): string {
  if (!segments.length) return ''

  // Group segments into lines of ~4 chords each
  const lines: string[] = []
  const offset = -capo // display as open chord shapes

  let i = 0
  while (i < segments.length) {
    const chunk = segments.slice(i, i + 4)
    const chordLine = chunk.map(s => {
      const chord = capo ? transposeChord(s.chord, offset) : s.chord
      const ts = formatDuration(Math.round(s.start))
      return `[${chord}]` // chord inline, timestamp in comment
    }).join(' ')
    lines.push(chordLine)
    i += 4
  }

  return lines.join('\n')
}

export default function YouTubePage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>('search')
  const [query, setQuery] = useState('')
  const [videos, setVideos] = useState<Video[]>([])
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState('')
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null)
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null)
  const [analyzeError, setAnalyzeError] = useState('')
  const [editTitle, setEditTitle] = useState('')
  const [editArtist, setEditArtist] = useState('')
  const [editCapo, setEditCapo] = useState(0)

  const search = async () => {
    if (!query.trim()) return
    setSearching(true)
    setSearchError('')
    try {
      const res = await fetch(`/api/yt-search?q=${encodeURIComponent(query)}`)
      const data = await res.json()
      if (data.error) {
        setSearchError(data.error.includes('not configured')
          ? 'Backend not set up yet — see deploy instructions below.'
          : data.error)
        return
      }
      setVideos(data.videos ?? [])
      if (!data.videos?.length) setSearchError('No videos found.')
    } catch {
      setSearchError('Search failed.')
    } finally {
      setSearching(false)
    }
  }

  const selectVideo = (video: Video) => {
    setSelectedVideo(video)
    setStep('video')
    setAnalysis(null)
    setAnalyzeError('')
  }

  const analyzeVideo = async () => {
    if (!selectedVideo) return
    setStep('analyzing')
    setAnalyzeError('')
    try {
      const res = await fetch('/api/yt-analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ youtube_url: selectedVideo.url }),
      })
      const data = await res.json()
      if (data.error) { setAnalyzeError(data.error); setStep('video'); return }
      setAnalysis(data)
      // Pre-fill title from video title — strip common suffixes
      const title = data.youtube_title
        .replace(/\s*[-|–]\s*chords.*/i, '')
        .replace(/\s*[-|–]\s*guitar.*/i, '')
        .replace(/\s*\(.*?\)\s*$/, '')
        .trim()
      const artist = selectedVideo.channel
      setEditTitle(title)
      setEditArtist(artist)
      setEditCapo(data.capo)
      setStep('review')
    } catch {
      setAnalyzeError('Analysis failed. Is the backend running?')
      setStep('video')
    }
  }

  const saveToLibrary = () => {
    if (!analysis) return
    const content = buildChordSheet(analysis.segments, editCapo)
    const song: Song = {
      id: `yt-${selectedVideo!.id}`,
      title: editTitle || 'Unknown',
      artist: editArtist || '',
      key: analysis.key,
      capo: editCapo,
      difficulty: 2,
      bpm: analysis.tempo,
      genre: 'Rock',
      content,
      source: 'user',
      createdAt: Date.now(),
    }
    saveSong(song)
    router.push(`/song/${song.id}`)
  }

  // ── SEARCH ──────────────────────────────────────────────────────
  if (step === 'search') {
    return (
      <div className="max-w-lg mx-auto px-4 pt-12 pb-6">
        <h1 className="text-2xl font-bold text-white mb-1">YouTube → Chords</h1>
        <p className="text-zinc-500 text-sm mb-6">Find a song, detect chords automatically</p>

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
            disabled={searching || !query.trim()}
            className="px-5 py-3 rounded-xl bg-amber-500 text-black font-bold text-sm disabled:opacity-40 active:bg-amber-400"
          >
            {searching ? '...' : 'Search'}
          </button>
        </div>

        {searchError && (
          <div className="bg-zinc-900 border border-amber-900/40 rounded-xl p-4 mb-4 text-amber-200/80 text-sm">
            <p>{searchError}</p>
            {searchError.includes('Backend') && (
              <p className="mt-2 text-zinc-500 text-xs">
                Deploy the backend to Railway or Render using the code in the <code className="text-zinc-300">/backend</code> folder.
                Then set <code className="text-zinc-300">BACKEND_URL</code> in your .env.local.
              </p>
            )}
          </div>
        )}

        <div className="flex flex-col gap-3">
          {videos.map(v => (
            <button
              key={v.id}
              onClick={() => selectVideo(v)}
              className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 flex gap-3 text-left active:bg-zinc-800"
            >
              <img
                src={v.thumbnail}
                alt=""
                className="w-24 h-16 rounded-lg object-cover shrink-0 bg-zinc-800"
              />
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium line-clamp-2 leading-snug">{v.title}</p>
                <p className="text-zinc-500 text-xs mt-1">{v.channel}</p>
                {v.duration > 0 && (
                  <p className="text-zinc-600 text-xs">{formatDuration(v.duration)}</p>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>
    )
  }

  // ── VIDEO SELECTED ───────────────────────────────────────────────
  if (step === 'video' && selectedVideo) {
    return (
      <div className="max-w-lg mx-auto px-4 pt-12 pb-6">
        <button onClick={() => setStep('search')} className="text-zinc-400 mb-4 flex items-center gap-2 text-sm">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to results
        </button>

        <div className="aspect-video w-full rounded-xl overflow-hidden bg-zinc-900 mb-4">
          <iframe
            src={`https://www.youtube.com/embed/${selectedVideo.id}?autoplay=1`}
            className="w-full h-full"
            allow="autoplay; encrypted-media"
            allowFullScreen
          />
        </div>

        <p className="text-white font-semibold text-base mb-1 line-clamp-2">{selectedVideo.title}</p>
        <p className="text-zinc-500 text-sm mb-5">{selectedVideo.channel}</p>

        {analyzeError && (
          <div className="bg-red-900/20 border border-red-800 rounded-xl p-3 mb-4 text-red-300 text-sm">
            {analyzeError}
          </div>
        )}

        <button
          onClick={analyzeVideo}
          className="w-full py-4 rounded-xl bg-amber-500 text-black font-bold text-base active:bg-amber-400"
        >
          Detect Chords, Key & Capo
        </button>
        <p className="text-zinc-600 text-xs text-center mt-2">Analyzes the first 4 minutes · takes ~30s</p>
      </div>
    )
  }

  // ── ANALYZING ────────────────────────────────────────────────────
  if (step === 'analyzing') {
    return (
      <div className="max-w-lg mx-auto px-4 pt-12 flex flex-col items-center justify-center min-h-64">
        <div className="w-12 h-12 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-white font-semibold">Detecting chords...</p>
        <p className="text-zinc-500 text-sm mt-1">Downloading audio and running analysis</p>
        <p className="text-zinc-600 text-xs mt-3">This takes about 30–60 seconds</p>
      </div>
    )
  }

  // ── REVIEW ───────────────────────────────────────────────────────
  if (step === 'review' && analysis) {
    const capoOffset = 0 // chords already adjusted
    return (
      <div className="max-w-lg mx-auto px-4 pt-12 pb-6">
        <button onClick={() => setStep('video')} className="text-zinc-400 mb-4 flex items-center gap-2 text-sm">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>

        <h2 className="text-xl font-bold text-white mb-4">Review & Save</h2>

        {/* Detected info */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          {[
            { label: 'Key', value: `${analysis.key} ${analysis.mode}` },
            { label: 'Capo', value: analysis.capo === 0 ? 'None' : `Fret ${analysis.capo}` },
            { label: 'Tempo', value: `${analysis.tempo} BPM` },
          ].map(item => (
            <div key={item.label} className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-center">
              <p className="text-zinc-500 text-xs mb-1">{item.label}</p>
              <p className="text-white font-bold text-sm">{item.value}</p>
            </div>
          ))}
        </div>

        {/* Chord timeline */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 mb-5">
          <p className="text-zinc-400 text-xs uppercase tracking-wide mb-3">Chord Timeline</p>
          <div className="flex flex-wrap gap-2">
            {analysis.segments.map((seg, i) => (
              <div key={i} className="flex flex-col items-center">
                <span className="text-amber-400 font-bold text-sm">{seg.chord}</span>
                <span className="text-zinc-600 text-xs">{formatDuration(Math.round(seg.start))}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Unique chords */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 mb-5">
          <p className="text-zinc-400 text-xs uppercase tracking-wide mb-3">Chords Used</p>
          <div className="flex flex-wrap gap-2">
            {analysis.unique_chords.map(c => (
              <span key={c} className="bg-zinc-800 text-white text-sm font-mono px-3 py-1 rounded-lg">{c}</span>
            ))}
          </div>
        </div>

        {/* Edit fields */}
        <div className="flex flex-col gap-3 mb-5">
          <input
            value={editTitle}
            onChange={e => setEditTitle(e.target.value)}
            placeholder="Song title"
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-amber-500"
          />
          <input
            value={editArtist}
            onChange={e => setEditArtist(e.target.value)}
            placeholder="Artist"
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-amber-500"
          />
          <div className="flex items-center gap-4">
            <span className="text-zinc-400 text-sm w-12">Capo</span>
            <button onClick={() => setEditCapo(c => Math.max(0, c - 1))} className="w-8 h-8 rounded-full bg-zinc-800 text-white flex items-center justify-center text-lg">−</button>
            <span className="text-white font-bold w-4 text-center">{editCapo}</span>
            <button onClick={() => setEditCapo(c => Math.min(7, c + 1))} className="w-8 h-8 rounded-full bg-zinc-800 text-white flex items-center justify-center text-lg">+</button>
          </div>
        </div>

        <button
          onClick={saveToLibrary}
          className="w-full py-4 rounded-xl bg-amber-500 text-black font-bold text-base active:bg-amber-400"
        >
          Add to My Catalog
        </button>
        <p className="text-zinc-600 text-xs text-center mt-2">You can add lyrics manually after saving</p>
      </div>
    )
  }

  return null
}

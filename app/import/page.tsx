'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { saveSong } from '@/lib/storage'
import { Song } from '@/lib/types'
import { parseUGContent } from '@/lib/ugParser'
import { parseChordPro } from '@/lib/chorproParser'
import ChordLyrics from '@/components/ChordLyrics'

type Step = 'input' | 'preview'

// Bookmarklet: runs in browser on a UG page, tries multiple data sources
const BOOKMARKLET = `javascript:(function(){function send(content,title,artist,key,capo,diff){var o=JSON.stringify({_ugimport:1,title:title||'',artist:artist||'',key:key||'',capo:capo||0,difficulty:diff||'intermediate',content:content});navigator.clipboard.writeText(o).then(function(){alert('Copied! Switch to Guitar App and paste.');},function(){prompt('Copy this:',o);});}try{var nd=window.__NEXT_DATA__;if(nd){var pp=nd.props&&nd.props.pageProps;var data=pp&&(pp.data||pp.initialData||pp);var tv=data&&(data.tab_view||data.tabView);var t=data&&(data.tab||data.tabData);if(tv&&tv.wiki_tab&&tv.wiki_tab.content){send(tv.wiki_tab.content,t&&t.song_name,t&&t.artist_name,t&&t.tonality_name,(tv.meta&&tv.meta.capo)||0,t&&t.difficulty);return;}}var el=document.querySelector('[data-content]');if(el){var c=el.getAttribute('data-content').replace(/&quot;/g,'"').replace(/&amp;/g,'&').replace(/&#039;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>');try{var j=JSON.parse(c);var tv2=j.store&&j.store.page&&j.store.page.data&&j.store.page.data.tab_view;var t2=j.store&&j.store.page&&j.store.page.data&&j.store.page.data.tab;if(tv2&&tv2.wiki_tab){send(tv2.wiki_tab.content,t2.song_name,t2.artist_name,t2.tonality_name,(tv2.meta&&tv2.meta.capo)||0,t2.difficulty);return;}}catch(e2){}}var keys=Object.keys(window).filter(function(k){return/ug|tab|chord|next/i.test(k);}).slice(0,10);alert('Could not find tab data. Debug: '+keys.join(', ')+(nd?' __NEXT_DATA__ exists but structure differs':''));}catch(e){alert('Error: '+e.message);}})();`

interface UGImport {
  _ugimport: 1
  title: string
  artist: string
  key: string
  capo: number
  difficulty: string
  content: string
}

const DIFFICULTY_MAP: Record<string, 1|2|3|4|5> = {
  novice: 1, beginner: 1, easy: 1,
  intermediate: 3,
  advanced: 4, hard: 4, expert: 5,
}

function parsePaste(text: string): Partial<Song> {
  const trimmed = text.trim()

  // Structured import from bookmarklet
  if (trimmed.startsWith('{"_ugimport":1')) {
    try {
      const data: UGImport = JSON.parse(trimmed)
      return {
        id: `ug-${Date.now()}`,
        title: data.title,
        artist: data.artist,
        key: data.key,
        capo: data.capo ?? 0,
        difficulty: DIFFICULTY_MAP[data.difficulty?.toLowerCase()] ?? 3,
        genre: 'Rock',
        content: parseUGContent(data.content),
        source: 'user',
        createdAt: Date.now(),
      }
    } catch { /* fall through */ }
  }

  // ChordPro format
  if (trimmed.includes('{title') || trimmed.includes('{t:')) {
    return parseChordPro(trimmed)
  }

  // Raw UG tab text (manual copy-paste)
  return {
    id: `paste-${Date.now()}`,
    title: 'Imported Song',
    artist: '',
    key: '',
    capo: 0,
    difficulty: 2,
    genre: 'Rock',
    content: parseUGContent(trimmed),
    source: 'user',
    createdAt: Date.now(),
  }
}

export default function ImportPage() {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [pasteContent, setPasteContent] = useState('')
  const [step, setStep] = useState<Step>('input')
  const [preview, setPreview] = useState<Partial<Song> | null>(null)
  const [copied, setCopied] = useState(false)

  const ugSearchUrl = query.trim()
    ? `https://www.ultimate-guitar.com/search.php?search_type=title&value=${encodeURIComponent(query.trim())}&type=300`
    : 'https://www.ultimate-guitar.com'

  const copyBookmarklet = async () => {
    await navigator.clipboard.writeText(BOOKMARKLET)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const importPaste = () => {
    if (!pasteContent.trim()) return
    const song = parsePaste(pasteContent)
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

      {/* Step 1: Find */}
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
            className="px-4 py-2.5 rounded-lg bg-amber-500 text-black font-bold text-sm whitespace-nowrap"
          >
            Open UG ↗
          </a>
        </div>
        <p className="text-zinc-600 text-xs mt-2">Opens UG in a new tab. Pick the Chords version of your song.</p>
      </div>

      {/* Step 2: Bookmarklet */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 mb-4">
        <p className="text-amber-400 text-xs font-bold uppercase tracking-widest mb-3">Step 2 — Extract the tab</p>
        <p className="text-zinc-400 text-sm mb-3">
          Use the <span className="text-white font-medium">Guitar Importer</span> bookmarklet.
          Click it on any UG chord page — it instantly copies the song data to your clipboard.
        </p>

        <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-3 mb-3 flex items-center gap-3">
          <span className="text-2xl">🔖</span>
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-medium">Guitar Importer</p>
            <p className="text-zinc-500 text-xs truncate">{BOOKMARKLET.slice(0, 50)}...</p>
          </div>
          <button
            onClick={copyBookmarklet}
            className="shrink-0 px-3 py-1.5 rounded-lg bg-zinc-700 text-white text-xs font-medium active:bg-zinc-600"
          >
            {copied ? '✓ Copied' : 'Copy code'}
          </button>
        </div>

        <details className="text-zinc-500 text-xs">
          <summary className="cursor-pointer text-zinc-400 text-xs mb-1">How to install the bookmarklet</summary>
          <div className="mt-2 space-y-1 text-zinc-500">
            <p><span className="text-zinc-300">Desktop:</span> Click "Copy code" above → open Bookmarks bar → right-click → Add Bookmark → paste as URL</p>
            <p><span className="text-zinc-300">iPhone Safari:</span> Bookmark any page → edit the bookmark → replace the URL with the copied code</p>
            <p className="mt-2 text-zinc-600">Once installed, just click/tap it on any UG chord page to extract the song.</p>
          </div>
        </details>
      </div>

      {/* Step 3: Paste */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
        <p className="text-amber-400 text-xs font-bold uppercase tracking-widest mb-3">Step 3 — Paste & import</p>
        <textarea
          value={pasteContent}
          onChange={e => setPasteContent(e.target.value)}
          placeholder="Paste here — works with bookmarklet output, raw tab text, or ChordPro files..."
          rows={5}
          className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-white placeholder-zinc-600 text-sm focus:outline-none focus:border-amber-500 font-mono resize-none mb-3"
        />
        <button
          onClick={importPaste}
          disabled={!pasteContent.trim()}
          className="w-full py-3.5 rounded-xl bg-amber-500 text-black font-bold disabled:opacity-40 active:bg-amber-400"
        >
          Preview & Import
        </button>
      </div>
    </div>
  )
}

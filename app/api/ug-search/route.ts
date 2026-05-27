import { NextRequest, NextResponse } from 'next/server'
import { extractJsStore, extractSearchResults } from '@/lib/ugParser'

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')
  if (!q) return NextResponse.json({ results: [] })

  try {
    const url = `https://www.ultimate-guitar.com/search.php?search_type=title&value=${encodeURIComponent(q)}`
    const res = await fetch(url, { headers: HEADERS })
    if (!res.ok) return NextResponse.json({ error: 'UG unavailable', results: [] }, { status: 502 })

    const html = await res.text()
    const store = extractJsStore(html)
    if (!store) return NextResponse.json({ error: 'Parse failed', results: [] }, { status: 502 })

    const results = extractSearchResults(store)
    return NextResponse.json({ results })
  } catch (e) {
    return NextResponse.json({ error: String(e), results: [] }, { status: 500 })
  }
}

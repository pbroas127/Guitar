import { NextRequest, NextResponse } from 'next/server'
import { extractJsStore, ugTabToSong } from '@/lib/ugParser'

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
}

export async function GET(req: NextRequest) {
  const tabUrl = req.nextUrl.searchParams.get('url')
  if (!tabUrl) return NextResponse.json({ error: 'No URL' }, { status: 400 })

  // Only allow ultimate-guitar.com URLs
  if (!tabUrl.includes('ultimate-guitar.com')) {
    return NextResponse.json({ error: 'Invalid URL' }, { status: 400 })
  }

  try {
    const res = await fetch(tabUrl, { headers: HEADERS })
    if (!res.ok) return NextResponse.json({ error: 'Fetch failed' }, { status: 502 })

    const html = await res.text()
    const store = extractJsStore(html)
    if (!store) return NextResponse.json({ error: 'Could not parse tab' }, { status: 502 })

    const song = ugTabToSong(store, tabUrl)
    if (!song) return NextResponse.json({ error: 'Could not extract tab data' }, { status: 502 })

    return NextResponse.json({ song })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

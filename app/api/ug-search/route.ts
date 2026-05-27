import { NextRequest, NextResponse } from 'next/server'
import { extractJsStore, extractSearchResults } from '@/lib/ugParser'

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  'Accept-Encoding': 'gzip, deflate, br',
  'Referer': 'https://www.ultimate-guitar.com/',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'same-origin',
  'Upgrade-Insecure-Requests': '1',
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')
  if (!q) return NextResponse.json({ results: [] })

  try {
    const url = `https://www.ultimate-guitar.com/search.php?search_type=title&value=${encodeURIComponent(q)}`
    const res = await fetch(url, { headers: HEADERS, cache: 'no-store' })

    if (!res.ok) {
      return NextResponse.json({ error: `UG returned ${res.status}`, results: [], blocked: true }, { status: 200 })
    }

    const html = await res.text()
    const store = extractJsStore(html)
    if (!store) {
      return NextResponse.json({ error: 'Could not parse UG page', results: [], blocked: false }, { status: 200 })
    }

    const results = extractSearchResults(store)
    return NextResponse.json({ results, blocked: false })
  } catch (e) {
    return NextResponse.json({ error: String(e), results: [], blocked: true }, { status: 200 })
  }
}

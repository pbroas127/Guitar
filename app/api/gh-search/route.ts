import { NextRequest, NextResponse } from 'next/server'

export interface GHResult {
  name: string
  path: string
  raw_url: string
  repo: string
  html_url: string
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')
  if (!q) return NextResponse.json({ results: [] })

  try {
    const query = `${q} in:path extension:chopro OR extension:cho`
    const url = `https://api.github.com/search/code?q=${encodeURIComponent(query)}&per_page=15`

    const res = await fetch(url, {
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'GuitarApp/1.0',
      },
      cache: 'no-store',
    })

    if (!res.ok) return NextResponse.json({ error: `GitHub returned ${res.status}`, results: [] }, { status: 200 })

    const data = await res.json()
    const results: GHResult[] = (data.items ?? []).map((item: {
      name: string
      path: string
      html_url: string
      repository: { full_name: string }
      url: string
    }) => ({
      name: item.name.replace(/\.(chopro|cho|crd)$/i, '').replace(/[-_]/g, ' '),
      path: item.path,
      raw_url: `https://raw.githubusercontent.com/${item.repository.full_name}/HEAD/${item.path}`,
      repo: item.repository.full_name,
      html_url: item.html_url,
    }))

    return NextResponse.json({ results })
  } catch (e) {
    return NextResponse.json({ error: String(e), results: [] }, { status: 200 })
  }
}

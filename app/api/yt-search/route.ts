import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')
  if (!q) return NextResponse.json({ videos: [] })

  const backendUrl = process.env.BACKEND_URL
  if (!backendUrl) {
    return NextResponse.json({ error: 'Backend not configured', videos: [] })
  }

  try {
    const res = await fetch(`${backendUrl}/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: q, max_results: 10 }),
    })
    if (!res.ok) return NextResponse.json({ error: 'Search failed', videos: [] })
    const data = await res.json()
    return NextResponse.json(data)
  } catch (e) {
    return NextResponse.json({ error: String(e), videos: [] })
  }
}

export interface Song {
  id: string
  title: string
  artist: string
  key: string
  capo: number
  difficulty: 1 | 2 | 3 | 4 | 5
  bpm?: number
  genre: string
  content: string
  source: 'builtin' | 'user'
  createdAt: number
}

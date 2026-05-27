'use client'
import { Song } from './types'
import { SEED_SONGS } from '@/data/songs'

const KEY = 'guitar_songs'

function getUserSongs(): Song[] {
  try {
    const stored = localStorage.getItem(KEY)
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

export function getAllSongs(): Song[] {
  return [...SEED_SONGS, ...getUserSongs()]
}

export function getSong(id: string): Song | undefined {
  return getAllSongs().find(s => s.id === id)
}

export function saveSong(song: Song): void {
  const songs = getUserSongs()
  const idx = songs.findIndex(s => s.id === song.id)
  if (idx >= 0) songs[idx] = song
  else songs.push(song)
  localStorage.setItem(KEY, JSON.stringify(songs))
}

export function deleteSong(id: string): void {
  const songs = getUserSongs().filter(s => s.id !== id)
  localStorage.setItem(KEY, JSON.stringify(songs))
}

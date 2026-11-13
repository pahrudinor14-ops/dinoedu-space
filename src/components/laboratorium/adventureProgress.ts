export const ADVENTURE_PROGRESS_KEY = "dinolab-adventure-progress-v1"
export const ADVENTURE_LEADERBOARD_KEY = "dinolab-adventure-leaderboard-v1"
export const ADVENTURE_PLAYER_NAME_KEY = "dinolab-adventure-player-name-v1"

export const ADVENTURE_ISLAND_IDS = [
  "bilangan",
  "pecahan",
  "geometri",
  "bangun-ruang",
  "data",
  "tantangan",
] as const

export type AdventureIslandId = (typeof ADVENTURE_ISLAND_IDS)[number]
export type IslandProgressStatus = "unexplored" | "learning" | "completed"
export type AdventureProgress = Record<AdventureIslandId, IslandProgressStatus>

export interface AdventureLeaderboardEntry {
  id: string
  playerName: string
  points: number
  correctFirstTry: number
  challengeFirstTry: number
  evaluationFirstTry: number
  completedAt: string
}

export interface AdventureCompletion {
  id: string
  playerName: string
  correctFirstTry: number
  challengeFirstTry: number
  evaluationFirstTry: number
  completedAt: string
}

export const EMPTY_ADVENTURE_PROGRESS: AdventureProgress = {
  bilangan: "unexplored",
  pecahan: "unexplored",
  geometri: "unexplored",
  "bangun-ruang": "unexplored",
  data: "unexplored",
  tantangan: "unexplored",
}

export function readAdventureProgress(): AdventureProgress {
  if (typeof window === "undefined") return { ...EMPTY_ADVENTURE_PROGRESS }
  try {
    const raw = window.localStorage.getItem(ADVENTURE_PROGRESS_KEY)
    if (!raw) return { ...EMPTY_ADVENTURE_PROGRESS }
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== "object") return { ...EMPTY_ADVENTURE_PROGRESS }
    const record = parsed as Record<string, unknown>
    const progress = { ...EMPTY_ADVENTURE_PROGRESS }
    for (const islandId of ADVENTURE_ISLAND_IDS) {
      const status = record[islandId]
      if (status === "unexplored" || status === "learning" || status === "completed") {
        progress[islandId] = status
      }
    }
    return progress
  } catch {
    return { ...EMPTY_ADVENTURE_PROGRESS }
  }
}

export function writeAdventureProgress(progress: AdventureProgress) {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(ADVENTURE_PROGRESS_KEY, JSON.stringify(progress))
  } catch {
    // Keep the current in-memory progress if browser storage is unavailable.
  }
}

export function readAdventurePlayerName() {
  if (typeof window === "undefined") return "Penjelajah"
  try {
    const saved = window.localStorage.getItem(ADVENTURE_PLAYER_NAME_KEY)?.trim()
    return saved ? saved.slice(0, 24) : "Penjelajah"
  } catch {
    return "Penjelajah"
  }
}

export function writeAdventurePlayerName(name: string) {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(ADVENTURE_PLAYER_NAME_KEY, name.trim().slice(0, 24))
  } catch {
    // The name remains available in React state for this visit.
  }
}

function isLeaderboardEntry(value: unknown): value is AdventureLeaderboardEntry {
  if (!value || typeof value !== "object") return false
  const item = value as Record<string, unknown>
  return typeof item.id === "string"
    && typeof item.playerName === "string"
    && typeof item.points === "number"
    && Number.isFinite(item.points)
    && typeof item.correctFirstTry === "number"
    && typeof item.challengeFirstTry === "number"
    && typeof item.evaluationFirstTry === "number"
    && typeof item.completedAt === "string"
    && Number.isFinite(Date.parse(item.completedAt))
}

export function sortLeaderboard(entries: AdventureLeaderboardEntry[]) {
  return [...entries].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points
    return Date.parse(a.completedAt) - Date.parse(b.completedAt)
  })
}

export function readAdventureLeaderboard() {
  if (typeof window === "undefined") return []
  try {
    const raw = window.localStorage.getItem(ADVENTURE_LEADERBOARD_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed) ? sortLeaderboard(parsed.filter(isLeaderboardEntry)).slice(0, 50) : []
  } catch {
    return []
  }
}

export function writeAdventureLeaderboard(entries: AdventureLeaderboardEntry[]) {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(ADVENTURE_LEADERBOARD_KEY, JSON.stringify(sortLeaderboard(entries).slice(0, 50)))
  } catch {
    // Keep the current in-memory leaderboard if browser storage is unavailable.
  }
}

export interface SavedLineup {
  matchday: number;
  starters: string[];          // 11 player ids
  bench: string[];             // até 7 reservas
  subs: { outId: string; inId: string; minute: number }[]; // plano de substituições
  opponent: string;
  home: boolean;
}

const key = (careerId: string) => `lineup:${careerId}`;

export function saveLineup(careerId: string, lineup: SavedLineup) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key(careerId), JSON.stringify(lineup));
  } catch {
    /* ignore */
  }
}

export function loadLineup(careerId: string): SavedLineup | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key(careerId));
    if (!raw) return null;
    return JSON.parse(raw) as SavedLineup;
  } catch {
    return null;
  }
}

export function clearLineup(careerId: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(key(careerId));
  } catch {
    /* ignore */
  }
}
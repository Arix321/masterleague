import type { ClubSlug } from "@/data/clubs";

/**
 * Janela de transferências cíclica:
 * - Aberta nas rodadas 1..4
 * - Fechada nas rodadas 5..9
 */
const CYCLE = 9;
const OPEN_PHASE = 4;

export function isWindowOpen(matchday: number): boolean {
  if (matchday < 1) return true;
  const pos = ((matchday - 1) % CYCLE) + 1;
  return pos <= OPEN_PHASE;
}

export function nextWindowChange(matchday: number): number {
  const pos = ((matchday - 1) % CYCLE) + 1;
  if (pos <= OPEN_PHASE) return matchday + (OPEN_PHASE - pos + 1);
  return matchday + (CYCLE - pos + 1);
}

export function windowClosesAt(matchday: number): number {
  const pos = ((matchday - 1) % CYCLE) + 1;
  if (pos <= OPEN_PHASE) return matchday + (OPEN_PHASE - pos);
  return nextWindowChange(matchday);
}

// =====================================================
// Clássicos brasileiros
// =====================================================
const DERBY_PAIRS: Record<ClubSlug, string[]> = {
  palmeiras:   ["Corinthians", "São Paulo", "Santos"],
  flamengo:    ["Fluminense", "Vasco", "Botafogo"],
  corinthians: ["Palmeiras", "São Paulo", "Santos"],
  vasco:       ["Flamengo", "Fluminense", "Botafogo"],
  fluminense:  ["Flamengo", "Vasco", "Botafogo"],
  cruzeiro:    ["Atlético-MG", "América-MG"],
};

const DERBY_NAMES: Record<string, string> = {
  "palmeiras|Corinthians": "Dérbi Paulista",
  "palmeiras|São Paulo": "Choque-Rei",
  "palmeiras|Santos": "Clássico da Saudade",
  "flamengo|Fluminense": "Fla-Flu",
  "flamengo|Vasco": "Clássico dos Milhões",
  "flamengo|Botafogo": "Clássico da Rivalidade",
  "corinthians|Palmeiras": "Dérbi Paulista",
  "corinthians|São Paulo": "Majestoso",
  "corinthians|Santos": "Clássico Alvinegro",
  "vasco|Flamengo": "Clássico dos Milhões",
  "vasco|Fluminense": "Clássico dos Gigantes",
  "vasco|Botafogo": "Clássico da Amizade",
  "fluminense|Flamengo": "Fla-Flu",
  "fluminense|Vasco": "Clássico dos Gigantes",
  "fluminense|Botafogo": "Clássico Vovô",
  "cruzeiro|Atlético-MG": "Clássico Mineiro",
  "cruzeiro|América-MG": "Clássico das Multidões",
};

export function isDerby(clubSlug: ClubSlug, opponent: string): boolean {
  return (DERBY_PAIRS[clubSlug] ?? []).includes(opponent);
}

export function derbyName(clubSlug: ClubSlug, opponent: string): string | null {
  const key = `${clubSlug}|${opponent}`;
  return DERBY_NAMES[key] ?? (isDerby(clubSlug, opponent) ? "Clássico" : null);
}

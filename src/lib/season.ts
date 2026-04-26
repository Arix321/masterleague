import type { ClubSlug } from "@/data/clubs";

/**
 * Janela de transferências cíclica:
 * - Aberta nas rodadas 1..4 (4 jogos abertos)
 * - Fechada nas rodadas 5..9 (5 jogos fechados)
 * - Aberta nas rodadas 10..13, fechada 14..18, e assim por diante.
 *
 * Ciclo total = 9 rodadas (4 abertas + 5 fechadas).
 */
const CYCLE = 9;
const OPEN_PHASE = 4;

export function isWindowOpen(matchday: number): boolean {
  if (matchday < 1) return true;
  const pos = ((matchday - 1) % CYCLE) + 1; // 1..9
  return pos <= OPEN_PHASE;
}

/** Próxima rodada em que a janela muda de estado a partir de `matchday` (inclusive). */
export function nextWindowChange(matchday: number): number {
  const pos = ((matchday - 1) % CYCLE) + 1;
  if (pos <= OPEN_PHASE) {
    // ainda aberta — fecha após OPEN_PHASE
    return matchday + (OPEN_PHASE - pos + 1);
  }
  // fechada — abre no início do próximo ciclo
  return matchday + (CYCLE - pos + 1);
}

/** Última rodada da fase aberta atual (se aberta). Caso contrário, próxima abertura. */
export function windowClosesAt(matchday: number): number {
  const pos = ((matchday - 1) % CYCLE) + 1;
  if (pos <= OPEN_PHASE) {
    return matchday + (OPEN_PHASE - pos);
  }
  return nextWindowChange(matchday); // representa "abre na rodada X"
}

// =====================================================
// Clássicos — pares clube ⇄ adversário considerados rivalidades
// =====================================================
const DERBY_PAIRS: Record<ClubSlug, string[]> = {
  palmeiras:        ["Corinthians", "São Paulo", "Santos"],
  flamengo:         ["Fluminense", "Vasco", "Botafogo"],
  "real-madrid":    ["Barcelona", "Atlético de Madrid"],
  barcelona:        ["Real Madrid", "Espanyol"],
  "manchester-city": ["Manchester United"],
  liverpool:        ["Manchester United", "Everton"],
};

const DERBY_NAMES: Record<string, string> = {
  "palmeiras|Corinthians": "Dérbi Paulista",
  "palmeiras|São Paulo": "Choque-Rei",
  "palmeiras|Santos": "Clássico da Saudade",
  "flamengo|Fluminense": "Fla-Flu",
  "flamengo|Vasco": "Clássico dos Milhões",
  "flamengo|Botafogo": "Clássico da Rivalidade",
  "real-madrid|Barcelona": "El Clásico",
  "real-madrid|Atlético de Madrid": "Derby Madrileño",
  "barcelona|Real Madrid": "El Clásico",
  "barcelona|Espanyol": "Derbi Barceloní",
  "manchester-city|Manchester United": "Manchester Derby",
  "liverpool|Manchester United": "North West Derby",
  "liverpool|Everton": "Merseyside Derby",
};

export function isDerby(clubSlug: ClubSlug, opponent: string): boolean {
  return (DERBY_PAIRS[clubSlug] ?? []).includes(opponent);
}

export function derbyName(clubSlug: ClubSlug, opponent: string): string | null {
  const key = `${clubSlug}|${opponent}`;
  return DERBY_NAMES[key] ?? (isDerby(clubSlug, opponent) ? "Clássico" : null);
}
import type { Position } from "@/data/squads";

const FIRST_NAMES = ["Lucas", "Matheus", "João", "Gabriel", "Pedro", "Carlos", "Diego", "Rafael", "Bruno", "Felipe", "Thiago", "André", "Vinícius", "Enzo", "Mateo", "Hugo", "Marco", "Leandro", "Iván", "Sergio"];
const LAST_NAMES = ["Silva", "Santos", "Oliveira", "Costa", "Rodríguez", "Martínez", "García", "Pereira", "Souza", "Lima", "Ferreira", "Almeida", "Ribeiro", "Torres", "Núñez", "López", "Ramos", "Vieira", "Castro", "Mendes"];

export function randomPlayerName() {
  const f = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
  const l = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
  return `${f} ${l}`;
}

/**
 * Gera atributos, overall e potencial a partir de idade + posição.
 * - Mais novo = potencial mais alto, overall mais baixo
 * - Mais velho = overall pode ser alto, mas potencial baixo
 */
export function generatePlayerStats(age: number, position: Position) {
  const safeAge = Math.max(15, Math.min(40, Math.floor(age)));
  const youthBoost = Math.max(0, 24 - safeAge); // 0..9
  const ageDecline = Math.max(0, safeAge - 30); // 0..10

  const baseOverall = 70 + Math.floor(Math.random() * 8); // 70..77
  const overall = Math.max(55, Math.min(92, baseOverall - Math.floor(youthBoost / 2) - ageDecline));

  const potential = Math.max(
    overall,
    Math.min(95, overall + youthBoost + Math.floor(Math.random() * 4) - Math.floor(ageDecline / 2)),
  );

  // Atributos por posição (peso)
  const ATTRS: Record<Position, { attack: number; defense: number; physical: number; technique: number }> = {
    GOL: { attack: 30, defense: 78, physical: 70, technique: 70 },
    ZAG: { attack: 45, defense: 82, physical: 80, technique: 65 },
    LAT: { attack: 70, defense: 75, physical: 78, technique: 70 },
    VOL: { attack: 60, defense: 80, physical: 80, technique: 70 },
    MDF: { attack: 60, defense: 78, physical: 78, technique: 74 },
    MCT: { attack: 70, defense: 68, physical: 74, technique: 80 },
    MAT: { attack: 80, defense: 55, physical: 70, technique: 84 },
    PTA: { attack: 84, defense: 45, physical: 75, technique: 82 },
    CA:  { attack: 88, defense: 40, physical: 78, technique: 80 },
  };
  const att = ATTRS[position];

  const jitter = () => Math.floor(Math.random() * 9) - 4; // -4..+4
  const scale = (overall - 75) * 0.6; // ajuste por overall

  return {
    overall,
    potential,
    attack:    clamp(att.attack    + scale + jitter()),
    defense:   clamp(att.defense   + scale + jitter()),
    physical:  clamp(att.physical  + scale + jitter()),
    technique: clamp(att.technique + scale + jitter()),
  };
}

function clamp(n: number) {
  return Math.max(40, Math.min(99, Math.round(n)));
}

/**
 * Estima valor de mercado (€) e salário semanal a partir de overall, idade e potencial.
 */
export function estimateValue(overall: number, age: number, potential: number) {
  const ageFactor = age <= 23 ? 1.4 : age <= 28 ? 1.0 : age <= 32 ? 0.7 : 0.35;
  const potBonus = (potential - overall) * 0.05; // jovens promissores valem mais
  const base = Math.pow(Math.max(60, overall) - 60, 2.4) * 18_000;
  const value = Math.round(base * (1 + potBonus) * ageFactor);
  const wage = Math.round(value * 0.012);
  return {
    marketValue: Math.max(500_000, value),
    weeklyWage: Math.max(20_000, wage),
  };
}

/**
 * Bônus de caixa entregue pela diretoria após uma vitória.
 * Quanto maior a diferença de gols, maior a recompensa.
 */
export function victoryBonus(gf: number, ga: number) {
  if (gf <= ga) return 0;
  const diff = gf - ga;
  if (diff >= 4) return 6_000_000;
  if (diff >= 3) return 3_500_000;
  if (diff >= 2) return 1_800_000;
  return 700_000;
}

/**
 * Decide se vai gerar propostas dos rivais para os meus jogadores nesta rodada,
 * com base em desempenho recente e estrelas do elenco.
 */
export interface SquadForOffers {
  id: string;
  name: string;
  overall: number;
  age: number;
  market_value_eur: number;
  weekly_wage_eur: number;
  goals: number;
  assists: number;
}

const SUITORS = [
  "PSG", "Bayern de Munique", "Chelsea", "Arsenal", "Inter de Milão",
  "Juventus", "Atlético de Madrid", "Borussia Dortmund", "Newcastle",
  "Al-Hilal", "Al-Nassr", "Tottenham", "Napoli", "Milan",
];

export function buildIncomingOffers(
  squad: SquadForOffers[],
  matchday: number,
  windowOpen: boolean,
) {
  if (!windowOpen) return [];
  // 1-2 propostas por rodada, focadas em quem brilhou
  const candidates = squad
    .map((p) => ({
      ...p,
      score: p.overall + p.goals * 2 + p.assists + (p.age <= 23 ? 5 : 0),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 6);

  const offers: Array<{
    player_id: string;
    player_name: string;
    from_club: string;
    fee_eur: number;
    bonus_eur: number;
    wage_offered_eur: number;
    offer_type: string;
    player_interest: number;
    matchday: number;
  }> = [];

  const targetCount = Math.random() < 0.6 ? 1 : Math.random() < 0.85 ? 2 : 0;
  const used = new Set<string>();

  for (let i = 0; i < targetCount && candidates.length > 0; i++) {
    const player = candidates[Math.floor(Math.random() * candidates.length)];
    if (used.has(player.id)) continue;
    used.add(player.id);

    const suitor = SUITORS[Math.floor(Math.random() * SUITORS.length)];
    const isLoan = Math.random() < 0.18;
    const feeMultiplier = 0.7 + Math.random() * 0.7; // 70%..140%
    const fee = isLoan ? 0 : Math.round(player.market_value_eur * feeMultiplier);
    const bonus = isLoan ? Math.round(player.market_value_eur * 0.05) : Math.round(fee * 0.1);
    const wage = Math.round(player.weekly_wage_eur * (1.1 + Math.random() * 0.5));
    const interest = Math.round(40 + Math.random() * 55); // 40..95

    offers.push({
      player_id: player.id,
      player_name: player.name,
      from_club: suitor,
      fee_eur: fee,
      bonus_eur: bonus,
      wage_offered_eur: wage,
      offer_type: isLoan ? "loan" : "buy",
      player_interest: interest,
      matchday,
    });
  }

  return offers;
}
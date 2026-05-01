import { supabase } from "@/integrations/supabase/client";
import { CLUBS, type ClubSlug } from "@/data/clubs";
import { SQUADS, MARKET_SEED } from "@/data/squads";
import { generatePlayerStats } from "@/lib/players";
import { isWindowOpen, windowClosesAt } from "@/lib/season";
import { pushAINews } from "@/lib/news";

export interface NewCareerInput {
  managerName: string;
  clubSlug: ClubSlug;
  userId: string;
}

export async function createCareer(input: NewCareerInput) {
  const club = CLUBS[input.clubSlug];
  const squad = SQUADS[input.clubSlug];

  const weekly = squad.reduce((acc, p) => acc + p.weeklyWage, 0);

  const { data: career, error: careerErr } = await supabase
    .from("careers")
    .insert({
      user_id: input.userId,
      manager_name: input.managerName,
      club_name: club.name,
      club_slug: club.slug,
      cash_eur: club.budgetEur,
      weekly_wages_eur: weekly,
      next_opponent: club.rivals[0] ?? "Adversário",
      transfer_window_open: isWindowOpen(1),
      transfer_window_closes_at: windowClosesAt(1),
    })
    .select()
    .single();

  if (careerErr || !career) throw careerErr ?? new Error("Falha ao criar carreira");

  // Inserir todos os elencos dos 6 clubes
  const allSquadRows: Array<{
    career_id: string;
    user_id: string;
    club_slug: string;
    name: string;
    position: string;
    overall: number;
    weekly_wage_eur: number;
    market_value_eur: number;
    age: number;
    potential: number;
    attack: number;
    defense: number;
    physical: number;
    technique: number;
  }> = [];
  (Object.keys(SQUADS) as ClubSlug[]).forEach((slug) => {
    SQUADS[slug].forEach((p) => {
      const age = p.age;
      const stats = generatePlayerStats(age, p.position);
      allSquadRows.push({
        career_id: career.id,
        user_id: input.userId,
        club_slug: slug,
        name: p.name,
        position: p.position,
        overall: p.overall,
        weekly_wage_eur: p.weeklyWage,
        market_value_eur: p.marketValue,
        age,
        potential: Math.max(p.overall, stats.potential),
        attack: stats.attack,
        defense: stats.defense,
        physical: stats.physical,
        technique: stats.technique,
      });
    });
  });

  const { error: squadErr } = await supabase.from("squad_players").insert(allSquadRows);
  if (squadErr) throw squadErr;

  // Mercado: remover qualquer jogador que pertença ao CLUBE SELECIONADO.
  // Jogadores de outros times continuam disponíveis no mercado.
  const ownedNames = new Set<string>(squad.map((p) => p.name));
  const ownClubName = club.name;

  // Remover duplicatas dentro do próprio MARKET_SEED (mantém a primeira ocorrência,
  // e como a lista está ordenada por valor, fica a entrada de maior valor).
  const seen = new Set<string>();
  const dedupedMarket = MARKET_SEED.filter((mp) => {
    if (seen.has(mp.name)) return false;
    seen.add(mp.name);
    return true;
  });

  const marketRows = dedupedMarket
    .filter((mp) => !ownedNames.has(mp.name) && mp.currentClub !== ownClubName)
    .map((mp) => {
    const age = mp.age;
    const stats = generatePlayerStats(age, mp.position);
    return {
      career_id: career.id,
      user_id: input.userId,
      name: mp.name,
      position: mp.position,
      overall: mp.overall,
      market_value_eur: mp.marketValue,
      expected_wage_eur: mp.expectedWage,
      region: mp.region,
      current_club: mp.currentClub,
      age,
      potential: Math.max(mp.overall, stats.potential),
    };
  });

  if (marketRows.length > 0) {
    const { error: mErr } = await supabase.from("market_players").insert(marketRows);
    if (mErr) throw mErr;
  }

  // Notícias iniciais (geradas por IA com fallback)
  await Promise.all([
    pushAINews({
      careerId: career.id,
      userId: input.userId,
      kind: "headline",
      hint: `Anunciar a chegada de ${input.managerName} como novo treinador do ${club.name} para a temporada do ${club.league}. Tom: oficial e empolgado.`,
      context: {
        clube: club.name,
        liga: club.league,
        treinador: input.managerName,
        rivais: club.rivals.join(", "),
        orcamento_eur: club.budgetEur,
      },
      fallbackTitle: `${input.managerName} é o novo treinador do ${club.name}`,
      fallbackBody: `A diretoria oficializou hoje a chegada de ${input.managerName} para comandar o ${club.name} na nova temporada do ${club.league}.`,
    }),
    pushAINews({
      careerId: career.id,
      userId: input.userId,
      kind: "press",
      hint: `Reação da torcida do ${club.name} à chegada de ${input.managerName}. Mencione redes sociais, expectativa, possíveis cobranças.`,
      context: { clube: club.name, treinador: input.managerName },
      fallbackTitle: `Torcida do ${club.name} recebe novo comandante com expectativa`,
      fallbackBody: `Nas redes sociais, torcedores do ${club.name} demonstram esperança por uma temporada vitoriosa.`,
    }),
  ]);

  return career;
}

export async function deleteCareer(careerId: string) {
  const { error } = await supabase.from("careers").delete().eq("id", careerId);
  if (error) throw error;
}
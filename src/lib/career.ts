import { supabase } from "@/integrations/supabase/client";
import { CLUBS, type ClubSlug } from "@/data/clubs";
import { SQUADS, MARKET_SEED } from "@/data/squads";

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
    })
    .select()
    .single();

  if (careerErr || !career) throw careerErr ?? new Error("Falha ao criar carreira");

  // Inserir todos os elencos dos 6 clubes
  const allSquadRows: Array<Record<string, unknown>> = [];
  (Object.keys(SQUADS) as ClubSlug[]).forEach((slug) => {
    SQUADS[slug].forEach((p) => {
      allSquadRows.push({
        career_id: career.id,
        user_id: input.userId,
        club_slug: slug,
        name: p.name,
        position: p.position,
        overall: p.overall,
        weekly_wage_eur: p.weeklyWage,
        market_value_eur: p.marketValue,
      });
    });
  });

  const { error: squadErr } = await supabase.from("squad_players").insert(allSquadRows);
  if (squadErr) throw squadErr;

  // Mercado: filtrar para não duplicar nomes que já estão em algum elenco
  const allNames = new Set<string>();
  (Object.values(SQUADS).flat() as { name: string }[]).forEach((p) => allNames.add(p.name));

  const marketRows = MARKET_SEED.filter((m) => !allNames.has(m.name)).map((m) => ({
    career_id: career.id,
    user_id: input.userId,
    name: m.name,
    position: m.position,
    overall: m.overall,
    market_value_eur: m.marketValue,
    expected_wage_eur: m.expectedWage,
    region: m.region,
  }));

  if (marketRows.length > 0) {
    const { error: mErr } = await supabase.from("market_players").insert(marketRows);
    if (mErr) throw mErr;
  }

  // Notícias iniciais
  await supabase.from("news_feed").insert([
    {
      career_id: career.id,
      user_id: input.userId,
      kind: "headline",
      title: `${input.managerName} é o novo treinador do ${club.name}`,
      body: `A diretoria oficializou hoje a chegada de ${input.managerName} para comandar o ${club.name} na nova temporada do ${club.league}.`,
    },
    {
      career_id: career.id,
      user_id: input.userId,
      kind: "press",
      title: `Torcida do ${club.name} recebe novo comandante com expectativa`,
      body: `Nas redes sociais, torcedores do ${club.name} demonstram esperança por uma temporada vitoriosa.`,
    },
  ]);

  return career;
}

export async function deleteCareer(careerId: string) {
  const { error } = await supabase.from("careers").delete().eq("id", careerId);
  if (error) throw error;
}
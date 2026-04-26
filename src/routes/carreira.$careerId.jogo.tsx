import { createFileRoute, Link, useNavigate, useParams } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useCareer } from "@/lib/career-context";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import {
  fanReaction,
  postMatchHeadline,
  postMatchPressIntro,
} from "@/lib/narrative";
import { isWindowOpen, isDerby, derbyName } from "@/lib/season";
import { loadLineup, clearLineup, type SavedLineup } from "@/lib/lineup";
import { POSITION_ORDER, normalizePosition } from "@/data/squads";
import { toast } from "sonner";
import { Trophy, ChevronRight, Mic, ChevronLeft, Goal, HandHelping, Square, Plus, Minus, ArrowRightLeft, Flame, ClipboardList, Trash2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { victoryBonus, buildIncomingOffers } from "@/lib/players";

interface SquadRow {
  id: string;
  name: string;
  position: string;
  overall: number;
  goals: number;
  assists: number;
  injured: boolean;
  age: number;
  market_value_eur: number;
  weekly_wage_eur: number;
  yellow_cards_season: number;
}

type StatKey = "goals" | "assists" | "yellow" | "red";

const STAT_META: Record<StatKey, { label: string; icon: typeof Goal; color: string; bg: string }> = {
  goals:   { label: "Gols",         icon: Goal,         color: "text-emerald-300", bg: "bg-emerald-500/15 border-emerald-500/40" },
  assists: { label: "Assistências", icon: HandHelping,  color: "text-sky-300",     bg: "bg-sky-500/15 border-sky-500/40" },
  yellow:  { label: "Amarelos",     icon: Square,       color: "text-yellow-300",  bg: "bg-yellow-500/15 border-yellow-500/40" },
  red:     { label: "Vermelhos",    icon: Square,       color: "text-red-400",     bg: "bg-red-500/15 border-red-500/40" },
};

export const Route = createFileRoute("/carreira/$careerId/jogo")({
  component: JogoPage,
});

function namesFromCount(rec: Record<string, number>, players: SquadRow[]): string {
  const parts: string[] = [];
  for (const [id, n] of Object.entries(rec)) {
    const p = players.find((x) => x.id === id);
    if (!p || n <= 0) continue;
    parts.push(n > 1 ? `${p.name} (${n})` : p.name);
  }
  return parts.join(", ");
}

function totalCount(rec: Record<string, number>) {
  return Object.values(rec).reduce((s, n) => s + n, 0);
}

function JogoPage() {
  const { career, club, refresh } = useCareer();
  const { careerId } = useParams({ from: "/carreira/$careerId/jogo" });
  const navigate = useNavigate();

  const [players, setPlayers] = useState<SquadRow[]>([]);
  const [lineup, setLineup] = useState<SavedLineup | null>(null);
  const opponent = lineup?.opponent ?? career.next_opponent ?? "Adversário";
  const home = lineup?.home ?? true;
  const [gf, setGf] = useState(0);
  const [ga, setGa] = useState(0);

  // Contagens por jogador
  const [goals, setGoals] = useState<Record<string, number>>({});
  const [assists, setAssists] = useState<Record<string, number>>({});
  const [yellow, setYellow] = useState<Record<string, number>>({});
  const [red, setRed] = useState<Record<string, number>>({});

  // Substituições feitas durante o jogo (ao vivo).
  const [liveSubs, setLiveSubs] = useState<{ outId: string; inId: string; minute: number }[]>([]);
  const [subOutId, setSubOutId] = useState<string>("");
  const [subInId, setSubInId] = useState<string>("");
  const [subMinute, setSubMinute] = useState<number>(60);

  const [activeStat, setActiveStat] = useState<StatKey>("goals");
  const [position, setPosition] = useState(career.league_position);
  const [busy, setBusy] = useState(false);

  // Coletiva pós-jogo
  const [pressOpen, setPressOpen] = useState(false);
  const [pressIntro, setPressIntro] = useState("");
  const [pressQuestions, setPressQuestions] = useState<string[]>([]);
  const [pressIndex, setPressIndex] = useState(0);
  const [pressAnswer, setPressAnswer] = useState("");
  const [pressAnswers, setPressAnswers] = useState<{ q: string; a: string }[]>([]);
  const [pressSaving, setPressSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("squad_players")
        .select("id, name, position, overall, goals, assists, injured, age, market_value_eur, weekly_wage_eur, yellow_cards_season")
        .eq("career_id", careerId)
        .eq("club_slug", career.club_slug);
      setPlayers((data ?? []) as SquadRow[]);
    })();
    setLineup(loadLineup(careerId));
  }, [careerId, career.club_slug]);

  // Ordenado por posição (do gol ao centroavante) e depois por overall desc.
  const ordered = useMemo(
    () =>
      [...players].sort((a, b) => {
        const pa = POSITION_ORDER[normalizePosition(a.position)] ?? 99;
        const pb = POSITION_ORDER[normalizePosition(b.position)] ?? 99;
        if (pa !== pb) return pa - pb;
        return b.overall - a.overall;
      }),
    [players],
  );

  // Jogadores realmente disponíveis para registrar lances:
  // titulares + reservas que entraram em substituições durante o jogo.
  const lineupPlayers = useMemo(() => {
    if (!lineup) return [] as SquadRow[];
    const subInIds = new Set(liveSubs.map((s) => s.inId));
    const ids = new Set<string>([...lineup.starters, ...Array.from(subInIds)]);
    return ordered.filter((p) => ids.has(p.id));
  }, [ordered, lineup, liveSubs]);

  // Lista de quem está atualmente em campo (titulares - quem saiu + quem entrou).
  const onFieldIds = useMemo(() => {
    if (!lineup) return new Set<string>();
    const ids = new Set<string>(lineup.starters);
    for (const s of liveSubs) {
      ids.delete(s.outId);
      ids.add(s.inId);
    }
    return ids;
  }, [lineup, liveSubs]);

  // Reservas ainda disponíveis para entrar (no banco e que ainda não entraram).
  const benchAvailable = useMemo(() => {
    if (!lineup) return [] as SquadRow[];
    const usedIn = new Set(liveSubs.map((s) => s.inId));
    return ordered.filter((p) => lineup.bench.includes(p.id) && !usedIn.has(p.id));
  }, [ordered, lineup, liveSubs]);

  // Quem está em campo agora (para sair).
  const onFieldList = useMemo(
    () => ordered.filter((p) => onFieldIds.has(p.id)),
    [ordered, onFieldIds],
  );

  // Pré-seleciona valores padrão dos selects de substituição.
  useEffect(() => {
    if (!subOutId && onFieldList.length > 0) setSubOutId(onFieldList[0].id);
    if (!subInId && benchAvailable.length > 0) setSubInId(benchAvailable[0].id);
  }, [onFieldList, benchAvailable, subOutId, subInId]);

  const addLiveSub = () => {
    if (!subOutId || !subInId) {
      toast.error("Selecione quem sai e quem entra.");
      return;
    }
    if (subOutId === subInId) {
      toast.error("Jogador inválido.");
      return;
    }
    const minute = Math.max(1, Math.min(120, subMinute || 60));
    setLiveSubs((s) => [...s, { outId: subOutId, inId: subInId, minute }]);
    // Reseta seleção
    setSubOutId("");
    setSubInId("");
    setSubMinute(60);
    toast.success("Substituição registrada.");
  };

  const removeLiveSub = (idx: number) => {
    setLiveSubs((s) => s.filter((_, i) => i !== idx));
  };

  const stateFor = (key: StatKey) =>
    key === "goals" ? goals : key === "assists" ? assists : key === "yellow" ? yellow : red;
  const setStateFor = (key: StatKey) =>
    key === "goals" ? setGoals : key === "assists" ? setAssists : key === "yellow" ? setYellow : setRed;

  const bumpStat = (key: StatKey, playerId: string, delta: number) => {
    const current = stateFor(key);
    const setter = setStateFor(key);
    const nextVal = Math.max(0, (current[playerId] ?? 0) + delta);
    if (key === "red" && nextVal > 1) {
      toast.error("Um jogador só pode receber 1 vermelho.");
      return;
    }
    if (key === "yellow" && nextVal > 2) {
      toast.error("Máximo de 2 amarelos por jogador. O 2º amarelo já significa expulsão.");
      return;
    }
    setter({ ...current, [playerId]: nextVal });
    // 2 amarelos = expulsão automática (1 vermelho).
    if (key === "yellow" && nextVal === 2 && (red[playerId] ?? 0) === 0) {
      setRed((r) => ({ ...r, [playerId]: 1 }));
      const p = players.find((pp) => pp.id === playerId);
      if (p) toast.warning(`🟨🟨 ${p.name} levou o 2º amarelo e foi expulso!`);
    }
  };

  const submit = async () => {
    if (!lineup || lineup.starters.length !== 11) {
      toast.error("Escale 11 titulares antes de jogar.");
      navigate({ to: "/carreira/$careerId/escalacao", params: { careerId } });
      return;
    }
    if (!opponent.trim())   { toast.error("Adversário não definido."); return; }
    if (gf < 0 || ga < 0)   { toast.error("Placar inválido."); return; }

    const totalGoals = totalCount(goals);
    if (totalGoals > gf) {
      toast.error(`Você marcou ${totalGoals} gols, mas o placar diz ${gf}.`);
      return;
    }

    setBusy(true);
    const realResult: "V" | "E" | "D" = gf > ga ? "V" : gf < ga ? "D" : "E";
    const pointsDelta = realResult === "V" ? 3 : realResult === "E" ? 1 : 0;
    const bonus = realResult === "V" ? victoryBonus(gf, ga) : 0;
    const nextMatchday = career.matchday + 1;
    const windowStillOpen = isWindowOpen(nextMatchday);
    const wasOpen = career.transfer_window_open;
    const derby = isDerby(club.slug, opponent.trim());
    const dName = derbyName(club.slug, opponent.trim());

    const scorersStr = namesFromCount(goals, players);
    const assistsStr = namesFromCount(assists, players);
    const yellowStr  = namesFromCount(yellow, players);
    const redStr     = namesFromCount(red, players);

    const { error: matchErr } = await supabase.from("matches").insert({
      career_id: career.id,
      user_id: career.user_id,
      matchday: career.matchday,
      opponent: opponent.trim(),
      home,
      goals_for: gf,
      goals_against: ga,
      scorers: scorersStr || null,
      assists: assistsStr || null,
      league_position_after: position,
      result: realResult,
    });
    if (matchErr) { toast.error(matchErr.message); setBusy(false); return; }

    // Atualizar gols/assistências
    for (const [id, n] of Object.entries(goals)) {
      const p = players.find((x) => x.id === id);
      if (p && n > 0) await supabase.from("squad_players").update({ goals: p.goals + n }).eq("id", p.id);
    }
    for (const [id, n] of Object.entries(assists)) {
      const p = players.find((x) => x.id === id);
      if (p && n > 0) await supabase.from("squad_players").update({ assists: p.assists + n }).eq("id", p.id);
    }
    // Vermelho => suspenso (injured proxy)
    for (const [id, n] of Object.entries(red)) {
      if (n > 0) await supabase.from("squad_players").update({ injured: true }).eq("id", id);
    }

    // Amarelos da temporada: 3 amarelos em jogos diferentes => suspensão + reset.
    // 2 amarelos no mesmo jogo (já viraram vermelho acima) NÃO contam pro acumulado.
    for (const [id, n] of Object.entries(yellow)) {
      const p = players.find((x) => x.id === id);
      if (!p || n <= 0) continue;
      const tookRed = (red[id] ?? 0) > 0;
      if (tookRed) continue; // já está suspenso por vermelho; não acumula amarelo
      const newTotal = (p.yellow_cards_season ?? 0) + 1; // 1 amarelo por jogo conta
      if (newTotal >= 3) {
        // Suspensão por acúmulo: marca como injured (proxy de suspensão) e zera contador.
        await supabase
          .from("squad_players")
          .update({ yellow_cards_season: 0, injured: true })
          .eq("id", p.id);
        await supabase.from("news_feed").insert({
          career_id: career.id,
          user_id: career.user_id,
          kind: "headline",
          title: `${p.name} suspenso por acúmulo de amarelos`,
          body: `${p.name} recebeu o 3º cartão amarelo da temporada e está automaticamente suspenso para a próxima rodada do ${club.name}. Após cumprir suspensão, o contador será zerado.`,
        });
      } else {
        await supabase
          .from("squad_players")
          .update({ yellow_cards_season: newTotal })
          .eq("id", p.id);
      }
    }

    const nextOpp = club.rivals[(career.matchday) % club.rivals.length] ?? "Adversário";
    const { error: cErr } = await supabase.from("careers").update({
      matchday: nextMatchday,
      points: career.points + pointsDelta,
      played: career.played + 1,
      wins: career.wins + (realResult === "V" ? 1 : 0),
      draws: career.draws + (realResult === "E" ? 1 : 0),
      losses: career.losses + (realResult === "D" ? 1 : 0),
      goals_for: career.goals_for + gf,
      goals_against: career.goals_against + ga,
      league_position: position,
      next_opponent: nextOpp,
      cash_eur: career.cash_eur - career.weekly_wages_eur + bonus,
      transfer_window_open: windowStillOpen,
      transfer_window_closes_at: windowStillOpen ? career.transfer_window_closes_at : nextMatchday,
      updated_at: new Date().toISOString(),
    }).eq("id", career.id);
    if (cErr) { toast.error(cErr.message); setBusy(false); return; }

    // Notícia rica e detalhada
    const localStr = home ? "em casa" : "como visitante";
    const xgStr = realResult === "V"
      ? `O ${club.name} construiu o resultado com autoridade ${localStr}, controlando os principais momentos da partida.`
      : realResult === "D"
      ? `O ${club.name} foi superado ${localStr}, falhando em transformar posse em chances claras.`
      : `Equipes se anularam em campo. O ${club.name} jogou ${localStr} sem encontrar o caminho da vitória.`;

    const scorersBlock = scorersStr
      ? `⚽ **Gols:** ${scorersStr}`
      : `⚽ **Gols:** Nenhum gol marcado pelo ${club.shortName}.`;
    const assistsBlock = assistsStr
      ? `🎯 **Assistências:** ${assistsStr}`
      : `🎯 **Assistências:** Sem assistências registradas.`;
    const cardsLines: string[] = [];
    if (yellowStr) cardsLines.push(`🟨 **Amarelos:** ${yellowStr}`);
    if (redStr)    cardsLines.push(`🟥 **Vermelhos:** ${redStr}`);
    const cardsBlock = cardsLines.length ? cardsLines.join("\n") : "🟨 **Cartões:** Partida sem cartões relevantes.";

    const fan = fanReaction(gf, ga, derby);
    const bonusLine = bonus > 0
      ? `\n\n💰 **Bônus financeiro:** A diretoria liberou €${bonus.toLocaleString("pt-BR")} pelo desempenho ofensivo.`
      : "";
    const derbyLine = derby && dName
      ? `\n\n🔥 **${dName}:** Esse jogo entra para a história da rivalidade. ${
          realResult === "V" ? "Torcida vai cantar a semana inteira!" :
          realResult === "D" ? "Torcida cobra reação imediata." :
          "Empate em clássico tem gosto de pouco para os dois lados."
        }`
      : "";
    const subsLine = lineup.subs.length > 0
      ? `\n\n🔄 **Substituições programadas:** ${lineup.subs.map((s) => {
          const out = players.find((p) => p.id === s.outId)?.name ?? "?";
          const inn = players.find((p) => p.id === s.inId)?.name ?? "?";
          return `${s.minute}' ${out} ↔ ${inn}`;
        }).join(" • ")}`
      : "";
    const liveSubsLine = liveSubs.length > 0
      ? `\n\n🔄 **Substituições no jogo:** ${liveSubs.map((s) => {
          const out = players.find((p) => p.id === s.outId)?.name ?? "?";
          const inn = players.find((p) => p.id === s.inId)?.name ?? "?";
          return `${s.minute}' ↓ ${out} ↑ ${inn}`;
        }).join(" • ")}`
      : "";

    const detailedBody = [
      `**${club.name} ${gf} x ${ga} ${opponent.trim()}** — Rodada ${career.matchday} (${home ? "Casa" : "Fora"}).`,
      "",
      xgStr,
      "",
      scorersBlock,
      assistsBlock,
      cardsBlock,
      "",
      `📊 **Posição na tabela após o jogo:** ${position}º com ${career.points + pointsDelta} pontos em ${career.played + 1} jogos.`,
      `${fan}${bonusLine}${liveSubsLine}${subsLine}${derbyLine}`,
    ].join("\n");

    await supabase.from("news_feed").insert({
      career_id: career.id,
      user_id: career.user_id,
      kind: "headline",
      title: postMatchHeadline(opponent.trim(), gf, ga, club.name, club.slug),
      body: detailedBody,
    });

    if (bonus > 0) {
      await supabase.from("news_feed").insert({
        career_id: career.id,
        user_id: career.user_id,
        kind: "finance",
        title: `Diretoria libera €${bonus.toLocaleString("pt-BR")} após vitória`,
        body: `Após a vitória por ${gf}x${ga} sobre o ${opponent.trim()}, o conselho do ${club.name} aprovou um aporte extra de €${bonus.toLocaleString("pt-BR")} no caixa do clube. O bônus reflete o reconhecimento ao desempenho ofensivo da equipe e poderá ser usado em reforços ou ajustes salariais.`,
      });
    }

    if (redStr) {
      await supabase.from("news_feed").insert({
        career_id: career.id,
        user_id: career.user_id,
        kind: "headline",
        title: `Expulsão complica o ${club.shortName} contra o ${opponent.trim()}`,
        body: `${redStr} recebeu cartão vermelho durante a partida e ficará de fora da próxima rodada. A comissão técnica precisará reorganizar a escalação para o próximo compromisso.`,
      });
    }

    if (wasOpen && !windowStillOpen) {
      await supabase.from("news_feed").insert({
        career_id: career.id,
        user_id: career.user_id,
        kind: "transfer",
        title: "Janela de transferências encerrada",
        body: `A federação encerrou oficialmente a janela de transferências após a rodada ${career.matchday}. O ${club.name} terá de competir com o elenco atual até a próxima abertura (em 5 rodadas). Movimentações de empréstimo e contratações ficam suspensas.`,
      });
    }
    if (!wasOpen && windowStillOpen) {
      await supabase.from("news_feed").insert({
        career_id: career.id,
        user_id: career.user_id,
        kind: "transfer",
        title: "Janela de transferências reaberta",
        body: `A janela voltou a abrir! O ${club.name} tem 4 rodadas para reforçar o elenco antes do próximo fechamento.`,
      });
    }

    if (windowStillOpen) {
      const offers = buildIncomingOffers(
        players.map((p) => ({
          id: p.id, name: p.name, overall: p.overall, age: p.age,
          market_value_eur: p.market_value_eur, weekly_wage_eur: p.weekly_wage_eur,
          goals: p.goals, assists: p.assists,
        })),
        nextMatchday,
        true,
      );
      if (offers.length > 0) {
        await supabase.from("incoming_offers").insert(
          offers.map((o) => ({
            ...o,
            career_id: career.id,
            user_id: career.user_id,
          })),
        );
      }
    }

    toast.success("Resultado registrado!");
    if (bonus > 0) toast.success(`💰 Bônus por vitória: ${new Intl.NumberFormat("pt-BR", { style: "currency", currency: "EUR" }).format(bonus)}`);
    clearLineup(careerId);
    await refresh();

    const ctx = {
      clubName: club.name,
      opponent: opponent.trim(),
      gf, ga,
      scorers: scorersStr,
      assists: assistsStr,
      home,
      position,
      clubSlug: club.slug,
    };
    setPressIntro(postMatchPressIntro(ctx));
    setPressQuestions([]);
    setPressIndex(0);
    setPressAnswer("");
    setPressAnswers([]);
    setPressOpen(true);
    setBusy(false);
    // Dispara primeira pergunta da IA
    void fetchNextAIQuestion([], {
      yellow: yellowStr,
      red: redStr,
      derby: dName,
      matchday: career.matchday,
    });
  };

  const advancePress = async () => {
    const currentQ = pressQuestions[pressIndex];
    const trimmed = pressAnswer.trim();
    if (!trimmed) { toast.error("Responda à pergunta antes de continuar."); return; }
    const updated = [...pressAnswers, { q: currentQ, a: trimmed }];
    setPressAnswers(updated);
    setPressAnswer("");

    if (pressIndex < pressQuestions.length - 1) {
      setPressIndex(pressIndex + 1);
      return;
    }

    setPressSaving(true);
    const body = updated
      .map((item, i) => `**Pergunta ${i + 1}:** ${item.q}\n\n**Resposta do técnico:** ${item.a}`)
      .join("\n\n---\n\n");
    const { error } = await supabase.from("news_feed").insert({
      career_id: career.id,
      user_id: career.user_id,
      kind: "press",
      title: `Coletiva: ${club.name} x ${opponent.trim()}`,
      body: `${pressIntro}\n\n${body}\n\n_A coletiva foi concedida no auditório do ${club.name} logo após o apito final, com a presença da imprensa esportiva._`,
    });
    setPressSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Coletiva publicada na imprensa!");
    setPressOpen(false);
    navigate({ to: "/carreira/$careerId", params: { careerId } });
  };

  const activeRec = stateFor(activeStat);
  const derby = isDerby(club.slug, opponent);
  const dName = derbyName(club.slug, opponent);

  // Sem escalação salva: orienta o usuário a escalar primeiro.
  if (!lineup || lineup.starters.length !== 11) {
    return (
      <Card className="mx-auto max-w-2xl border-border/60 bg-card/70">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-primary" /> Escale o time antes do jogo
          </CardTitle>
          <CardDescription>
            Você precisa definir os 11 titulares, o banco e (opcionalmente) as substituições antes de registrar o resultado.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button asChild size="lg" className="w-full">
            <Link to="/carreira/$careerId/escalacao" params={{ careerId }}>
              Ir para a escalação <ChevronRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
          <Button variant="ghost" size="sm" asChild className="w-full">
            <Link to="/carreira/$careerId" params={{ careerId }}>Voltar ao hub</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card className="border-border/60 bg-card/70">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-primary" /> Escalação confirmada
          </CardTitle>
          <CardDescription>
            {lineup.starters.length} titulares • {lineup.bench.length} reservas •{" "}
            <Link
              to="/carreira/$careerId/escalacao"
              params={{ careerId }}
              className="text-primary underline-offset-2 hover:underline"
            >
              editar
            </Link>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-3 flex flex-wrap items-center gap-2 rounded-md border border-border/40 bg-background/30 px-3 py-2 text-sm">
            <Trophy className="h-4 w-4 text-gold" />
            <span className="font-semibold">{club.shortName}</span>
            <span className="text-muted-foreground">vs</span>
            <span className="font-semibold">{opponent}</span>
            <Badge variant="secondary" className="ml-auto text-[10px]">
              {home ? "🏟️ Casa" : "✈️ Fora"}
            </Badge>
            {derby && dName && (
              <Badge variant="destructive" className="text-[10px]"><Flame className="mr-1 h-3 w-3" />{dName}</Badge>
            )}
          </div>
          <div className="max-h-[480px] space-y-1 overflow-y-auto pr-1">
            <p className="px-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Em campo</p>
            {ordered.filter((p) => onFieldIds.has(p.id)).map((p) => {
              const camePerSub = liveSubs.some((s) => s.inId === p.id);
              return (
                <div
                  key={p.id}
                  className={`flex items-center gap-3 rounded-md border px-3 py-2 ${
                    camePerSub ? "border-emerald-500/40 bg-emerald-500/10" : "border-primary/40 bg-primary/10"
                  }`}
                >
                  <span className="w-10 rounded bg-muted px-1 py-0.5 text-center text-xs font-bold">{normalizePosition(p.position)}</span>
                  <span className="flex-1 truncate">{p.name}</span>
                  {camePerSub && <Badge variant="outline" className="text-[9px]">Entrou</Badge>}
                  <span className="text-sm font-bold text-primary">{p.overall}</span>
                </div>
              );
            })}
            {liveSubs.length > 0 && (
              <>
                <p className="mt-3 px-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Saíram do jogo</p>
                {liveSubs.map((s, i) => {
                  const out = players.find((p) => p.id === s.outId);
                  if (!out) return null;
                  return (
                    <div key={`out-${i}`} className="flex items-center gap-3 rounded-md border border-border/40 bg-background/30 px-3 py-2 opacity-70">
                      <span className="w-10 rounded bg-muted px-1 py-0.5 text-center text-xs font-bold">{normalizePosition(out.position)}</span>
                      <span className="flex-1 truncate text-sm line-through">{out.name}</span>
                      <span className="text-[10px] text-muted-foreground">saiu aos {s.minute}'</span>
                    </div>
                  );
                })}
              </>
            )}
            {lineup.bench.length > 0 && (
              <>
                <p className="mt-3 px-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  Banco ({benchAvailable.length} disponíveis)
                </p>
                {ordered.filter((p) => lineup.bench.includes(p.id)).map((p) => {
                  const used = liveSubs.some((s) => s.inId === p.id);
                  return (
                    <div
                      key={p.id}
                      className={`flex items-center gap-3 rounded-md border border-border/40 bg-background/30 px-3 py-2 ${used ? "opacity-50" : ""}`}
                    >
                      <span className="w-10 rounded bg-muted px-1 py-0.5 text-center text-xs font-bold">{normalizePosition(p.position)}</span>
                      <span className="flex-1 truncate text-sm">{p.name}</span>
                      {used && <Badge variant="outline" className="text-[9px]">Em campo</Badge>}
                      <span className="text-sm font-bold text-muted-foreground">{p.overall}</span>
                    </div>
                  );
                })}
              </>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/60 bg-card/70">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Trophy className="h-5 w-5 text-gold" /> Resultado</CardTitle>
          <CardDescription>Você define cada placar e cada lance.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>{club.shortName}</Label>
              <Input type="number" min={0} value={gf} onChange={(e) => setGf(parseInt(e.target.value) || 0)} />
            </div>
            <div className="space-y-1.5">
              <Label>{(opponent || "ADV").slice(0, 3).toUpperCase()}</Label>
              <Input type="number" min={0} value={ga} onChange={(e) => setGa(parseInt(e.target.value) || 0)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Lances do jogo</Label>
            <div className="grid grid-cols-4 gap-1">
              {(Object.keys(STAT_META) as StatKey[]).map((key) => {
                const meta = STAT_META[key];
                const Icon = meta.icon;
                const total = totalCount(stateFor(key));
                const isActive = activeStat === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setActiveStat(key)}
                    className={`flex flex-col items-center gap-1 rounded-md border p-2 text-xs transition ${
                      isActive ? meta.bg : "border-border/40 bg-background/30 hover:bg-background/60"
                    }`}
                  >
                    <Icon className={`h-4 w-4 ${meta.color}`} />
                    <span className="font-semibold">{meta.label}</span>
                    <span className={`text-sm font-bold ${meta.color}`}>{total}</span>
                  </button>
                );
              })}
            </div>

            {lineupPlayers.length === 0 ? (
              <p className="rounded-md border border-dashed border-border/40 p-3 text-center text-xs text-muted-foreground">
                Carregando elenco da escalação...
              </p>
            ) : (
              <div className="max-h-56 space-y-1 overflow-y-auto rounded-md border border-border/40 bg-background/20 p-2">
                {lineupPlayers.map((p) => {
                  const count = activeRec[p.id] ?? 0;
                  return (
                    <div
                      key={p.id}
                      className={`flex items-center gap-2 rounded px-2 py-1.5 text-sm transition ${
                        count > 0 ? STAT_META[activeStat].bg : "hover:bg-background/40"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => bumpStat(activeStat, p.id, 1)}
                        className="flex flex-1 items-center gap-2 text-left"
                      >
                        <span className="w-9 rounded bg-muted px-1 py-0.5 text-center text-[10px] font-bold">{p.position}</span>
                        <span className="flex-1 truncate">{p.name}</span>
                        {count > 0 && (
                          <Badge variant="outline" className={`${STAT_META[activeStat].color} border-current`}>
                            ×{count}
                          </Badge>
                        )}
                      </button>
                      {count > 0 && (
                        <button
                          type="button"
                          onClick={() => bumpStat(activeStat, p.id, -1)}
                          className="rounded p-1 text-muted-foreground hover:bg-background/60"
                          aria-label="Remover um"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => bumpStat(activeStat, p.id, 1)}
                        className="rounded p-1 text-muted-foreground hover:bg-background/60"
                        aria-label="Adicionar um"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
            <p className="text-[10px] text-muted-foreground">
              Dica: clique no jogador para adicionar +1 do lance selecionado. Clique de novo para somar.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label>Posição na tabela após o jogo</Label>
            <Input type="number" min={1} max={20} value={position} onChange={(e) => setPosition(parseInt(e.target.value) || 1)} />
          </div>

          <div className="space-y-2 rounded-md border border-border/40 bg-background/20 p-3">
            <div className="flex items-center gap-2">
              <ArrowRightLeft className="h-4 w-4 text-primary" />
              <Label className="m-0">Substituições no jogo</Label>
              <span className="ml-auto text-[10px] text-muted-foreground">
                {liveSubs.length} feita{liveSubs.length === 1 ? "" : "s"}
              </span>
            </div>

            {liveSubs.length > 0 && (
              <div className="space-y-1">
                {liveSubs.map((s, i) => {
                  const out = players.find((p) => p.id === s.outId);
                  const inn = players.find((p) => p.id === s.inId);
                  return (
                    <div key={i} className="flex items-center gap-2 rounded border border-border/40 bg-background/40 px-2 py-1.5 text-xs">
                      <span className="font-bold text-muted-foreground">{s.minute}'</span>
                      <span className="text-destructive-foreground">↓ {out?.name ?? "?"}</span>
                      <span className="text-primary">↑ {inn?.name ?? "?"}</span>
                      <button
                        type="button"
                        onClick={() => removeLiveSub(i)}
                        className="ml-auto rounded p-1 text-muted-foreground hover:bg-background/60 hover:text-destructive"
                        aria-label="Remover"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {benchAvailable.length === 0 ? (
              <p className="rounded border border-dashed border-border/40 p-2 text-center text-[11px] text-muted-foreground">
                Sem reservas disponíveis para substituições.
              </p>
            ) : (
              <div className="grid gap-2 md:grid-cols-[1fr,1fr,80px,auto]">
                <div className="space-y-1">
                  <Label className="text-[10px]">Sai</Label>
                  <Select value={subOutId} onValueChange={setSubOutId}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {onFieldList.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {normalizePosition(p.position)} • {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px]">Entra</Label>
                  <Select value={subInId} onValueChange={setSubInId}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {benchAvailable.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {normalizePosition(p.position)} • {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px]">Min.</Label>
                  <Input
                    className="h-8 text-xs"
                    type="number"
                    min={1}
                    max={120}
                    value={subMinute}
                    onChange={(e) => setSubMinute(parseInt(e.target.value) || 60)}
                  />
                </div>
                <div className="flex items-end">
                  <Button type="button" size="sm" onClick={addLiveSub} className="h-8 w-full md:w-auto">
                    <Plus className="mr-1 h-3 w-3" /> Substituir
                  </Button>
                </div>
              </div>
            )}
            <p className="text-[10px] text-muted-foreground">
              Quem entrar fica disponível para registrar gols, assistências e cartões.
            </p>
          </div>

          <Button onClick={submit} disabled={busy} size="lg" className="w-full">
            {busy ? "Registrando..." : "Confirmar resultado"} <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        </CardContent>
      </Card>

      <Dialog open={pressOpen} onOpenChange={(v) => { if (!pressSaving) setPressOpen(v); }}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mic className="h-5 w-5 text-primary" /> Coletiva de imprensa
            </DialogTitle>
            <DialogDescription>{pressIntro}</DialogDescription>
          </DialogHeader>

          {pressQuestions.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Pergunta {pressIndex + 1} de {pressQuestions.length}</span>
                <span>🎤 Repórter</span>
              </div>
              <div className="rounded-md border border-border/50 bg-muted/30 p-4">
                <p className="text-sm font-medium leading-relaxed">{pressQuestions[pressIndex]}</p>
              </div>
              <div className="space-y-1.5">
                <Label>Sua resposta</Label>
                <Textarea
                  value={pressAnswer}
                  onChange={(e) => setPressAnswer(e.target.value)}
                  rows={4}
                  placeholder="Responda como técnico..."
                  autoFocus
                />
              </div>
              {pressAnswers.length > 0 && (
                <div className="max-h-32 space-y-2 overflow-y-auto rounded border border-border/40 bg-background/30 p-3 text-xs">
                  {pressAnswers.map((item, i) => (
                    <div key={i}>
                      <p className="font-semibold text-muted-foreground">{i + 1}. {item.q}</p>
                      <p className="pl-2 text-foreground/80">↳ {item.a}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <DialogFooter className="flex-col gap-2 sm:flex-row">
            <div className="flex flex-1 items-center text-xs text-muted-foreground">
              <ChevronLeft className="mr-1 h-3 w-3" />
              Suas respostas viram notícia oficial.
            </div>
            <Button onClick={advancePress} disabled={pressSaving}>
              {pressIndex < pressQuestions.length - 1 ? (
                <>Próxima pergunta <ChevronRight className="ml-1 h-4 w-4" /></>
              ) : pressSaving ? (
                "Publicando..."
              ) : (
                <>Encerrar coletiva <Mic className="ml-1 h-4 w-4" /></>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

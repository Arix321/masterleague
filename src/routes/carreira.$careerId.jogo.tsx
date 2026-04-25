import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useCareer } from "@/lib/career-context";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import {
  fanReaction,
  postMatchHeadline,
  postMatchPressIntro,
  postMatchPressQuestions,
} from "@/lib/narrative";
import { toast } from "sonner";
import { Trophy, ChevronRight, Mic, ChevronLeft, Goal, HandHelping, Square, Plus, Minus } from "lucide-react";
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
  const [picked, setPicked] = useState<Set<string>>(new Set());

  const [opponent, setOpponent] = useState(career.next_opponent ?? club.rivals[0] ?? "Adversário");
  const [home, setHome] = useState(true);
  const [gf, setGf] = useState(0);
  const [ga, setGa] = useState(0);

  // Contagens por jogador
  const [goals, setGoals] = useState<Record<string, number>>({});
  const [assists, setAssists] = useState<Record<string, number>>({});
  const [yellow, setYellow] = useState<Record<string, number>>({});
  const [red, setRed] = useState<Record<string, number>>({});

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
        .select("id, name, position, overall, goals, assists, injured, age, market_value_eur, weekly_wage_eur")
        .eq("career_id", careerId)
        .eq("club_slug", career.club_slug);
      setPlayers((data ?? []) as SquadRow[]);
    })();
  }, [careerId, career.club_slug]);

  const toggle = (id: string) => {
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else if (next.size < 11) next.add(id);
      else toast.error("Máximo de 11 titulares.");
      return next;
    });
  };

  const ordered = useMemo(
    () => [...players].sort((a, b) => b.overall - a.overall),
    [players],
  );

  const pickedPlayers = useMemo(
    () => ordered.filter((p) => picked.has(p.id)),
    [ordered, picked],
  );

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
    setter({ ...current, [playerId]: nextVal });
  };

  const submit = async () => {
    if (picked.size !== 11) { toast.error("Escale exatamente 11 jogadores."); return; }
    if (!opponent.trim())   { toast.error("Informe o adversário."); return; }
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
    const windowStillOpen = nextMatchday <= career.transfer_window_closes_at;

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

    const fan = fanReaction(gf, ga);
    const bonusLine = bonus > 0
      ? `\n\n💰 **Bônus financeiro:** A diretoria liberou €${bonus.toLocaleString("pt-BR")} pelo desempenho ofensivo.`
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
      `${fan}${bonusLine}`,
    ].join("\n");

    await supabase.from("news_feed").insert({
      career_id: career.id,
      user_id: career.user_id,
      kind: "headline",
      title: postMatchHeadline(opponent.trim(), gf, ga, club.name),
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

    if (career.transfer_window_open && !windowStillOpen) {
      await supabase.from("news_feed").insert({
        career_id: career.id,
        user_id: career.user_id,
        kind: "transfer",
        title: "Janela de transferências encerrada",
        body: `A federação encerrou oficialmente a janela de transferências. O ${club.name} terá de competir com o elenco atual até a próxima abertura. Movimentações de empréstimo e contratações ficam suspensas.`,
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
    await refresh();

    const ctx = {
      clubName: club.name,
      opponent: opponent.trim(),
      gf, ga,
      scorers: scorersStr,
      assists: assistsStr,
      home,
      position,
    };
    setPressIntro(postMatchPressIntro(ctx));
    setPressQuestions(postMatchPressQuestions(ctx));
    setPressIndex(0);
    setPressAnswer("");
    setPressAnswers([]);
    setPressOpen(true);
    setBusy(false);
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

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card className="border-border/60 bg-card/70">
        <CardHeader>
          <CardTitle>Escalação obrigatória</CardTitle>
          <CardDescription>Selecione 11 titulares ({picked.size}/11)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="max-h-[480px] space-y-1 overflow-y-auto pr-1">
            {ordered.map((p) => {
              const checked = picked.has(p.id);
              return (
                <label
                  key={p.id}
                  className={`flex cursor-pointer items-center gap-3 rounded-md border px-3 py-2 transition ${
                    checked ? "border-primary bg-primary/10" : "border-border/40 bg-background/30 hover:bg-background/60"
                  } ${p.injured ? "opacity-50" : ""}`}
                >
                  <Checkbox checked={checked} onCheckedChange={() => !p.injured && toggle(p.id)} disabled={p.injured} />
                  <span className="w-10 rounded bg-muted px-1 py-0.5 text-center text-xs font-bold">{p.position}</span>
                  <span className="flex-1 truncate">{p.name}</span>
                  <span className="text-sm font-bold text-primary">{p.overall}</span>
                </label>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/60 bg-card/70">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Trophy className="h-5 w-5 text-gold" /> Resultado</CardTitle>
          <CardDescription>Você define cada placar e cada lance.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>Adversário</Label>
            <Input value={opponent} onChange={(e) => setOpponent(e.target.value)} />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={home} onCheckedChange={(v) => setHome(Boolean(v))} /> Mando de campo (jogo em casa)
          </label>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>{club.shortName}</Label>
              <Input type="number" min={0} value={gf} onChange={(e) => setGf(parseInt(e.target.value) || 0)} />
            </div>
            <div className="space-y-1.5">
              <Label>{opponent.slice(0, 3).toUpperCase() || "ADV"}</Label>
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

            {pickedPlayers.length === 0 ? (
              <p className="rounded-md border border-dashed border-border/40 p-3 text-center text-xs text-muted-foreground">
                Escale 11 jogadores ao lado para registrar lances.
              </p>
            ) : (
              <div className="max-h-56 space-y-1 overflow-y-auto rounded-md border border-border/40 bg-background/20 p-2">
                {pickedPlayers.map((p) => {
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

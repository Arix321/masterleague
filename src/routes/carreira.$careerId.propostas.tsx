import { createFileRoute, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useCareer } from "@/lib/career-context";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { formatEur } from "@/lib/format";
import { toast } from "sonner";
import { Inbox, Check, X, Handshake, Heart, Gavel, AlertTriangle } from "lucide-react";
import { pushAINews } from "@/lib/news";

interface IncomingRow {
  id: string;
  player_id: string;
  player_name: string;
  from_club: string;
  fee_eur: number;
  bonus_eur: number;
  wage_offered_eur: number;
  offer_type: string;
  player_interest: number;
  status: string;
  matchday: number;
  created_at: string;
}

const MAX_ROUNDS = 4;

export const Route = createFileRoute("/carreira/$careerId/propostas")({
  component: PropostasPage,
});

function PropostasPage() {
  const { career, club, refresh } = useCareer();
  const { careerId } = useParams({ from: "/carreira/$careerId/propostas" });
  const [offers, setOffers] = useState<IncomingRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("incoming_offers")
      .select("*")
      .eq("career_id", careerId)
      .order("created_at", { ascending: false });
    setOffers((data ?? []) as IncomingRow[]);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [careerId]);

  // Aceita os termos atuais — concretiza venda/empréstimo e move o jogador para o mercado.
  const accept = async (offer: IncomingRow) => {
    // Busca dados atuais do jogador antes de remover
    const { data: player } = await supabase
      .from("squad_players")
      .select("id, name, position, overall, weekly_wage_eur, market_value_eur, age, potential")
      .eq("id", offer.player_id)
      .maybeSingle();

    if (offer.offer_type === "buy") {
      if (player) {
        // Move o jogador vendido para o mercado, agora pertencendo ao clube comprador
        await supabase.from("market_players").insert({
          career_id: career.id,
          user_id: career.user_id,
          name: player.name,
          position: player.position,
          overall: player.overall,
          market_value_eur: offer.fee_eur > 0 ? offer.fee_eur : (player.market_value_eur ?? 0),
          expected_wage_eur: Math.max(player.weekly_wage_eur ?? 0, offer.wage_offered_eur ?? 0),
          region: "Internacional",
          current_club: offer.from_club,
          age: player.age ?? 26,
          potential: player.potential ?? player.overall ?? 80,
        });
      }

      const wageRemoved = player?.weekly_wage_eur ?? 0;
      await supabase.from("squad_players").delete().eq("id", offer.player_id);
      await supabase.from("careers").update({
        cash_eur: career.cash_eur + offer.fee_eur + offer.bonus_eur,
        weekly_wages_eur: Math.max(0, career.weekly_wages_eur - wageRemoved),
        updated_at: new Date().toISOString(),
      }).eq("id", career.id);
      await pushAINews({
        careerId: career.id,
        userId: career.user_id,
        kind: "transfer",
        hint: `Anunciar a venda de ${offer.player_name} do ${club.name} para o ${offer.from_club}. Mencione valores, repercussão da torcida e como o jogador encara a mudança.`,
        context: {
          jogador: offer.player_name,
          clube_origem: club.name,
          clube_destino: offer.from_club,
          valor_eur: offer.fee_eur,
          bonus_eur: offer.bonus_eur,
          salario_eur: offer.wage_offered_eur,
        },
        fallbackTitle: `${offer.player_name} é vendido para o ${offer.from_club}`,
        fallbackBody: `${club.name} acerta a saída de ${offer.player_name} por ${formatEur(offer.fee_eur)}${offer.bonus_eur ? ` (+${formatEur(offer.bonus_eur)} em bônus)` : ""}.`,
      });
      toast.success(`${offer.player_name} vendido!`);
    } else {
      // Empréstimo: jogador sai temporariamente
      await supabase.from("squad_players").update({ injured: true }).eq("id", offer.player_id);
      await supabase.from("careers").update({
        cash_eur: career.cash_eur + offer.bonus_eur,
        updated_at: new Date().toISOString(),
      }).eq("id", career.id);
      await pushAINews({
        careerId: career.id,
        userId: career.user_id,
        kind: "transfer",
        hint: `Anunciar empréstimo de ${offer.player_name} do ${club.name} ao ${offer.from_club}. Bônus envolvido e expectativas do empréstimo.`,
        context: {
          jogador: offer.player_name,
          clube_origem: club.name,
          clube_destino: offer.from_club,
          bonus_eur: offer.bonus_eur,
        },
        fallbackTitle: `${offer.player_name} é emprestado ao ${offer.from_club}`,
        fallbackBody: `${club.name} libera ${offer.player_name} por empréstimo. Bônus: ${formatEur(offer.bonus_eur)}.`,
      });
      toast.success(`${offer.player_name} emprestado!`);
    }
    await supabase.from("incoming_offers").update({ status: "accepted" }).eq("id", offer.id);
    await refresh();
    await load();
  };

  const reject = async (offer: IncomingRow) => {
    await supabase.from("incoming_offers").update({ status: "rejected" }).eq("id", offer.id);
    if (offer.player_interest >= 80) {
      await supabase.from("squad_players").update({ morale: 35 }).eq("id", offer.player_id);
      await pushAINews({
        careerId: career.id,
        userId: career.user_id,
        kind: "press",
        hint: `${offer.player_name} fica insatisfeito após o ${club.name} recusar a proposta do ${offer.from_club}. Mostre bastidor: moral em queda, possível pedido para sair.`,
        context: {
          jogador: offer.player_name,
          clube: club.name,
          clube_interessado: offer.from_club,
          interesse_jogador: offer.player_interest,
        },
        fallbackTitle: `${offer.player_name} fica insatisfeito com recusa`,
        fallbackBody: `Após a diretoria recusar a proposta do ${offer.from_club}, ${offer.player_name} demonstrou descontentamento. Moral em queda.`,
      });
      toast.warning(`${offer.player_name} ficou desmotivado.`);
    } else {
      await pushAINews({
        careerId: career.id,
        userId: career.user_id,
        kind: "transfer",
        hint: `Diretoria do ${club.name} recusa proposta do ${offer.from_club} por ${offer.player_name}. Tom: oficial, segurando o jogador.`,
        context: {
          jogador: offer.player_name,
          clube: club.name,
          clube_interessado: offer.from_club,
          valor_eur: offer.fee_eur,
        },
        fallbackTitle: `${club.name} recusa proposta do ${offer.from_club} por ${offer.player_name}`,
        fallbackBody: `A diretoria considerou a oferta de ${formatEur(offer.fee_eur)} insuficiente e segurou ${offer.player_name}.`,
      });
      toast.success("Proposta recusada.");
    }
    await load();
  };

  // Atualiza valores da oferta sem fechar (usado pela negociação multi-rodada)
  const updateOffer = async (id: string, patch: Partial<IncomingRow>) => {
    await supabase.from("incoming_offers").update(patch).eq("id", id);
    await load();
  };

  const pending = offers.filter((o) => o.status === "pending");
  const history = offers.filter((o) => o.status !== "pending");

  return (
    <div className="space-y-6">
      <Card className="border-border/60 bg-card/70">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Inbox className="h-5 w-5 text-primary" /> Propostas pelos seus jogadores</CardTitle>
          <CardDescription>
            {career.transfer_window_open
              ? `Janela aberta até a rodada ${career.transfer_window_closes_at}.`
              : "Janela fechada — apenas histórico disponível."}
          </CardDescription>
        </CardHeader>
      </Card>

      {loading ? (
        <p className="text-muted-foreground">Carregando propostas...</p>
      ) : (
        <>
          <div className="grid gap-3 md:grid-cols-2">
            {pending.map((o) => (
              <OfferCard
                key={o.id}
                offer={o}
                onAccept={accept}
                onReject={reject}
                onUpdate={updateOffer}
                disabled={!career.transfer_window_open}
              />
            ))}
            {pending.length === 0 && (
              <p className="md:col-span-2 text-muted-foreground">Nenhuma proposta pendente. Bom desempenho atrai os olhares.</p>
            )}
          </div>

          {history.length > 0 && (
            <Card className="border-border/60 bg-card/70">
              <CardHeader>
                <CardTitle className="text-base">Histórico</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {history.map((o) => (
                  <div key={o.id} className="flex items-center justify-between rounded-md border border-border/40 bg-background/30 px-3 py-2">
                    <span>
                      <strong>{o.from_club}</strong> por {o.player_name} — {formatEur(o.fee_eur)}
                    </span>
                    <Badge variant={o.status === "accepted" ? "default" : "destructive"}>{o.status === "accepted" ? "Aceita" : "Recusada"}</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

function OfferCard({
  offer, onAccept, onReject, onUpdate, disabled,
}: {
  offer: IncomingRow;
  onAccept: (o: IncomingRow) => Promise<void>;
  onReject: (o: IncomingRow) => Promise<void>;
  onUpdate: (id: string, patch: Partial<IncomingRow>) => Promise<void>;
  disabled: boolean;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <Card className="border-border/60 bg-card/70">
      <CardContent className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground">{offer.from_club}</p>
            <p className="text-lg font-bold">{offer.player_name}</p>
          </div>
          <Badge variant={offer.offer_type === "buy" ? "default" : "secondary"}>
            {offer.offer_type === "buy" ? "Compra" : "Empréstimo"}
          </Badge>
        </div>
        <div className="grid grid-cols-3 gap-2 text-xs">
          <Stat label="Valor" value={formatEur(offer.fee_eur)} />
          <Stat label="Bônus" value={formatEur(offer.bonus_eur)} />
          <Stat label="Salário ofertado" value={`${formatEur(offer.wage_offered_eur)}/sem`} />
        </div>
        <div className="flex items-center gap-2 text-xs">
          <Heart className="h-3.5 w-3.5 text-destructive" />
          <span className="text-muted-foreground">Interesse do jogador:</span>
          <strong>{offer.player_interest}%</strong>
        </div>
        <div className="flex flex-wrap gap-2">
          <CounterDialog offer={offer} onUpdate={onUpdate} onAccept={onAccept} disabled={disabled} />
          <Button size="sm" variant="outline" onClick={async () => { setBusy(true); await onAccept(offer); setBusy(false); }} disabled={busy || disabled}>
            <Check className="mr-1 h-4 w-4" /> Aceitar direto
          </Button>
          <Button size="sm" variant="ghost" onClick={async () => { setBusy(true); await onReject(offer); setBusy(false); }} disabled={busy}>
            <X className="mr-1 h-4 w-4" /> Recusar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-border/40 bg-background/30 p-2">
      <p className="text-muted-foreground">{label}</p>
      <p className="font-bold">{value}</p>
    </div>
  );
}

// ===== Negociação multi-rodada — propostas pelos meus jogadores =====

type Speaker = "you" | "club" | "player";
interface DialogueLine { from: Speaker; text: string }

interface CounterState {
  // Demandas atuais do nosso lado (mínimos aceitáveis)
  ourMinFee: number;
  ourMinWage: number; // salário mínimo que queremos para o jogador
  // Última proposta deles (vinda do banco)
  theirFee: number;
  theirBonus: number;
  theirWage: number;
  // Inputs do usuário (contraproposta a enviar)
  askFee: number;
  askBonus: number;
  askWage: number;
  round: number;
  history: DialogueLine[];
  closed: boolean;
  rejected: boolean;
}

function CounterDialog({
  offer, onUpdate, onAccept, disabled,
}: {
  offer: IncomingRow;
  onUpdate: (id: string, patch: Partial<IncomingRow>) => Promise<void>;
  onAccept: (o: IncomingRow) => Promise<void>;
  disabled: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<CounterState>(() => initialCounter(offer));
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (open) setState(initialCounter(offer)); }, [open, offer]);

  const canSend = state.round <= MAX_ROUNDS && !state.closed && !state.rejected;

  const submit = async () => {
    setBusy(true);
    const next = simulateCounter(state, offer);
    setState(next);
    setBusy(false);

    // Se o clube aceitou os novos termos, persiste no banco para o usuário poder concretizar
    const lastClub = [...next.history].reverse().find((h) => h.from === "club");
    const clubAccepted = lastClub?.text.includes("✅");
    if (clubAccepted) {
      await onUpdate(offer.id, {
        fee_eur: next.theirFee,
        bonus_eur: next.theirBonus,
        wage_offered_eur: next.theirWage,
      });
    }
    if (next.rejected) {
      await onUpdate(offer.id, { status: "rejected" });
      setTimeout(() => setOpen(false), 1500);
    }
  };

  // Aceita diretamente os termos atuais (após o clube ter melhorado a oferta)
  const acceptNow = async () => {
    setBusy(true);
    // Atualiza os valores no banco antes de aceitar, para garantir consistência
    const updated: IncomingRow = {
      ...offer,
      fee_eur: state.theirFee,
      bonus_eur: state.theirBonus,
      wage_offered_eur: state.theirWage,
    };
    await onUpdate(offer.id, {
      fee_eur: state.theirFee,
      bonus_eur: state.theirBonus,
      wage_offered_eur: state.theirWage,
    });
    await onAccept(updated);
    setBusy(false);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="secondary" disabled={disabled}>
          <Handshake className="mr-1 h-4 w-4" /> Negociar
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gavel className="h-5 w-5 text-primary" /> Contraproposta — {offer.player_name}
          </DialogTitle>
          <DialogDescription>
            {offer.from_club} ofereceu {formatEur(offer.fee_eur)} + {formatEur(offer.bonus_eur)} bônus • salário {formatEur(offer.wage_offered_eur)}/sem.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Valor que você pede (€)</Label>
            <Input
              type="number"
              value={state.askFee}
              onChange={(e) => setState({ ...state, askFee: parseInt(e.target.value) || 0 })}
            />
            <p className="text-[10px] text-muted-foreground">Eles oferecem agora: {formatEur(state.theirFee)}</p>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Bônus pedido (€)</Label>
            <Input
              type="number"
              value={state.askBonus}
              onChange={(e) => setState({ ...state, askBonus: parseInt(e.target.value) || 0 })}
            />
            <p className="text-[10px] text-muted-foreground">Bônus deles: {formatEur(state.theirBonus)}</p>
          </div>
          <div className="space-y-1.5 col-span-2">
            <Label className="text-xs">Salário que o jogador quer (€/sem)</Label>
            <Input
              type="number"
              value={state.askWage}
              onChange={(e) => setState({ ...state, askWage: parseInt(e.target.value) || 0 })}
            />
            <p className="text-[10px] text-muted-foreground">
              Eles pagam: {formatEur(state.theirWage)}/sem • Jogador exige no mínimo {formatEur(state.ourMinWage)}/sem
            </p>
          </div>
        </div>

        {state.history.length > 0 && (
          <div className="space-y-1.5">
            <Label className="text-xs flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" /> Negociação — Rodada {Math.min(state.round, MAX_ROUNDS)}/{MAX_ROUNDS}
            </Label>
            <div className="max-h-44 space-y-1.5 overflow-y-auto rounded border border-border/40 bg-background/30 p-2 text-xs">
              {state.history.map((h, i) => (
                <div key={i} className={
                  h.from === "you" ? "text-foreground" :
                  h.from === "club" ? "text-amber-300" : "text-emerald-300"
                }>
                  <strong className="mr-1">
                    {h.from === "you" ? "Você:" : h.from === "club" ? `${offer.from_club}:` : `${offer.player_name}:`}
                  </strong>
                  {h.text}
                </div>
              ))}
            </div>
          </div>
        )}

        <DialogFooter className="flex-col gap-2 sm:flex-col">
          {state.closed ? (
            <Button onClick={acceptNow} disabled={busy} className="w-full">
              {busy ? "Concluindo..." : "✅ Aceitar e concretizar venda"}
            </Button>
          ) : state.rejected ? (
            <Button disabled variant="destructive" className="w-full">❌ Negociação encerrada</Button>
          ) : canSend ? (
            <Button onClick={submit} disabled={busy} className="w-full">
              {busy ? "Aguardando resposta..." : state.round === 1 ? "Enviar contraproposta" : `Enviar contraproposta (rodada ${state.round})`}
            </Button>
          ) : (
            <Button disabled variant="outline" className="w-full">Limite de {MAX_ROUNDS} rodadas atingido</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function initialCounter(offer: IncomingRow): CounterState {
  // Pediremos por padrão 20% acima da oferta inicial; jogador quer salário 15% maior.
  const askFee = Math.round(offer.fee_eur * 1.2);
  const askBonus = Math.max(offer.bonus_eur, Math.round(offer.fee_eur * 0.08));
  const askWage = Math.round(offer.wage_offered_eur * 1.15);
  const dealLabel = offer.offer_type === "buy" ? "compra" : "empréstimo";
  const interestLine =
    offer.player_interest >= 80
      ? `Estou muito animado com a chance de jogar pelo ${offer.from_club}. Quero esse acordo.`
      : offer.player_interest >= 50
      ? `É uma proposta interessante. Se o salário for justo, eu topo.`
      : `Não sei se quero sair agora. Vai depender muito do salário.`;
  return {
    ourMinFee: Math.round(offer.fee_eur * 1.05), // mínimo aceitável
    ourMinWage: Math.round(offer.wage_offered_eur * 1.05),
    theirFee: offer.fee_eur,
    theirBonus: offer.bonus_eur,
    theirWage: offer.wage_offered_eur,
    askFee,
    askBonus,
    askWage,
    round: 1,
    history: [
      {
        from: "club",
        text: `Boa tarde. Viemos formalizar nosso interesse em ${offer.player_name}. Nossa proposta de ${dealLabel}: ${formatEur(offer.fee_eur)}${offer.bonus_eur ? ` + ${formatEur(offer.bonus_eur)} em bônus` : ""}, salário de ${formatEur(offer.wage_offered_eur)}/sem.`,
      },
      { from: "player", text: interestLine },
    ],
    closed: false,
    rejected: false,
  };
}

function simulateCounter(s: CounterState, offer: IncomingRow): CounterState {
  const history = [...s.history];
  history.push({
    from: "you",
    text: `Pedimos ${formatEur(s.askFee)}${s.askBonus ? ` + ${formatEur(s.askBonus)} bônus` : ""}, com salário de ${formatEur(s.askWage)}/sem para o jogador.`,
  });

  const totalAsked = s.askFee + s.askBonus * 0.6;
  const totalTheirCurrent = s.theirFee + s.theirBonus * 0.6;
  // Qual é o "teto" do clube comprador? Tipicamente 1.4x da primeira proposta.
  const clubCeiling = (offer.fee_eur + offer.bonus_eur * 0.6) * 1.4;
  const wageCeiling = offer.wage_offered_eur * 1.5;

  const lastRound = s.round >= MAX_ROUNDS;

  // ===== Resposta do clube comprador =====
  let nextFee = s.theirFee;
  let nextBonus = s.theirBonus;
  let nextWage = s.theirWage;
  let clubAcceptsValue = false;

  if (totalAsked <= totalTheirCurrent * 1.02) {
    // Pediu basicamente o que já ofereceram — aceita imediatamente
    history.push({ from: "club", text: `Aceito. Fechamos por ${formatEur(s.theirFee)}.` });
    clubAcceptsValue = true;
  } else if (totalAsked > clubCeiling) {
    // Pediu acima do teto deles
    if (lastRound) {
      history.push({ from: "club", text: "Está muito acima do que podemos pagar. Encerramos as conversas." });
    } else {
      // Sobe um pouco em direção ao teto
      nextFee = Math.min(Math.round(clubCeiling * 0.9), Math.round((s.theirFee + s.askFee) / 2));
      nextBonus = Math.max(s.theirBonus, Math.round(s.askBonus * 0.6));
      history.push({ from: "club", text: `Acima do nosso limite. Nosso máximo razoável é ${formatEur(nextFee)}${nextBonus ? ` + ${formatEur(nextBonus)} bônus` : ""}.` });
    }
  } else {
    // Está dentro do teto — sobe a oferta em direção ao pedido
    nextFee = Math.round((s.theirFee + s.askFee) / 2);
    nextBonus = Math.round((s.theirBonus + s.askBonus) / 2);
    if (Math.abs(nextFee - s.askFee) <= s.askFee * 0.05) {
      history.push({ from: "club", text: `Tudo bem. Subimos para ${formatEur(nextFee)}${nextBonus ? ` + ${formatEur(nextBonus)} bônus` : ""}. ✅ Acordo possível.` });
      clubAcceptsValue = true;
    } else {
      history.push({ from: "club", text: `Subimos a oferta para ${formatEur(nextFee)}${nextBonus ? ` + ${formatEur(nextBonus)} bônus` : ""}. Vocês cedem um pouco?` });
    }
  }

  // ===== Resposta do jogador (sobre o salário) =====
  let playerAccepts = false;
  if (s.askWage <= s.theirWage * 1.02) {
    history.push({ from: "player", text: `Aceito ${formatEur(s.theirWage)}/sem. Estou pronto para a mudança.` });
    playerAccepts = true;
  } else if (s.askWage > wageCeiling) {
    if (lastRound) {
      history.push({ from: "player", text: "Salário muito longe da minha expectativa. Não aceito." });
    } else {
      nextWage = Math.min(Math.round(wageCeiling * 0.95), Math.round((s.theirWage + s.askWage) / 2));
      history.push({ from: "player", text: `O clube me ofereceu ${formatEur(nextWage)}/sem. Ainda quero mais para fechar.` });
    }
  } else {
    nextWage = Math.round((s.theirWage + s.askWage) / 2);
    if (Math.abs(nextWage - s.askWage) <= s.askWage * 0.05) {
      history.push({ from: "player", text: `Acertei salário em ${formatEur(nextWage)}/sem. ✅ Aceito.` });
      playerAccepts = true;
    } else {
      history.push({ from: "player", text: `O ${offer.from_club} me oferece ${formatEur(nextWage)}/sem. Quero pelo menos um pouco mais.` });
    }
  }

  // ===== Resultado final =====
  const closed = clubAcceptsValue && playerAccepts;
  const rejected =
    history.some((h) => h.text.includes("Encerramos as conversas") || h.text.includes("Não aceito")) ||
    (lastRound && !closed);

  if (closed) {
    history.push({ from: "club", text: `✅ Tudo certo! Aguardamos sua confirmação para concretizar.` });
  } else if (rejected && lastRound && !closed) {
    history.push({ from: "club", text: "❌ Limite de rodadas atingido. Negociação encerrada." });
  }

  return {
    ...s,
    theirFee: nextFee,
    theirBonus: nextBonus,
    theirWage: nextWage,
    round: s.round + 1,
    history,
    closed,
    rejected,
  };
}
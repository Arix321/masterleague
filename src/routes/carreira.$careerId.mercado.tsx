import { createFileRoute, useParams } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useCareer } from "@/lib/career-context";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatEur } from "@/lib/format";
import { toast } from "sonner";
import { Handshake, Store, Lock, Search, X, ShoppingCart, Repeat, Gavel, AlertTriangle } from "lucide-react";
import React from "react";
import { nextWindowChange, windowClosesAt } from "@/lib/season";

interface MarketRow {
  id: string;
  name: string;
  position: string;
  overall: number;
  market_value_eur: number;
  expected_wage_eur: number;
  region: string;
  current_club: string;
}

type DealType = "buy" | "loan";
type LoanType = "simple" | "option" | "obligation";

interface Negotiation {
  player: MarketRow;
  dealType: DealType;
  loanType: LoanType;
  loanMonths: 3 | 6 | 12;
  fee: number;
  wage: number;
  bonus: number;
  years: number;
  wageSharePct: number; // % salário pago pelo MEU clube no empréstimo
  buyOption: number;
  round: number;
  history: Array<{ from: "you" | "club" | "player"; text: string }>;
  // Demandas do clube/jogador (atualizadas a cada rodada)
  clubAsk: number; // valor que o clube vendedor quer agora
  playerAsk: number; // salário que o jogador quer agora
}

const MONTHS_TO_MATCHDAYS = 4; // 1 mês ≈ 4 rodadas
const MAX_NEGOTIATION_ROUNDS = 4;

export const Route = createFileRoute("/carreira/$careerId/mercado")({
  component: MercadoPage,
});

function MercadoPage() {
  const { career, club, refresh } = useCareer();
  const { careerId } = useParams({ from: "/carreira/$careerId/mercado" });
  const [market, setMarket] = useState<MarketRow[]>([]);
  const [search, setSearch] = useState("");
  const [posFilter, setPosFilter] = useState<string>("ALL");

  const load = async () => {
    const { data } = await supabase
      .from("market_players")
      .select("id, name, position, overall, market_value_eur, expected_wage_eur, region, current_club")
      .eq("career_id", careerId)
      .order("market_value_eur", { ascending: false });
    setMarket((data ?? []) as MarketRow[]);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [careerId]);

  const [clubFilter, setClubFilter] = useState<string>("ALL");
  const [valueOrder, setValueOrder] = useState<"desc" | "asc">("desc");

  const clubOptions = useMemo(() => {
    const set = new Set<string>();
    market.forEach((p) => set.add(p.current_club || "Livre"));
    return Array.from(set).sort();
  }, [market]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = market.filter((p) => {
      if (posFilter !== "ALL" && p.position !== posFilter) return false;
      if (clubFilter !== "ALL" && (p.current_club || "Livre") !== clubFilter) return false;
      if (q && !p.name.toLowerCase().includes(q)) return false;
      return true;
    });
    return list.sort((a, b) =>
      valueOrder === "desc"
        ? b.market_value_eur - a.market_value_eur
        : a.market_value_eur - b.market_value_eur,
    );
  }, [market, search, posFilter, clubFilter, valueOrder]);

  // Conclui contratação definitiva (compra OU empréstimo aceito por ambas as partes)
  const closeDeal = async (n: Negotiation) => {
    if (n.dealType === "buy") {
      if (n.fee > career.cash_eur) {
        toast.error("Caixa insuficiente para concretizar a compra.");
        return;
      }
      await supabase.from("squad_players").insert({
        career_id: career.id,
        user_id: career.user_id,
        club_slug: career.club_slug,
        name: n.player.name,
        position: n.player.position,
        overall: n.player.overall,
        weekly_wage_eur: n.wage,
        original_wage_eur: n.wage,
        market_value_eur: n.player.market_value_eur,
      });
      await supabase.from("market_players").delete().eq("id", n.player.id);
      await supabase.from("careers").update({
        cash_eur: career.cash_eur - n.fee,
        weekly_wages_eur: career.weekly_wages_eur + n.wage,
        updated_at: new Date().toISOString(),
      }).eq("id", career.id);
      await supabase.from("news_feed").insert({
        career_id: career.id,
        user_id: career.user_id,
        kind: "transfer",
        title: `${club.name} acerta a contratação de ${n.player.name}`,
        body: `Vindo do ${n.player.current_club || n.player.region}. Valor: ${formatEur(n.fee)}${n.bonus ? ` (+${formatEur(n.bonus)} em bônus)` : ""} • Salário: ${formatEur(n.wage)}/sem • Contrato: ${n.years} anos.`,
      });
      toast.success(`${n.player.name} é seu novo reforço!`);
    } else {
      // Empréstimo
      const months = n.loanMonths;
      const returnsAt = career.matchday + months * MONTHS_TO_MATCHDAYS;
      const myWageShare = Math.round((n.wage * n.wageSharePct) / 100);
      const loanFee = n.fee; // taxa de empréstimo
      if (loanFee > career.cash_eur) {
        toast.error("Caixa insuficiente para a taxa de empréstimo.");
        return;
      }
      const loanLabel = n.loanType === "obligation" ? "com obrigação de compra" : n.loanType === "option" ? "com opção de compra" : "simples";
      await supabase.from("squad_players").insert({
        career_id: career.id,
        user_id: career.user_id,
        club_slug: career.club_slug,
        name: n.player.name,
        position: n.player.position,
        overall: n.player.overall,
        weekly_wage_eur: myWageShare,
        original_wage_eur: myWageShare,
        market_value_eur: n.player.market_value_eur,
      });
      await supabase.from("market_players").delete().eq("id", n.player.id);
      await supabase.from("careers").update({
        cash_eur: career.cash_eur - loanFee,
        weekly_wages_eur: career.weekly_wages_eur + myWageShare,
        updated_at: new Date().toISOString(),
      }).eq("id", career.id);
      await supabase.from("news_feed").insert({
        career_id: career.id,
        user_id: career.user_id,
        kind: "transfer",
        title: `${club.name} acerta empréstimo de ${n.player.name}`,
        body: `Empréstimo ${loanLabel} por ${months} meses${n.loanType !== "simple" ? `, com opção/obrigação de compra de ${formatEur(n.buyOption)}` : ""}. Taxa: ${formatEur(loanFee)} • Salário pago pelo ${club.name}: ${n.wageSharePct}% (${formatEur(myWageShare)}/sem). Retorno previsto na rodada ${returnsAt}.`,
      });
      toast.success(`${n.player.name} chega por empréstimo!`);
    }

    // Registra no histórico de transferências
    await supabase.from("transfer_offers").insert({
      career_id: career.id,
      user_id: career.user_id,
      direction: "in",
      player_name: n.player.name,
      other_club: n.player.current_club || n.player.region,
      deal_type: n.dealType,
      loan_months: n.dealType === "loan" ? n.loanMonths : 0,
      loan_buy_option_eur: n.dealType === "loan" && n.loanType !== "simple" ? n.buyOption : 0,
      loan_obligation: n.dealType === "loan" && n.loanType === "obligation",
      wage_share_pct: n.dealType === "loan" ? n.wageSharePct : 100,
      fee_eur: n.fee,
      wage_eur: n.wage,
      bonus_eur: n.bonus,
      contract_years: n.years,
      negotiation_round: n.round,
      rounds_used: n.round,
      status: "accepted",
      club_response: "Aceita a proposta final.",
      player_response: "Aceita os termos finais.",
    });

    await refresh();
    await load();
  };

  return (
    <div className="space-y-6">
      <Card className="border-border/60 bg-card/70">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Store className="h-5 w-5 text-primary" /> Mercado de transferências
            {!career.transfer_window_open && <Badge variant="destructive" className="gap-1"><Lock className="h-3 w-3" /> Fechada</Badge>}
          </CardTitle>
          <CardDescription>
            {career.transfer_window_open
              ? `Janela aberta até a rodada ${windowClosesAt(career.matchday)}. Caixa: ${formatEur(career.cash_eur)}.`
              : `Janela fechada. Reabre na rodada ${nextWindowChange(career.matchday)}.`}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-3 pt-0">
          <div className="min-w-[220px] flex-1 space-y-1.5">
            <Label className="text-xs">Buscar jogador</Label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Digite o nome..."
                className="pl-8 pr-8"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label="Limpar busca"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
          <div className="w-40 space-y-1.5">
            <Label className="text-xs">Posição</Label>
            <Select value={posFilter} onValueChange={setPosFilter}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todas</SelectItem>
                <SelectItem value="GOL">GOL</SelectItem>
                <SelectItem value="ZAG">ZAG</SelectItem>
                <SelectItem value="LAT">LAT</SelectItem>
                <SelectItem value="VOL">VOL</SelectItem>
                <SelectItem value="MDF">MDF</SelectItem>
                <SelectItem value="MCT">MCT</SelectItem>
                <SelectItem value="MAT">MAT</SelectItem>
                <SelectItem value="PTA">PTA</SelectItem>
                <SelectItem value="CA">CA</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="w-48 space-y-1.5">
            <Label className="text-xs">Time atual</Label>
            <Select value={clubFilter} onValueChange={setClubFilter}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todos os times</SelectItem>
                {clubOptions.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="w-40 space-y-1.5">
            <Label className="text-xs">Ordenar valor</Label>
            <Select value={valueOrder} onValueChange={(v) => setValueOrder(v as "desc" | "asc")}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="desc">Maior valor</SelectItem>
                <SelectItem value="asc">Menor valor</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="text-xs text-muted-foreground">
            {filtered.length} de {market.length}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((p) => (
          <Card key={p.id} className="border-border/60 bg-card/70">
            <CardContent className="space-y-3 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 flex-col items-center justify-center rounded-xl bg-gradient-gold text-primary-foreground">
                  <span className="text-base font-black leading-none">{p.overall}</span>
                  <span className="text-[10px] font-semibold uppercase">{p.position}</span>
                </div>
                <div className="flex-1">
                  <p className="font-bold">{p.name}</p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    <Badge variant="secondary" className="text-[10px]">🏟️ {p.current_club || "Livre"}</Badge>
                    <Badge variant="outline" className="text-[10px]">{p.region}</Badge>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="rounded border border-border/40 bg-background/30 p-2">
                  <p className="text-muted-foreground">Valor</p>
                  <p className="font-bold">{formatEur(p.market_value_eur)}</p>
                </div>
                <div className="rounded border border-border/40 bg-background/30 p-2">
                  <p className="text-muted-foreground">Salário esperado</p>
                  <p className="font-bold">{formatEur(p.expected_wage_eur)}/sem</p>
                </div>
              </div>
              <NegotiateDialog player={p} onClose={closeDeal} disabled={!career.transfer_window_open} cash={career.cash_eur} />
            </CardContent>
          </Card>
        ))}
        {filtered.length === 0 && (
          <p className="md:col-span-2 xl:col-span-3 text-muted-foreground">
            {market.length === 0 ? "Mercado vazio." : "Nenhum jogador encontrado com esses filtros."}
          </p>
        )}
      </div>
    </div>
  );
}

function NegotiateDialog({
  player, onClose, disabled, cash,
}: {
  player: MarketRow;
  onClose: (n: Negotiation) => Promise<void>;
  disabled?: boolean;
  cash: number;
}) {
  const [open, setOpen] = useState(false);
  const [neg, setNeg] = useState<Negotiation>(() => initialNegotiation(player));
  const [busy, setBusy] = useState(false);

  // Reseta quando abre
  useEffect(() => {
    if (open) setNeg(initialNegotiation(player));
  }, [open, player]);

  const isLoan = neg.dealType === "loan";
  const dealClosed = neg.history.some((h) => h.text.startsWith("✅"));
  const dealRejected = neg.history.some((h) => h.text.startsWith("❌"));
  const canSendMore = neg.round <= MAX_NEGOTIATION_ROUNDS && !dealClosed && !dealRejected;

  // Envia proposta para clube + jogador. Atualiza demandas se recusado parcialmente.
  const submit = async () => {
    setBusy(true);
    const next = simulateRound(neg);
    setNeg(next);
    setBusy(false);

    // Se aceitaram tudo, fecha o negócio
    if (next.history[next.history.length - 1].text.startsWith("✅")) {
      await onClose(next);
      setTimeout(() => setOpen(false), 1200);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="w-full" disabled={disabled}>
          {disabled ? <><Lock className="mr-2 h-4 w-4" /> Janela fechada</> : <><Handshake className="mr-2 h-4 w-4" /> Negociar</>}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gavel className="h-5 w-5 text-primary" /> Negociar — {player.name}
          </DialogTitle>
          <DialogDescription>
            {neg.player.current_club || "Livre"} • Valor de mercado {formatEur(player.market_value_eur)} • Salário pedido {formatEur(player.expected_wage_eur)}/sem
          </DialogDescription>
        </DialogHeader>

        {/* Tipo de negociação */}
        <div className="space-y-2">
          <Label className="text-xs">Tipo</Label>
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              variant={neg.dealType === "buy" ? "default" : "outline"}
              onClick={() => setNeg(initialNegotiation(player, "buy"))}
              className="flex-1"
              disabled={dealClosed}
            >
              <ShoppingCart className="mr-1 h-4 w-4" /> Compra
            </Button>
            <Button
              type="button"
              size="sm"
              variant={neg.dealType === "loan" ? "default" : "outline"}
              onClick={() => setNeg(initialNegotiation(player, "loan"))}
              className="flex-1"
              disabled={dealClosed}
            >
              <Repeat className="mr-1 h-4 w-4" /> Empréstimo
            </Button>
          </div>
        </div>

        {isLoan && (
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Modalidade</Label>
              <Select value={neg.loanType} onValueChange={(v) => setNeg({ ...neg, loanType: v as LoanType })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="simple">Empréstimo simples</SelectItem>
                  <SelectItem value="option">Com opção de compra</SelectItem>
                  <SelectItem value="obligation">Com obrigação de compra</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Duração</Label>
              <Select value={String(neg.loanMonths)} onValueChange={(v) => setNeg({ ...neg, loanMonths: Number(v) as 3 | 6 | 12 })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="3">3 meses</SelectItem>
                  <SelectItem value="6">6 meses</SelectItem>
                  <SelectItem value="12">1 ano</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">% salário pago por nós</Label>
              <Input
                type="number"
                min={0}
                max={100}
                value={neg.wageSharePct}
                onChange={(e) => setNeg({ ...neg, wageSharePct: Math.max(0, Math.min(100, parseInt(e.target.value) || 0)) })}
              />
            </div>
            {neg.loanType !== "simple" && (
              <div className="space-y-1.5">
                <Label className="text-xs">Opção/obrigação de compra (€)</Label>
                <Input
                  type="number"
                  value={neg.buyOption}
                  onChange={(e) => setNeg({ ...neg, buyOption: parseInt(e.target.value) || 0 })}
                />
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">{isLoan ? "Taxa de empréstimo (€)" : "Valor da transferência (€)"}</Label>
            <Input type="number" value={neg.fee} onChange={(e) => setNeg({ ...neg, fee: parseInt(e.target.value) || 0 })} />
            <p className="text-[10px] text-muted-foreground">Clube pede agora: {formatEur(neg.clubAsk)}</p>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Salário semanal total (€)</Label>
            <Input type="number" value={neg.wage} onChange={(e) => setNeg({ ...neg, wage: parseInt(e.target.value) || 0 })} />
            <p className="text-[10px] text-muted-foreground">Jogador quer: {formatEur(neg.playerAsk)}/sem</p>
          </div>
          {!isLoan && (
            <>
              <div className="space-y-1.5">
                <Label className="text-xs">Bônus (€)</Label>
                <Input type="number" value={neg.bonus} onChange={(e) => setNeg({ ...neg, bonus: parseInt(e.target.value) || 0 })} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Anos de contrato</Label>
                <Input type="number" min={1} max={6} value={neg.years} onChange={(e) => setNeg({ ...neg, years: parseInt(e.target.value) || 3 })} />
              </div>
            </>
          )}
        </div>

        {/* Histórico da negociação */}
        {neg.history.length > 0 && (
          <div className="space-y-1.5">
            <Label className="text-xs flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" /> Negociação — Rodada {Math.min(neg.round, MAX_NEGOTIATION_ROUNDS)}/{MAX_NEGOTIATION_ROUNDS}
            </Label>
            <div className="max-h-40 space-y-1.5 overflow-y-auto rounded border border-border/40 bg-background/30 p-2 text-xs">
              {neg.history.map((h, i) => (
                <div key={i} className={
                  h.from === "you" ? "text-foreground" :
                  h.from === "club" ? "text-amber-300" : "text-emerald-300"
                }>
                  <strong className="mr-1">
                    {h.from === "you" ? "Você:" : h.from === "club" ? `${player.current_club || "Clube"}:` : `${player.name}:`}
                  </strong>
                  {h.text}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="rounded border border-border/40 bg-background/30 p-2 text-[11px] text-muted-foreground">
          💰 Caixa: {formatEur(cash)} {neg.fee > cash && <span className="text-destructive">— insuficiente</span>}
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-col">
          {canSendMore ? (
            <Button onClick={submit} disabled={busy} className="w-full">
              {busy ? "Aguardando resposta..." : neg.round === 1 ? "Enviar proposta" : `Enviar contraproposta (rodada ${neg.round})`}
            </Button>
          ) : dealClosed ? (
            <Button disabled className="w-full">✅ Negócio fechado</Button>
          ) : dealRejected ? (
            <Button disabled variant="destructive" className="w-full">❌ Negociação encerrada</Button>
          ) : (
            <Button disabled variant="outline" className="w-full">Limite de {MAX_NEGOTIATION_ROUNDS} rodadas atingido</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ====== Negociação inteligente ======
function initialNegotiation(player: MarketRow, dealType: DealType = "buy"): Negotiation {
  const isLoan = dealType === "loan";
  return {
    player,
    dealType,
    loanType: "simple",
    loanMonths: 6,
    fee: isLoan ? Math.round(player.market_value_eur * 0.08) : player.market_value_eur,
    wage: player.expected_wage_eur,
    bonus: 0,
    years: 3,
    wageSharePct: 100,
    buyOption: Math.round(player.market_value_eur * 1.05),
    round: 1,
    history: [],
    clubAsk: isLoan ? Math.round(player.market_value_eur * 0.1) : player.market_value_eur,
    playerAsk: player.expected_wage_eur,
  };
}

function simulateRound(n: Negotiation): Negotiation {
  const history = [...n.history];
  history.push({
    from: "you",
    text: n.dealType === "buy"
      ? `Proposta de compra: ${formatEur(n.fee)}${n.bonus ? ` + ${formatEur(n.bonus)} bônus` : ""} • salário ${formatEur(n.wage)}/sem • ${n.years} anos.`
      : `Empréstimo (${n.loanType === "simple" ? "simples" : n.loanType === "option" ? "opção" : "obrigação"}, ${n.loanMonths}m): taxa ${formatEur(n.fee)}, ${n.wageSharePct}% salário (${formatEur(n.wage)}/sem total)${n.loanType !== "simple" ? `, opção ${formatEur(n.buyOption)}` : ""}.`,
  });

  const totalOffered = n.fee + n.bonus * 0.6;
  const clubGap = totalOffered / Math.max(1, n.clubAsk);
  const playerGap = n.wage / Math.max(1, n.playerAsk);

  const clubAccepts = clubGap >= 0.97;
  const playerAccepts = playerGap >= 0.97;

  // Em última rodada, se ambos rejeitarem, encerra a negociação.
  const lastRound = n.round >= MAX_NEGOTIATION_ROUNDS;

  // Resposta do clube
  let nextClubAsk = n.clubAsk;
  if (clubAccepts) {
    history.push({ from: "club", text: "Aceitamos a proposta. Boa sorte ao jogador." });
  } else if (clubGap < 0.6 && lastRound) {
    history.push({ from: "club", text: "Distância grande demais. Encerramos a conversa." });
    history.push({ from: "club", text: "❌ Negociação encerrada pelo clube." });
  } else {
    // Clube cede um pouco mas ainda pede mais
    nextClubAsk = Math.max(totalOffered + 1, Math.round(n.clubAsk * (clubGap < 0.7 ? 0.92 : 0.96)));
    const tone = clubGap < 0.7 ? "Está muito abaixo. Precisamos pelo menos" : "Estamos perto, mas queremos";
    history.push({ from: "club", text: `${tone} ${formatEur(nextClubAsk)} para liberar.` });
  }

  // Resposta do jogador
  let nextPlayerAsk = n.playerAsk;
  if (playerAccepts) {
    history.push({ from: "player", text: "Aceito o salário. Quero vestir essa camisa!" });
  } else if (playerGap < 0.7 && lastRound) {
    history.push({ from: "player", text: "❌ O salário está muito longe do que mereço. Recuso." });
  } else {
    nextPlayerAsk = Math.max(n.wage + 1, Math.round(n.playerAsk * (playerGap < 0.8 ? 0.95 : 0.98)));
    history.push({ from: "player", text: `Quero ao menos ${formatEur(nextPlayerAsk)}/sem para fechar.` });
  }

  // Resultado final da rodada
  const closed = clubAccepts && playerAccepts;
  const ended = history.some((h) => h.text.startsWith("❌"));
  if (closed) {
    history.push({ from: "club", text: `✅ Negócio fechado! Bem-vindo, ${n.player.name}.` });
  } else if (lastRound && !ended) {
    history.push({ from: "club", text: "❌ Negociação encerrada — limite de rodadas atingido." });
  }

  return {
    ...n,
    round: n.round + 1,
    history,
    clubAsk: nextClubAsk,
    playerAsk: nextPlayerAsk,
  };
}
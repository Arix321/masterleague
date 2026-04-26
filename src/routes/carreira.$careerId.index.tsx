import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useCareer } from "@/lib/career-context";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { buildCrowdReaction, randomPressQuestion, welcomeHeadlines } from "@/lib/narrative";
import { Mic, Megaphone, Sparkles, ArrowRight, Trophy } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/carreira/$careerId/")({
  component: HubIndex,
});

function HubIndex() {
  const { career, club, refresh } = useCareer();
  const { careerId } = useParams({ from: "/carreira/$careerId/" });
  const [pressAnswer, setPressAnswer] = useState("");
  const [pressQ] = useState(() => randomPressQuestion());
  const [submitting, setSubmitting] = useState(false);
  const [news, setNews] = useState<{ id: string; title: string; body: string | null; kind: string; created_at: string }[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("news_feed")
        .select("id, title, body, kind, created_at")
        .eq("career_id", careerId)
        .order("created_at", { ascending: false })
        .limit(5);
      setNews(data ?? []);
    })();
  }, [careerId]);

  const finishIntro = async () => {
    if (!pressAnswer.trim()) {
      toast.error("Diga algo à imprensa.");
      return;
    }
    setSubmitting(true);
    await supabase.from("news_feed").insert({
      career_id: career.id,
      user_id: career.user_id,
      kind: "press",
      title: `Coletiva: ${career.manager_name} responde à imprensa`,
      body: `Pergunta: ${pressQ}\n\n${career.manager_name}: "${pressAnswer.trim()}"`,
    });
    await supabase.from("careers").update({ intro_done: true, updated_at: new Date().toISOString() }).eq("id", career.id);
    toast.success("Coletiva concluída.");
    setSubmitting(false);
    await refresh();
  };

  if (!career.intro_done) {
    const headlines = welcomeHeadlines(club.slug, career.manager_name);
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="rounded-2xl border border-primary/30 bg-gradient-pitch p-8 shadow-card">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-primary">
            <Megaphone className="h-4 w-4" /> Apresentação oficial
          </div>
          <h2 className="mt-2 text-3xl font-black md:text-4xl">
            {career.manager_name} é apresentado(a) no {club.name}
          </h2>
          <p className="mt-3 text-muted-foreground">
            O elenco está reunido. As câmeras esperam. A primeira coletiva começa agora.
          </p>
        </div>

        <Card className="border-border/60 bg-card/70">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-gold" /> Manchetes do dia</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {headlines.map((h) => (
              <div key={h} className="rounded-lg border border-border/40 bg-background/40 px-4 py-2 text-sm">
                📰 {h}
              </div>
            ))}
            <div className="rounded-lg border border-accent/30 bg-accent/10 px-4 py-3 text-sm">
              {buildCrowdReaction(club.slug, career.manager_name)}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/70">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Mic className="h-5 w-5 text-primary" /> Coletiva inicial</CardTitle>
            <CardDescription>Responda à imprensa para começar a temporada.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-lg bg-muted/50 px-4 py-3 text-sm italic">"{pressQ}"</div>
            <Textarea rows={4} value={pressAnswer} onChange={(e) => setPressAnswer(e.target.value)} placeholder="Sua resposta..." />
            <Button onClick={finishIntro} disabled={submitting} className="w-full">
              {submitting ? "Publicando..." : "Encerrar coletiva e começar a temporada"}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Card className="lg:col-span-2 border-border/60 bg-card/70">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Trophy className="h-5 w-5 text-gold" /> Próximo jogo</CardTitle>
          <CardDescription>Rodada {career.matchday} • {club.league}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-around rounded-xl border border-border/40 bg-background/40 p-6">
            <div className="text-center">
              <div className="text-5xl">{club.badge}</div>
              <p className="mt-2 font-bold">{club.shortName}</p>
            </div>
            <span className="text-2xl font-black text-muted-foreground">vs</span>
            <div className="text-center">
              <div className="text-5xl">⚔️</div>
              <p className="mt-2 font-bold">{career.next_opponent ?? "Adversário"}</p>
            </div>
          </div>
          <Button asChild size="lg" className="w-full">
            <Link to="/carreira/$careerId/escalacao" params={{ careerId }}>
              Escalar o time <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <Card className="border-border/60 bg-card/70">
          <CardHeader>
            <CardTitle>Campanha</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3 text-center">
              <Mini label="V" value={career.wins} />
              <Mini label="E" value={career.draws} />
              <Mini label="D" value={career.losses} />
            </div>
            <div className="mt-3 flex justify-between text-sm">
              <span className="text-muted-foreground">Saldo de gols</span>
              <span className="font-bold">{career.goals_for - career.goals_against}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/70">
          <CardHeader>
            <CardTitle>Últimas notícias</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {news.length === 0 && <p className="text-muted-foreground">Sem novidades.</p>}
            {news.map((n) => (
              <div key={n.id} className="rounded-md border border-border/40 bg-background/30 px-3 py-2">
                <p className="font-medium">{n.title}</p>
              </div>
            ))}
            <Button variant="ghost" size="sm" asChild className="w-full">
              <Link to="/carreira/$careerId/noticias" params={{ careerId }}>Ver todas</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Mini({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border/40 bg-background/40 p-2">
      <p className="text-xs uppercase text-muted-foreground">{label}</p>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}
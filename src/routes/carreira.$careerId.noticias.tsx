import { createFileRoute, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useCareer } from "@/lib/career-context";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface NewsRow { id: string; kind: string; title: string; body: string | null; created_at: string }

export const Route = createFileRoute("/carreira/$careerId/noticias")({
  component: NoticiasPage,
});

function NoticiasPage() {
  const { careerId } = useParams({ from: "/carreira/$careerId/noticias" });
  const [news, setNews] = useState<NewsRow[]>([]);
  void useCareer(); // garantir contexto

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("news_feed")
        .select("id, kind, title, body, created_at")
        .eq("career_id", careerId)
        .order("created_at", { ascending: false });
      setNews((data ?? []) as NewsRow[]);
    })();
  }, [careerId]);

  const kindLabel: Record<string, string> = {
    headline: "Manchete",
    press: "Coletiva",
    board: "Diretoria",
    news: "Notícia",
  };

  return (
    <div className="mx-auto max-w-3xl space-y-3">
      {news.length === 0 && <p className="text-muted-foreground">Sem notícias ainda.</p>}
      {news.map((n) => (
        <Card key={n.id} className="border-border/60 bg-card/70">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <Badge variant="outline" className="border-primary/40 text-primary">{kindLabel[n.kind] ?? n.kind}</Badge>
              <span className="text-xs text-muted-foreground">{new Date(n.created_at).toLocaleString("pt-BR")}</span>
            </div>
            <CardTitle className="text-lg">{n.title}</CardTitle>
          </CardHeader>
          {n.body && (
            <CardContent className="whitespace-pre-line text-sm text-muted-foreground">{n.body}</CardContent>
          )}
        </Card>
      ))}
    </div>
  );
}
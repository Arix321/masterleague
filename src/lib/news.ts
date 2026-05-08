import { supabase } from "@/integrations/supabase/client";

export type NewsKind = "headline" | "press" | "board" | "finance" | "transfer" | "news";

interface AINewsArgs {
  careerId: string;
  userId: string;
  kind: NewsKind;
  hint: string;
  context: Record<string, unknown>;
  fallbackTitle: string;
  fallbackBody: string;
  imageUrl?: string | null;
}

/**
 * Gera uma notícia via IA (edge function generate-news) e insere em news_feed.
 * Se a IA falhar, cai pro título/corpo template fornecidos para nunca travar o jogo.
 */
export async function pushAINews(args: AINewsArgs) {
  let title = args.fallbackTitle;
  let body = args.fallbackBody;
  try {
    const { data, error } = await supabase.functions.invoke("generate-news", {
      body: { kind: args.kind, hint: args.hint, context: args.context },
    });
    if (!error && data?.title && data?.body) {
      title = String(data.title).trim();
      body = String(data.body).trim();
    }
  } catch (e) {
    console.error("pushAINews failed, using fallback", e);
  }

  await supabase.from("news_feed").insert({
    career_id: args.careerId,
    user_id: args.userId,
    kind: args.kind,
    title,
    body,
    image_url: args.imageUrl ?? null,
  });
}
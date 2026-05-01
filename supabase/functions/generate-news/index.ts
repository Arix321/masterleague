import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NewsRequest {
  kind: string;          // headline | press | board | finance | transfer | news
  context: Record<string, unknown>;
  hint?: string;         // short instruction about what to write
}

function buildSystem(kind: string) {
  const base = "Você é um redator esportivo brasileiro experiente, escrevendo para um portal de notícias de futebol estilo GE/ESPN. Seu texto é vivo, com detalhes concretos, sem clichês. Sempre cite nomes, números, contexto da rodada quando fornecido. Nunca repita templates. Use português do Brasil natural.";
  const map: Record<string, string> = {
    headline: "Foco em manchete pós-jogo com análise tática curta e reação da torcida.",
    press: "Foco em coletiva de imprensa, fala do treinador e clima do vestiário.",
    board: "Foco em comunicado da diretoria, expectativas, cobranças.",
    finance: "Foco em finanças do clube, bônus, salários, balanço.",
    transfer: "Foco em mercado de transferências, negociação, valores, repercussão.",
    news: "Foco em notícia geral do clube com tom jornalístico.",
  };
  return `${base} ${map[kind] ?? map.news}`;
}

function buildUser(req: NewsRequest) {
  const lines: string[] = [];
  lines.push(`Tipo de notícia: ${req.kind}`);
  if (req.hint) lines.push(`Instrução: ${req.hint}`);
  lines.push("");
  lines.push("Contexto disponível (use só o que for relevante, NUNCA invente nomes):");
  for (const [k, v] of Object.entries(req.context)) {
    if (v === null || v === undefined || v === "") continue;
    lines.push(`- ${k}: ${typeof v === "object" ? JSON.stringify(v) : String(v)}`);
  }
  lines.push("");
  lines.push("Retorne 1 manchete curta (até 90 caracteres, sem aspas) e 1 corpo de 2 a 4 parágrafos curtos. Pode usar **negrito** com markdown, mas evite listas longas. Não copie o título no corpo. Não use cabeçalhos como 'Título:' ou 'Corpo:'.");
  return lines.join("\n");
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = (await req.json()) as NewsRequest;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: buildSystem(body.kind) },
          { role: "user", content: buildUser(body) },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "emit_news",
              description: "Retorna a notícia gerada com manchete e corpo.",
              parameters: {
                type: "object",
                properties: {
                  title: { type: "string", description: "Manchete curta, sem aspas, até 100 caracteres." },
                  body: { type: "string", description: "Corpo da notícia em 2-4 parágrafos. Pode usar markdown leve." },
                },
                required: ["title", "body"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "emit_news" } },
      }),
    });

    if (!aiResp.ok) {
      const t = await aiResp.text();
      console.error("AI error", aiResp.status, t);
      if (aiResp.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de IA atingido." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResp.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos de IA esgotados." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "Falha ao gerar notícia." }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const json = await aiResp.json();
    const tc = json.choices?.[0]?.message?.tool_calls?.[0];
    let title = ""; let bodyText = "";
    if (tc?.function?.arguments) {
      try {
        const parsed = JSON.parse(tc.function.arguments);
        title = String(parsed.title ?? "").trim();
        bodyText = String(parsed.body ?? "").trim();
      } catch (e) { console.error("parse error", e); }
    }

    if (!title || !bodyText) {
      return new Response(JSON.stringify({ error: "Resposta vazia da IA." }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ title, body: bodyText }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("generate-news error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
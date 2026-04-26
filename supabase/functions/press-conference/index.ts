import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PressContext {
  clubName: string;
  opponent: string;
  gf: number;
  ga: number;
  home: boolean;
  position: number;
  matchday: number;
  derby?: string | null;
  scorers?: string;
  assists?: string;
  yellow?: string;
  red?: string;
  highlight?: string | null;
  previousAnswers?: { q: string; a: string }[];
}

function buildSystemPrompt() {
  return [
    "Você é um repórter esportivo brasileiro experiente cobrindo coletivas pós-jogo de futebol.",
    "Sua missão é gerar perguntas REALISTAS, ÚNICAS, com tom jornalístico — variando entre técnicas, polêmicas, táticas e emocionais.",
    "NUNCA repita perguntas genéricas como 'fale sobre o jogo'. Sempre cite detalhes concretos: jogadores, placar, lances, tabela, rivalidade.",
    "Use linguagem natural do jornalismo esportivo brasileiro (Globo Esporte, ESPN).",
    "As perguntas devem ser curtas (1-2 frases), diretas e específicas.",
    "Se houver respostas anteriores do técnico, faça perguntas que ENGAJEM com o que ele disse (concordando, provocando, pedindo para detalhar).",
    "Retorne APENAS um JSON válido no formato: { \"questions\": [\"pergunta 1\", \"pergunta 2\", ...] }",
  ].join(" ");
}

function buildUserPrompt(ctx: PressContext, count: number) {
  const result = ctx.gf > ctx.ga ? "vitória" : ctx.gf < ctx.ga ? "derrota" : "empate";
  const local = ctx.home ? "em casa" : "como visitante";
  const lines: string[] = [];
  lines.push(`Contexto da partida (rodada ${ctx.matchday}):`);
  lines.push(`- ${ctx.clubName} ${ctx.gf} x ${ctx.ga} ${ctx.opponent} (${local}) — ${result}`);
  lines.push(`- Posição na tabela após o jogo: ${ctx.position}º`);
  if (ctx.derby) lines.push(`- ⚠️ CLÁSSICO: ${ctx.derby}. Explore a rivalidade.`);
  if (ctx.scorers) lines.push(`- Gols de: ${ctx.scorers}`);
  if (ctx.assists) lines.push(`- Assistências: ${ctx.assists}`);
  if (ctx.yellow) lines.push(`- Cartões amarelos: ${ctx.yellow}`);
  if (ctx.red) lines.push(`- Expulsões (vermelho): ${ctx.red} — explore o impacto disciplinar`);
  if (ctx.highlight) lines.push(`- Destaque jornalístico: ${ctx.highlight}`);

  if (ctx.previousAnswers && ctx.previousAnswers.length > 0) {
    lines.push("");
    lines.push("Respostas anteriores do técnico nesta coletiva:");
    ctx.previousAnswers.forEach((p, i) => {
      lines.push(`${i + 1}. P: ${p.q}`);
      lines.push(`   R: ${p.a}`);
    });
    lines.push("");
    lines.push(`Gere ${count} pergunta(s) NOVA(S) que reagem ao que ele disse. Provoque, peça detalhes, mude de assunto se for natural. Não repita temas já cobertos.`);
  } else {
    lines.push("");
    lines.push(`Gere ${count} pergunta(s) variadas para abrir a coletiva: misture análise tática, jogadores em destaque, pressão da torcida, planos para o próximo jogo.`);
  }

  return lines.join("\n");
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { context, count = 4 } = await req.json();
    if (!context) {
      return new Response(JSON.stringify({ error: "Missing context" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: buildSystemPrompt() },
          { role: "user", content: buildUserPrompt(context as PressContext, count) },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "emit_questions",
              description: "Retorna a lista de perguntas geradas para a coletiva.",
              parameters: {
                type: "object",
                properties: {
                  questions: {
                    type: "array",
                    items: { type: "string" },
                    minItems: 1,
                    maxItems: 8,
                  },
                },
                required: ["questions"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "emit_questions" } },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de IA atingido. Tente novamente em alguns segundos." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos de IA esgotados. Adicione fundos no workspace Lovable." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "Falha ao gerar perguntas." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const json = await response.json();
    const toolCall = json.choices?.[0]?.message?.tool_calls?.[0];
    let questions: string[] = [];
    if (toolCall?.function?.arguments) {
      try {
        const parsed = JSON.parse(toolCall.function.arguments);
        if (Array.isArray(parsed.questions)) {
          questions = parsed.questions.filter((q: unknown) => typeof q === "string" && q.trim().length > 0);
        }
      } catch (e) {
        console.error("Failed to parse tool call args", e);
      }
    }

    if (questions.length === 0) {
      // Fallback simples para evitar travar a coletiva
      questions = [
        `Como o senhor avalia o desempenho do ${(context as PressContext).clubName} nesta partida?`,
      ];
    }

    return new Response(JSON.stringify({ questions }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("press-conference error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
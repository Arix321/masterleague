import { CLUBS, type ClubSlug } from "@/data/clubs";
import { derbyName, isDerby } from "@/lib/season";

const PRESS_QUESTIONS = [
  "Como o senhor avalia a estreia à frente do clube?",
  "Há cobrança da diretoria por títulos já nesta temporada?",
  "O elenco atual é o suficiente para brigar pelo topo?",
  "Existe algum reforço prioritário em mente?",
  "Como vai lidar com a pressão da torcida?",
  "Há jogadores que pediram para sair?",
  "O senhor pretende mudar o estilo de jogo?",
];

export function randomPressQuestion() {
  return PRESS_QUESTIONS[Math.floor(Math.random() * PRESS_QUESTIONS.length)];
}

export function welcomeHeadlines(clubSlug: ClubSlug, manager: string) {
  const club = CLUBS[clubSlug];
  return [
    `${manager} chega ao ${club.name} prometendo ambição`,
    `Diretoria do ${club.name} confia em projeto de longo prazo`,
    `Torcida do ${club.name} se mobiliza para receber novo comandante`,
    `Mercado: ${club.name} pode movimentar a janela de transferências`,
  ];
}

export function buildCrowdReaction(clubSlug: ClubSlug, manager: string) {
  const club = CLUBS[clubSlug];
  return `🏟️ A arquibancada do ${club.name} entoou o nome de ${manager} antes mesmo do início do treino. A torcida espera ousadia e títulos.`;
}

export function postMatchHeadline(opponent: string, gf: number, ga: number, clubName: string, clubSlug?: ClubSlug) {
  const derby = clubSlug ? derbyName(clubSlug, opponent) : null;
  const tag = derby ? `${derby}: ` : "";
  if (gf > ga) {
    if (derby) return `${tag}${clubName} faz história e bate o ${opponent} por ${gf}x${ga}`;
    if (gf - ga >= 3) return `${clubName} aplica goleada de ${gf}x${ga} no ${opponent} e empolga torcida`;
    return `${clubName} vence o ${opponent} por ${gf}x${ga} e mantém boa fase`;
  }
  if (gf < ga) {
    if (derby) return `${tag}${clubName} sofre revés doloroso para o ${opponent} (${ga}x${gf})`;
    if (ga - gf >= 3) return `${clubName} é atropelado pelo ${opponent} em ${ga}x${gf} e cria crise`;
    return `${clubName} tropeça diante do ${opponent} e acende alerta (${ga}x${gf})`;
  }
  if (derby) return `${tag}${clubName} e ${opponent} ficam no ${gf}x${ga} em duelo eletrizante`;
  return `${clubName} empata em ${gf}x${ga} com o ${opponent} e divide opiniões`;
}

export function fanReaction(gf: number, ga: number, derby = false) {
  if (gf > ga) {
    if (derby) return "🏟️ Delírio total nas arquibancadas — clássico vencido entra para a história da torcida!";
    if (gf - ga >= 3) return "🏟️ Festa de gala: a torcida sai do estádio em êxtase, cantando até o estacionamento.";
    return "🏟️ Festa nas arquibancadas: torcida sai cantando do estádio.";
  }
  if (gf < ga) {
    if (derby) return "🏟️ Silêncio sepulcral. Perder clássico em casa machuca de um jeito diferente.";
    if (ga - gf >= 3) return "🏟️ Vaias ensurdecedoras e gritos de revolta. A pressão explodiu.";
    return "🏟️ Vaias no apito final. A pressão sobre o vestiário aumenta.";
  }
  if (derby) return "🏟️ Empate em clássico tem gosto de pouco — a torcida queria os três pontos.";
  return "🏟️ Clima morno: a torcida esperava mais.";
}

export interface PostMatchPressContext {
  clubName: string;
  opponent: string;
  gf: number;
  ga: number;
  scorers: string;
  assists: string;
  home: boolean;
  position: number;
  clubSlug?: ClubSlug;
}

export function postMatchPressQuestions(ctx: PostMatchPressContext): string[] {
  const { clubName, opponent, gf, ga, scorers, assists, home, position, clubSlug } = ctx;
  const local = home ? "em casa" : "como visitante";
  const result: "V" | "E" | "D" = gf > ga ? "V" : gf < ga ? "D" : "E";
  const diff = Math.abs(gf - ga);
  const topScorer = scorers.split(",").map((s) => s.trim()).filter(Boolean)[0];
  const topAssist = assists.split(",").map((s) => s.trim()).filter(Boolean)[0];
  const derby = clubSlug ? isDerby(clubSlug, opponent) : false;
  const derbyLabel = clubSlug ? derbyName(clubSlug, opponent) : null;

  const questions: string[] = [];

  if (derby && derbyLabel) {
    if (result === "V") {
      questions.push(`Vencer ${derbyLabel} é sempre especial. O que essa vitória sobre o ${opponent} representa para o vestiário?`);
    } else if (result === "D") {
      questions.push(`Perder o ${derbyLabel} para o ${opponent} dói no orgulho da torcida. Como o senhor pretende reagir?`);
    } else {
      questions.push(`Empate em ${derbyLabel} costuma deixar gosto amargo. O ${clubName} podia ter ganho?`);
    }
  }

  if (result === "V") {
    if (diff >= 3) {
      questions.push(`Goleada de ${gf}x${ga} sobre o ${opponent} ${local}. O senhor já considera o ${clubName} candidato ao título?`);
    } else {
      questions.push(`Vitória apertada por ${gf}x${ga} contra o ${opponent}. Faltou capricho para liquidar o jogo antes?`);
    }
    if (topScorer) {
      questions.push(`${topScorer} voltou a decidir. O senhor enxerga nele a referência ofensiva da temporada?`);
    } else {
      questions.push(`A vitória veio sem um nome de destaque no ataque. Falta um goleador de ofício no elenco?`);
    }
    questions.push(`Com este resultado o ${clubName} sobe para a ${position}ª posição. É hora de mirar mais alto na tabela?`);
  } else if (result === "D") {
    if (diff >= 3) {
      questions.push(`Derrota dura por ${ga}x${gf} ${local} para o ${opponent}. O senhor sente que perdeu o controle do vestiário?`);
    } else {
      questions.push(`O ${clubName} foi superado por ${ga}x${gf}. Onde o jogo se perdeu na sua leitura?`);
    }
    questions.push(`A torcida vaiou no apito final. Como o senhor pretende reconquistar o apoio até a próxima rodada?`);
    questions.push(`Caindo para a ${position}ª colocação, há risco de o projeto ser questionado pela diretoria?`);
  } else {
    questions.push(`Empate em ${gf}x${ga} ${local} contra o ${opponent}. O resultado é justo pelo que se viu em campo?`);
    questions.push(`O ${clubName} segue na ${position}ª posição. Esse ponto soma ou atrapalha os planos?`);
    if (topScorer) {
      questions.push(`${topScorer} marcou, mas a equipe não venceu. Faltou ajuda do meio-campo?`);
    } else {
      questions.push(`Mais um jogo sem brilho ofensivo. O sistema de jogo precisa mudar?`);
    }
  }

  if (topAssist && topAssist !== topScorer) {
    questions.push(`A jogada de ${topAssist} chamou atenção. Ele está pronto para assumir um papel de protagonista?`);
  }

  return questions;
}

export function postMatchPressIntro(ctx: PostMatchPressContext): string {
  const { clubName, opponent, gf, ga, clubSlug } = ctx;
  const result: "V" | "E" | "D" = gf > ga ? "V" : gf < ga ? "D" : "E";
  const derby = clubSlug ? derbyName(clubSlug, opponent) : null;
  const prefix = derby ? `Após o ${derby}, ` : "";
  if (result === "V") {
    return `🎤 ${prefix}sala de imprensa lotada após a vitória do ${clubName} sobre o ${opponent} por ${gf}x${ga}. Os repórteres aguardam o técnico no púlpito.`;
  }
  if (result === "D") {
    return `🎤 ${prefix}clima tenso na sala de imprensa após a derrota para o ${opponent} por ${ga}x${gf}. As primeiras perguntas vêm carregadas.`;
  }
  return `🎤 ${prefix}sala de imprensa morna após o empate em ${gf}x${ga} contra o ${opponent}. Os jornalistas querem respostas.`;
}
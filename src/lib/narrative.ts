import { CLUBS, type ClubSlug } from "@/data/clubs";

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

export function postMatchHeadline(opponent: string, gf: number, ga: number, clubName: string) {
  if (gf > ga) return `${clubName} vence ${opponent} por ${gf}x${ga} e se firma na temporada`;
  if (gf < ga) return `${clubName} é derrotado pelo ${opponent} por ${ga}x${gf} e acende alerta`;
  return `${clubName} empata em ${gf}x${ga} contra o ${opponent} e divide opiniões`;
}

export function fanReaction(gf: number, ga: number) {
  if (gf > ga) return "🏟️ Festa nas arquibancadas: torcida sai cantando do estádio.";
  if (gf < ga) return "🏟️ Vaias no apito final. A pressão sobre o vestiário aumenta.";
  return "🏟️ Clima morno: a torcida esperava mais.";
}
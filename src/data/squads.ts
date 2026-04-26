import type { ClubSlug } from "./clubs";

export type Position = "GOL" | "ZAG" | "LAT" | "VOL" | "MEI" | "ATA";

export interface SeedPlayer {
  name: string;
  position: Position;
  overall: number;
  weeklyWage: number; // EUR
  marketValue: number; // EUR
}

const p = (name: string, position: Position, overall: number, marketValue: number, weeklyWage: number): SeedPlayer => ({
  name, position, overall, marketValue, weeklyWage,
});

export const SQUADS: Record<ClubSlug, SeedPlayer[]> = {
  palmeiras: [
    p("Vitor Roque", "ATA", 84, 35_000_000, 180_000),
    p("Jhon Arias", "MEI", 82, 22_000_000, 150_000),
    p("Andreas Pereira", "MEI", 81, 18_000_000, 140_000),
    p("Gustavo Gómez", "ZAG", 83, 12_000_000, 130_000),
    p("Joaquín Piquerez", "LAT", 81, 14_000_000, 120_000),
    p("Carlos Miguel", "GOL", 80, 12_000_000, 110_000),
    p("Agustín Giay", "LAT", 78, 10_000_000, 90_000),
    p("Paulinho", "ATA", 82, 18_000_000, 150_000),
    p("Flaco López", "ATA", 81, 16_000_000, 130_000),
    p("Marlon Freitas", "VOL", 79, 8_000_000, 95_000),
    p("Mauricio", "MEI", 78, 9_000_000, 90_000),
    p("Ramón Sosa", "ATA", 79, 12_000_000, 100_000),
    p("Allan", "MEI", 78, 7_000_000, 85_000),
    p("Emiliano Martínez", "VOL", 78, 8_000_000, 90_000),
    p("Lucas Evangelista", "MEI", 77, 6_000_000, 80_000),
  ],
  flamengo: [
    p("Lucas Paquetá", "MEI", 86, 45_000_000, 280_000),
    p("Giorgian de Arrascaeta", "MEI", 85, 22_000_000, 220_000),
    p("Pedro", "ATA", 84, 28_000_000, 220_000),
    p("Samuel Lino", "ATA", 82, 25_000_000, 180_000),
    p("Vitão", "ZAG", 80, 14_000_000, 130_000),
    p("Léo Ortiz", "ZAG", 80, 12_000_000, 120_000),
    p("Léo Pereira", "ZAG", 81, 14_000_000, 130_000),
    p("Ayrton Lucas", "LAT", 80, 12_000_000, 120_000),
    p("Emerson Royal", "LAT", 80, 14_000_000, 140_000),
    p("Gustavo Gómez", "ZAG", 80, 10_000_000, 110_000),
    p("Erick Pulgar", "VOL", 79, 9_000_000, 110_000),
    p("Nicolás de la Cruz", "MEI", 82, 18_000_000, 170_000),
    p("Jorge Carrascal", "MEI", 80, 15_000_000, 140_000),
    p("Agustín Rossi", "GOL", 81, 10_000_000, 110_000),
    p("Andrew", "VOL", 76, 5_000_000, 70_000),
  ],
  "real-madrid": [
    p("Kylian Mbappé", "ATA", 92, 180_000_000, 1_200_000),
    p("Vinícius Júnior", "ATA", 91, 150_000_000, 950_000),
    p("Jude Bellingham", "MEI", 90, 180_000_000, 800_000),
    p("Federico Valverde", "MEI", 88, 100_000_000, 500_000),
    p("Thibaut Courtois", "GOL", 89, 35_000_000, 450_000),
    p("Éder Militão", "ZAG", 86, 65_000_000, 350_000),
    p("Trent Alexander-Arnold", "LAT", 88, 70_000_000, 500_000),
    p("Aurélien Tchouaméni", "VOL", 86, 80_000_000, 400_000),
    p("Arda Güler", "MEI", 84, 60_000_000, 220_000),
    p("Rodrygo", "ATA", 87, 90_000_000, 450_000),
    p("Andriy Lunin", "GOL", 81, 18_000_000, 200_000),
    p("Álvaro Carreras", "LAT", 82, 35_000_000, 250_000),
    p("Dean Huijsen", "ZAG", 84, 60_000_000, 280_000),
    p("Brahim Díaz", "MEI", 83, 40_000_000, 250_000),
    p("Gonzalo García", "ATA", 80, 25_000_000, 150_000),
  ],
  barcelona: [
    p("Lamine Yamal", "ATA", 91, 200_000_000, 700_000),
    p("Robert Lewandowski", "ATA", 88, 25_000_000, 800_000),
    p("Pedri", "MEI", 89, 130_000_000, 500_000),
    p("Ferran Torres", "ATA", 83, 35_000_000, 350_000),
    p("Raphinha", "ATA", 87, 80_000_000, 500_000),
    p("Jules Koundé", "ZAG", 86, 60_000_000, 380_000),
    p("Pau Cubarsí", "ZAG", 86, 90_000_000, 250_000),
    p("João Cancelo", "LAT", 84, 30_000_000, 380_000),
    p("Alejandro Balde", "LAT", 84, 50_000_000, 250_000),
    p("Marc-André ter Stegen", "GOL", 87, 18_000_000, 500_000),
    p("Gavi", "MEI", 85, 70_000_000, 300_000),
    p("Frenkie de Jong", "MEI", 85, 50_000_000, 450_000),
    p("Dani Olmo", "MEI", 85, 50_000_000, 350_000),
    p("Fermín López", "MEI", 83, 40_000_000, 220_000),
    p("Marcus Rashford", "ATA", 84, 45_000_000, 450_000),
  ],
  "manchester-city": [
    p("Erling Haaland", "ATA", 92, 200_000_000, 950_000),
    p("Phil Foden", "MEI", 88, 130_000_000, 550_000),
    p("Rodri", "VOL", 91, 130_000_000, 600_000),
    p("Gianluigi Donnarumma", "GOL", 89, 50_000_000, 500_000),
    p("Joško Gvardiol", "ZAG", 86, 80_000_000, 400_000),
    p("Rúben Dias", "ZAG", 87, 75_000_000, 450_000),
    p("Jérémy Doku", "ATA", 84, 60_000_000, 300_000),
    p("Bernardo Silva", "MEI", 87, 60_000_000, 500_000),
    p("Tijjani Reijnders", "MEI", 85, 70_000_000, 350_000),
    p("Nico O'Reilly", "MEI", 80, 30_000_000, 180_000),
    p("Rayan Cherki", "MEI", 84, 55_000_000, 280_000),
    p("Antoine Semenyo", "ATA", 83, 50_000_000, 250_000),
    p("Omar Marmoush", "ATA", 84, 55_000_000, 280_000),
    p("Matheus Nunes", "MEI", 81, 30_000_000, 220_000),
    p("Rico Lewis", "LAT", 81, 35_000_000, 200_000),
  ],
  liverpool: [
    p("Florian Wirtz", "MEI", 89, 130_000_000, 500_000),
    p("Mohamed Salah", "ATA", 90, 60_000_000, 800_000),
    p("Alexander Isak", "ATA", 88, 110_000_000, 500_000),
    p("Ryan Gravenberch", "VOL", 85, 60_000_000, 300_000),
    p("Dominik Szoboszlai", "MEI", 85, 70_000_000, 320_000),
    p("Ibrahima Konaté", "ZAG", 85, 50_000_000, 350_000),
    p("Hugo Ekitiké", "ATA", 84, 65_000_000, 280_000),
    p("Cody Gakpo", "ATA", 84, 55_000_000, 280_000),
    p("Miloš Kerkez", "LAT", 82, 45_000_000, 220_000),
    p("Jeremie Frimpong", "LAT", 83, 45_000_000, 250_000),
    p("Alisson", "GOL", 89, 35_000_000, 480_000),
    p("Giorgi Mamardashvili", "GOL", 83, 30_000_000, 220_000),
    p("Andrew Robertson", "LAT", 84, 25_000_000, 380_000),
    p("Conor Bradley", "LAT", 81, 30_000_000, 180_000),
    p("Alexis Mac Allister", "MEI", 86, 70_000_000, 400_000),
  ],
};

export interface MarketSeedPlayer {
  name: string;
  position: Position;
  overall: number;
  marketValue: number;
  expectedWage: number;
  region: string;
  currentClub: string;
}

// Helper para gerar overall e salário aproximados a partir do valor de mercado.
const ovrFromValue = (eur: number) => {
  if (eur >= 50_000_000) return 86;
  if (eur >= 25_000_000) return 84;
  if (eur >= 18_000_000) return 82;
  if (eur >= 12_000_000) return 80;
  if (eur >= 7_000_000) return 78;
  if (eur >= 3_000_000) return 75;
  return 72;
};
const wageFromValue = (eur: number) => Math.max(40_000, Math.round(eur * 0.012));

const m = (
  name: string,
  position: Position,
  marketValue: number,
  currentClub: string,
  region = "Brasil",
): MarketSeedPlayer => ({
  name,
  position,
  overall: ovrFromValue(marketValue),
  marketValue,
  expectedWage: wageFromValue(marketValue),
  region,
  currentClub,
});

// Lista oficial do mercado (substitui qualquer versão anterior).
// Duplicatas foram removidas, mantendo a entrada com maior valor de mercado.
export const MARKET_SEED: MarketSeedPlayer[] = [
  m("Estêvão",                "ATA", 50_000_000, "Chelsea",            "Inglaterra"),
  m("Endrick",                "ATA", 20_000_000, "Lyon",               "França"),
  m("Vitor Roque",            "ATA", 35_000_000, "Palmeiras",          "Brasil"),
  m("Thiago Almada",          "MEI", 27_000_000, "Atlético de Madrid", "Espanha"),
  m("Rayan",                  "ATA", 25_000_000, "Bournemouth",        "Inglaterra"),
  m("Luiz Henrique",          "ATA", 22_000_000, "Zenit",              "Rússia"),
  m("Danilo",                 "VOL", 22_000_000, "Flamengo",           "Brasil"),
  m("Yuri Alberto",           "ATA", 22_000_000, "Corinthians",        "Brasil"),
  m("Kaio Jorge",             "ATA", 22_000_000, "Cruzeiro",           "Brasil"),
  m("Flaco López",            "MEI", 20_000_000, "Palmeiras",          "Brasil"),
  m("Samuel Lino",            "ATA", 20_000_000, "Atlético de Madrid", "Espanha"),
  m("Nico de la Cruz",        "MEI", 18_000_000, "Flamengo",           "Brasil"),
  m("Gerson",                 "MEI", 18_000_000, "Cruzeiro",           "Brasil"),
  m("Pedro",                  "ATA", 18_000_000, "Flamengo",           "Brasil"),
  m("Raphael Veiga",          "MEI", 17_000_000, "Club América",       "México"),
  m("Paulinho",               "ATA", 17_000_000, "Palmeiras",          "Brasil"),
  m("Jhon Arias",             "ATA", 16_000_000, "Palmeiras",          "Brasil"),
  m("Yan Couto",              "LAT", 15_000_000, "Girona",             "Espanha"),
  m("Igor Jesus",             "ATA", 15_000_000, "Bournemouth",        "Inglaterra"),
  m("Andreas Pereira",        "MEI", 15_000_000, "Palmeiras",          "Brasil"),
  m("Léo Ortiz",              "ZAG", 15_000_000, "Flamengo",           "Brasil"),
  m("Giorgian de Arrascaeta", "MEI", 15_000_000, "Flamengo",           "Brasil"),
  m("Marcos Leonardo",        "ATA", 14_000_000, "Benfica",            "Portugal"),
  m("Zaracho",                "VOL", 14_000_000, "Atlético Mineiro",   "Brasil"),
  m("Arana",                  "LAT", 14_000_000, "Atlético Mineiro",   "Brasil"),
  m("Vitor Reis",             "ZAG", 14_000_000, "Sevilla",            "Espanha"),
  m("Breno Bidon",            "MEI", 14_000_000, "Corinthians",        "Brasil"),
  m("Martinelli",             "VOL", 14_000_000, "Fluminense",         "Brasil"),
  m("Joaquín Piquerez",       "LAT", 14_000_000, "Palmeiras",          "Brasil"),
  m("Matheus Pereira",        "MEI", 14_000_000, "Cruzeiro",           "Brasil"),
  m("Ângelo Gabriel",         "ATA", 13_000_000, "Al-Nassr",           "Arábia Saudita"),
  m("Facundo Torres",         "ATA", 13_000_000, "Fluminense",         "Brasil"),
  m("Mauricio",               "MEI", 12_000_000, "Palmeiras",          "Brasil"),
  m("Rodrigo Garro",          "MEI", 12_000_000, "Corinthians",        "Brasil"),
  m("Renan Lodi",             "LAT", 12_000_000, "Al-Duhail",          "Catar"),
  m("Luis Sinisterra",        "ATA", 12_000_000, "Bournemouth",        "Inglaterra"),
  m("Fabrício Bruno",         "ZAG", 12_000_000, "Cruzeiro",           "Brasil"),
  m("Jean Lucas",             "MEI", 12_000_000, "Bahia",              "Brasil"),
  m("Gabriel Carvalho",       "MEI",  9_000_000, "Internacional",      "Brasil"),
  m("Hugo Souza",             "GOL",  8_000_000, "Corinthians",        "Brasil"),
  m("John",                   "GOL",  7_000_000, "Botafogo",           "Brasil"),
  m("Marlon Freitas",         "VOL",  7_000_000, "Palmeiras",          "Brasil"),
  m("Gregore",                "VOL",  6_000_000, "Botafogo",           "Brasil"),
  m("Bernabei",               "LAT",  6_000_000, "Internacional",      "Brasil"),
  m("Alexander Barboza",      "ZAG",  5_000_000, "Botafogo",           "Brasil"),
  m("Rômulo",                 "VOL",  4_000_000, "Internacional",      "Brasil"),
  m("Rodrigo Sam",            "ZAG",    350_000, "Mirassol",           "Brasil"),
  // ===== Adições — Goleiros =====
  m("Alisson Becker",         "GOL", 35_000_000, "Liverpool",          "Inglaterra"),
  m("Ederson Moraes",         "GOL", 30_000_000, "Manchester City",    "Inglaterra"),
  m("Jordan Pickford",        "GOL", 25_000_000, "Everton",            "Inglaterra"),
  m("David Raya",             "GOL", 22_000_000, "Arsenal",            "Inglaterra"),
  m("Mark Travers",           "GOL", 15_000_000, "AFC Bournemouth",    "Inglaterra"),
  m("Bento",                  "GOL", 10_000_000, "Athletico Paranaense", "Brasil"),
  // ===== Adições — Zagueiros =====
  m("Virgil van Dijk",        "ZAG", 45_000_000, "Liverpool",          "Inglaterra"),
  m("Gabriel Magalhães",      "ZAG", 40_000_000, "Arsenal",            "Inglaterra"),
  m("Joachim Andersen",       "ZAG", 30_000_000, "Fulham",             "Inglaterra"),
  m("Marc Cucurella",         "ZAG", 25_000_000, "Chelsea",            "Inglaterra"),
  m("Nicolás Otamendi",       "ZAG",  8_000_000, "Manchester City",    "Inglaterra"),
  // ===== Adições — Laterais =====
  m("Trent Alexander-Arnold", "LAT", 80_000_000, "Liverpool",          "Inglaterra"),
  m("Myles Lewis-Skelly",     "LAT", 40_000_000, "Arsenal",            "Inglaterra"),
  m("Jorrel Hato",            "LAT", 38_000_000, "Chelsea",            "Inglaterra"),
  m("Luke Shaw",              "LAT", 35_000_000, "Manchester United",  "Inglaterra"),
  m("Ayrton Lucas",           "LAT", 14_000_000, "Flamengo",           "Brasil"),
  // ===== Adições — Meias / Meio-campistas =====
  m("Declan Rice",            "VOL",120_000_000, "Arsenal",            "Inglaterra"),
  m("Moisés Caicedo",         "VOL",110_000_000, "Chelsea",            "Inglaterra"),
  m("Cole Palmer",            "MEI",110_000_000, "Chelsea",            "Inglaterra"),
  m("Bruno Guimarães",        "VOL", 80_000_000, "Newcastle",          "Inglaterra"),
  m("Bruno Fernandes",        "MEI", 80_000_000, "Manchester United",  "Inglaterra"),
  m("Douglas Luiz",           "VOL", 45_000_000, "Aston Villa",        "Inglaterra"),
  m("Lucas Paquetá",          "MEI", 35_000_000, "Flamengo",           "Brasil"),
  m("André",                  "VOL", 18_000_000, "Fluminense",         "Brasil"),
  m("João Gomes",             "VOL", 16_000_000, "Flamengo",           "Brasil"),
];

// Sentinela: garante que a edição não quebrou a lista.
export const MARKET_SEED_COUNT = MARKET_SEED.length;
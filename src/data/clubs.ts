export type ClubSlug =
  | "palmeiras"
  | "flamengo"
  | "real-madrid"
  | "barcelona"
  | "manchester-city"
  | "liverpool";

export interface ClubInfo {
  slug: ClubSlug;
  name: string;
  shortName: string;
  country: string;
  flag: string;
  badge: string; // emoji ou inicial
  league: string;
  primary: string; // hex/oklch para gradiente
  secondary: string;
  rivals: string[]; // adversários da liga
  budgetEur: number;
}

export const CLUBS: Record<ClubSlug, ClubInfo> = {
  palmeiras: {
    slug: "palmeiras",
    name: "Palmeiras",
    shortName: "PAL",
    country: "Brasil",
    flag: "🇧🇷",
    badge: "🌴",
    league: "Brasileirão",
    primary: "#006437",
    secondary: "#ffffff",
    rivals: [
      "Corinthians", "São Paulo", "Santos", "Flamengo", "Fluminense",
      "Botafogo", "Vasco", "Atlético-MG", "Cruzeiro", "Internacional",
      "Grêmio", "Bahia", "Fortaleza", "Athletico-PR", "Bragantino",
    ],
    budgetEur: 80_000_000,
  },
  flamengo: {
    slug: "flamengo",
    name: "Flamengo",
    shortName: "FLA",
    country: "Brasil",
    flag: "🇧🇷",
    badge: "🦅",
    league: "Brasileirão",
    primary: "#d40000",
    secondary: "#000000",
    rivals: [
      "Fluminense", "Vasco", "Botafogo", "Palmeiras", "Corinthians",
      "São Paulo", "Santos", "Atlético-MG", "Cruzeiro", "Internacional",
      "Grêmio", "Bahia", "Fortaleza", "Athletico-PR", "Bragantino",
    ],
    budgetEur: 90_000_000,
  },
  "real-madrid": {
    slug: "real-madrid",
    name: "Real Madrid",
    shortName: "RMA",
    country: "Espanha",
    flag: "🇪🇸",
    badge: "👑",
    league: "La Liga",
    primary: "#febd11",
    secondary: "#ffffff",
    rivals: [
      "Barcelona", "Atlético de Madrid", "Sevilla", "Real Sociedad", "Athletic Bilbao",
      "Valencia", "Villarreal", "Real Betis", "Girona", "Osasuna",
      "Celta", "Mallorca", "Getafe", "Las Palmas", "Rayo Vallecano",
    ],
    budgetEur: 250_000_000,
  },
  barcelona: {
    slug: "barcelona",
    name: "Barcelona",
    shortName: "BAR",
    country: "Espanha",
    flag: "🇪🇸",
    badge: "🔵",
    league: "La Liga",
    primary: "#a50044",
    secondary: "#004d98",
    rivals: [
      "Real Madrid", "Atlético de Madrid", "Sevilla", "Real Sociedad", "Athletic Bilbao",
      "Valencia", "Villarreal", "Real Betis", "Girona", "Osasuna",
      "Celta", "Mallorca", "Getafe", "Las Palmas", "Rayo Vallecano",
    ],
    budgetEur: 200_000_000,
  },
  "manchester-city": {
    slug: "manchester-city",
    name: "Manchester City",
    shortName: "MCI",
    country: "Inglaterra",
    flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿",
    badge: "🩵",
    league: "Premier League",
    primary: "#6CABDD",
    secondary: "#1c2c5b",
    rivals: [
      "Manchester United", "Liverpool", "Arsenal", "Chelsea", "Tottenham",
      "Newcastle", "Aston Villa", "West Ham", "Brighton", "Crystal Palace",
      "Fulham", "Brentford", "Bournemouth", "Wolves", "Nottingham Forest",
    ],
    budgetEur: 220_000_000,
  },
  liverpool: {
    slug: "liverpool",
    name: "Liverpool",
    shortName: "LIV",
    country: "Inglaterra",
    flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿",
    badge: "🔴",
    league: "Premier League",
    primary: "#c8102e",
    secondary: "#00b2a9",
    rivals: [
      "Manchester United", "Manchester City", "Arsenal", "Chelsea", "Tottenham",
      "Newcastle", "Aston Villa", "West Ham", "Brighton", "Crystal Palace",
      "Fulham", "Brentford", "Bournemouth", "Wolves", "Nottingham Forest",
    ],
    budgetEur: 200_000_000,
  },
};

export const CLUB_LIST = Object.values(CLUBS);
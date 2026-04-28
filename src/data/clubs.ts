export type ClubSlug =
  | "palmeiras"
  | "flamengo"
  | "corinthians"
  | "vasco"
  | "fluminense"
  | "cruzeiro";

export interface ClubInfo {
  slug: ClubSlug;
  name: string;
  shortName: string;
  country: string;
  flag: string;
  badge: string;
  league: string;
  primary: string;
  secondary: string;
  rivals: string[];
  budgetEur: number;
}

const BR_RIVALS = [
  "Palmeiras", "Flamengo", "Corinthians", "Vasco", "Fluminense", "Cruzeiro",
  "São Paulo", "Santos", "Botafogo", "Atlético-MG", "Internacional",
  "Grêmio", "Bahia", "Fortaleza", "Athletico-PR", "Bragantino",
];

const rivalsExcept = (self: string) => BR_RIVALS.filter((r) => r !== self);

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
    rivals: rivalsExcept("Palmeiras"),
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
    rivals: rivalsExcept("Flamengo"),
    budgetEur: 90_000_000,
  },
  corinthians: {
    slug: "corinthians",
    name: "Corinthians",
    shortName: "COR",
    country: "Brasil",
    flag: "🇧🇷",
    badge: "⚫",
    league: "Brasileirão",
    primary: "#000000",
    secondary: "#ffffff",
    rivals: rivalsExcept("Corinthians"),
    budgetEur: 70_000_000,
  },
  vasco: {
    slug: "vasco",
    name: "Vasco da Gama",
    shortName: "VAS",
    country: "Brasil",
    flag: "🇧🇷",
    badge: "⚓",
    league: "Brasileirão",
    primary: "#000000",
    secondary: "#ffffff",
    rivals: rivalsExcept("Vasco"),
    budgetEur: 55_000_000,
  },
  fluminense: {
    slug: "fluminense",
    name: "Fluminense",
    shortName: "FLU",
    country: "Brasil",
    flag: "🇧🇷",
    badge: "🟢",
    league: "Brasileirão",
    primary: "#7a0019",
    secondary: "#006437",
    rivals: rivalsExcept("Fluminense"),
    budgetEur: 60_000_000,
  },
  cruzeiro: {
    slug: "cruzeiro",
    name: "Cruzeiro",
    shortName: "CRU",
    country: "Brasil",
    flag: "🇧🇷",
    badge: "✝️",
    league: "Brasileirão",
    primary: "#003da5",
    secondary: "#ffffff",
    rivals: rivalsExcept("Cruzeiro"),
    budgetEur: 65_000_000,
  },
};

export const CLUB_LIST = Object.values(CLUBS);

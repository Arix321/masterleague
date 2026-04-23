export function formatEur(value: number): string {
  if (value >= 1_000_000) return `€${(value / 1_000_000).toFixed(value % 1_000_000 === 0 ? 0 : 1)}M`;
  if (value >= 1_000) return `€${(value / 1_000).toFixed(0)}k`;
  return `€${value}`;
}

export function ordinal(n: number, lang = "pt"): string {
  if (lang === "pt") return `${n}º`;
  return `${n}`;
}
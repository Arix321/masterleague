import { createContext, useContext } from "react";
import type { ClubInfo } from "@/data/clubs";

export interface CareerData {
  id: string;
  user_id: string;
  manager_name: string;
  club_name: string;
  club_slug: string;
  season: number;
  matchday: number;
  cash_eur: number;
  weekly_wages_eur: number;
  league_position: number;
  points: number;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goals_for: number;
  goals_against: number;
  intro_done: boolean;
  next_opponent: string | null;
  transfer_window_open: boolean;
  transfer_window_closes_at: number;
}

export interface CareerContextValue {
  career: CareerData;
  club: ClubInfo;
  refresh: () => Promise<void>;
}

export const CareerContext = createContext<CareerContextValue | undefined>(undefined);

export function useCareer() {
  const ctx = useContext(CareerContext);
  if (!ctx) throw new Error("useCareer must be used inside CareerProvider");
  return ctx;
}
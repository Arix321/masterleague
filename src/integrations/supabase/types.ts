export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      careers: {
        Row: {
          cash_eur: number
          club_name: string
          club_slug: string
          created_at: string
          draws: number
          goals_against: number
          goals_for: number
          id: string
          intro_done: boolean
          league_position: number
          losses: number
          manager_name: string
          matchday: number
          next_opponent: string | null
          played: number
          points: number
          season: number
          updated_at: string
          user_id: string
          weekly_wages_eur: number
          wins: number
        }
        Insert: {
          cash_eur?: number
          club_name: string
          club_slug: string
          created_at?: string
          draws?: number
          goals_against?: number
          goals_for?: number
          id?: string
          intro_done?: boolean
          league_position?: number
          losses?: number
          manager_name: string
          matchday?: number
          next_opponent?: string | null
          played?: number
          points?: number
          season?: number
          updated_at?: string
          user_id: string
          weekly_wages_eur?: number
          wins?: number
        }
        Update: {
          cash_eur?: number
          club_name?: string
          club_slug?: string
          created_at?: string
          draws?: number
          goals_against?: number
          goals_for?: number
          id?: string
          intro_done?: boolean
          league_position?: number
          losses?: number
          manager_name?: string
          matchday?: number
          next_opponent?: string | null
          played?: number
          points?: number
          season?: number
          updated_at?: string
          user_id?: string
          weekly_wages_eur?: number
          wins?: number
        }
        Relationships: []
      }
      market_players: {
        Row: {
          career_id: string
          created_at: string
          expected_wage_eur: number
          id: string
          market_value_eur: number
          name: string
          overall: number
          position: string
          region: string
          user_id: string
        }
        Insert: {
          career_id: string
          created_at?: string
          expected_wage_eur?: number
          id?: string
          market_value_eur: number
          name: string
          overall?: number
          position?: string
          region?: string
          user_id: string
        }
        Update: {
          career_id?: string
          created_at?: string
          expected_wage_eur?: number
          id?: string
          market_value_eur?: number
          name?: string
          overall?: number
          position?: string
          region?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "market_players_career_id_fkey"
            columns: ["career_id"]
            isOneToOne: false
            referencedRelation: "careers"
            referencedColumns: ["id"]
          },
        ]
      }
      matches: {
        Row: {
          assists: string | null
          career_id: string
          created_at: string
          goals_against: number
          goals_for: number
          home: boolean
          id: string
          league_position_after: number | null
          matchday: number
          opponent: string
          result: string
          scorers: string | null
          user_id: string
        }
        Insert: {
          assists?: string | null
          career_id: string
          created_at?: string
          goals_against?: number
          goals_for?: number
          home?: boolean
          id?: string
          league_position_after?: number | null
          matchday: number
          opponent: string
          result?: string
          scorers?: string | null
          user_id: string
        }
        Update: {
          assists?: string | null
          career_id?: string
          created_at?: string
          goals_against?: number
          goals_for?: number
          home?: boolean
          id?: string
          league_position_after?: number | null
          matchday?: number
          opponent?: string
          result?: string
          scorers?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "matches_career_id_fkey"
            columns: ["career_id"]
            isOneToOne: false
            referencedRelation: "careers"
            referencedColumns: ["id"]
          },
        ]
      }
      news_feed: {
        Row: {
          body: string | null
          career_id: string
          created_at: string
          id: string
          kind: string
          title: string
          user_id: string
        }
        Insert: {
          body?: string | null
          career_id: string
          created_at?: string
          id?: string
          kind?: string
          title: string
          user_id: string
        }
        Update: {
          body?: string | null
          career_id?: string
          created_at?: string
          id?: string
          kind?: string
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "news_feed_career_id_fkey"
            columns: ["career_id"]
            isOneToOne: false
            referencedRelation: "careers"
            referencedColumns: ["id"]
          },
        ]
      }
      squad_players: {
        Row: {
          assists: number
          career_id: string
          club_slug: string
          created_at: string
          goals: number
          id: string
          injured: boolean
          market_value_eur: number
          morale: number
          name: string
          overall: number
          position: string
          user_id: string
          weekly_wage_eur: number
        }
        Insert: {
          assists?: number
          career_id: string
          club_slug: string
          created_at?: string
          goals?: number
          id?: string
          injured?: boolean
          market_value_eur?: number
          morale?: number
          name: string
          overall?: number
          position?: string
          user_id: string
          weekly_wage_eur?: number
        }
        Update: {
          assists?: number
          career_id?: string
          club_slug?: string
          created_at?: string
          goals?: number
          id?: string
          injured?: boolean
          market_value_eur?: number
          morale?: number
          name?: string
          overall?: number
          position?: string
          user_id?: string
          weekly_wage_eur?: number
        }
        Relationships: [
          {
            foreignKeyName: "squad_players_career_id_fkey"
            columns: ["career_id"]
            isOneToOne: false
            referencedRelation: "careers"
            referencedColumns: ["id"]
          },
        ]
      }
      transfer_offers: {
        Row: {
          bonus_eur: number
          career_id: string
          club_response: string | null
          contract_years: number
          created_at: string
          direction: string
          fee_eur: number
          id: string
          other_club: string
          player_id: string | null
          player_name: string
          player_response: string | null
          status: string
          user_id: string
          wage_eur: number
        }
        Insert: {
          bonus_eur?: number
          career_id: string
          club_response?: string | null
          contract_years?: number
          created_at?: string
          direction: string
          fee_eur?: number
          id?: string
          other_club: string
          player_id?: string | null
          player_name: string
          player_response?: string | null
          status?: string
          user_id: string
          wage_eur?: number
        }
        Update: {
          bonus_eur?: number
          career_id?: string
          club_response?: string | null
          contract_years?: number
          created_at?: string
          direction?: string
          fee_eur?: number
          id?: string
          other_club?: string
          player_id?: string | null
          player_name?: string
          player_response?: string | null
          status?: string
          user_id?: string
          wage_eur?: number
        }
        Relationships: [
          {
            foreignKeyName: "transfer_offers_career_id_fkey"
            columns: ["career_id"]
            isOneToOne: false
            referencedRelation: "careers"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const

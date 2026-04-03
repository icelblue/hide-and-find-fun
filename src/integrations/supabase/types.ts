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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      error_logs: {
        Row: {
          component: string | null
          created_at: string
          error_message: string
          error_stack: string | null
          id: string
          metadata: Json | null
          url: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          component?: string | null
          created_at?: string
          error_message: string
          error_stack?: string | null
          id?: string
          metadata?: Json | null
          url?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          component?: string | null
          created_at?: string
          error_message?: string
          error_stack?: string | null
          id?: string
          metadata?: Json | null
          url?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      game_moves: {
        Row: {
          action: Database["public"]["Enums"]["action_type"]
          bonus_value: string | null
          created_at: string
          found_bonus: Database["public"]["Enums"]["bonus_type"] | null
          found_object: boolean | null
          game_id: string
          hint_level: number | null
          id: string
          player_id: string
          target_item_id: string | null
          target_position: Database["public"]["Enums"]["position_type"] | null
          target_scenario_id: string | null
          token_cost: number
          turn_number: number
        }
        Insert: {
          action: Database["public"]["Enums"]["action_type"]
          bonus_value?: string | null
          created_at?: string
          found_bonus?: Database["public"]["Enums"]["bonus_type"] | null
          found_object?: boolean | null
          game_id: string
          hint_level?: number | null
          id?: string
          player_id: string
          target_item_id?: string | null
          target_position?: Database["public"]["Enums"]["position_type"] | null
          target_scenario_id?: string | null
          token_cost: number
          turn_number: number
        }
        Update: {
          action?: Database["public"]["Enums"]["action_type"]
          bonus_value?: string | null
          created_at?: string
          found_bonus?: Database["public"]["Enums"]["bonus_type"] | null
          found_object?: boolean | null
          game_id?: string
          hint_level?: number | null
          id?: string
          player_id?: string
          target_item_id?: string | null
          target_position?: Database["public"]["Enums"]["position_type"] | null
          target_scenario_id?: string | null
          token_cost?: number
          turn_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "game_moves_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_moves_target_item_id_fkey"
            columns: ["target_item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_moves_target_scenario_id_fkey"
            columns: ["target_scenario_id"]
            isOneToOne: false
            referencedRelation: "scenarios"
            referencedColumns: ["id"]
          },
        ]
      }
      game_players: {
        Row: {
          bonus_tokens_added: number
          created_at: string
          current_scenario_id: string | null
          game_id: string
          has_hidden: boolean
          hidden_item_id: string | null
          hidden_object_id: string | null
          hidden_position: Database["public"]["Enums"]["position_type"] | null
          id: string
          shield_active: boolean
          smoke_bomb_used: boolean
          social_item_used_today: boolean
          special_data: Json | null
          tokens_last_reset: string
          tokens_remaining: number
          user_id: string
        }
        Insert: {
          bonus_tokens_added?: number
          created_at?: string
          current_scenario_id?: string | null
          game_id: string
          has_hidden?: boolean
          hidden_item_id?: string | null
          hidden_object_id?: string | null
          hidden_position?: Database["public"]["Enums"]["position_type"] | null
          id?: string
          shield_active?: boolean
          smoke_bomb_used?: boolean
          social_item_used_today?: boolean
          special_data?: Json | null
          tokens_last_reset?: string
          tokens_remaining?: number
          user_id: string
        }
        Update: {
          bonus_tokens_added?: number
          created_at?: string
          current_scenario_id?: string | null
          game_id?: string
          has_hidden?: boolean
          hidden_item_id?: string | null
          hidden_object_id?: string | null
          hidden_position?: Database["public"]["Enums"]["position_type"] | null
          id?: string
          shield_active?: boolean
          smoke_bomb_used?: boolean
          social_item_used_today?: boolean
          special_data?: Json | null
          tokens_last_reset?: string
          tokens_remaining?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "game_players_current_scenario_id_fkey"
            columns: ["current_scenario_id"]
            isOneToOne: false
            referencedRelation: "scenarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_players_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_players_hidden_item_id_fkey"
            columns: ["hidden_item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_players_hidden_object_id_fkey"
            columns: ["hidden_object_id"]
            isOneToOne: false
            referencedRelation: "objects"
            referencedColumns: ["id"]
          },
        ]
      }
      game_social_items: {
        Row: {
          blocked_by_shield: boolean
          created_at: string
          from_player_id: string
          game_id: string
          id: string
          item_type: Database["public"]["Enums"]["social_item_type"]
          message_text: string | null
          processed: boolean
          to_player_id: string
        }
        Insert: {
          blocked_by_shield?: boolean
          created_at?: string
          from_player_id: string
          game_id: string
          id?: string
          item_type: Database["public"]["Enums"]["social_item_type"]
          message_text?: string | null
          processed?: boolean
          to_player_id: string
        }
        Update: {
          blocked_by_shield?: boolean
          created_at?: string
          from_player_id?: string
          game_id?: string
          id?: string
          item_type?: Database["public"]["Enums"]["social_item_type"]
          message_text?: string | null
          processed?: boolean
          to_player_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "game_social_items_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
        ]
      }
      games: {
        Row: {
          code: string
          created_at: string
          created_by: string
          id: string
          invited_user_id: string | null
          scenario_id: string | null
          status: Database["public"]["Enums"]["game_status"]
          updated_at: string
          winner_id: string | null
        }
        Insert: {
          code: string
          created_at?: string
          created_by: string
          id?: string
          invited_user_id?: string | null
          scenario_id?: string | null
          status?: Database["public"]["Enums"]["game_status"]
          updated_at?: string
          winner_id?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string
          id?: string
          invited_user_id?: string | null
          scenario_id?: string | null
          status?: Database["public"]["Enums"]["game_status"]
          updated_at?: string
          winner_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "games_scenario_id_fkey"
            columns: ["scenario_id"]
            isOneToOne: false
            referencedRelation: "scenarios"
            referencedColumns: ["id"]
          },
        ]
      }
      items: {
        Row: {
          display_order: number
          environment: Database["public"]["Enums"]["item_environment"]
          icon: string | null
          id: string
          inner_capacity: number
          name: string
          scenario_id: string
        }
        Insert: {
          display_order?: number
          environment?: Database["public"]["Enums"]["item_environment"]
          icon?: string | null
          id?: string
          inner_capacity?: number
          name: string
          scenario_id: string
        }
        Update: {
          display_order?: number
          environment?: Database["public"]["Enums"]["item_environment"]
          icon?: string | null
          id?: string
          inner_capacity?: number
          name?: string
          scenario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "items_scenario_id_fkey"
            columns: ["scenario_id"]
            isOneToOne: false
            referencedRelation: "scenarios"
            referencedColumns: ["id"]
          },
        ]
      }
      object_specials: {
        Row: {
          id: string
          object_id: string
          prompt_on: string
          prompt_text: string
          special_type: string
          variants: Json | null
        }
        Insert: {
          id?: string
          object_id: string
          prompt_on: string
          prompt_text: string
          special_type: string
          variants?: Json | null
        }
        Update: {
          id?: string
          object_id?: string
          prompt_on?: string
          prompt_text?: string
          special_type?: string
          variants?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "object_specials_object_id_fkey"
            columns: ["object_id"]
            isOneToOne: true
            referencedRelation: "objects"
            referencedColumns: ["id"]
          },
        ]
      }
      object_traits: {
        Row: {
          id: string
          object_id: string
          trait_number: number
          trait_text: string
        }
        Insert: {
          id?: string
          object_id: string
          trait_number: number
          trait_text: string
        }
        Update: {
          id?: string
          object_id?: string
          trait_number?: number
          trait_text?: string
        }
        Relationships: [
          {
            foreignKeyName: "object_traits_object_id_fkey"
            columns: ["object_id"]
            isOneToOne: false
            referencedRelation: "objects"
            referencedColumns: ["id"]
          },
        ]
      }
      objects: {
        Row: {
          display_order: number
          icon: string | null
          id: string
          material: Database["public"]["Enums"]["object_material"]
          name: string
          size: number
        }
        Insert: {
          display_order?: number
          icon?: string | null
          id?: string
          material?: Database["public"]["Enums"]["object_material"]
          name: string
          size?: number
        }
        Update: {
          display_order?: number
          icon?: string | null
          id?: string
          material?: Database["public"]["Enums"]["object_material"]
          name?: string
          size?: number
        }
        Relationships: []
      }
      player_inventory: {
        Row: {
          collected_at: string
          game_id: string | null
          gifted_at: string | null
          gifted_to: string | null
          id: string
          item_type: string
          item_value: string | null
          special_data: Json | null
          user_id: string
        }
        Insert: {
          collected_at?: string
          game_id?: string | null
          gifted_at?: string | null
          gifted_to?: string | null
          id?: string
          item_type: string
          item_value?: string | null
          special_data?: Json | null
          user_id: string
        }
        Update: {
          collected_at?: string
          game_id?: string | null
          gifted_at?: string | null
          gifted_to?: string | null
          id?: string
          item_type?: string
          item_value?: string | null
          special_data?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "player_inventory_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
        ]
      }
      player_rewards: {
        Row: {
          game_id: string | null
          id: string
          obtained_at: string
          reward_item_id: string
          status: string
          user_id: string
        }
        Insert: {
          game_id?: string | null
          id?: string
          obtained_at?: string
          reward_item_id: string
          status?: string
          user_id: string
        }
        Update: {
          game_id?: string | null
          id?: string
          obtained_at?: string
          reward_item_id?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "player_rewards_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_rewards_reward_item_id_fkey"
            columns: ["reward_item_id"]
            isOneToOne: false
            referencedRelation: "reward_items"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          best_streak: number
          bonus_tokens: number
          created_at: string
          current_streak: number
          display_name: string | null
          elo: number
          games_played: number
          games_won: number
          id: string
          league: Database["public"]["Enums"]["league_tier"]
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          best_streak?: number
          bonus_tokens?: number
          created_at?: string
          current_streak?: number
          display_name?: string | null
          elo?: number
          games_played?: number
          games_won?: number
          id?: string
          league?: Database["public"]["Enums"]["league_tier"]
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          best_streak?: number
          bonus_tokens?: number
          created_at?: string
          current_streak?: number
          display_name?: string | null
          elo?: number
          games_played?: number
          games_won?: number
          id?: string
          league?: Database["public"]["Enums"]["league_tier"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      reward_items: {
        Row: {
          icon: string
          id: string
          name: string
          placed_at: string | null
          placed_by: string | null
          placed_in_scenario_id: string | null
          rarity: Database["public"]["Enums"]["item_rarity"]
          sell_value: number
        }
        Insert: {
          icon: string
          id?: string
          name: string
          placed_at?: string | null
          placed_by?: string | null
          placed_in_scenario_id?: string | null
          rarity: Database["public"]["Enums"]["item_rarity"]
          sell_value?: number
        }
        Update: {
          icon?: string
          id?: string
          name?: string
          placed_at?: string | null
          placed_by?: string | null
          placed_in_scenario_id?: string | null
          rarity?: Database["public"]["Enums"]["item_rarity"]
          sell_value?: number
        }
        Relationships: [
          {
            foreignKeyName: "reward_items_placed_in_scenario_id_fkey"
            columns: ["placed_in_scenario_id"]
            isOneToOne: false
            referencedRelation: "scenarios"
            referencedColumns: ["id"]
          },
        ]
      }
      scenario_bonuses: {
        Row: {
          bonus_type: Database["public"]["Enums"]["bonus_type"]
          id: string
          item_id: string
          position: Database["public"]["Enums"]["position_type"]
          value: string | null
        }
        Insert: {
          bonus_type: Database["public"]["Enums"]["bonus_type"]
          id?: string
          item_id: string
          position: Database["public"]["Enums"]["position_type"]
          value?: string | null
        }
        Update: {
          bonus_type?: Database["public"]["Enums"]["bonus_type"]
          id?: string
          item_id?: string
          position?: Database["public"]["Enums"]["position_type"]
          value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scenario_bonuses_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
        ]
      }
      scenario_connections: {
        Row: {
          id: string
          scenario_a: string
          scenario_b: string
        }
        Insert: {
          id?: string
          scenario_a: string
          scenario_b: string
        }
        Update: {
          id?: string
          scenario_a?: string
          scenario_b?: string
        }
        Relationships: [
          {
            foreignKeyName: "scenario_connections_scenario_a_fkey"
            columns: ["scenario_a"]
            isOneToOne: false
            referencedRelation: "scenarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scenario_connections_scenario_b_fkey"
            columns: ["scenario_b"]
            isOneToOne: false
            referencedRelation: "scenarios"
            referencedColumns: ["id"]
          },
        ]
      }
      scenarios: {
        Row: {
          created_at: string
          display_order: number
          icon: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          icon: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          display_order?: number
          icon?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      wall_messages: {
        Row: {
          author_user_id: string
          created_at: string
          id: string
          message: string
          target_user_id: string
        }
        Insert: {
          author_user_id: string
          created_at?: string
          id?: string
          message: string
          target_user_id: string
        }
        Update: {
          author_user_id?: string
          created_at?: string
          id?: string
          message?: string
          target_user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_player_in_game: {
        Args: { _game_id: string; _user_id: string }
        Returns: boolean
      }
      place_reward_item: {
        Args: { _player_reward_id: string; _scenario_id: string }
        Returns: undefined
      }
      sell_reward_item: { Args: { _player_reward_id: string }; Returns: number }
    }
    Enums: {
      action_type: "move" | "look" | "confirm"
      bonus_type: "extra_token" | "hint_yes" | "hint_no"
      game_status: "waiting" | "hiding" | "playing" | "finished"
      item_environment:
        | "generic"
        | "wet"
        | "hot"
        | "dirty"
        | "outdoor"
        | "frozen"
        | "sorrenc"
        | "ventós"
        | "submergit"
        | "químic"
      item_rarity: "common" | "uncommon" | "rare" | "epic" | "legendary"
      league_tier: "bronze" | "silver" | "gold" | "platinum" | "diamond"
      object_material:
        | "generic"
        | "paper"
        | "glass"
        | "metal"
        | "plastic"
        | "fabric"
        | "wood"
        | "cardboard"
        | "rubber"
        | "ceramic"
        | "electronic"
        | "leather"
        | "stone"
      position_type: "sobre" | "sota" | "dins"
      social_item_type:
        | "banana"
        | "smoke_bomb"
        | "false_clue"
        | "shield"
        | "message"
        | "espia"
        | "swap"
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
    Enums: {
      action_type: ["move", "look", "confirm"],
      bonus_type: ["extra_token", "hint_yes", "hint_no"],
      game_status: ["waiting", "hiding", "playing", "finished"],
      item_environment: [
        "generic",
        "wet",
        "hot",
        "dirty",
        "outdoor",
        "frozen",
        "sorrenc",
        "ventós",
        "submergit",
        "químic",
      ],
      item_rarity: ["common", "uncommon", "rare", "epic", "legendary"],
      league_tier: ["bronze", "silver", "gold", "platinum", "diamond"],
      object_material: [
        "generic",
        "paper",
        "glass",
        "metal",
        "plastic",
        "fabric",
        "wood",
        "cardboard",
        "rubber",
        "ceramic",
        "electronic",
        "leather",
        "stone",
      ],
      position_type: ["sobre", "sota", "dins"],
      social_item_type: [
        "banana",
        "smoke_bomb",
        "false_clue",
        "shield",
        "message",
        "espia",
        "swap",
      ],
    },
  },
} as const

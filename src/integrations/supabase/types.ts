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
      daily_challenge_log: {
        Row: {
          challenge_date: string
          choice_id: string
          completed_at: string
          id: string
          node_id: string
          reward_type: string | null
          reward_value: Json | null
          user_id: string
        }
        Insert: {
          challenge_date: string
          choice_id: string
          completed_at?: string
          id?: string
          node_id: string
          reward_type?: string | null
          reward_value?: Json | null
          user_id: string
        }
        Update: {
          challenge_date?: string
          choice_id?: string
          completed_at?: string
          id?: string
          node_id?: string
          reward_type?: string | null
          reward_value?: Json | null
          user_id?: string
        }
        Relationships: []
      }
      email_reminders_log: {
        Row: {
          bonus_reward_rarity: string | null
          bonus_tokens: number
          claim_token: string
          claimed: boolean
          claimed_at: string | null
          expires_at: string
          id: string
          reminder_type: string
          sent_at: string
          user_id: string
        }
        Insert: {
          bonus_reward_rarity?: string | null
          bonus_tokens?: number
          claim_token?: string
          claimed?: boolean
          claimed_at?: string | null
          expires_at?: string
          id?: string
          reminder_type: string
          sent_at?: string
          user_id: string
        }
        Update: {
          bonus_reward_rarity?: string | null
          bonus_tokens?: number
          claim_token?: string
          claimed?: boolean
          claimed_at?: string | null
          expires_at?: string
          id?: string
          reminder_type?: string
          sent_at?: string
          user_id?: string
        }
        Relationships: []
      }
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
      furniture_catalog: {
        Row: {
          category: string
          created_at: string
          happiness_bonus: number
          icon: string
          id: string
          name_key: string
          price_coins: number
          unlock_level: number
        }
        Insert: {
          category: string
          created_at?: string
          happiness_bonus?: number
          icon: string
          id: string
          name_key: string
          price_coins?: number
          unlock_level?: number
        }
        Update: {
          category?: string
          created_at?: string
          happiness_bonus?: number
          icon?: string
          id?: string
          name_key?: string
          price_coins?: number
          unlock_level?: number
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
          tools: Json
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
          tools?: Json
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
          tools?: Json
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
          target_data: Json | null
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
          target_data?: Json | null
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
          target_data?: Json | null
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
          game_mode: string
          guest_space_snapshot: Json | null
          host_space_snapshot: Json | null
          id: string
          invited_user_id: string | null
          is_story: boolean
          scenario_id: string | null
          status: Database["public"]["Enums"]["game_status"]
          updated_at: string
          winner_id: string | null
        }
        Insert: {
          code: string
          created_at?: string
          created_by: string
          game_mode?: string
          guest_space_snapshot?: Json | null
          host_space_snapshot?: Json | null
          id?: string
          invited_user_id?: string | null
          is_story?: boolean
          scenario_id?: string | null
          status?: Database["public"]["Enums"]["game_status"]
          updated_at?: string
          winner_id?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string
          game_mode?: string
          guest_space_snapshot?: Json | null
          host_space_snapshot?: Json | null
          id?: string
          invited_user_id?: string | null
          is_story?: boolean
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
      item_interactions: {
        Row: {
          action_icon: string
          action_label: string
          action_name: string
          cost: number
          display_order: number
          effect_data: Json
          effect_type: string
          id: string
          item_id: string
          one_time: boolean
          requires: Json | null
        }
        Insert: {
          action_icon?: string
          action_label: string
          action_name: string
          cost?: number
          display_order?: number
          effect_data?: Json
          effect_type: string
          id?: string
          item_id: string
          one_time?: boolean
          requires?: Json | null
        }
        Update: {
          action_icon?: string
          action_label?: string
          action_name?: string
          cost?: number
          display_order?: number
          effect_data?: Json
          effect_type?: string
          id?: string
          item_id?: string
          one_time?: boolean
          requires?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "item_interactions_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
        ]
      }
      items: {
        Row: {
          can_behind: boolean
          display_order: number
          environment: Database["public"]["Enums"]["item_environment"]
          hidden: boolean
          icon: string | null
          id: string
          inner_capacity: number
          name: string
          scenario_id: string
          tags: string[]
        }
        Insert: {
          can_behind?: boolean
          display_order?: number
          environment?: Database["public"]["Enums"]["item_environment"]
          hidden?: boolean
          icon?: string | null
          id?: string
          inner_capacity?: number
          name: string
          scenario_id: string
          tags?: string[]
        }
        Update: {
          can_behind?: boolean
          display_order?: number
          environment?: Database["public"]["Enums"]["item_environment"]
          hidden?: boolean
          icon?: string | null
          id?: string
          inner_capacity?: number
          name?: string
          scenario_id?: string
          tags?: string[]
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
          find_prompt_text: string | null
          find_special_type: string | null
          has_hide_message: boolean
          id: string
          object_id: string
          prompt_on: string
          prompt_text: string
          special_type: string
          variants: Json | null
        }
        Insert: {
          find_prompt_text?: string | null
          find_special_type?: string | null
          has_hide_message?: boolean
          id?: string
          object_id: string
          prompt_on: string
          prompt_text: string
          special_type: string
          variants?: Json | null
        }
        Update: {
          find_prompt_text?: string | null
          find_special_type?: string | null
          has_hide_message?: boolean
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
      pet_accessories: {
        Row: {
          accessory_icon: string
          accessory_name: string
          id: string
          obtained_at: string
          user_id: string
        }
        Insert: {
          accessory_icon: string
          accessory_name: string
          id?: string
          obtained_at?: string
          user_id: string
        }
        Update: {
          accessory_icon?: string
          accessory_name?: string
          id?: string
          obtained_at?: string
          user_id?: string
        }
        Relationships: []
      }
      pet_consumables: {
        Row: {
          consumable_icon: string
          consumable_name: string
          id: string
          obtained_at: string
          used_at: string | null
          user_id: string
        }
        Insert: {
          consumable_icon: string
          consumable_name: string
          id?: string
          obtained_at?: string
          used_at?: string | null
          user_id: string
        }
        Update: {
          consumable_icon?: string
          consumable_name?: string
          id?: string
          obtained_at?: string
          used_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      pet_events: {
        Row: {
          created_at: string
          event_icon: string
          event_name: string
          event_type: string
          id: string
          resolved: boolean
          resolved_at: string | null
          user_id: string
          xp_change: number
        }
        Insert: {
          created_at?: string
          event_icon?: string
          event_name: string
          event_type: string
          id?: string
          resolved?: boolean
          resolved_at?: string | null
          user_id: string
          xp_change: number
        }
        Update: {
          created_at?: string
          event_icon?: string
          event_name?: string
          event_type?: string
          id?: string
          resolved?: boolean
          resolved_at?: string | null
          user_id?: string
          xp_change?: number
        }
        Relationships: []
      }
      pet_notifications: {
        Row: {
          created_at: string
          from_user_id: string | null
          id: string
          notif_type: string
          payload: Json
          seen: boolean
          user_id: string
        }
        Insert: {
          created_at?: string
          from_user_id?: string | null
          id?: string
          notif_type: string
          payload?: Json
          seen?: boolean
          user_id: string
        }
        Update: {
          created_at?: string
          from_user_id?: string | null
          id?: string
          notif_type?: string
          payload?: Json
          seen?: boolean
          user_id?: string
        }
        Relationships: []
      }
      pet_relationships: {
        Row: {
          id: string
          interactions_count: number
          last_interaction_at: string
          score: number
          status: string
          user_a: string
          user_b: string
        }
        Insert: {
          id?: string
          interactions_count?: number
          last_interaction_at?: string
          score?: number
          status?: string
          user_a: string
          user_b: string
        }
        Update: {
          id?: string
          interactions_count?: number
          last_interaction_at?: string
          score?: number
          status?: string
          user_a?: string
          user_b?: string
        }
        Relationships: []
      }
      pet_skills: {
        Row: {
          id: string
          skill_id: string
          unlocked_at: string
          user_id: string
        }
        Insert: {
          id?: string
          skill_id: string
          unlocked_at?: string
          user_id: string
        }
        Update: {
          id?: string
          skill_id?: string
          unlocked_at?: string
          user_id?: string
        }
        Relationships: []
      }
      pet_species_traits: {
        Row: {
          brave: number
          calm: number
          created_at: string
          curious: number
          gluttonous: number
          loyal: number
          pet_type: string
        }
        Insert: {
          brave?: number
          calm?: number
          created_at?: string
          curious?: number
          gluttonous?: number
          loyal?: number
          pet_type: string
        }
        Update: {
          brave?: number
          calm?: number
          created_at?: string
          curious?: number
          gluttonous?: number
          loyal?: number
          pet_type?: string
        }
        Relationships: []
      }
      pet_state: {
        Row: {
          bond: number
          fear: number
          hunger: number
          id: string
          sleep: number
          updated_at: string
          user_id: string
        }
        Insert: {
          bond?: number
          fear?: number
          hunger?: number
          id?: string
          sleep?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          bond?: number
          fear?: number
          hunger?: number
          id?: string
          sleep?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      pet_visits: {
        Row: {
          ends_at: string
          host_delta: Json | null
          host_user_id: string
          id: string
          outcome: string | null
          resolved_at: string | null
          seen_by_host: boolean
          seen_by_visitor: boolean
          started_at: string
          visitor_delta: Json | null
          visitor_user_id: string
        }
        Insert: {
          ends_at?: string
          host_delta?: Json | null
          host_user_id: string
          id?: string
          outcome?: string | null
          resolved_at?: string | null
          seen_by_host?: boolean
          seen_by_visitor?: boolean
          started_at?: string
          visitor_delta?: Json | null
          visitor_user_id: string
        }
        Update: {
          ends_at?: string
          host_delta?: Json | null
          host_user_id?: string
          id?: string
          outcome?: string | null
          resolved_at?: string | null
          seen_by_host?: boolean
          seen_by_visitor?: boolean
          started_at?: string
          visitor_delta?: Json | null
          visitor_user_id?: string
        }
        Relationships: []
      }
      player_furniture: {
        Row: {
          acquired_at: string
          furniture_id: string
          id: string
          user_id: string
        }
        Insert: {
          acquired_at?: string
          furniture_id: string
          id?: string
          user_id: string
        }
        Update: {
          acquired_at?: string
          furniture_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "player_furniture_furniture_id_fkey"
            columns: ["furniture_id"]
            isOneToOne: false
            referencedRelation: "furniture_catalog"
            referencedColumns: ["id"]
          },
        ]
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
      player_pets: {
        Row: {
          created_at: string
          id: string
          level: number
          max_xp: number
          pet_icon: string
          pet_name: string
          pet_type: string
          user_id: string
          xp: number
        }
        Insert: {
          created_at?: string
          id?: string
          level?: number
          max_xp?: number
          pet_icon: string
          pet_name: string
          pet_type: string
          user_id: string
          xp?: number
        }
        Update: {
          created_at?: string
          id?: string
          level?: number
          max_xp?: number
          pet_icon?: string
          pet_name?: string
          pet_type?: string
          user_id?: string
          xp?: number
        }
        Relationships: []
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
      player_spaces: {
        Row: {
          created_at: string
          layout: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          layout?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          layout?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          best_streak: number
          bonus_tokens: number
          collection_master_at: string | null
          created_at: string
          current_streak: number
          display_name: string | null
          elo: number
          games_played: number
          games_won: number
          id: string
          language: string
          last_active_at: string | null
          last_reminder_sent_at: string | null
          league: Database["public"]["Enums"]["league_tier"]
          referral_code: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          best_streak?: number
          bonus_tokens?: number
          collection_master_at?: string | null
          created_at?: string
          current_streak?: number
          display_name?: string | null
          elo?: number
          games_played?: number
          games_won?: number
          id?: string
          language?: string
          last_active_at?: string | null
          last_reminder_sent_at?: string | null
          league?: Database["public"]["Enums"]["league_tier"]
          referral_code?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          best_streak?: number
          bonus_tokens?: number
          collection_master_at?: string | null
          created_at?: string
          current_streak?: number
          display_name?: string | null
          elo?: number
          games_played?: number
          games_won?: number
          id?: string
          language?: string
          last_active_at?: string | null
          last_reminder_sent_at?: string | null
          league?: Database["public"]["Enums"]["league_tier"]
          referral_code?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth_key: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          platform: string
          user_id: string
        }
        Insert: {
          auth_key: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          platform?: string
          user_id: string
        }
        Update: {
          auth_key?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          platform?: string
          user_id?: string
        }
        Relationships: []
      }
      referrals: {
        Row: {
          active_reward_given: boolean
          created_at: string
          first_game_reward_given: boolean
          id: string
          referral_code: string
          referred_user_id: string
          referrer_user_id: string
          signup_reward_given: boolean
          status: string
          updated_at: string
        }
        Insert: {
          active_reward_given?: boolean
          created_at?: string
          first_game_reward_given?: boolean
          id?: string
          referral_code: string
          referred_user_id: string
          referrer_user_id: string
          signup_reward_given?: boolean
          status?: string
          updated_at?: string
        }
        Update: {
          active_reward_given?: boolean
          created_at?: string
          first_game_reward_given?: boolean
          id?: string
          referral_code?: string
          referred_user_id?: string
          referrer_user_id?: string
          signup_reward_given?: boolean
          status?: string
          updated_at?: string
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
          is_outdoor: boolean
          max_items: number
          name: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          icon: string
          id?: string
          is_outdoor?: boolean
          max_items?: number
          name: string
        }
        Update: {
          created_at?: string
          display_order?: number
          icon?: string
          id?: string
          is_outdoor?: boolean
          max_items?: number
          name?: string
        }
        Relationships: []
      }
      story_choices: {
        Row: {
          choice_order: number
          id: string
          label: string
          max_visits: number | null
          min_visits: number | null
          next_node_id: string | null
          node_id: string
          requires_bond: number | null
          requires_items: Json | null
          requires_skill: string | null
          requires_traits: Json | null
          reward_type: string | null
          reward_value: Json | null
          state_delta: Json | null
          trait_reward_multiplier: Json | null
        }
        Insert: {
          choice_order: number
          id?: string
          label: string
          max_visits?: number | null
          min_visits?: number | null
          next_node_id?: string | null
          node_id: string
          requires_bond?: number | null
          requires_items?: Json | null
          requires_skill?: string | null
          requires_traits?: Json | null
          reward_type?: string | null
          reward_value?: Json | null
          state_delta?: Json | null
          trait_reward_multiplier?: Json | null
        }
        Update: {
          choice_order?: number
          id?: string
          label?: string
          max_visits?: number | null
          min_visits?: number | null
          next_node_id?: string | null
          node_id?: string
          requires_bond?: number | null
          requires_items?: Json | null
          requires_skill?: string | null
          requires_traits?: Json | null
          reward_type?: string | null
          reward_value?: Json | null
          state_delta?: Json | null
          trait_reward_multiplier?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "story_choices_next_node_id_fkey"
            columns: ["next_node_id"]
            isOneToOne: false
            referencedRelation: "story_nodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "story_choices_node_id_fkey"
            columns: ["node_id"]
            isOneToOne: false
            referencedRelation: "story_nodes"
            referencedColumns: ["id"]
          },
        ]
      }
      story_inventory: {
        Row: {
          id: string
          item_icon: string
          item_id: string
          item_name: string
          obtained_at: string
          user_id: string
        }
        Insert: {
          id?: string
          item_icon?: string
          item_id: string
          item_name: string
          obtained_at?: string
          user_id: string
        }
        Update: {
          id?: string
          item_icon?: string
          item_id?: string
          item_name?: string
          obtained_at?: string
          user_id?: string
        }
        Relationships: []
      }
      story_item_effects: {
        Row: {
          created_at: string
          d_bond: number
          d_fear: number
          d_hunger: number
          d_sleep: number
          item_id: string
          kind: string
        }
        Insert: {
          created_at?: string
          d_bond?: number
          d_fear?: number
          d_hunger?: number
          d_sleep?: number
          item_id: string
          kind: string
        }
        Update: {
          created_at?: string
          d_bond?: number
          d_fear?: number
          d_hunger?: number
          d_sleep?: number
          item_id?: string
          kind?: string
        }
        Relationships: []
      }
      story_node_visits: {
        Row: {
          count: number
          id: string
          last_visited_at: string
          node_id: string
          user_id: string
        }
        Insert: {
          count?: number
          id?: string
          last_visited_at?: string
          node_id: string
          user_id: string
        }
        Update: {
          count?: number
          id?: string
          last_visited_at?: string
          node_id?: string
          user_id?: string
        }
        Relationships: []
      }
      story_nodes: {
        Row: {
          chapter: number
          created_at: string
          ending_type: string | null
          id: string
          is_daily: boolean
          is_ending: boolean
          narrative: string
          puzzle_data: Json | null
          puzzle_type: string | null
          title: string
        }
        Insert: {
          chapter: number
          created_at?: string
          ending_type?: string | null
          id: string
          is_daily?: boolean
          is_ending?: boolean
          narrative: string
          puzzle_data?: Json | null
          puzzle_type?: string | null
          title: string
        }
        Update: {
          chapter?: number
          created_at?: string
          ending_type?: string | null
          id?: string
          is_daily?: boolean
          is_ending?: boolean
          narrative?: string
          puzzle_data?: Json | null
          puzzle_type?: string | null
          title?: string
        }
        Relationships: []
      }
      story_puzzle_attempts: {
        Row: {
          attempts: number
          created_at: string
          id: string
          node_id: string
          run_id: string
          skipped_at: string | null
          solved_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          attempts?: number
          created_at?: string
          id?: string
          node_id: string
          run_id: string
          skipped_at?: string | null
          solved_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          attempts?: number
          created_at?: string
          id?: string
          node_id?: string
          run_id?: string
          skipped_at?: string | null
          solved_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "story_puzzle_attempts_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "story_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      story_recipe_book: {
        Row: {
          discovered_at: string
          id: string
          recipe_id: string
          user_id: string
        }
        Insert: {
          discovered_at?: string
          id?: string
          recipe_id: string
          user_id: string
        }
        Update: {
          discovered_at?: string
          id?: string
          recipe_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "story_recipe_book_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "story_recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      story_recipes: {
        Row: {
          created_at: string
          description: string | null
          icon: string
          id: string
          name: string
          requires_items: Json
          result_item_icon: string
          result_item_id: string
          result_item_name: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          icon?: string
          id: string
          name: string
          requires_items?: Json
          result_item_icon?: string
          result_item_id: string
          result_item_name: string
        }
        Update: {
          created_at?: string
          description?: string | null
          icon?: string
          id?: string
          name?: string
          requires_items?: Json
          result_item_icon?: string
          result_item_id?: string
          result_item_name?: string
        }
        Relationships: []
      }
      story_runs: {
        Row: {
          current_node_id: string | null
          ended_at: string | null
          ending_type: string | null
          id: string
          path: Json
          started_at: string
          starting_world: string | null
          status: string
          user_id: string
        }
        Insert: {
          current_node_id?: string | null
          ended_at?: string | null
          ending_type?: string | null
          id?: string
          path?: Json
          started_at?: string
          starting_world?: string | null
          status?: string
          user_id: string
        }
        Update: {
          current_node_id?: string | null
          ended_at?: string | null
          ending_type?: string | null
          id?: string
          path?: Json
          started_at?: string
          starting_world?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "story_runs_current_node_id_fkey"
            columns: ["current_node_id"]
            isOneToOne: false
            referencedRelation: "story_nodes"
            referencedColumns: ["id"]
          },
        ]
      }
      story_world_progress: {
        Row: {
          completed_endings: Json
          id: string
          last_visited_at: string
          user_id: string
          visits: number
          world_id: string
        }
        Insert: {
          completed_endings?: Json
          id?: string
          last_visited_at?: string
          user_id: string
          visits?: number
          world_id: string
        }
        Update: {
          completed_endings?: Json
          id?: string
          last_visited_at?: string
          user_id?: string
          visits?: number
          world_id?: string
        }
        Relationships: []
      }
      story_worlds: {
        Row: {
          chapters: number[]
          description: string | null
          display_order: number
          icon: string
          id: string
          name: string
          start_node_id: string
          unlock_rule: Json
        }
        Insert: {
          chapters: number[]
          description?: string | null
          display_order?: number
          icon: string
          id: string
          name: string
          start_node_id: string
          unlock_rule?: Json
        }
        Update: {
          chapters?: number[]
          description?: string | null
          display_order?: number
          icon?: string
          id?: string
          name?: string
          start_node_id?: string
          unlock_rule?: Json
        }
        Relationships: []
      }
      translations: {
        Row: {
          entity_id: string
          entity_type: string
          id: string
          lang: string
          updated_at: string
          value: string
        }
        Insert: {
          entity_id: string
          entity_type: string
          id?: string
          lang: string
          updated_at?: string
          value: string
        }
        Update: {
          entity_id?: string
          entity_type?: string
          id?: string
          lang?: string
          updated_at?: string
          value?: string
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
      check_both_hidden: { Args: { _game_id: string }; Returns: boolean }
      check_collection_master: { Args: { _user_id: string }; Returns: boolean }
      check_referral_milestones: {
        Args: { _user_id: string }
        Returns: undefined
      }
      claim_reminder_bonus: { Args: { _claim_token: string }; Returns: Json }
      consume_social_cost: {
        Args: { _cost: number; _game_id: string }
        Returns: Json
      }
      count_game_players: { Args: { _game_id: string }; Returns: number }
      create_personal_game: {
        Args: { _opponent_id: string }
        Returns: {
          code: string
          game_id: string
        }[]
      }
      delete_user_account: { Args: never; Returns: Json }
      execute_barricada: {
        Args: { _game_id: string; _scenario_from: string; _scenario_to: string }
        Returns: Json
      }
      execute_fill_water: {
        Args: { _game_id: string; _item_id: string }
        Returns: Json
      }
      execute_game_move: {
        Args: {
          _action: Database["public"]["Enums"]["action_type"]
          _game_id: string
          _is_story?: boolean
          _target_item_id: string
          _target_position: Database["public"]["Enums"]["position_type"]
          _target_scenario_id: string
        }
        Returns: Json
      }
      execute_grant_drap_if_available: {
        Args: { _game_id: string }
        Returns: Json
      }
      execute_polish: {
        Args: { _game_id: string; _item_id: string }
        Returns: Json
      }
      execute_robar_llanterna: { Args: { _game_id: string }; Returns: Json }
      execute_robar_tornavis: { Args: { _game_id: string }; Returns: Json }
      execute_smoke_bomb: { Args: { _game_id: string }; Returns: Json }
      execute_swap: { Args: { _game_id: string }; Returns: Json }
      execute_tag_action: {
        Args: {
          _action_key: string
          _game_id: string
          _item_id: string
          _player_tools: Json
        }
        Returns: Json
      }
      execute_toggle_light: {
        Args: {
          _game_id: string
          _scenario_id: string
          _scenario_name?: string
          _turn_off: boolean
        }
        Returns: Json
      }
      execute_trampa: {
        Args: { _game_id: string; _item_id: string }
        Returns: Json
      }
      generate_referral_code: {
        Args: { _display_name: string }
        Returns: string
      }
      get_game_participants: {
        Args: { _game_ids: string[] }
        Returns: {
          game_id: string
          user_id: string
        }[]
      }
      get_inactive_users_for_reminder: {
        Args: never
        Returns: {
          bonus_reward_rarity: string
          bonus_tokens: number
          days_inactive: number
          display_name: string
          reminder_type: string
          user_id: string
        }[]
      }
      get_revealed_specials: {
        Args: { _game_id: string }
        Returns: {
          item_id: string
          pos: Database["public"]["Enums"]["position_type"]
          type: string
          value: number
        }[]
      }
      get_rival_traits: { Args: { _game_id: string }; Returns: Json }
      get_safe_game_players: {
        Args: { _game_id: string }
        Returns: {
          bonus_tokens_added: number
          created_at: string
          current_scenario_id: string
          game_id: string
          has_hidden: boolean
          hidden_item_id: string
          hidden_object_id: string
          hidden_position: Database["public"]["Enums"]["position_type"]
          id: string
          shield_active: boolean
          smoke_bomb_used: boolean
          social_item_used_today: boolean
          special_data: Json
          tokens_last_reset: string
          tokens_remaining: number
          tools: Json
          user_id: string
        }[]
      }
      get_translation: {
        Args: {
          p_entity_id: string
          p_entity_type: string
          p_fallback: string
          p_lang: string
        }
        Returns: string
      }
      gift_consumable: {
        Args: { _consumable_name: string; _to_user_id: string }
        Returns: Json
      }
      gift_inventory_item: {
        Args: { _item_id: string; _to_user_id: string }
        Returns: Json
      }
      insert_cpu_move: {
        Args: {
          _action: Database["public"]["Enums"]["action_type"]
          _found_object?: boolean
          _game_id: string
          _hint_level?: number
          _target_item_id?: string
          _target_position?: Database["public"]["Enums"]["position_type"]
          _target_scenario_id?: string
          _token_cost: number
          _turn_number: number
        }
        Returns: undefined
      }
      is_player_in_game: {
        Args: { _game_id: string; _user_id: string }
        Returns: boolean
      }
      join_game_by_link: { Args: { _game_id: string }; Returns: Json }
      place_reward_item: {
        Args: { _player_reward_id: string; _scenario_id: string }
        Returns: undefined
      }
      redeem_bonus_tokens: {
        Args: { _amount: number; _game_id: string }
        Returns: number
      }
      register_referral: { Args: { _referral_code: string }; Returns: Json }
      resolve_my_pet_visits: { Args: never; Returns: Json }
      roll_galleda_drop: { Args: { _game_id: string }; Returns: Json }
      sell_reward_item: { Args: { _player_reward_id: string }; Returns: number }
      send_pet_visit: { Args: { _host_user_id: string }; Returns: Json }
      start_game_setup: { Args: { _game_id: string }; Returns: undefined }
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
        | "food"
      position_type: "sobre" | "sota" | "dins" | "darrere"
      social_item_type:
        | "banana"
        | "smoke_bomb"
        | "false_clue"
        | "shield"
        | "message"
        | "espia"
        | "swap"
        | "robar_tornavis"
        | "barricada"
        | "trampa"
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
        "food",
      ],
      position_type: ["sobre", "sota", "dins", "darrere"],
      social_item_type: [
        "banana",
        "smoke_bomb",
        "false_clue",
        "shield",
        "message",
        "espia",
        "swap",
        "robar_tornavis",
        "barricada",
        "trampa",
      ],
    },
  },
} as const

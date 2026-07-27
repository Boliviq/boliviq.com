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
      automations: {
        Row: {
          action_config: Json | null
          action_type: string
          condition: Json | null
          created_at: string
          enabled: boolean
          id: string
          last_run_at: string | null
          name: string
          run_count: number
          trigger_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          action_config?: Json | null
          action_type: string
          condition?: Json | null
          created_at?: string
          enabled?: boolean
          id?: string
          last_run_at?: string | null
          name: string
          run_count?: number
          trigger_type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          action_config?: Json | null
          action_type?: string
          condition?: Json | null
          created_at?: string
          enabled?: boolean
          id?: string
          last_run_at?: string | null
          name?: string
          run_count?: number
          trigger_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      calls: {
        Row: {
          ai_summary: Json | null
          assigned_to: string | null
          called_at: string
          consent_note: string | null
          contact_id: string | null
          contact_name: string | null
          contact_type: string | null
          created_at: string
          duration_seconds: number | null
          follow_up_at: string | null
          id: string
          lead_id: string | null
          motivation_score: number | null
          outcome: Database["public"]["Enums"]["call_outcome"] | null
          phone_number: string | null
          property_id: string | null
          purpose: string | null
          recording_url: string | null
          status: string | null
          summary: string | null
          transcript: string | null
          user_id: string
        }
        Insert: {
          ai_summary?: Json | null
          assigned_to?: string | null
          called_at?: string
          consent_note?: string | null
          contact_id?: string | null
          contact_name?: string | null
          contact_type?: string | null
          created_at?: string
          duration_seconds?: number | null
          follow_up_at?: string | null
          id?: string
          lead_id?: string | null
          motivation_score?: number | null
          outcome?: Database["public"]["Enums"]["call_outcome"] | null
          phone_number?: string | null
          property_id?: string | null
          purpose?: string | null
          recording_url?: string | null
          status?: string | null
          summary?: string | null
          transcript?: string | null
          user_id: string
        }
        Update: {
          ai_summary?: Json | null
          assigned_to?: string | null
          called_at?: string
          consent_note?: string | null
          contact_id?: string | null
          contact_name?: string | null
          contact_type?: string | null
          created_at?: string
          duration_seconds?: number | null
          follow_up_at?: string | null
          id?: string
          lead_id?: string | null
          motivation_score?: number | null
          outcome?: Database["public"]["Enums"]["call_outcome"] | null
          phone_number?: string | null
          property_id?: string | null
          purpose?: string | null
          recording_url?: string | null
          status?: string | null
          summary?: string | null
          transcript?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "calls_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calls_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calls_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          address: string | null
          created_at: string
          id: string
          logo_url: string | null
          name: string
          owner_id: string
          phone: string | null
          updated_at: string
          website: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string
          id?: string
          logo_url?: string | null
          name: string
          owner_id: string
          phone?: string | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string
          id?: string
          logo_url?: string | null
          name?: string
          owner_id?: string
          phone?: string | null
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      contacts: {
        Row: {
          company: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          role: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          company?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          role?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          company?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          role?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      coupon_redemptions: {
        Row: {
          coupon_code: string
          coupon_id: string
          created_at: string
          discount_amount: number | null
          id: string
          order_amount: number | null
          plan: string | null
          user_id: string
        }
        Insert: {
          coupon_code: string
          coupon_id: string
          created_at?: string
          discount_amount?: number | null
          id?: string
          order_amount?: number | null
          plan?: string | null
          user_id: string
        }
        Update: {
          coupon_code?: string
          coupon_id?: string
          created_at?: string
          discount_amount?: number | null
          id?: string
          order_amount?: number | null
          plan?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coupon_redemptions_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
        ]
      }
      coupons: {
        Row: {
          active: boolean
          admin_only: boolean
          code: string
          created_at: string
          created_by: string | null
          current_uses: number
          discount_type: Database["public"]["Enums"]["discount_type"]
          discount_value: number
          expiration_date: string | null
          hidden: boolean
          id: string
          max_total_uses: number | null
          max_uses_per_customer: number | null
          name: string
          notes: string | null
          restricted_plan: string | null
          start_date: string | null
          stripe_coupon_id: string | null
          stripe_promotion_code: string | null
          stripe_promotion_code_id: string | null
          stripe_synced_at: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          admin_only?: boolean
          code: string
          created_at?: string
          created_by?: string | null
          current_uses?: number
          discount_type?: Database["public"]["Enums"]["discount_type"]
          discount_value: number
          expiration_date?: string | null
          hidden?: boolean
          id?: string
          max_total_uses?: number | null
          max_uses_per_customer?: number | null
          name: string
          notes?: string | null
          restricted_plan?: string | null
          start_date?: string | null
          stripe_coupon_id?: string | null
          stripe_promotion_code?: string | null
          stripe_promotion_code_id?: string | null
          stripe_synced_at?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          admin_only?: boolean
          code?: string
          created_at?: string
          created_by?: string | null
          current_uses?: number
          discount_type?: Database["public"]["Enums"]["discount_type"]
          discount_value?: number
          expiration_date?: string | null
          hidden?: boolean
          id?: string
          max_total_uses?: number | null
          max_uses_per_customer?: number | null
          name?: string
          notes?: string | null
          restricted_plan?: string | null
          start_date?: string | null
          stripe_coupon_id?: string | null
          stripe_promotion_code?: string | null
          stripe_promotion_code_id?: string | null
          stripe_synced_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      documents: {
        Row: {
          created_at: string
          id: string
          kind: string | null
          name: string
          property_id: string | null
          url: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          kind?: string | null
          name: string
          property_id?: string | null
          url?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string | null
          name?: string
          property_id?: string | null
          url?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "documents_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      integrations: {
        Row: {
          config: Json | null
          created_at: string
          id: string
          provider: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          config?: Json | null
          created_at?: string
          id?: string
          provider: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          config?: Json | null
          created_at?: string
          id?: string
          provider?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      leads: {
        Row: {
          assigned_to: string | null
          contact_id: string | null
          created_at: string
          hot: boolean
          id: string
          last_contact_at: string | null
          next_follow_up_at: string | null
          opportunity_value: number | null
          priority: string | null
          property_id: string | null
          score: number | null
          source: string | null
          stage_id: string | null
          status: Database["public"]["Enums"]["lead_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          assigned_to?: string | null
          contact_id?: string | null
          created_at?: string
          hot?: boolean
          id?: string
          last_contact_at?: string | null
          next_follow_up_at?: string | null
          opportunity_value?: number | null
          priority?: string | null
          property_id?: string | null
          score?: number | null
          source?: string | null
          stage_id?: string | null
          status?: Database["public"]["Enums"]["lead_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          assigned_to?: string | null
          contact_id?: string | null
          created_at?: string
          hot?: boolean
          id?: string
          last_contact_at?: string | null
          next_follow_up_at?: string | null
          opportunity_value?: number | null
          priority?: string | null
          property_id?: string | null
          score?: number | null
          source?: string | null
          stage_id?: string | null
          status?: Database["public"]["Enums"]["lead_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "leads_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "pipeline_stages"
            referencedColumns: ["id"]
          },
        ]
      }
      notes: {
        Row: {
          body: string
          created_at: string
          id: string
          lead_id: string | null
          property_id: string | null
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          lead_id?: string | null
          property_id?: string | null
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          lead_id?: string | null
          property_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notes_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notes_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      offers: {
        Row: {
          amount: number
          created_at: string
          id: string
          notes: string | null
          property_id: string | null
          status: string
          submitted_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          notes?: string | null
          property_id?: string | null
          status?: string
          submitted_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          notes?: string | null
          property_id?: string | null
          status?: string
          submitted_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "offers_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      pipeline_stages: {
        Row: {
          color: string | null
          created_at: string
          id: string
          name: string
          position: number
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          id?: string
          name: string
          position?: number
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          id?: string
          name?: string
          position?: number
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          company_id: string | null
          created_at: string
          full_name: string | null
          id: string
          onboarded: boolean
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          company_id?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          onboarded?: boolean
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          company_id?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          onboarded?: boolean
          phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      properties: {
        Row: {
          address: string
          agent_email: string | null
          agent_phone: string | null
          archived: boolean
          arv: number | null
          assigned_to: string | null
          baths: number | null
          beds: number | null
          cap_rate: number | null
          city: string | null
          created_at: string
          days_on_market: number | null
          deal_score: number | null
          estimated_profit: number | null
          id: string
          image_url: string | null
          list_price: number | null
          listing_agent: string | null
          listing_url: string | null
          lot_size: number | null
          monthly_cashflow: number | null
          monthly_rent: number | null
          motivation: string | null
          notes: string | null
          offer_price: number | null
          owner_name: string | null
          property_type: string | null
          rehab_estimate: number | null
          saved: boolean
          source: string | null
          sqft: number | null
          state: string | null
          status: string | null
          strategy: string | null
          updated_at: string
          user_id: string
          year_built: number | null
          zip: string | null
        }
        Insert: {
          address: string
          agent_email?: string | null
          agent_phone?: string | null
          archived?: boolean
          arv?: number | null
          assigned_to?: string | null
          baths?: number | null
          beds?: number | null
          cap_rate?: number | null
          city?: string | null
          created_at?: string
          days_on_market?: number | null
          deal_score?: number | null
          estimated_profit?: number | null
          id?: string
          image_url?: string | null
          list_price?: number | null
          listing_agent?: string | null
          listing_url?: string | null
          lot_size?: number | null
          monthly_cashflow?: number | null
          monthly_rent?: number | null
          motivation?: string | null
          notes?: string | null
          offer_price?: number | null
          owner_name?: string | null
          property_type?: string | null
          rehab_estimate?: number | null
          saved?: boolean
          source?: string | null
          sqft?: number | null
          state?: string | null
          status?: string | null
          strategy?: string | null
          updated_at?: string
          user_id: string
          year_built?: number | null
          zip?: string | null
        }
        Update: {
          address?: string
          agent_email?: string | null
          agent_phone?: string | null
          archived?: boolean
          arv?: number | null
          assigned_to?: string | null
          baths?: number | null
          beds?: number | null
          cap_rate?: number | null
          city?: string | null
          created_at?: string
          days_on_market?: number | null
          deal_score?: number | null
          estimated_profit?: number | null
          id?: string
          image_url?: string | null
          list_price?: number | null
          listing_agent?: string | null
          listing_url?: string | null
          lot_size?: number | null
          monthly_cashflow?: number | null
          monthly_rent?: number | null
          motivation?: string | null
          notes?: string | null
          offer_price?: number | null
          owner_name?: string | null
          property_type?: string | null
          rehab_estimate?: number | null
          saved?: boolean
          source?: string | null
          sqft?: number | null
          state?: string | null
          status?: string | null
          strategy?: string | null
          updated_at?: string
          user_id?: string
          year_built?: number | null
          zip?: string | null
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean | null
          coupon_code: string | null
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          environment: string
          id: string
          plan: string
          price_id: string | null
          product_id: string | null
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          cancel_at_period_end?: boolean | null
          coupon_code?: string | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          environment?: string
          id?: string
          plan?: string
          price_id?: string | null
          product_id?: string | null
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          cancel_at_period_end?: boolean | null
          coupon_code?: string | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          environment?: string
          id?: string
          plan?: string
          price_id?: string | null
          product_id?: string | null
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          assigned_to: string | null
          contact_id: string | null
          created_at: string
          description: string | null
          due_at: string | null
          id: string
          lead_id: string | null
          priority: string
          property_id: string | null
          reminder_at: string | null
          status: Database["public"]["Enums"]["task_status"]
          task_type: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          assigned_to?: string | null
          contact_id?: string | null
          created_at?: string
          description?: string | null
          due_at?: string | null
          id?: string
          lead_id?: string | null
          priority?: string
          property_id?: string | null
          reminder_at?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          task_type?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          assigned_to?: string | null
          contact_id?: string | null
          created_at?: string
          description?: string | null
          due_at?: string | null
          id?: string
          lead_id?: string | null
          priority?: string
          property_id?: string | null
          reminder_at?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          task_type?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      user_preferences: {
        Row: {
          created_at: string
          dark_mode: boolean
          investor_type: Database["public"]["Enums"]["investor_type"] | null
          max_rehab_budget: number | null
          min_monthly_cashflow: number | null
          min_profit: number | null
          price_max: number | null
          price_min: number | null
          primary_market: string | null
          strategy: Database["public"]["Enums"]["investment_strategy"] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          dark_mode?: boolean
          investor_type?: Database["public"]["Enums"]["investor_type"] | null
          max_rehab_budget?: number | null
          min_monthly_cashflow?: number | null
          min_profit?: number | null
          price_max?: number | null
          price_min?: number | null
          primary_market?: string | null
          strategy?: Database["public"]["Enums"]["investment_strategy"] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          dark_mode?: boolean
          investor_type?: Database["public"]["Enums"]["investor_type"] | null
          max_rehab_budget?: number | null
          min_monthly_cashflow?: number | null
          min_profit?: number | null
          price_max?: number | null
          price_min?: number | null
          primary_market?: string | null
          strategy?: Database["public"]["Enums"]["investment_strategy"] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      webhook_events: {
        Row: {
          created_at: string
          environment: string
          event_type: string
          id: string
          payload: Json | null
          processed_at: string
          stripe_event_id: string
        }
        Insert: {
          created_at?: string
          environment: string
          event_type: string
          id?: string
          payload?: Json | null
          processed_at?: string
          stripe_event_id: string
        }
        Update: {
          created_at?: string
          environment?: string
          event_type?: string
          id?: string
          payload?: Json | null
          processed_at?: string
          stripe_event_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_active_subscription: {
        Args: { check_env?: string; user_uuid: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      call_outcome:
        | "no_answer"
        | "left_voicemail"
        | "spoke"
        | "follow_up"
        | "not_interested"
      discount_type: "percentage" | "fixed"
      investment_strategy:
        | "fix_and_flip"
        | "wholesale"
        | "buy_and_hold"
        | "brrrr"
        | "short_term_rental"
        | "creative_finance"
        | "land_investing"
      investor_type:
        | "individual"
        | "wholesaler"
        | "flipper"
        | "landlord"
        | "agent"
        | "team"
      lead_status:
        | "new"
        | "contacted"
        | "qualified"
        | "negotiating"
        | "under_contract"
        | "closed"
        | "dead"
        | "researching"
        | "attempting_contact"
        | "offer_preparation"
        | "offer_submitted"
        | "follow_up_later"
        | "lost"
      task_status: "pending" | "in_progress" | "done" | "cancelled"
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
      app_role: ["admin", "moderator", "user"],
      call_outcome: [
        "no_answer",
        "left_voicemail",
        "spoke",
        "follow_up",
        "not_interested",
      ],
      discount_type: ["percentage", "fixed"],
      investment_strategy: [
        "fix_and_flip",
        "wholesale",
        "buy_and_hold",
        "brrrr",
        "short_term_rental",
        "creative_finance",
        "land_investing",
      ],
      investor_type: [
        "individual",
        "wholesaler",
        "flipper",
        "landlord",
        "agent",
        "team",
      ],
      lead_status: [
        "new",
        "contacted",
        "qualified",
        "negotiating",
        "under_contract",
        "closed",
        "dead",
        "researching",
        "attempting_contact",
        "offer_preparation",
        "offer_submitted",
        "follow_up_later",
        "lost",
      ],
      task_status: ["pending", "in_progress", "done", "cancelled"],
    },
  },
} as const

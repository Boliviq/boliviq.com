export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: {
        Args: {
          extensions?: Json;
          operationName?: string;
          query?: string;
          variables?: Json;
        };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      admin_audit_logs: {
        Row: {
          action: string;
          admin_id: string;
          created_at: string;
          id: string;
          new_value: Json | null;
          previous_value: Json | null;
          reason: string | null;
          record_id: string | null;
          record_type: string | null;
          reference: string | null;
        };
        Insert: {
          action: string;
          admin_id: string;
          created_at?: string;
          id?: string;
          new_value?: Json | null;
          previous_value?: Json | null;
          reason?: string | null;
          record_id?: string | null;
          record_type?: string | null;
          reference?: string | null;
        };
        Update: {
          action?: string;
          admin_id?: string;
          created_at?: string;
          id?: string;
          new_value?: Json | null;
          previous_value?: Json | null;
          reason?: string | null;
          record_id?: string | null;
          record_type?: string | null;
          reference?: string | null;
        };
        Relationships: [];
      };
      automations: {
        Row: {
          action_config: Json | null;
          action_type: string;
          condition: Json | null;
          created_at: string;
          enabled: boolean;
          id: string;
          last_run_at: string | null;
          name: string;
          run_count: number;
          trigger_type: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          action_config?: Json | null;
          action_type: string;
          condition?: Json | null;
          created_at?: string;
          enabled?: boolean;
          id?: string;
          last_run_at?: string | null;
          name: string;
          run_count?: number;
          trigger_type: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          action_config?: Json | null;
          action_type?: string;
          condition?: Json | null;
          created_at?: string;
          enabled?: boolean;
          id?: string;
          last_run_at?: string | null;
          name?: string;
          run_count?: number;
          trigger_type?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      calls: {
        Row: {
          ai_summary: Json | null;
          assigned_to: string | null;
          called_at: string;
          consent_note: string | null;
          contact_id: string | null;
          contact_name: string | null;
          contact_type: string | null;
          created_at: string;
          duration_seconds: number | null;
          follow_up_at: string | null;
          id: string;
          lead_id: string | null;
          motivation_score: number | null;
          outcome: Database["public"]["Enums"]["call_outcome"] | null;
          phone_number: string | null;
          property_id: string | null;
          purpose: string | null;
          recording_url: string | null;
          status: string | null;
          summary: string | null;
          transcript: string | null;
          user_id: string;
        };
        Insert: {
          ai_summary?: Json | null;
          assigned_to?: string | null;
          called_at?: string;
          consent_note?: string | null;
          contact_id?: string | null;
          contact_name?: string | null;
          contact_type?: string | null;
          created_at?: string;
          duration_seconds?: number | null;
          follow_up_at?: string | null;
          id?: string;
          lead_id?: string | null;
          motivation_score?: number | null;
          outcome?: Database["public"]["Enums"]["call_outcome"] | null;
          phone_number?: string | null;
          property_id?: string | null;
          purpose?: string | null;
          recording_url?: string | null;
          status?: string | null;
          summary?: string | null;
          transcript?: string | null;
          user_id: string;
        };
        Update: {
          ai_summary?: Json | null;
          assigned_to?: string | null;
          called_at?: string;
          consent_note?: string | null;
          contact_id?: string | null;
          contact_name?: string | null;
          contact_type?: string | null;
          created_at?: string;
          duration_seconds?: number | null;
          follow_up_at?: string | null;
          id?: string;
          lead_id?: string | null;
          motivation_score?: number | null;
          outcome?: Database["public"]["Enums"]["call_outcome"] | null;
          phone_number?: string | null;
          property_id?: string | null;
          purpose?: string | null;
          recording_url?: string | null;
          status?: string | null;
          summary?: string | null;
          transcript?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "calls_contact_id_fkey";
            columns: ["contact_id"];
            isOneToOne: false;
            referencedRelation: "contacts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "calls_lead_id_fkey";
            columns: ["lead_id"];
            isOneToOne: false;
            referencedRelation: "leads";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "calls_property_id_fkey";
            columns: ["property_id"];
            isOneToOne: false;
            referencedRelation: "properties";
            referencedColumns: ["id"];
          },
        ];
      };
      companies: {
        Row: {
          address: string | null;
          created_at: string;
          id: string;
          logo_url: string | null;
          name: string;
          owner_id: string;
          phone: string | null;
          updated_at: string;
          website: string | null;
        };
        Insert: {
          address?: string | null;
          created_at?: string;
          id?: string;
          logo_url?: string | null;
          name: string;
          owner_id: string;
          phone?: string | null;
          updated_at?: string;
          website?: string | null;
        };
        Update: {
          address?: string | null;
          created_at?: string;
          id?: string;
          logo_url?: string | null;
          name?: string;
          owner_id?: string;
          phone?: string | null;
          updated_at?: string;
          website?: string | null;
        };
        Relationships: [];
      };
      contacts: {
        Row: {
          company: string | null;
          created_at: string;
          email: string | null;
          id: string;
          name: string;
          notes: string | null;
          phone: string | null;
          role: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          company?: string | null;
          created_at?: string;
          email?: string | null;
          id?: string;
          name: string;
          notes?: string | null;
          phone?: string | null;
          role?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          company?: string | null;
          created_at?: string;
          email?: string | null;
          id?: string;
          name?: string;
          notes?: string | null;
          phone?: string | null;
          role?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      conversation_participants: {
        Row: {
          conversation_id: string;
          last_read_at: string | null;
          user_id: string;
        };
        Insert: {
          conversation_id: string;
          last_read_at?: string | null;
          user_id: string;
        };
        Update: {
          conversation_id?: string;
          last_read_at?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "conversation_participants_conversation_id_fkey";
            columns: ["conversation_id"];
            isOneToOne: false;
            referencedRelation: "conversations";
            referencedColumns: ["id"];
          },
        ];
      };
      conversations: {
        Row: {
          context: string | null;
          created_at: string;
          created_by: string;
          id: string;
          listing_id: string | null;
          property_id: string | null;
          title: string | null;
          updated_at: string;
        };
        Insert: {
          context?: string | null;
          created_at?: string;
          created_by: string;
          id?: string;
          listing_id?: string | null;
          property_id?: string | null;
          title?: string | null;
          updated_at?: string;
        };
        Update: {
          context?: string | null;
          created_at?: string;
          created_by?: string;
          id?: string;
          listing_id?: string | null;
          property_id?: string | null;
          title?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "conversations_listing_id_fkey";
            columns: ["listing_id"];
            isOneToOne: false;
            referencedRelation: "marketplace_listings";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "conversations_property_id_fkey";
            columns: ["property_id"];
            isOneToOne: false;
            referencedRelation: "properties";
            referencedColumns: ["id"];
          },
        ];
      };
      coupon_redemptions: {
        Row: {
          coupon_code: string;
          coupon_id: string;
          created_at: string;
          discount_amount: number | null;
          id: string;
          order_amount: number | null;
          plan: string | null;
          user_id: string;
        };
        Insert: {
          coupon_code: string;
          coupon_id: string;
          created_at?: string;
          discount_amount?: number | null;
          id?: string;
          order_amount?: number | null;
          plan?: string | null;
          user_id: string;
        };
        Update: {
          coupon_code?: string;
          coupon_id?: string;
          created_at?: string;
          discount_amount?: number | null;
          id?: string;
          order_amount?: number | null;
          plan?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "coupon_redemptions_coupon_id_fkey";
            columns: ["coupon_id"];
            isOneToOne: false;
            referencedRelation: "coupons";
            referencedColumns: ["id"];
          },
        ];
      };
      coupons: {
        Row: {
          active: boolean;
          admin_only: boolean;
          code: string;
          created_at: string;
          created_by: string | null;
          current_uses: number;
          discount_type: Database["public"]["Enums"]["discount_type"];
          discount_value: number;
          expiration_date: string | null;
          hidden: boolean;
          id: string;
          max_total_uses: number | null;
          max_uses_per_customer: number | null;
          name: string;
          notes: string | null;
          restricted_plan: string | null;
          start_date: string | null;
          stripe_coupon_id: string | null;
          stripe_promotion_code: string | null;
          stripe_promotion_code_id: string | null;
          stripe_synced_at: string | null;
          updated_at: string;
        };
        Insert: {
          active?: boolean;
          admin_only?: boolean;
          code: string;
          created_at?: string;
          created_by?: string | null;
          current_uses?: number;
          discount_type?: Database["public"]["Enums"]["discount_type"];
          discount_value: number;
          expiration_date?: string | null;
          hidden?: boolean;
          id?: string;
          max_total_uses?: number | null;
          max_uses_per_customer?: number | null;
          name: string;
          notes?: string | null;
          restricted_plan?: string | null;
          start_date?: string | null;
          stripe_coupon_id?: string | null;
          stripe_promotion_code?: string | null;
          stripe_promotion_code_id?: string | null;
          stripe_synced_at?: string | null;
          updated_at?: string;
        };
        Update: {
          active?: boolean;
          admin_only?: boolean;
          code?: string;
          created_at?: string;
          created_by?: string | null;
          current_uses?: number;
          discount_type?: Database["public"]["Enums"]["discount_type"];
          discount_value?: number;
          expiration_date?: string | null;
          hidden?: boolean;
          id?: string;
          max_total_uses?: number | null;
          max_uses_per_customer?: number | null;
          name?: string;
          notes?: string | null;
          restricted_plan?: string | null;
          start_date?: string | null;
          stripe_coupon_id?: string | null;
          stripe_promotion_code?: string | null;
          stripe_promotion_code_id?: string | null;
          stripe_synced_at?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      credit_ledger: {
        Row: {
          created_at: string;
          delta: number;
          id: string;
          idempotency_key: string | null;
          label: string;
          status: Database["public"]["Enums"]["credit_entry_status"];
          wallet_id: string;
        };
        Insert: {
          created_at?: string;
          delta: number;
          id?: string;
          idempotency_key?: string | null;
          label: string;
          status?: Database["public"]["Enums"]["credit_entry_status"];
          wallet_id: string;
        };
        Update: {
          created_at?: string;
          delta?: number;
          id?: string;
          idempotency_key?: string | null;
          label?: string;
          status?: Database["public"]["Enums"]["credit_entry_status"];
          wallet_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "credit_ledger_wallet_id_fkey";
            columns: ["wallet_id"];
            isOneToOne: false;
            referencedRelation: "credit_wallets";
            referencedColumns: ["id"];
          },
        ];
      };
      credit_wallets: {
        Row: {
          balance: number;
          id: string;
          updated_at: string;
          user_id: string | null;
          workspace_id: string | null;
        };
        Insert: {
          balance?: number;
          id?: string;
          updated_at?: string;
          user_id?: string | null;
          workspace_id?: string | null;
        };
        Update: {
          balance?: number;
          id?: string;
          updated_at?: string;
          user_id?: string | null;
          workspace_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "credit_wallets_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      documents: {
        Row: {
          created_at: string;
          id: string;
          kind: string | null;
          name: string;
          property_id: string | null;
          related: string | null;
          restricted: boolean;
          storage_path: string | null;
          updated_at: string;
          url: string | null;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          kind?: string | null;
          name: string;
          property_id?: string | null;
          related?: string | null;
          restricted?: boolean;
          storage_path?: string | null;
          updated_at?: string;
          url?: string | null;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          kind?: string | null;
          name?: string;
          property_id?: string | null;
          related?: string | null;
          restricted?: boolean;
          storage_path?: string | null;
          updated_at?: string;
          url?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "documents_property_id_fkey";
            columns: ["property_id"];
            isOneToOne: false;
            referencedRelation: "properties";
            referencedColumns: ["id"];
          },
        ];
      };
      integrations: {
        Row: {
          config: Json | null;
          created_at: string;
          id: string;
          provider: string;
          status: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          config?: Json | null;
          created_at?: string;
          id?: string;
          provider: string;
          status?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          config?: Json | null;
          created_at?: string;
          id?: string;
          provider?: string;
          status?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      leads: {
        Row: {
          assigned_to: string | null;
          contact_id: string | null;
          created_at: string;
          hot: boolean;
          id: string;
          last_contact_at: string | null;
          next_follow_up_at: string | null;
          opportunity_value: number | null;
          priority: string | null;
          property_id: string | null;
          score: number | null;
          source: string | null;
          stage_id: string | null;
          status: Database["public"]["Enums"]["lead_status"];
          updated_at: string;
          user_id: string;
        };
        Insert: {
          assigned_to?: string | null;
          contact_id?: string | null;
          created_at?: string;
          hot?: boolean;
          id?: string;
          last_contact_at?: string | null;
          next_follow_up_at?: string | null;
          opportunity_value?: number | null;
          priority?: string | null;
          property_id?: string | null;
          score?: number | null;
          source?: string | null;
          stage_id?: string | null;
          status?: Database["public"]["Enums"]["lead_status"];
          updated_at?: string;
          user_id: string;
        };
        Update: {
          assigned_to?: string | null;
          contact_id?: string | null;
          created_at?: string;
          hot?: boolean;
          id?: string;
          last_contact_at?: string | null;
          next_follow_up_at?: string | null;
          opportunity_value?: number | null;
          priority?: string | null;
          property_id?: string | null;
          score?: number | null;
          source?: string | null;
          stage_id?: string | null;
          status?: Database["public"]["Enums"]["lead_status"];
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "leads_contact_id_fkey";
            columns: ["contact_id"];
            isOneToOne: false;
            referencedRelation: "contacts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "leads_property_id_fkey";
            columns: ["property_id"];
            isOneToOne: false;
            referencedRelation: "properties";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "leads_stage_id_fkey";
            columns: ["stage_id"];
            isOneToOne: false;
            referencedRelation: "pipeline_stages";
            referencedColumns: ["id"];
          },
        ];
      };
      listing_reports: {
        Row: {
          created_at: string;
          id: string;
          listing_id: string;
          reason: string | null;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          listing_id: string;
          reason?: string | null;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          listing_id?: string;
          reason?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "listing_reports_listing_id_fkey";
            columns: ["listing_id"];
            isOneToOne: false;
            referencedRelation: "marketplace_listings";
            referencedColumns: ["id"];
          },
        ];
      };
      marketplace_listings: {
        Row: {
          category: string;
          created_at: string;
          description: string | null;
          details: Json;
          expires_at: string | null;
          id: string;
          location: string | null;
          price: number | null;
          price_label: string | null;
          reported: boolean;
          title: string;
          updated_at: string;
          user_id: string;
          visibility: Database["public"]["Enums"]["listing_visibility"];
          workspace_id: string | null;
        };
        Insert: {
          category: string;
          created_at?: string;
          description?: string | null;
          details?: Json;
          expires_at?: string | null;
          id?: string;
          location?: string | null;
          price?: number | null;
          price_label?: string | null;
          reported?: boolean;
          title: string;
          updated_at?: string;
          user_id: string;
          visibility?: Database["public"]["Enums"]["listing_visibility"];
          workspace_id?: string | null;
        };
        Update: {
          category?: string;
          created_at?: string;
          description?: string | null;
          details?: Json;
          expires_at?: string | null;
          id?: string;
          location?: string | null;
          price?: number | null;
          price_label?: string | null;
          reported?: boolean;
          title?: string;
          updated_at?: string;
          user_id?: string;
          visibility?: Database["public"]["Enums"]["listing_visibility"];
          workspace_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "marketplace_listings_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      messages: {
        Row: {
          body: string;
          conversation_id: string;
          created_at: string;
          id: string;
          sender_id: string;
        };
        Insert: {
          body: string;
          conversation_id: string;
          created_at?: string;
          id?: string;
          sender_id: string;
        };
        Update: {
          body?: string;
          conversation_id?: string;
          created_at?: string;
          id?: string;
          sender_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey";
            columns: ["conversation_id"];
            isOneToOne: false;
            referencedRelation: "conversations";
            referencedColumns: ["id"];
          },
        ];
      };
      notes: {
        Row: {
          body: string;
          created_at: string;
          id: string;
          lead_id: string | null;
          property_id: string | null;
          user_id: string;
        };
        Insert: {
          body: string;
          created_at?: string;
          id?: string;
          lead_id?: string | null;
          property_id?: string | null;
          user_id: string;
        };
        Update: {
          body?: string;
          created_at?: string;
          id?: string;
          lead_id?: string | null;
          property_id?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "notes_lead_id_fkey";
            columns: ["lead_id"];
            isOneToOne: false;
            referencedRelation: "leads";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "notes_property_id_fkey";
            columns: ["property_id"];
            isOneToOne: false;
            referencedRelation: "properties";
            referencedColumns: ["id"];
          },
        ];
      };
      offers: {
        Row: {
          amount: number;
          created_at: string;
          id: string;
          notes: string | null;
          property_id: string | null;
          status: string;
          submitted_at: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          amount: number;
          created_at?: string;
          id?: string;
          notes?: string | null;
          property_id?: string | null;
          status?: string;
          submitted_at?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          amount?: number;
          created_at?: string;
          id?: string;
          notes?: string | null;
          property_id?: string | null;
          status?: string;
          submitted_at?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "offers_property_id_fkey";
            columns: ["property_id"];
            isOneToOne: false;
            referencedRelation: "properties";
            referencedColumns: ["id"];
          },
        ];
      };
      pipeline_stages: {
        Row: {
          color: string | null;
          created_at: string;
          id: string;
          name: string;
          position: number;
          user_id: string;
        };
        Insert: {
          color?: string | null;
          created_at?: string;
          id?: string;
          name: string;
          position?: number;
          user_id: string;
        };
        Update: {
          color?: string | null;
          created_at?: string;
          id?: string;
          name?: string;
          position?: number;
          user_id?: string;
        };
        Relationships: [];
      };
      professional_profiles: {
        Row: {
          bio: string | null;
          company_name: string | null;
          created_at: string;
          id: string;
          insurance_policy: string | null;
          license_number: string | null;
          role: Database["public"]["Enums"]["profile_role"];
          service_area: string | null;
          specialties: string[];
          updated_at: string;
          user_id: string;
        };
        Insert: {
          bio?: string | null;
          company_name?: string | null;
          created_at?: string;
          id?: string;
          insurance_policy?: string | null;
          license_number?: string | null;
          role: Database["public"]["Enums"]["profile_role"];
          service_area?: string | null;
          specialties?: string[];
          updated_at?: string;
          user_id: string;
        };
        Update: {
          bio?: string | null;
          company_name?: string | null;
          created_at?: string;
          id?: string;
          insurance_policy?: string | null;
          license_number?: string | null;
          role?: Database["public"]["Enums"]["profile_role"];
          service_area?: string | null;
          specialties?: string[];
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          account_kind: Database["public"]["Enums"]["account_kind"];
          avatar_url: string | null;
          comms_consent: boolean;
          company_id: string | null;
          created_at: string;
          full_name: string | null;
          id: string;
          language: string;
          onboarded: boolean;
          onboarding_step: number;
          phone: string | null;
          primary_role: Database["public"]["Enums"]["profile_role"];
          secondary_roles: Database["public"]["Enums"]["profile_role"][];
          service_area: string | null;
          terms_accepted_at: string | null;
          updated_at: string;
        };
        Insert: {
          account_kind?: Database["public"]["Enums"]["account_kind"];
          avatar_url?: string | null;
          comms_consent?: boolean;
          company_id?: string | null;
          created_at?: string;
          full_name?: string | null;
          id: string;
          language?: string;
          onboarded?: boolean;
          onboarding_step?: number;
          phone?: string | null;
          primary_role?: Database["public"]["Enums"]["profile_role"];
          secondary_roles?: Database["public"]["Enums"]["profile_role"][];
          service_area?: string | null;
          terms_accepted_at?: string | null;
          updated_at?: string;
        };
        Update: {
          account_kind?: Database["public"]["Enums"]["account_kind"];
          avatar_url?: string | null;
          comms_consent?: boolean;
          company_id?: string | null;
          created_at?: string;
          full_name?: string | null;
          id?: string;
          language?: string;
          onboarded?: boolean;
          onboarding_step?: number;
          phone?: string | null;
          primary_role?: Database["public"]["Enums"]["profile_role"];
          secondary_roles?: Database["public"]["Enums"]["profile_role"][];
          service_area?: string | null;
          terms_accepted_at?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
        ];
      };
      projects: {
        Row: {
          address: string | null;
          budget: number | null;
          created_at: string;
          id: string;
          listing_id: string | null;
          name: string;
          next_milestone: string | null;
          property_id: string | null;
          spent: number | null;
          status: string;
          updated_at: string;
          user_id: string;
          workspace_id: string | null;
        };
        Insert: {
          address?: string | null;
          budget?: number | null;
          created_at?: string;
          id?: string;
          listing_id?: string | null;
          name: string;
          next_milestone?: string | null;
          property_id?: string | null;
          spent?: number | null;
          status?: string;
          updated_at?: string;
          user_id: string;
          workspace_id?: string | null;
        };
        Update: {
          address?: string | null;
          budget?: number | null;
          created_at?: string;
          id?: string;
          listing_id?: string | null;
          name?: string;
          next_milestone?: string | null;
          property_id?: string | null;
          spent?: number | null;
          status?: string;
          updated_at?: string;
          user_id?: string;
          workspace_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "projects_listing_id_fkey";
            columns: ["listing_id"];
            isOneToOne: false;
            referencedRelation: "marketplace_listings";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "projects_property_id_fkey";
            columns: ["property_id"];
            isOneToOne: false;
            referencedRelation: "properties";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "projects_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      properties: {
        Row: {
          address: string;
          agent_email: string | null;
          agent_phone: string | null;
          archived: boolean;
          arv: number | null;
          assigned_to: string | null;
          baths: number | null;
          beds: number | null;
          cap_rate: number | null;
          city: string | null;
          created_at: string;
          days_on_market: number | null;
          deal_score: number | null;
          estimated_profit: number | null;
          id: string;
          image_url: string | null;
          list_price: number | null;
          listing_agent: string | null;
          listing_url: string | null;
          lot_size: number | null;
          monthly_cashflow: number | null;
          monthly_rent: number | null;
          motivation: string | null;
          notes: string | null;
          offer_price: number | null;
          owner_name: string | null;
          property_type: string | null;
          rehab_estimate: number | null;
          saved: boolean;
          source: string | null;
          sqft: number | null;
          state: string | null;
          status: string | null;
          strategy: string | null;
          updated_at: string;
          user_id: string;
          year_built: number | null;
          zip: string | null;
        };
        Insert: {
          address: string;
          agent_email?: string | null;
          agent_phone?: string | null;
          archived?: boolean;
          arv?: number | null;
          assigned_to?: string | null;
          baths?: number | null;
          beds?: number | null;
          cap_rate?: number | null;
          city?: string | null;
          created_at?: string;
          days_on_market?: number | null;
          deal_score?: number | null;
          estimated_profit?: number | null;
          id?: string;
          image_url?: string | null;
          list_price?: number | null;
          listing_agent?: string | null;
          listing_url?: string | null;
          lot_size?: number | null;
          monthly_cashflow?: number | null;
          monthly_rent?: number | null;
          motivation?: string | null;
          notes?: string | null;
          offer_price?: number | null;
          owner_name?: string | null;
          property_type?: string | null;
          rehab_estimate?: number | null;
          saved?: boolean;
          source?: string | null;
          sqft?: number | null;
          state?: string | null;
          status?: string | null;
          strategy?: string | null;
          updated_at?: string;
          user_id: string;
          year_built?: number | null;
          zip?: string | null;
        };
        Update: {
          address?: string;
          agent_email?: string | null;
          agent_phone?: string | null;
          archived?: boolean;
          arv?: number | null;
          assigned_to?: string | null;
          baths?: number | null;
          beds?: number | null;
          cap_rate?: number | null;
          city?: string | null;
          created_at?: string;
          days_on_market?: number | null;
          deal_score?: number | null;
          estimated_profit?: number | null;
          id?: string;
          image_url?: string | null;
          list_price?: number | null;
          listing_agent?: string | null;
          listing_url?: string | null;
          lot_size?: number | null;
          monthly_cashflow?: number | null;
          monthly_rent?: number | null;
          motivation?: string | null;
          notes?: string | null;
          offer_price?: number | null;
          owner_name?: string | null;
          property_type?: string | null;
          rehab_estimate?: number | null;
          saved?: boolean;
          source?: string | null;
          sqft?: number | null;
          state?: string | null;
          status?: string | null;
          strategy?: string | null;
          updated_at?: string;
          user_id?: string;
          year_built?: number | null;
          zip?: string | null;
        };
        Relationships: [];
      };
      saved_listings: {
        Row: {
          created_at: string;
          id: string;
          listing_id: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          listing_id: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          listing_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "saved_listings_listing_id_fkey";
            columns: ["listing_id"];
            isOneToOne: false;
            referencedRelation: "marketplace_listings";
            referencedColumns: ["id"];
          },
        ];
      };
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean | null;
          coupon_code: string | null;
          created_at: string;
          current_period_end: string | null;
          current_period_start: string | null;
          environment: string;
          id: string;
          plan: string;
          price_id: string | null;
          product_id: string | null;
          status: string;
          stripe_customer_id: string | null;
          stripe_subscription_id: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          cancel_at_period_end?: boolean | null;
          coupon_code?: string | null;
          created_at?: string;
          current_period_end?: string | null;
          current_period_start?: string | null;
          environment?: string;
          id?: string;
          plan?: string;
          price_id?: string | null;
          product_id?: string | null;
          status?: string;
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          cancel_at_period_end?: boolean | null;
          coupon_code?: string | null;
          created_at?: string;
          current_period_end?: string | null;
          current_period_start?: string | null;
          environment?: string;
          id?: string;
          plan?: string;
          price_id?: string | null;
          product_id?: string | null;
          status?: string;
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      tasks: {
        Row: {
          assigned_to: string | null;
          contact_id: string | null;
          created_at: string;
          description: string | null;
          due_at: string | null;
          id: string;
          lead_id: string | null;
          priority: string;
          property_id: string | null;
          reminder_at: string | null;
          status: Database["public"]["Enums"]["task_status"];
          task_type: string | null;
          title: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          assigned_to?: string | null;
          contact_id?: string | null;
          created_at?: string;
          description?: string | null;
          due_at?: string | null;
          id?: string;
          lead_id?: string | null;
          priority?: string;
          property_id?: string | null;
          reminder_at?: string | null;
          status?: Database["public"]["Enums"]["task_status"];
          task_type?: string | null;
          title: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          assigned_to?: string | null;
          contact_id?: string | null;
          created_at?: string;
          description?: string | null;
          due_at?: string | null;
          id?: string;
          lead_id?: string | null;
          priority?: string;
          property_id?: string | null;
          reminder_at?: string | null;
          status?: Database["public"]["Enums"]["task_status"];
          task_type?: string | null;
          title?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "tasks_contact_id_fkey";
            columns: ["contact_id"];
            isOneToOne: false;
            referencedRelation: "contacts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tasks_lead_id_fkey";
            columns: ["lead_id"];
            isOneToOne: false;
            referencedRelation: "leads";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tasks_property_id_fkey";
            columns: ["property_id"];
            isOneToOne: false;
            referencedRelation: "properties";
            referencedColumns: ["id"];
          },
        ];
      };
      user_preferences: {
        Row: {
          created_at: string;
          dark_mode: boolean;
          investor_type: Database["public"]["Enums"]["investor_type"] | null;
          max_rehab_budget: number | null;
          min_monthly_cashflow: number | null;
          min_profit: number | null;
          price_max: number | null;
          price_min: number | null;
          primary_market: string | null;
          strategy: Database["public"]["Enums"]["investment_strategy"] | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          dark_mode?: boolean;
          investor_type?: Database["public"]["Enums"]["investor_type"] | null;
          max_rehab_budget?: number | null;
          min_monthly_cashflow?: number | null;
          min_profit?: number | null;
          price_max?: number | null;
          price_min?: number | null;
          primary_market?: string | null;
          strategy?: Database["public"]["Enums"]["investment_strategy"] | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          dark_mode?: boolean;
          investor_type?: Database["public"]["Enums"]["investor_type"] | null;
          max_rehab_budget?: number | null;
          min_monthly_cashflow?: number | null;
          min_profit?: number | null;
          price_max?: number | null;
          price_min?: number | null;
          primary_market?: string | null;
          strategy?: Database["public"]["Enums"]["investment_strategy"] | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      user_roles: {
        Row: {
          created_at: string;
          id: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          role?: Database["public"]["Enums"]["app_role"];
          user_id?: string;
        };
        Relationships: [];
      };
      verification_records: {
        Row: {
          created_at: string;
          id: string;
          notes: string | null;
          reviewed_by: string | null;
          status: string;
          tier: Database["public"]["Enums"]["verification_tier"];
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          notes?: string | null;
          reviewed_by?: string | null;
          status?: string;
          tier: Database["public"]["Enums"]["verification_tier"];
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          notes?: string | null;
          reviewed_by?: string | null;
          status?: string;
          tier?: Database["public"]["Enums"]["verification_tier"];
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      webhook_events: {
        Row: {
          created_at: string;
          environment: string;
          event_type: string;
          id: string;
          payload: Json | null;
          processed_at: string;
          stripe_event_id: string;
        };
        Insert: {
          created_at?: string;
          environment: string;
          event_type: string;
          id?: string;
          payload?: Json | null;
          processed_at?: string;
          stripe_event_id: string;
        };
        Update: {
          created_at?: string;
          environment?: string;
          event_type?: string;
          id?: string;
          payload?: Json | null;
          processed_at?: string;
          stripe_event_id?: string;
        };
        Relationships: [];
      };
      workspace_members: {
        Row: {
          created_at: string;
          id: string;
          role: string;
          user_id: string;
          workspace_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          role?: string;
          user_id: string;
          workspace_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          role?: string;
          user_id?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "workspace_members_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      workspaces: {
        Row: {
          company_id: string | null;
          created_at: string;
          id: string;
          name: string;
          owner_id: string;
          updated_at: string;
        };
        Insert: {
          company_id?: string | null;
          created_at?: string;
          id?: string;
          name: string;
          owner_id: string;
          updated_at?: string;
        };
        Update: {
          company_id?: string | null;
          created_at?: string;
          id?: string;
          name?: string;
          owner_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "workspaces_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      has_active_subscription: {
        Args: { check_env?: string; user_uuid: string };
        Returns: boolean;
      };
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"];
          _user_id: string;
        };
        Returns: boolean;
      };
    };
    Enums: {
      account_kind: "individual" | "company";
      app_role: "admin" | "moderator" | "user";
      call_outcome: "no_answer" | "left_voicemail" | "spoke" | "follow_up" | "not_interested";
      credit_entry_status: "posted" | "reserved" | "released" | "refunded" | "adjustment";
      discount_type: "percentage" | "fixed";
      investment_strategy:
        | "fix_and_flip"
        | "wholesale"
        | "buy_and_hold"
        | "brrrr"
        | "short_term_rental"
        | "creative_finance"
        | "land_investing";
      investor_type: "individual" | "wholesaler" | "flipper" | "landlord" | "agent" | "team";
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
        | "appointment_scheduled"
        | "proposal_created"
        | "in_progress";
      listing_visibility: "public" | "limited";
      profile_role:
        | "homeowner"
        | "contractor"
        | "trade"
        | "realtor"
        | "investor"
        | "wholesaler"
        | "lender"
        | "property_manager"
        | "inspector"
        | "appraiser"
        | "title"
        | "insurance"
        | "attorney"
        | "designer"
        | "supplier"
        | "other"
        | "administrator";
      task_status: "pending" | "in_progress" | "done" | "cancelled";
      verification_tier: "unverified" | "identity" | "license" | "insurance" | "boliviq_certified";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      account_kind: ["individual", "company"],
      app_role: ["admin", "moderator", "user"],
      call_outcome: ["no_answer", "left_voicemail", "spoke", "follow_up", "not_interested"],
      credit_entry_status: ["posted", "reserved", "released", "refunded", "adjustment"],
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
      investor_type: ["individual", "wholesaler", "flipper", "landlord", "agent", "team"],
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
        "appointment_scheduled",
        "proposal_created",
        "in_progress",
      ],
      listing_visibility: ["public", "limited"],
      profile_role: [
        "homeowner",
        "contractor",
        "trade",
        "realtor",
        "investor",
        "wholesaler",
        "lender",
        "property_manager",
        "inspector",
        "appraiser",
        "title",
        "insurance",
        "attorney",
        "designer",
        "supplier",
        "other",
        "administrator",
      ],
      task_status: ["pending", "in_progress", "done", "cancelled"],
      verification_tier: ["unverified", "identity", "license", "insurance", "boliviq_certified"],
    },
  },
} as const;

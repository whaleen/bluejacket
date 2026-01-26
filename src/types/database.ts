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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      activity_log: {
        Row: {
          action: string
          actor_image: string | null
          actor_name: string
          company_id: string
          created_at: string | null
          details: Json | null
          entity_id: string | null
          entity_type: string | null
          id: string
          location_id: string
          user_id: number | null
        }
        Insert: {
          action: string
          actor_image?: string | null
          actor_name: string
          company_id: string
          created_at?: string | null
          details?: Json | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          location_id: string
          user_id?: number | null
        }
        Update: {
          action?: string
          actor_image?: string | null
          actor_name?: string
          company_id?: string
          created_at?: string | null
          details?: Json | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          location_id?: string
          user_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_log_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_log_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          active: boolean | null
          created_at: string | null
          id: string
          name: string
          slug: string
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          id?: string
          name: string
          slug: string
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          id?: string
          name?: string
          slug?: string
        }
        Relationships: []
      }
      customers: {
        Row: {
          address: string | null
          company_id: string
          created_at: string | null
          customer_name: string
          email: string | null
          id: string
          location_id: string
          phone: string | null
        }
        Insert: {
          address?: string | null
          company_id?: string
          created_at?: string | null
          customer_name: string
          email?: string | null
          id?: string
          location_id: string
          phone?: string | null
        }
        Update: {
          address?: string | null
          company_id?: string
          created_at?: string | null
          customer_name?: string
          email?: string | null
          id?: string
          location_id?: string
          phone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customers_company_fk"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customers_location_fk"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      deliveries: {
        Row: {
          company_id: string
          consumer_customer_name: string
          created_at: string | null
          cso: string
          customer_fk: string | null
          date: string
          id: string
          location_id: string
          marked_for_truck: boolean | null
          model: string
          product_fk: string | null
          product_type: string
          qty: number
          scanned: boolean | null
          serial: string | null
          staged: boolean | null
          status: string
          stop: number
          truck_fk: string | null
          truck_id: string
          updated_at: string | null
        }
        Insert: {
          company_id?: string
          consumer_customer_name: string
          created_at?: string | null
          cso: string
          customer_fk?: string | null
          date: string
          id?: string
          location_id: string
          marked_for_truck?: boolean | null
          model: string
          product_fk?: string | null
          product_type: string
          qty?: number
          scanned?: boolean | null
          serial?: string | null
          staged?: boolean | null
          status?: string
          stop: number
          truck_fk?: string | null
          truck_id: string
          updated_at?: string | null
        }
        Update: {
          company_id?: string
          consumer_customer_name?: string
          created_at?: string | null
          cso?: string
          customer_fk?: string | null
          date?: string
          id?: string
          location_id?: string
          marked_for_truck?: boolean | null
          model?: string
          product_fk?: string | null
          product_type?: string
          qty?: number
          scanned?: boolean | null
          serial?: string | null
          staged?: boolean | null
          status?: string
          stop?: number
          truck_fk?: string | null
          truck_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "deliveries_company_fk"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deliveries_location_fk"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_deliveries_customer"
            columns: ["customer_fk"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_deliveries_product"
            columns: ["product_fk"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_deliveries_truck"
            columns: ["truck_fk"]
            isOneToOne: false
            referencedRelation: "trucks"
            referencedColumns: ["id"]
          },
        ]
      }
      floor_displays: {
        Row: {
          company_id: string
          created_at: string | null
          id: string
          last_heartbeat: string | null
          location_id: string
          name: string
          paired: boolean
          pairing_code: string
          state_json: Json
          updated_at: string | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          id?: string
          last_heartbeat?: string | null
          location_id: string
          name?: string
          paired?: boolean
          pairing_code: string
          state_json?: Json
          updated_at?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          id?: string
          last_heartbeat?: string | null
          location_id?: string
          name?: string
          paired?: boolean
          pairing_code?: string
          state_json?: Json
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "floor_displays_company_fk"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "floor_displays_location_fk"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      ge_changes: {
        Row: {
          change_type: string
          company_id: string
          cso: string | null
          current_state: Json | null
          detected_at: string | null
          field_changed: string | null
          id: string
          inventory_type: string
          load_number: string | null
          location_id: string
          model: string | null
          new_value: string | null
          notes: string | null
          old_value: string | null
          previous_state: Json | null
          processed: boolean | null
          processed_action: string | null
          processed_at: string | null
          serial: string | null
          source: string
        }
        Insert: {
          change_type: string
          company_id: string
          cso?: string | null
          current_state?: Json | null
          detected_at?: string | null
          field_changed?: string | null
          id?: string
          inventory_type: string
          load_number?: string | null
          location_id: string
          model?: string | null
          new_value?: string | null
          notes?: string | null
          old_value?: string | null
          previous_state?: Json | null
          processed?: boolean | null
          processed_action?: string | null
          processed_at?: string | null
          serial?: string | null
          source: string
        }
        Update: {
          change_type?: string
          company_id?: string
          cso?: string | null
          current_state?: Json | null
          detected_at?: string | null
          field_changed?: string | null
          id?: string
          inventory_type?: string
          load_number?: string | null
          location_id?: string
          model?: string | null
          new_value?: string | null
          notes?: string | null
          old_value?: string | null
          previous_state?: Json | null
          processed?: boolean | null
          processed_action?: string | null
          processed_at?: string | null
          serial?: string | null
          source?: string
        }
        Relationships: [
          {
            foreignKeyName: "ge_changes_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ge_changes_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_conflicts: {
        Row: {
          company_id: string
          detected_at: string | null
          groups: Json
          id: string
          location_id: string
          serial: string
          source: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          company_id: string
          detected_at?: string | null
          groups: Json
          id?: string
          location_id: string
          serial: string
          source?: string | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          company_id?: string
          detected_at?: string | null
          groups?: Json
          id?: string
          location_id?: string
          serial?: string
          source?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_conflicts_company_fk"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_conflicts_location_fk"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_conversions: {
        Row: {
          company_id: string
          converted_by: string | null
          created_at: string | null
          from_inventory_type: string
          from_sub_inventory: string | null
          id: string
          inventory_item_id: string
          location_id: string
          notes: string | null
          to_inventory_type: string
          to_sub_inventory: string | null
        }
        Insert: {
          company_id?: string
          converted_by?: string | null
          created_at?: string | null
          from_inventory_type: string
          from_sub_inventory?: string | null
          id?: string
          inventory_item_id: string
          location_id: string
          notes?: string | null
          to_inventory_type: string
          to_sub_inventory?: string | null
        }
        Update: {
          company_id?: string
          converted_by?: string | null
          created_at?: string | null
          from_inventory_type?: string
          from_sub_inventory?: string | null
          id?: string
          inventory_item_id?: string
          location_id?: string
          notes?: string | null
          to_inventory_type?: string
          to_sub_inventory?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_conversion_item"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_conversions_company_fk"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_conversions_location_fk"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_counts: {
        Row: {
          company_id: string
          count_reason: string | null
          counted_by: string | null
          created_at: string | null
          delta: number | null
          id: string
          location_id: string
          notes: string | null
          previous_qty: number | null
          product_id: string
          qty: number
          tracked_part_id: string | null
        }
        Insert: {
          company_id?: string
          count_reason?: string | null
          counted_by?: string | null
          created_at?: string | null
          delta?: number | null
          id?: string
          location_id: string
          notes?: string | null
          previous_qty?: number | null
          product_id: string
          qty: number
          tracked_part_id?: string | null
        }
        Update: {
          company_id?: string
          count_reason?: string | null
          counted_by?: string | null
          created_at?: string | null
          delta?: number | null
          id?: string
          location_id?: string
          notes?: string | null
          previous_qty?: number | null
          product_id?: string
          qty?: number
          tracked_part_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_counts_company_fk"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_counts_location_fk"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_counts_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_counts_tracked_part_id_fkey"
            columns: ["tracked_part_id"]
            isOneToOne: false
            referencedRelation: "tracked_parts"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_items: {
        Row: {
          company_id: string
          consumer_customer_name: string | null
          created_at: string | null
          cso: string
          date: string | null
          ge_availability_message: string | null
          ge_availability_status: string | null
          ge_inv_qty: number | null
          ge_model: string | null
          ge_ordc: string | null
          ge_orphaned: boolean | null
          ge_orphaned_at: string | null
          ge_serial: string | null
          id: string
          inventory_type: string
          is_scanned: boolean | null
          location_id: string
          model: string
          notes: string | null
          product_fk: string | null
          product_type: string
          qty: number | null
          route_id: string | null
          scanned_at: string | null
          scanned_by: string | null
          serial: string | null
          status: string | null
          stop: number | null
          sub_inventory: string | null
          updated_at: string | null
        }
        Insert: {
          company_id?: string
          consumer_customer_name?: string | null
          created_at?: string | null
          cso: string
          date?: string | null
          ge_availability_message?: string | null
          ge_availability_status?: string | null
          ge_inv_qty?: number | null
          ge_model?: string | null
          ge_ordc?: string | null
          ge_orphaned?: boolean | null
          ge_orphaned_at?: string | null
          ge_serial?: string | null
          id?: string
          inventory_type: string
          is_scanned?: boolean | null
          location_id: string
          model: string
          notes?: string | null
          product_fk?: string | null
          product_type: string
          qty?: number | null
          route_id?: string | null
          scanned_at?: string | null
          scanned_by?: string | null
          serial?: string | null
          status?: string | null
          stop?: number | null
          sub_inventory?: string | null
          updated_at?: string | null
        }
        Update: {
          company_id?: string
          consumer_customer_name?: string | null
          created_at?: string | null
          cso?: string
          date?: string | null
          ge_availability_message?: string | null
          ge_availability_status?: string | null
          ge_inv_qty?: number | null
          ge_model?: string | null
          ge_ordc?: string | null
          ge_orphaned?: boolean | null
          ge_orphaned_at?: string | null
          ge_serial?: string | null
          id?: string
          inventory_type?: string
          is_scanned?: boolean | null
          location_id?: string
          model?: string
          notes?: string | null
          product_fk?: string | null
          product_type?: string
          qty?: number | null
          route_id?: string | null
          scanned_at?: string | null
          scanned_by?: string | null
          serial?: string | null
          status?: string | null
          stop?: number | null
          sub_inventory?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_inventory_product"
            columns: ["product_fk"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_items_company_fk"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_items_location_fk"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      load_conflicts: {
        Row: {
          company_id: string
          conflicting_load: string
          detected_at: string | null
          id: string
          inventory_type: string
          load_number: string
          location_id: string
          notes: string | null
          serial: string
          status: string
        }
        Insert: {
          company_id: string
          conflicting_load: string
          detected_at?: string | null
          id?: string
          inventory_type: string
          load_number: string
          location_id: string
          notes?: string | null
          serial: string
          status?: string
        }
        Update: {
          company_id?: string
          conflicting_load?: string
          detected_at?: string | null
          id?: string
          inventory_type?: string
          load_number?: string
          location_id?: string
          notes?: string | null
          serial?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "load_conflicts_company_fk"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "load_conflicts_location_fk"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      load_metadata: {
        Row: {
          category: string | null
          company_id: string
          created_at: string | null
          created_by: string | null
          friendly_name: string | null
          ge_cso: string | null
          ge_cso_status: string | null
          ge_inv_org: string | null
          ge_notes: string | null
          ge_pricing: string | null
          ge_scanned_at: string | null
          ge_source_status: string | null
          ge_submitted_date: string | null
          ge_units: number | null
          id: string
          inventory_type: string
          location_id: string
          notes: string | null
          pickup_date: string | null
          pickup_tba: boolean | null
          prep_tagged: boolean | null
          prep_wrapped: boolean | null
          sanity_check_requested: boolean | null
          sanity_check_requested_at: string | null
          sanity_check_requested_by: string | null
          sanity_check_completed_at: string | null
          sanity_check_completed_by: string | null
          primary_color: string | null
          status: string
          sub_inventory_name: string
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          company_id?: string
          created_at?: string | null
          created_by?: string | null
          friendly_name?: string | null
          ge_cso?: string | null
          ge_cso_status?: string | null
          ge_inv_org?: string | null
          ge_notes?: string | null
          ge_pricing?: string | null
          ge_scanned_at?: string | null
          ge_source_status?: string | null
          ge_submitted_date?: string | null
          ge_units?: number | null
          id?: string
          inventory_type: string
          location_id: string
          notes?: string | null
          pickup_date?: string | null
          pickup_tba?: boolean | null
          prep_tagged?: boolean | null
          prep_wrapped?: boolean | null
          sanity_check_requested?: boolean | null
          sanity_check_requested_at?: string | null
          sanity_check_requested_by?: string | null
          sanity_check_completed_at?: string | null
          sanity_check_completed_by?: string | null
          primary_color?: string | null
          status?: string
          sub_inventory_name: string
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          company_id?: string
          created_at?: string | null
          created_by?: string | null
          friendly_name?: string | null
          ge_cso?: string | null
          ge_cso_status?: string | null
          ge_inv_org?: string | null
          ge_notes?: string | null
          ge_pricing?: string | null
          ge_scanned_at?: string | null
          ge_source_status?: string | null
          ge_submitted_date?: string | null
          ge_units?: number | null
          id?: string
          inventory_type?: string
          location_id?: string
          notes?: string | null
          pickup_date?: string | null
          pickup_tba?: boolean | null
          prep_tagged?: boolean | null
          prep_wrapped?: boolean | null
          sanity_check_requested?: boolean | null
          sanity_check_requested_at?: string | null
          sanity_check_requested_by?: string | null
          sanity_check_completed_at?: string | null
          sanity_check_completed_by?: string | null
          primary_color?: string | null
          status?: string
          sub_inventory_name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "load_metadata_company_fk"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "load_metadata_location_fk"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      locations: {
        Row: {
          active: boolean | null
          company_id: string
          created_at: string | null
          id: string
          name: string
          slug: string
        }
        Insert: {
          active?: boolean | null
          company_id: string
          created_at?: string | null
          id?: string
          name: string
          slug: string
        }
        Update: {
          active?: boolean | null
          company_id?: string
          created_at?: string | null
          id?: string
          name?: string
          slug?: string
        }
        Relationships: [
          {
            foreignKeyName: "locations_company_fk"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          availability: string | null
          brand: string | null
          capacity: string | null
          color: string | null
          commercial_category: string | null
          created_at: string | null
          description: string | null
          dimensions: Json | null
          id: string
          image_url: string | null
          is_part: boolean | null
          model: string
          msrp: number | null
          price: number | null
          product_category: string | null
          product_type: string
          product_url: string | null
          specs: Json | null
          updated_at: string | null
        }
        Insert: {
          availability?: string | null
          brand?: string | null
          capacity?: string | null
          color?: string | null
          commercial_category?: string | null
          created_at?: string | null
          description?: string | null
          dimensions?: Json | null
          id?: string
          image_url?: string | null
          is_part?: boolean | null
          model: string
          msrp?: number | null
          price?: number | null
          product_category?: string | null
          product_type: string
          product_url?: string | null
          specs?: Json | null
          updated_at?: string | null
        }
        Update: {
          availability?: string | null
          brand?: string | null
          capacity?: string | null
          color?: string | null
          commercial_category?: string | null
          created_at?: string | null
          description?: string | null
          dimensions?: Json | null
          id?: string
          image_url?: string | null
          is_part?: boolean | null
          model?: string
          msrp?: number | null
          price?: number | null
          product_category?: string | null
          product_type?: string
          product_url?: string | null
          specs?: Json | null
          updated_at?: string | null
        }
        Relationships: []
      }
      scanning_sessions: {
        Row: {
          closed_at: string | null
          closed_by: string | null
          company_id: string
          created_at: string | null
          created_by: string | null
          id: string
          inventory_type: string
          items: Json
          location_id: string
          name: string
          scanned_item_ids: string[]
          status: string
          sub_inventory: string | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          closed_at?: string | null
          closed_by?: string | null
          company_id?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          inventory_type: string
          items?: Json
          location_id: string
          name: string
          scanned_item_ids?: string[]
          status?: string
          sub_inventory?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          closed_at?: string | null
          closed_by?: string | null
          company_id?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          inventory_type?: string
          items?: Json
          location_id?: string
          name?: string
          scanned_item_ids?: string[]
          status?: string
          sub_inventory?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scanning_sessions_company_fk"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scanning_sessions_location_fk"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      settings: {
        Row: {
          company_id: string
          ge_cookies: Json | null
          ge_cookies_updated_at: string | null
          location_id: string
          sso_password: string | null
          sso_username: string | null
          updated_at: string | null
        }
        Insert: {
          company_id: string
          ge_cookies?: Json | null
          ge_cookies_updated_at?: string | null
          location_id: string
          sso_password?: string | null
          sso_username?: string | null
          updated_at?: string | null
        }
        Update: {
          company_id?: string
          ge_cookies?: Json | null
          ge_cookies_updated_at?: string | null
          location_id?: string
          sso_password?: string | null
          sso_username?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "settings_company_fk"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "settings_location_fk"
            columns: ["location_id"]
            isOneToOne: true
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      tracked_parts: {
        Row: {
          company_id: string
          created_at: string | null
          created_by: string | null
          id: string
          is_active: boolean | null
          location_id: string
          product_id: string
          reorder_threshold: number
          reordered_at: string | null
          updated_at: string | null
        }
        Insert: {
          company_id?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          location_id: string
          product_id: string
          reorder_threshold?: number
          reordered_at?: string | null
          updated_at?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          location_id?: string
          product_id?: string
          reorder_threshold?: number
          reordered_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tracked_parts_company_fk"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tracked_parts_location_fk"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tracked_parts_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      trucks: {
        Row: {
          abbreviated_name: string | null
          active: boolean | null
          capacity: number | null
          color: string | null
          company_id: string
          created_at: string | null
          driver_name: string | null
          id: string
          location_id: string
          truck_id: string
        }
        Insert: {
          abbreviated_name?: string | null
          active?: boolean | null
          capacity?: number | null
          color?: string | null
          company_id?: string
          created_at?: string | null
          driver_name?: string | null
          id?: string
          location_id: string
          truck_id: string
        }
        Update: {
          abbreviated_name?: string | null
          active?: boolean | null
          capacity?: number | null
          color?: string | null
          company_id?: string
          created_at?: string | null
          driver_name?: string | null
          id?: string
          location_id?: string
          truck_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trucks_company_fk"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trucks_location_fk"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          company_ids: string[] | null
          created_at: string
          id: number
          image: string | null
          password: string | null
          role: string
          username: string | null
        }
        Insert: {
          company_ids?: string[] | null
          created_at?: string
          id?: number
          image?: string | null
          password?: string | null
          role?: string
          username?: string | null
        }
        Update: {
          company_ids?: string[] | null
          created_at?: string
          id?: number
          image?: string | null
          password?: string | null
          role?: string
          username?: string | null
        }
        Relationships: []
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

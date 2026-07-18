/* Hand-authored to match supabase/migrations/0001_init.sql +
   0002_follow_ups.sql + 0003_item_presets.sql + 0004_invoice_sent_at.sql
   exactly. Those migrations are applied to the live project and are the
   schema ground truth — change this file only when a new migration
   lands. */

export type LeadSource = 'website' | 'ads' | 'referral' | 'phone' | 'manual' | 'visualizer'
export type LeadStatus = 'new' | 'contacted' | 'quoted' | 'won' | 'lost' | 'spam'
export type LeadIntent = 'quote_request'
export type QuoteStatus = 'draft' | 'sent' | 'accepted' | 'declined' | 'expired'
export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'void'
export type ItemUnit = 'job' | 'day' | 'room' | 'm2' | 'item'
export type PaymentMethod = 'bank_transfer' | 'cash'
export type VisualizerService = 'interior' | 'exterior' | 'wallpaper' | 'finish'
export type VisualizerRenderStatus = 'processing' | 'done' | 'failed'

export type Database = {
  public: {
    Tables: {
      admins: {
        Row: {
          user_id: string
          name: string
          created_at: string
        }
        Insert: {
          user_id: string
          name: string
          created_at?: string
        }
        Update: {
          user_id?: string
          name?: string
          created_at?: string
        }
        Relationships: []
      }
      leads: {
        Row: {
          id: string
          created_at: string
          name: string
          email: string | null
          phone: string | null
          service: string | null
          message: string | null
          source: LeadSource
          status: LeadStatus
          notes: string | null
          status_changed_at: string
          follow_up_at: string | null
          intent: LeadIntent | null
        }
        Insert: {
          id?: string
          created_at?: string
          name: string
          email?: string | null
          phone?: string | null
          service?: string | null
          message?: string | null
          source?: LeadSource
          status?: LeadStatus
          notes?: string | null
          status_changed_at?: string
          follow_up_at?: string | null
          intent?: LeadIntent | null
        }
        Update: {
          id?: string
          created_at?: string
          name?: string
          email?: string | null
          phone?: string | null
          service?: string | null
          message?: string | null
          source?: LeadSource
          status?: LeadStatus
          notes?: string | null
          status_changed_at?: string
          follow_up_at?: string | null
          intent?: LeadIntent | null
        }
        Relationships: []
      }
      clients: {
        Row: {
          id: string
          created_at: string
          name: string
          contact_name: string | null
          email: string | null
          phone: string | null
          address_line1: string | null
          address_line2: string | null
          town: string | null
          postcode: string | null
          notes: string | null
        }
        Insert: {
          id?: string
          created_at?: string
          name: string
          contact_name?: string | null
          email?: string | null
          phone?: string | null
          address_line1?: string | null
          address_line2?: string | null
          town?: string | null
          postcode?: string | null
          notes?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          name?: string
          contact_name?: string | null
          email?: string | null
          phone?: string | null
          address_line1?: string | null
          address_line2?: string | null
          town?: string | null
          postcode?: string | null
          notes?: string | null
        }
        Relationships: []
      }
      quotes: {
        Row: {
          id: string
          created_at: string
          quote_number: number
          client_id: string
          lead_id: string | null
          title: string
          status: QuoteStatus
          issue_date: string | null
          valid_until: string | null
          vat_rate: number
          subtotal_pence: number
          vat_pence: number
          total_pence: number
          notes: string | null
          terms: string | null
          sent_at: string | null
          decided_at: string | null
          follow_up_at: string | null
          public_token: string | null
          site_address: string | null
        }
        Insert: {
          id?: string
          created_at?: string
          quote_number: number
          client_id: string
          lead_id?: string | null
          title: string
          status?: QuoteStatus
          issue_date?: string | null
          valid_until?: string | null
          vat_rate?: number
          subtotal_pence?: number
          vat_pence?: number
          total_pence?: number
          notes?: string | null
          terms?: string | null
          sent_at?: string | null
          decided_at?: string | null
          follow_up_at?: string | null
          public_token?: string | null
          site_address?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          quote_number?: number
          client_id?: string
          lead_id?: string | null
          title?: string
          status?: QuoteStatus
          issue_date?: string | null
          valid_until?: string | null
          vat_rate?: number
          subtotal_pence?: number
          vat_pence?: number
          total_pence?: number
          notes?: string | null
          terms?: string | null
          sent_at?: string | null
          decided_at?: string | null
          follow_up_at?: string | null
          public_token?: string | null
          site_address?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'quotes_client_id_fkey'
            columns: ['client_id']
            isOneToOne: false
            referencedRelation: 'clients'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'quotes_lead_id_fkey'
            columns: ['lead_id']
            isOneToOne: false
            referencedRelation: 'leads'
            referencedColumns: ['id']
          },
        ]
      }
      quote_items: {
        Row: {
          id: string
          quote_id: string
          position: number
          description: string
          note: string | null
          qty: number
          unit: ItemUnit
          unit_price_pence: number
          total_pence: number
        }
        Insert: {
          id?: string
          quote_id: string
          position?: number
          description: string
          note?: string | null
          qty?: number
          unit?: ItemUnit
          unit_price_pence?: number
          total_pence?: number
        }
        Update: {
          id?: string
          quote_id?: string
          position?: number
          description?: string
          note?: string | null
          qty?: number
          unit?: ItemUnit
          unit_price_pence?: number
          total_pence?: number
        }
        Relationships: [
          {
            foreignKeyName: 'quote_items_quote_id_fkey'
            columns: ['quote_id']
            isOneToOne: false
            referencedRelation: 'quotes'
            referencedColumns: ['id']
          },
        ]
      }
      invoices: {
        Row: {
          id: string
          created_at: string
          invoice_number: number
          quote_id: string | null
          client_id: string
          title: string | null
          status: InvoiceStatus
          issue_date: string | null
          due_date: string | null
          vat_rate: number
          subtotal_pence: number
          vat_pence: number
          total_pence: number
          sent_at: string | null
          paid_at: string | null
          payment_method: PaymentMethod | null
          notes: string | null
          public_token: string | null
          site_address: string | null
        }
        Insert: {
          id?: string
          created_at?: string
          invoice_number: number
          quote_id?: string | null
          client_id: string
          title?: string | null
          status?: InvoiceStatus
          issue_date?: string | null
          due_date?: string | null
          vat_rate?: number
          subtotal_pence?: number
          vat_pence?: number
          total_pence?: number
          sent_at?: string | null
          paid_at?: string | null
          payment_method?: PaymentMethod | null
          notes?: string | null
          public_token?: string | null
          site_address?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          invoice_number?: number
          quote_id?: string | null
          client_id?: string
          title?: string | null
          status?: InvoiceStatus
          issue_date?: string | null
          due_date?: string | null
          vat_rate?: number
          subtotal_pence?: number
          vat_pence?: number
          total_pence?: number
          sent_at?: string | null
          paid_at?: string | null
          payment_method?: PaymentMethod | null
          notes?: string | null
          public_token?: string | null
          site_address?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'invoices_quote_id_fkey'
            columns: ['quote_id']
            isOneToOne: false
            referencedRelation: 'quotes'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'invoices_client_id_fkey'
            columns: ['client_id']
            isOneToOne: false
            referencedRelation: 'clients'
            referencedColumns: ['id']
          },
        ]
      }
      invoice_items: {
        Row: {
          id: string
          invoice_id: string
          position: number
          description: string
          note: string | null
          qty: number
          unit: ItemUnit
          unit_price_pence: number
          total_pence: number
        }
        Insert: {
          id?: string
          invoice_id: string
          position?: number
          description: string
          note?: string | null
          qty?: number
          unit?: ItemUnit
          unit_price_pence?: number
          total_pence?: number
        }
        Update: {
          id?: string
          invoice_id?: string
          position?: number
          description?: string
          note?: string | null
          qty?: number
          unit?: ItemUnit
          unit_price_pence?: number
          total_pence?: number
        }
        Relationships: [
          {
            foreignKeyName: 'invoice_items_invoice_id_fkey'
            columns: ['invoice_id']
            isOneToOne: false
            referencedRelation: 'invoices'
            referencedColumns: ['id']
          },
        ]
      }
      item_presets: {
        Row: {
          id: string
          description: string
          unit: ItemUnit
          unit_price_pence: number
          position: number
          created_at: string
        }
        Insert: {
          id?: string
          description: string
          unit?: ItemUnit
          unit_price_pence?: number
          position?: number
          created_at?: string
        }
        Update: {
          id?: string
          description?: string
          unit?: ItemUnit
          unit_price_pence?: number
          position?: number
          created_at?: string
        }
        Relationships: []
      }
      settings: {
        Row: {
          id: number
          company_name: string
          company_number: string
          address: string
          phone: string
          email: string
          vat_registered: boolean
          vat_number: string | null
          bank_name: string | null
          bank_sort_code: string | null
          bank_account_no: string | null
          default_terms: string | null
          quote_counter: number
          invoice_counter: number
        }
        Insert: {
          id?: number
          company_name?: string
          company_number?: string
          address?: string
          phone?: string
          email?: string
          vat_registered?: boolean
          vat_number?: string | null
          bank_name?: string | null
          bank_sort_code?: string | null
          bank_account_no?: string | null
          default_terms?: string | null
          quote_counter?: number
          invoice_counter?: number
        }
        Update: {
          id?: number
          company_name?: string
          company_number?: string
          address?: string
          phone?: string
          email?: string
          vat_registered?: boolean
          vat_number?: string | null
          bank_name?: string | null
          bank_sort_code?: string | null
          bank_account_no?: string | null
          default_terms?: string | null
          quote_counter?: number
          invoice_counter?: number
        }
        Relationships: []
      }
      visualizer_renders: {
        Row: {
          id: string
          created_at: string
          session_id: string
          ip_hash: string | null
          service: VisualizerService
          color_label: string | null
          color_hex: string | null
          finish: string | null
          prompt: string | null
          source_path: string
          result_path: string | null
          model: string | null
          status: VisualizerRenderStatus
          qa_score: number | null
          cost_pence: number
          lead_id: string | null
          customer_email_sent_at: string | null
        }
        Insert: {
          id?: string
          created_at?: string
          session_id: string
          ip_hash?: string | null
          service: VisualizerService
          color_label?: string | null
          color_hex?: string | null
          finish?: string | null
          prompt?: string | null
          source_path: string
          result_path?: string | null
          model?: string | null
          status?: VisualizerRenderStatus
          qa_score?: number | null
          cost_pence?: number
          lead_id?: string | null
          customer_email_sent_at?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          session_id?: string
          ip_hash?: string | null
          service?: VisualizerService
          color_label?: string | null
          color_hex?: string | null
          finish?: string | null
          prompt?: string | null
          source_path?: string
          result_path?: string | null
          model?: string | null
          status?: VisualizerRenderStatus
          qa_score?: number | null
          cost_pence?: number
          lead_id?: string | null
          customer_email_sent_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'visualizer_renders_lead_id_fkey'
            columns: ['lead_id']
            isOneToOne: false
            referencedRelation: 'leads'
            referencedColumns: ['id']
          },
        ]
      }
      visualizer_usage: {
        Row: {
          bucket_key: string
          day: string
          render_count: number
          spend_pence: number
          updated_at: string
        }
        Insert: {
          bucket_key: string
          day?: string
          render_count?: number
          spend_pence?: number
          updated_at?: string
        }
        Update: {
          bucket_key?: string
          day?: string
          render_count?: number
          spend_pence?: number
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: {
      is_admin: {
        Args: Record<string, never>
        Returns: boolean
      }
      next_number: {
        Args: { kind: 'quote' | 'invoice' }
        Returns: number
      }
      /* Atomic quota check+increment for the public visualizer render path.
         Called only via the service-role client. */
      visualizer_check_and_increment: {
        Args: {
          p_session: string
          p_ip_hash: string | null
          p_max_per_session: number
          p_max_per_ip: number
          p_est_cost_pence: number
        }
        Returns: {
          allowed: boolean
          reason?: 'session_limit' | 'ip_limit'
          session_count?: number
          ip_count?: number
        }
      }
      /* Refund a failed render's quota + estimated spend (migration 0008). */
      visualizer_refund: {
        Args: {
          p_session: string
          p_ip_hash: string | null
          p_est_cost_pence: number
        }
        Returns: undefined
      }
      /* Public quote read: token in, one assembled quote out (or null).
         SECURITY DEFINER — the only keyhole anon can reach. */
      get_public_quote: {
        Args: { p_token: string }
        Returns: {
          quote: {
            quote_number: number
            title: string
            status: QuoteStatus
            issue_date: string | null
            valid_until: string | null
            vat_rate: number
            subtotal_pence: number
            vat_pence: number
            total_pence: number
            notes: string | null
            terms: string | null
            public_token: string
            site_address: string | null
          }
          items: {
            description: string
            note: string | null
            qty: number
            unit: ItemUnit
            unit_price_pence: number
            total_pence: number
          }[]
          client: {
            name: string
            address_line1: string | null
            address_line2: string | null
            town: string | null
            postcode: string | null
          }
          company: {
            company_name: string
            company_number: string
            address: string
            phone: string
            email: string
            vat_registered: boolean
            vat_number: string | null
            default_terms: string | null
          }
        } | null
      }
      /* Public invoice read — mirrors get_public_quote, keyed "invoice", with
         the bank fields added to company for the payment block. */
      get_public_invoice: {
        Args: { p_token: string }
        Returns: {
          invoice: {
            invoice_number: number
            title: string | null
            status: InvoiceStatus
            issue_date: string | null
            due_date: string | null
            vat_rate: number
            subtotal_pence: number
            vat_pence: number
            total_pence: number
            notes: string | null
            public_token: string
            site_address: string | null
          }
          items: {
            description: string
            note: string | null
            qty: number
            unit: ItemUnit
            unit_price_pence: number
            total_pence: number
          }[]
          client: {
            name: string
            address_line1: string | null
            address_line2: string | null
            town: string | null
            postcode: string | null
          }
          company: {
            company_name: string
            company_number: string
            address: string
            phone: string
            email: string
            vat_registered: boolean
            vat_number: string | null
            default_terms: string | null
            bank_name: string | null
            bank_sort_code: string | null
            bank_account_no: string | null
          }
        } | null
      }
    }
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}

export type Lead = Database['public']['Tables']['leads']['Row']
export type Client = Database['public']['Tables']['clients']['Row']
export type Quote = Database['public']['Tables']['quotes']['Row']
export type QuoteItem = Database['public']['Tables']['quote_items']['Row']
export type Invoice = Database['public']['Tables']['invoices']['Row']
export type InvoiceItem = Database['public']['Tables']['invoice_items']['Row']
export type ItemPreset = Database['public']['Tables']['item_presets']['Row']
export type Settings = Database['public']['Tables']['settings']['Row']
export type VisualizerRender = Database['public']['Tables']['visualizer_renders']['Row']
export type VisualizerUsage = Database['public']['Tables']['visualizer_usage']['Row']

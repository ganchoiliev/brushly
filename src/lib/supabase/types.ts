/* Hand-authored to match supabase/migrations/0001_init.sql +
   0002_follow_ups.sql + 0003_item_presets.sql + 0004_invoice_sent_at.sql
   exactly. Those migrations are applied to the live project and are the
   schema ground truth — change this file only when a new migration
   lands. */

export type LeadSource = 'website' | 'ads' | 'referral' | 'phone' | 'manual'
export type LeadStatus = 'new' | 'contacted' | 'quoted' | 'won' | 'lost' | 'spam'
export type QuoteStatus = 'draft' | 'sent' | 'accepted' | 'declined' | 'expired'
export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'void'
export type ItemUnit = 'job' | 'day' | 'room' | 'm2' | 'item'
export type PaymentMethod = 'bank_transfer' | 'cash'

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
        }
        Relationships: []
      }
      clients: {
        Row: {
          id: string
          created_at: string
          name: string
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

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      couples: {
        Row: {
          id: string
          user_1_id: string
          user_2_id: string
          split_mode: 'equal' | 'proportional' | 'custom'
          user_1_split_percentage: number
          user_2_split_percentage: number
          created_at: string
        }
        Insert: {
          id?: string
          user_1_id: string
          user_2_id: string
          split_mode?: 'equal' | 'proportional' | 'custom'
          user_1_split_percentage?: number
          user_2_split_percentage?: number
          created_at?: string
        }
        Update: {
          id?: string
          user_1_id?: string
          user_2_id?: string
          split_mode?: 'equal' | 'proportional' | 'custom'
          user_1_split_percentage?: number
          user_2_split_percentage?: number
          created_at?: string
        }
      }
      // Add more tables as needed
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
  }
}

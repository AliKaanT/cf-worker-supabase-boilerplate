export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export interface Database {
  public: {
    Tables: {
      errors: {
        Row: {
          code: string | null;
          created_at: string | null;
          data: Json | null;
          dev_message: string | null;
          id: number;
          ip: string | null;
          message: string | null;
          path: string | null;
          type: string | null;
        };
        Insert: {
          code?: string | null;
          created_at?: string | null;
          data?: Json | null;
          dev_message?: string | null;
          id?: number;
          ip?: string | null;
          message?: string | null;
          path?: string | null;
          type?: string | null;
        };
        Update: {
          code?: string | null;
          created_at?: string | null;
          data?: Json | null;
          dev_message?: string | null;
          id?: number;
          ip?: string | null;
          message?: string | null;
          path?: string | null;
          type?: string | null;
        };
        Relationships: [];
      };
      users: {
        Row: {
          created_at: string | null;
          email: string | null;
          id: string;
          name: string | null;
          surname: string | null;
          username: string | null;
        };
        Insert: {
          created_at?: string | null;
          email?: string | null;
          id: string;
          name?: string | null;
          surname?: string | null;
          username?: string | null;
        };
        Update: {
          created_at?: string | null;
          email?: string | null;
          id?: string;
          name?: string | null;
          surname?: string | null;
          username?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'users_id_fkey';
            columns: ['id'];
            referencedRelation: 'users';
            referencedColumns: ['id'];
          }
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}

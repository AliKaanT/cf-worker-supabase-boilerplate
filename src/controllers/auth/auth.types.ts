import { User } from '@supabase/supabase-js';

export enum AuthRoles {
  Any = 'any',
  User = 'user',
  Admin = 'admin',
}

export interface KVAuthSession {
  access_token: string;
  refresh_token: string;
  user: User;
  expires_at: number;
}

export interface CustomAuthSession {
  custom_access_token: string;
  sb_access_token: string;
  sb_refresh_token: string;
  user: User;
  role: AuthRoles;
  expires_at: number;
}

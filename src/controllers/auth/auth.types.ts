import { User } from '@supabase/supabase-js';

export enum AuthRoles {
  Public = 'public',
  User = 'user',
  Admin = 'admin',
}

export interface CustomAuthSession {
  access_token: string;
  refresh_token: string;
  user: User;
  expires_at: number;
}

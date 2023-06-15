import { createClient } from '@supabase/supabase-js';
import { Context } from 'hono';
import ENV from '../types/ContextEnv.types';
import { Database } from '../types/database.types';

export default async (c: Context<ENV>, next: any): Promise<void> => {
  const ANON_CLIENT = createClient<Database>(c.env.SUPABASE_URL, c.env.SUPABASE_ANON);
  const SERVICE_CLIENT = createClient<Database>(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE);

  c.env.ANON_CLIENT = ANON_CLIENT;
  c.env.SERVICE_CLIENT = SERVICE_CLIENT;

  return next();
};

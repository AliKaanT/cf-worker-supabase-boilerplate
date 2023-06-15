import { SupabaseClient } from '@supabase/supabase-js';
import { KVNamespace } from '@cloudflare/workers-types';
export default interface ENV {
  Bindings: {
    SUPABASE_URL: string;
    SUPABASE_ANON: string;
    SUPABASE_SERVICE: string;
    KV_AUTH_SESSIONS: KVNamespace;
  };
  Variables: {
    ANON_CLIENT: SupabaseClient;
    SERVICE_CLIENT: SupabaseClient;
  };
}

import { Hono } from 'hono';
import type { Context } from 'hono';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import CustomError from './error/CustomError.class';
// eslint-disable-next-line
type Bindings = {
  SUPABASE_URL: string;
  SUPABASE_ANON: string;
  SUPABASE_SERVICE: string;
};
const app = new Hono<{ Bindings: Bindings }>();

app.post('/login', async (c: Context) => {
  const reqBody = await c.req.json();
  const validationSchema = z.object({
    email: z.string().email(),
    password: z.string(),
  });
  const body = validationSchema.safeParse(reqBody);
  if (!body.success) throw new CustomError('AUTH-001', { error: body.error }, 'ValidationError');

  const supabase: SupabaseClient = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_ANON);

  const { data, error } = await supabase.auth.signInWithPassword({
    email: body.data.email,
    password: body.data.password,
  });

  if (error !== null) {
    switch (error.message) {
      case 'Invalid login credentials':
        throw new CustomError('AUTH-002', { error }, 'AuthenticationError');
      case 'Email not confirmed':
        throw new CustomError('AUTH-004', { error }, 'AuthenticationError');
      default:
        throw new CustomError('AUTH-003', { error }, 'SupabaseError');
    }
  }

  c.cookie('AUTH-ACCESS-TOKEN', data.session?.access_token as string, { path: '/', expires: new Date(Date.now() + 86400000) });
  c.cookie('AUTH-REFRESH-TOKEN', data.session?.refresh_token as string, { path: '/', expires: new Date(Date.now() + 86400000) });

  return c.json({ status: 'success', message: 'Successfully logged in' }, 200);
});

app.post('/register', async (c: Context) => {
  const reqBody = await c.req.json();
  const validationSchema = z.object({
    email: z.string().email(),
    password: z.string().min(6).max(128),
    username: z.string().min(3).max(128),
    name: z.string().min(3).max(128),
    surname: z.string().min(3).max(128),
  });
  const body = validationSchema.safeParse(reqBody);

  if (!body.success) throw new CustomError('AUTH-005', { error: body.error }, 'ValidationError');

  const supabase: SupabaseClient = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_ANON);

  const { data, error } = await supabase.auth.signUp({
    email: body.data.email,
    password: body.data.password,
    options: {
      data: {
        username: `${body.data.email.split('@')[0]}-${Math.floor(Math.random() * 10000)}`,
        name: body.data.name,
        surname: body.data.surname,
        role: 'user',
      },
    },
  });

  if (error !== null) throw new CustomError('AUTH-006', { error }, 'SupabaseError');
  if (data.user?.identities?.length === 0) throw new CustomError('AUTH-007', { error }, 'AuthenticationError');

  return c.json({ status: 'success', message: 'Successfully registered, Please confirm your email' }, 200);
});

app.get('/check-session', async (c: Context) => {
  try {
    await AuthMW(c, async () => {});
  } catch (e) {
    return c.json({ status: 'success', message: 'Session is not valid', data: false }, 200);
  }
  return c.json({ status: 'success', message: 'Session is valid', data: true }, 200);
});

// eslint-disable-next-line @typescript-eslint/no-invalid-void-type
async function AuthMW(c: Context, next: () => Promise<void>): Promise<Response | void> {
  try {
    const supabase = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_ANON, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const access_token = c.req.cookie('AUTH-ACCESS-TOKEN') ?? c.req.header('AUTH-ACCESS-TOKEN') ?? '';
    const refresh_token = c.req.cookie('AUTH-REFRESH-TOKEN') ?? c.req.header('AUTH-REFRESH-TOKEN') ?? '';

    const { error } = await supabase.auth.setSession({ access_token, refresh_token });
    if (error !== null) throw new CustomError('Unauthorized', { error }, 'AuthorizationError');

    c.set('supabaseUserClient', supabase);
    await next();
  } catch (e) {
    throw new CustomError('Unauthorized', {}, 'AuthorizationError');
  }
}

export default app;
export { AuthMW };

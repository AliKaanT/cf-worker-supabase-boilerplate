import { Hono } from 'hono';
import ErrorHandler from './error/ErrorHandler';
import setSupabaseClientsMw from './middlewares/setSupabaseClients.mw';
import ENV from './types/ContextEnv.types';
import Auth from './controllers/auth/auth.controller';
import authMw from './middlewares/auth.mw';
import { AuthRoles } from './controllers/auth/auth.types';

const app = new Hono<ENV>();

// Middlewares
app.use('/*', setSupabaseClientsMw);

app.post('/auth/login', Auth.login);

app.get('/test', authMw(AuthRoles.Public), async (c) => {
  const supabase = c.get('SERVICE_CLIENT');

  const res = await supabase.from('users').select('*');

  return c.json(res, 200);
});

app.onError(ErrorHandler);

export default app;

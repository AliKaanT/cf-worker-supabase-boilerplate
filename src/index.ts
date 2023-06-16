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
app.post('/auth/logout', authMw(AuthRoles.Any), Auth.logout);
app.get('/auth/check-session', authMw(AuthRoles.Any), Auth.checkSession);

app.get('/test', async (c) => {
  return c.text('f');
});

app.onError(ErrorHandler);

export default app;

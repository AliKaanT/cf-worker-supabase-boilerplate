import { Context, Hono } from 'hono';
import ErrorHandler from './error/ErrorHandler';
import setSupabaseClientsMw from './middlewares/setSupabaseClients.mw';
import ENV from './types/ContextEnv.types';
import Auth from './controllers/auth/auth.controller';
import authMw from './middlewares/auth.mw';
// import loggerMw from './middlewares/logger.mw';
import { AuthRoles } from './controllers/auth/auth.types';

const app = new Hono<ENV>();

// Middlewares
app.use('/*', setSupabaseClientsMw);
// app.use('/*', loggerMw); // using logger adding min 60ms to response time

app.post('/auth/login', Auth.login); // Login user
app.post('/auth/logout', authMw(AuthRoles.Any), Auth.logout); // Logout user
app.get('/auth/check-session', authMw(AuthRoles.Any), Auth.checkSession); // Check if session is valid
app.get('/auth/get-user', authMw(AuthRoles.Any), Auth.getUser); // Get user info
app.post('/auth/register', Auth.register); // Register user
app.post('/auth/forgot-password', Auth.forgotPassword); // Send email with reset token
app.post('/auth/reset-password', Auth.resetPassword); // Reset password with reset token
app.post('/auth/change-password', authMw(AuthRoles.Any), Auth.changePassword);
app.post('/auth/initialize-session', Auth.initializeSession); // Inıtialize session with supabase tokens

app.get('/test', async (c: Context<ENV>) => {
  return c.text('Hello World');
});

app.onError(ErrorHandler);

export default app;

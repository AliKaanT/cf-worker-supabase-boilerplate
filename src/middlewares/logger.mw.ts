import { Context } from 'hono';
import ENV from '../types/ContextEnv.types';

export default async (c: Context<ENV>, next: any) => {
  await next();

  const request = {
    path: c.req.path,
    method: c.req.method,
    status: c.res.status,
  };
  const userSession = c.get('CUSTOM_AUTH_SESSION');
  const user = {
    id: userSession?.user.id,
    email: userSession?.user.email,
    role: userSession?.role,
    ip: c.req.headers.get('cf-connecting-ip'),
  };

  const log = {
    request,
    user,
  };

  // save into db
  await c.get('SERVICE_CLIENT').from('logs').insert(log);
};

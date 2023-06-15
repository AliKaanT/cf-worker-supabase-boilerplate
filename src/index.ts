import { Hono } from 'hono';
import CustomError, { ErrorTypes } from './error/CustomError.class';
import ErrorHandler from './error/ErrorHandler';
import setSupabaseClientsMw from './middlewares/setSupabaseClients.mw';
import ENV from './types/ContextEnv.types';

const app = new Hono<ENV>();

// Middlewares
app.use('/*', setSupabaseClientsMw);

app.get('/', async (c) => {
  throw new CustomError('AUTH-001', { error: 'test' }, ErrorTypes.ValidationError);

  // return c.json({ status: 'success', message: 'Hello World!' }, 200);
});

app.onError(ErrorHandler);

export default app;

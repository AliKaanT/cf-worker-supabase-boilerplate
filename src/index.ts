import { Hono } from 'hono';
import type { Context } from 'hono';
import auth from './auth';
import CustomError from './error/CustomError.class';
const app = new Hono<{
  Bindings: {
    SUPABASE_URL: string;
    SUPABASE_ANON: string;
    SUPABASE_SERVICE: string;
  };
}>();

app.route('/', auth);

app.get('/', (c: Context) => {
  return c.text('Hello World!');
});

app.onError((err, c) => {
  if (err instanceof CustomError) {
    // await err.saveErrorToDatabase(supabase);
    const error = err.toJSON();
    return c.json(
      {
        status: 'error',
        code: error.code,
        message: error.message,
        devMessage: error.devMessage,
        data: error.data,
      },
      400
    );
  }
  return c.json({ status: 'error', message: err.message }, 500);
});

export default app;

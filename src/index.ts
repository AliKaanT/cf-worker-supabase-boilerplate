import { Hono } from 'hono';
import type { Context } from 'hono';
import auth from './auth';
import CustomError from './error/CustomError.class';
import { createClient } from '@supabase/supabase-js';
const app = new Hono<{
  Bindings: {
    SUPABASE_URL: string;
    SUPABASE_ANON: string;
    SUPABASE_SERVICE: string;
  };
}>();

app.route('/', auth);

app.onError(async (err: Error, c: Context) => {
  try {
    const supabase = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE);
    if (err instanceof CustomError) {
      await err.saveErrorToDatabase(supabase);
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
    await supabase.from('errors').insert({
      code: 'unknown',
      extra: err,
    });
    return c.json({ status: 'error', message: err?.message }, 500);
  } catch (err) {
    return c.text('!Internal Server Error', 500);
  }
});

export default app;

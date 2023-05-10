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

// eslint-disable-next-line
// @ts-ignore
app.onError(async (err: Error, c: Context) => {
  try {
    const supabase = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE);
    if (err instanceof CustomError) {
      await err.saveErrorToDatabase(supabase, c.req.headers.get('cf-connecting-ip'));
      return err.returnDevResponse(c);
    } else {
      // if its not CustomError
      await supabase.from('errors').insert({
        code: 'unknown',
        extra: err,
      });
      return c.json({ status: 'error', message: err?.message }, 500);
    }
  } catch (err) {
    // if something goes wrong, when handling error
    return c.text('!Internal Server Error', 500);
  }
});

export default app;

import { Context } from 'hono';
import { createClient } from '@supabase/supabase-js';
import CustomError from './CustomError.class';
import ENV from '../types/ContextEnv.types';

export default async (err: Error, c: Context<ENV>): Promise<Response> => {
  try {
    const supabase = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE);
    if (err instanceof CustomError) {
      await err.saveErrorToDatabase(supabase, c.req.headers.get('cf-connecting-ip'));
      return err.getResponseObject(c);
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
};

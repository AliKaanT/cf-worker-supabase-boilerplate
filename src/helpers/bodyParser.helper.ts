import { Context } from 'hono';
import ENV from '../types/ContextEnv.types';
import { z } from 'zod';
import CustomError, { ErrorTypes } from '../error/CustomError.class';

export async function parseBodyByContentType<T>(c: Context<ENV>, schema: z.ZodTypeAny, errCode: string): Promise<T> {
  let body: any;
  if (c.req.header('content-type') === 'application/json') {
    body = await c.req.json();
  } else {
    body = await c.req.parseBody();
  }

  const validation = schema.safeParse(body);
  if (!validation.success) {
    throw new CustomError(errCode, validation.error, ErrorTypes.ValidationError);
  }
  return validation.data as T;
}

import type { SupabaseClient } from '@supabase/supabase-js';
import importedErrors from './data/errors';
import type { Context } from 'hono';
import ENV from '../types/ContextEnv.types';
interface ICustomError {
  code: string;
  message: string;
  devMessage: string;
  data?: object;
  type: ErrorTypes;
}

export enum ErrorTypes {
  'ValidationError' = 'ValidationError',
  'AuthenticationError' = 'AuthenticationError',
  'AuthorizationError' = 'AuthorizationError',
  'InternalError' = 'InternalError',
  'UnknownError' = 'UnknownError',
  'SupabaseError' = 'SupabaseError',
}

const statusCodes: Record<ErrorTypes, number> = {
  ValidationError: 400,
  AuthenticationError: 401,
  AuthorizationError: 403,
  InternalError: 500,
  UnknownError: 500,
  SupabaseError: 500,
};

const errors: Record<string, { message: string; devMessage: string }> = importedErrors;
export default class CustomError extends Error implements ICustomError {
  public readonly code: string;
  public readonly message: string;
  public readonly devMessage: string;
  public readonly data?: object;
  public readonly type: ErrorTypes;

  constructor(code: string, data: object, type: ErrorTypes) {
    super();
    this.code = code;
    this.message = errors[code]?.message ?? 'Unknown Error Code';
    this.devMessage = errors[code]?.devMessage ?? 'Unknown Error Code';
    this.type = type ?? ErrorTypes.UnknownError;
    this.data = data;
  }

  /**
   *
   * @returns {object} returns the error object without devMessage also it removes data property if it's not allowed
   */
  private toProdJSON(): Pick<ICustomError, 'code' | 'message' | 'data'> {
    const object = {
      code: this.code,
      message: this.message,
      data: this.data,
    };

    const AllowedTypes = [ErrorTypes.ValidationError];

    if (!AllowedTypes.includes(this.type)) {
      delete object.data;
    }

    return object;
  }

  /**
   *
   * @param c is a instance of Context class from hono
   * @param isDev is a boolean which tells if the error is in development mode or not, if it's null then it checks the ENV variable
   * @returns {Response} returns the response object it removes devMessage depends on Env type
   */
  public getResponseObject(c: Context<ENV>, isDev?: boolean): Response {
    if (isDev === undefined) {
      isDev = c.env.ENV_MODE?.toLocaleLowerCase() === 'development';
    }

    if (isDev) {
      const response = { status: 'error', error: { ...this } };
      return c.json(response, statusCodes[this.type]); // type is the status code
    } else {
      const response = { status: 'error', error: { ...this.toProdJSON() } };
      return c.json(response, statusCodes[this.type]); // type is the status code
    }
  }

  /**
   *
   * @param supabase is a instance of SupabaseClient class from supabase/supabase-js
   * @param ip of the user who got the error. Nullable
   * @returns {boolean} returns true if the error is saved to database successfully
   */
  public async saveErrorToDatabase(supabase: SupabaseClient, ip: string | null, path: string): Promise<boolean> {
    const { error } = await supabase.from('errors').insert({
      type: this.type.toString(),
      code: this.code,
      message: this.message,
      devMessage: this.devMessage,
      data: this.data,
      ip: ip ?? null,
      path,
    });
    if (error !== null) {
      return false;
    }
    return true;
  }
}

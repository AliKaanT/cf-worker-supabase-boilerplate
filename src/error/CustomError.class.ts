import type { SupabaseClient } from '@supabase/supabase-js';
import errors from './errors';
interface CustomErrorType {
  code: string;
  message: string;
  devMessage?: string;
  data?: object;
}

export default class CustomError extends Error {
  errors: Record<string, Omit<CustomErrorType, 'code'>> = errors;

  code: string;
  error: CustomErrorType = {
    code: 'unknown',
    message: 'unknown',
    devMessage: 'unknown',
    data: {},
  };

  constructor(code: string, data?: object) {
    super();
    this.code = code;
    this.error = {
      code,
      ...this.errors[code],
      data,
    };
  }

  public toJSON(): CustomErrorType {
    return this.error;
  }

  public async saveErrorToDatabase(supabase: SupabaseClient): Promise<void> {
    // save error to database
    const { error } = await supabase.from('errors').insert([this.error]);
    if (error !== null) {
      throw new Error(error.message);
    }
  }
}

import type { SupabaseClient } from '@supabase/supabase-js';
import importedErrors from './errors';
interface CustomErrorType {
  code: string;
  message: string;
  devMessage: string;
  data?: object;
  type: ErrorType;
}
enum ErrorType {
  'ValidationError' = 'ValidationError',
  'AuthenticationError' = 'AuthenticationError',
  'InternalError' = 'InternalError',
  'UnknownError' = 'UnknownError',
}
const errors: Record<string, { message: string; devMessage: string }> = importedErrors;
export default class CustomError extends Error {
  private readonly error: CustomErrorType;

  private readonly type: ErrorType;

  constructor(code: string, data?: object, type?: ErrorType | string) {
    super();
    // next 2 line of code assigns the type of error based on "type" parameter which could be either string or directly ErrorType enum
    if (typeof type === 'string') {
      this.type = ErrorType[type as keyof typeof ErrorType] ?? ErrorType.UnknownError;
    } else {
      this.type = type ?? ErrorType.UnknownError;
    }
    this.error = {
      code,
      ...errors[code],
      data,
      type: this.type,
    };
  }

  public toJSON(): CustomErrorType {
    return this.error;
  }

  public toUserJSON(): Pick<CustomErrorType, 'code' | 'message'> & { data?: object } {
    // this function returns the error object without devMessage also it removes data property if it's not allowed
    const object = {
      code: this.error.code,
      message: this.error.message,
      data: this.error.data,
    };

    const AllowedTypes = [ErrorType.ValidationError];

    if (!AllowedTypes.includes(this.type)) {
      delete object.data;
    }

    return object;
  }

  public async saveErrorToDatabase(supabase: SupabaseClient, ip: string | null): Promise<boolean> {
    const { error } = await supabase.from('errors').insert({
      type: this.type.toString(),
      code: this.error.code,
      message: this.error.message,
      devMessage: this.error.devMessage,
      data: this.error.data,
      ip: ip ?? null,
      extra: null,
    });
    if (error !== null) {
      return false;
    }
    return true;
  }
}

import type { SupabaseClient } from '@supabase/supabase-js';
import importedErrors from './errors';
import type { Context } from 'hono';
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
  'AuthorizationError' = 'AuthorizationError',
  'InternalError' = 'InternalError',
  'UnknownError' = 'UnknownError',
  'SupabaseError' = 'SupabaseError',
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

  public toProdJSON(): Pick<CustomErrorType, 'code' | 'message'> & { data?: object } {
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

  public returnDevResponse(c: Context): Response {
    const response = { status: 'error', ...this.error };

    switch (this.type) {
      case ErrorType.ValidationError:
      case ErrorType.AuthenticationError:
        return c.json(response, 400);
      case ErrorType.InternalError:
      case ErrorType.UnknownError:
      case ErrorType.SupabaseError:
        return c.json(response, 500);
      case ErrorType.AuthorizationError:
        return c.json(response, 401);
      default:
        return c.json(response, 500);
    }
  }

  public returnProdResponse(c: Context): Response {
    const response = { status: 'error', ...this.toProdJSON() };

    switch (this.type) {
      case ErrorType.ValidationError:
      case ErrorType.AuthenticationError:
        return c.json(response, 400);
      case ErrorType.InternalError:
      case ErrorType.UnknownError:
      case ErrorType.SupabaseError:
        return c.json(response, 500);
      case ErrorType.AuthorizationError:
        return c.json(response, 401);
      default:
        return c.json(response, 500);
    }
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

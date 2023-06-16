import { Context } from 'hono';
import ENV from '../../types/ContextEnv.types';
import { parseBodyByContentType } from '../../helpers/bodyParser.helper';
import { changePasswordReqBodySchema, forgotPasswordReqBodySchema, loginReqBodySchema, resetPasswordReqBodySchema, resgisterReqBodySchema } from './schema';
import { z } from 'zod';
import CustomError, { ErrorTypes } from '../../error/CustomError.class';
import { generateRandomString } from '../../helpers/general.helper';
import { setCookie } from 'hono/cookie';
import { KVAuthSession } from './auth.types';
export interface IAuth {
  login: (c: Context<ENV>) => Promise<Response>;
  logout: (c: Context<ENV>) => Promise<Response>;
  checkSession: (c: Context<ENV>) => Promise<Response>;
  getUser: (c: Context<ENV>) => Promise<Response>;
  register: (c: Context<ENV>) => Promise<Response>;
  forgotPassword: (c: Context<ENV>) => Promise<Response>;
  resetPassword: (c: Context<ENV>) => Promise<Response>;
  changePassword: (c: Context<ENV>) => Promise<Response>;
}

class Auth implements IAuth {
  public async login(c: Context<ENV>): Promise<Response> {
    const body = await parseBodyByContentType<z.infer<typeof loginReqBodySchema>>(c, loginReqBodySchema);

    const supabaseClient = c.get('ANON_CLIENT');

    const { data: loginData, error: loginError } = await supabaseClient.auth.signInWithPassword({
      email: body.email,
      password: body.password,
    });

    if (loginError !== null) {
      if (loginError.message.includes('credentials')) {
        throw new CustomError('AUTH-002', loginError, ErrorTypes.AuthenticationError);
      } else if (loginError.message.includes('confirm')) {
        // resend email confirm email
        await supabaseClient.auth.resend({ email: body.email, type: 'signup' });
        throw new CustomError('AUTH-003', loginError, ErrorTypes.AuthenticationError);
      }
      throw new CustomError('Supabase', loginError, ErrorTypes.SupabaseError);
    }

    const custom_access_token = generateRandomString(128);

    const custom_session: KVAuthSession = {
      access_token: loginData.session.access_token,
      refresh_token: loginData.session.refresh_token,
      user: loginData.user,
      expires_at: Date.now() + 1000 * 60 * 60 * 24 * 30, // 30 days TODO : remember me
    };

    await c.env.KV_AUTH_SESSIONS.put(custom_access_token, JSON.stringify(custom_session));

    setCookie(c, 'AUTH-ACCESS-TOKEN', custom_access_token, {
      path: '/',
      expires: new Date(custom_session.expires_at),
    });

    return c.json({
      status: 'success',
      message: 'Succesfully logged in.',
      data: {
        'AUTH-ACCESS-TOKEN': custom_access_token,
      },
    });
  }

  public async logout(c: Context<ENV>): Promise<Response> {
    const session = c.get('CUSTOM_AUTH_SESSION');

    await c.env.KV_AUTH_SESSIONS.delete(session.custom_access_token);

    return c.json({
      status: 'success',
      message: 'Succesfully logged out.',
    });
  }

  public async checkSession(c: Context<ENV>): Promise<Response> {
    const session = c.get('CUSTOM_AUTH_SESSION');

    return c.json({
      status: 'success',
      message: 'Session is valid.',
      role: session.role,
      isValid: true,
    });
  }

  public async getUser(c: Context<ENV>): Promise<Response> {
    const session = c.get('CUSTOM_AUTH_SESSION');

    return c.json({
      message: 'User data',
      data: { email: session.user.email, ...session.user.user_metadata, role: session.user.app_metadata.role },
    });
  }

  public async register(c: Context<ENV>): Promise<Response> {
    const body = await parseBodyByContentType<z.infer<typeof resgisterReqBodySchema>>(c, resgisterReqBodySchema);

    const supabaseClient = c.get('SERVICE_CLIENT');

    const { error: registerError } = await supabaseClient.auth.admin.createUser({
      email: body.email,
      password: body.password,
      email_confirm: false,
      user_metadata: {
        name: body.name,
        surname: body.surname,
        username: body.username,
      },
      app_metadata: {
        role: 'user',
      },
    });

    if (registerError !== null) {
      if (registerError.message.includes('unique') || registerError.message.includes('already')) {
        throw new CustomError('AUTH-001', registerError, ErrorTypes.AuthenticationError);
      }
      throw new CustomError('Supabase', registerError, ErrorTypes.SupabaseError);
    }

    return c.json({
      status: 'success',
      message: 'Succesfully registered. Please check your email for verification.',
    });
  }

  public async forgotPassword(c: Context<ENV>): Promise<Response> {
    const body = await parseBodyByContentType<z.infer<typeof forgotPasswordReqBodySchema>>(c, forgotPasswordReqBodySchema);

    const supabaseClient = c.get('SERVICE_CLIENT');
    console.log(body.email);
    const { error: forgotPasswordError } = await supabaseClient.auth.resetPasswordForEmail(body.email, {
      redirectTo: c.env.RESET_PASSWORD_REDIRECT_URL,
    });
    if (forgotPasswordError !== null) {
      throw new CustomError('Supabase', forgotPasswordError, ErrorTypes.SupabaseError);
    }

    return c.json({
      status: 'success',
      message: 'Succesfully sent reset password email.',
    });
  }

  public async resetPassword(c: Context<ENV>): Promise<Response> {
    const body = await parseBodyByContentType<z.infer<typeof resetPasswordReqBodySchema>>(c, resetPasswordReqBodySchema);

    const supabaseClient = c.get('ANON_CLIENT');

    const { error: sessionError } = await supabaseClient.auth.setSession({ access_token: body.access_token, refresh_token: body.refresh_token });

    if (sessionError !== null) {
      throw new CustomError('Supabase', sessionError, ErrorTypes.SupabaseError);
    }

    const { error: resetPasswordError } = await supabaseClient.auth.updateUser({
      password: body.password,
    });

    if (resetPasswordError !== null) {
      throw new CustomError('Supabase', resetPasswordError, ErrorTypes.SupabaseError);
    }

    return c.json({
      status: 'success',
      message: 'Succesfully reset password.',
    });
  }

  public async changePassword(c: Context<ENV>): Promise<Response> {
    const body = await parseBodyByContentType<z.infer<typeof changePasswordReqBodySchema>>(c, changePasswordReqBodySchema);

    const session = c.get('CUSTOM_AUTH_SESSION');

    const supabaseClient = c.get('ANON_CLIENT');

    const { error: loginError } = await supabaseClient.auth.signInWithPassword({
      email: session.user.email ?? '',
      password: body.old_password,
    });

    if (loginError !== null) {
      throw new CustomError('AUTH-004', {}, ErrorTypes.AuthenticationError);
    }

    const { error: changePasswordError } = await supabaseClient.auth.updateUser({
      password: body.new_password,
    });

    if (changePasswordError !== null) {
      throw new CustomError('Supabase', changePasswordError, ErrorTypes.SupabaseError);
    }

    return c.json({
      status: 'success',
      message: 'Succesfully changed password.',
    });
  }
}

export default new Auth();

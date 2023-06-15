import { Context } from 'hono';
import ENV from '../../types/ContextEnv.types';
import { parseBodyByContentType } from '../../helpers/bodyParser.helper';
import { loginReqBodySchema } from './schema';
import { z } from 'zod';
import CustomError, { ErrorTypes } from '../../error/CustomError.class';
import { generateRandomString } from '../../helpers/general.helper';
import { setCookie, getCookie } from 'hono/cookie';
import { CustomAuthSession } from './auth.types';
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
    const body = await parseBodyByContentType<z.infer<typeof loginReqBodySchema>>(c, loginReqBodySchema, 'AUTH-001');

    const supabaseClient = c.get('ANON_CLIENT');

    const { data: loginData, error: loginError } = await supabaseClient.auth.signInWithPassword({
      email: body.email,
      password: body.password,
    });

    if (loginError !== null) {
      throw new CustomError('AUTH-002', loginError, ErrorTypes.SupabaseError);
    }

    const custom_access_token = generateRandomString(128);

    const custom_session: CustomAuthSession = {
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
      message: 'Succesfully logged in.',
      data: {
        'AUTH-ACCESS-TOKEN': custom_access_token,
      },
    });
  }
}

export default new Auth();

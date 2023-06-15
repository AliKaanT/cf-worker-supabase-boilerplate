import { Context } from 'hono';
import ENV from '../types/ContextEnv.types';
import { AuthRoles, CustomAuthSession } from '../controllers/auth/auth.types';
import CustomError, { ErrorTypes } from '../error/CustomError.class';
import { getCookie } from 'hono/cookie';
import { AuthSession, User } from '@supabase/supabase-js';

class AuthClient {
  private isAuth: boolean = false;
  private readonly role: AuthRoles = AuthRoles.Public; // TODO : role system
  private readonly c: Context<ENV>;
  private reason: string = '';

  constructor(c: Context<ENV>) {
    this.c = c;
  }

  public async init(): Promise<void> {
    await this.authAttempt();
  }

  public getIsAuth = (): boolean => this.isAuth;
  public getRole = (): AuthRoles => this.role;
  public getReason = (): string => this.reason;

  private async checkCustomSession(custom_access_token: string): Promise<CustomAuthSession | null> {
    const kv_value = await this.c.env.KV_AUTH_SESSIONS.get(custom_access_token);

    if (kv_value === null) {
      this.reason = 'KV value is null';
      return null;
    }

    const custom_session: CustomAuthSession = JSON.parse(kv_value);

    if (custom_session.expires_at < Date.now()) {
      this.reason = 'Session expired';
      return null;
    }

    return custom_session;
  }

  private async createSupabaseSession(custom_session: CustomAuthSession): Promise<{
    user: User | null;
    session: AuthSession | null;
  } | null> {
    const { error: authError } = await this.c.get('ANON_CLIENT').auth.setSession({
      access_token: custom_session.access_token,
      refresh_token: custom_session.refresh_token,
    });

    if (authError === null) {
      // Both sessions are valid
      this.isAuth = true;
      this.reason = 'Both sessions are valid';
      return null;
    }

    // Custom session is valid but supabase session is not, Lets make a new supabase session

    const { data: mailData, error: mailErr } = await this.c.get('SERVICE_CLIENT').auth.admin.generateLink({
      type: 'magiclink',
      email: custom_session.user.email ?? '',
    });

    if (mailErr !== null) {
      this.reason = 'Failed to generate magic link';
      return null;
    }

    const { data: newSession, error: verifyError } = await this.c.get('ANON_CLIENT').auth.verifyOtp({
      type: 'email',
      email: custom_session.user.email ?? '',
      token: mailData.properties?.email_otp,
    });

    if (verifyError !== null) {
      this.reason = 'Failed to verify magic link';
      return null;
    }

    return newSession;
  }

  private async authAttempt(): Promise<void> {
    try {
      const custom_access_token = this.c.req.header('AUTH-ACCESS-TOKEN') ?? getCookie(this.c, 'AUTH-ACCESS-TOKEN');

      if (custom_access_token === null || custom_access_token === undefined || custom_access_token === '') {
        this.reason = 'No custom access token';
        return;
      }

      // Checks from KV_AUTH_SESSIONS if custom session is valid
      const custom_session = await this.checkCustomSession(custom_access_token);
      if (custom_session === null) return;

      // This function either sets the session or creates a new session
      const newSupabaseSession = await this.createSupabaseSession(custom_session);
      if (newSupabaseSession === null) return;

      // If code reaches here, it means that the custom session is valid but the supabase session is not
      // and we are putting the new supabase session in KV_AUTH_SESSIONS
      await this.c.env.KV_AUTH_SESSIONS.put(
        custom_access_token,
        JSON.stringify({
          access_token: newSupabaseSession.session?.access_token,
          refresh_token: newSupabaseSession.session?.refresh_token,
          user: newSupabaseSession.user,
          expires_at: custom_session.expires_at,
        })
      );

      this.isAuth = true;
      this.reason = 'Custom session is valid but supabase session is not';
    } catch (err) {
      this.reason = 'Unknown error';
    }
  }
}

export default (role: AuthRoles): ((c: Context<ENV>, next: any) => Promise<void>) => {
  return async (c: Context<ENV>, next: any): Promise<void> => {
    const authClient = new AuthClient(c);
    await authClient.init();

    if (!authClient.getIsAuth()) throw new CustomError('Unauthenticated', {}, ErrorTypes.AuthenticationError);
    // if (authClient.getRole() !== role) throw new CustomError('Unauthorized', {}, ErrorTypes.AuthorizationError);
    // TODO : role system & maybe we can set this AuthClient in the context with additional object properties we can even store the user object in the context
    await next();
  };
};

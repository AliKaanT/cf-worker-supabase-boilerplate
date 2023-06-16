import { Context } from 'hono';
import ENV from '../types/ContextEnv.types';
import { AuthRoles, CustomAuthSession, KVAuthSession } from '../controllers/auth/auth.types';
import CustomError, { ErrorTypes } from '../error/CustomError.class';
import { getCookie } from 'hono/cookie';
import { AuthSession, Session, User } from '@supabase/supabase-js';

class AuthClient {
  private readonly c: Context<ENV>;
  private isAuth: boolean = false;
  private role: AuthRoles = AuthRoles.Any;

  private sb_aceess_token: string = '';
  private sb_refresh_token: string = '';
  private readonly custom_access_token: string;
  private user: User | null = null;
  private expires_at: number = 0;

  constructor(c: Context<ENV>) {
    this.c = c;
    this.custom_access_token = this.c.req.header('AUTH-ACCESS-TOKEN') ?? getCookie(this.c, 'AUTH-ACCESS-TOKEN') ?? '';
  }

  public async init(): Promise<void> {
    await this.authAttempt();
  }

  public getIsAuth = (): boolean => this.isAuth;
  public getRole = (): AuthRoles => this.role;

  public getStorableSession(): CustomAuthSession | null {
    if (!this.isAuth) return null;
    if (this.user === null) return null;
    return {
      custom_access_token: this.custom_access_token,
      sb_access_token: this.sb_aceess_token,
      sb_refresh_token: this.sb_refresh_token,
      user: this.user,
      role: this.role,
      expires_at: this.expires_at,
    };
  }

  private authSuccess(sb_session: Session, user: User, expires_at: number): void {
    this.isAuth = true;
    this.role = user.app_metadata?.role ?? this.role;
    this.sb_aceess_token = sb_session.access_token;
    this.sb_refresh_token = sb_session.refresh_token;
    this.user = user;
    this.expires_at = expires_at;
  }

  private async checkCustomSession(custom_access_token: string): Promise<KVAuthSession | null> {
    const kv_value = await this.c.env.KV_AUTH_SESSIONS.get(custom_access_token);

    if (kv_value === null) {
      return null;
    }

    const custom_session: KVAuthSession = JSON.parse(kv_value);

    if (custom_session.expires_at < Date.now()) {
      return null;
    }

    return custom_session;
  }

  private async createSupabaseSession(custom_session: KVAuthSession): Promise<{
    user: User | null;
    session: AuthSession | null;
  } | null> {
    const { data: authData, error: authError } = await this.c.get('ANON_CLIENT').auth.setSession({
      access_token: custom_session.access_token,
      refresh_token: custom_session.refresh_token,
    });

    if (authError === null && authData.session !== null && authData.user !== null) {
      // Both sessions are valid
      this.authSuccess(authData?.session, authData?.user, custom_session.expires_at);
    }

    // Custom session is valid but supabase session is not, Lets make a new supabase session

    const { data: mailData, error: mailErr } = await this.c.get('SERVICE_CLIENT').auth.admin.generateLink({
      type: 'magiclink',
      email: custom_session.user.email ?? '',
    });

    if (mailErr !== null) {
      return null;
    }

    const { data: newSession, error: verifyError } = await this.c.get('ANON_CLIENT').auth.verifyOtp({
      type: 'email',
      email: custom_session.user.email ?? '',
      token: mailData.properties?.email_otp,
    });

    if (verifyError !== null) {
      return null;
    }

    return newSession;
  }

  private async authAttempt(): Promise<void> {
    try {
      const custom_access_token = this.c.req.header('AUTH-ACCESS-TOKEN') ?? getCookie(this.c, 'AUTH-ACCESS-TOKEN');

      if (custom_access_token === null || custom_access_token === undefined || custom_access_token === '') {
        return;
      }

      // Checks from KV_AUTH_SESSIONS if custom session is valid
      const custom_session = await this.checkCustomSession(custom_access_token);
      if (custom_session === null) return;

      // This function either sets the session or creates a new session
      const newSupabaseSession = await this.createSupabaseSession(custom_session);
      if (newSupabaseSession === null || newSupabaseSession.session === null || newSupabaseSession.user === null) return;

      // If code reaches here, it means that the custom session is valid but the supabase session is not
      // and we are putting the new supabase session in KV_AUTH_SESSIONS
      await this.c.env.KV_AUTH_SESSIONS.put(
        custom_access_token,
        JSON.stringify({
          access_token: newSupabaseSession.session?.access_token,
          refresh_token: newSupabaseSession.session?.refresh_token,
          user: newSupabaseSession.user,
          expires_at: custom_session.expires_at,
        }),
        {
          expiration: custom_session.expires_at,
        }
      );

      this.authSuccess(newSupabaseSession?.session, newSupabaseSession?.user, custom_session.expires_at);
    } catch (err) {}
  }
}

export default (...role: AuthRoles[]): ((c: Context<ENV>, next: any) => Promise<void>) => {
  return async (c: Context<ENV>, next: any): Promise<void> => {
    const authClient = new AuthClient(c);
    await authClient.init();

    if (!authClient.getIsAuth()) throw new CustomError('Unauthenticated', {}, ErrorTypes.AuthenticationError);

    let authorized = false; // true if any of the roles match
    role.forEach((r) => {
      if (r === authClient.getRole()) authorized = true;
      if (r === AuthRoles.Any) authorized = true;
    });
    if (!authorized) throw new CustomError('Unauthorized', {}, ErrorTypes.AuthorizationError);

    const session = authClient.getStorableSession();
    if (session !== null) c.set('CUSTOM_AUTH_SESSION', session);

    await next();
  };
};

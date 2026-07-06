import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { env } from './env';

export function configurePassport(): void {
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET || !env.GOOGLE_CALLBACK_URL) return;

  passport.use(
    new GoogleStrategy(
      {
        clientID: env.GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET,
        callbackURL: env.GOOGLE_CALLBACK_URL,
      },
      (_accessToken, _refreshToken, profile, done) => {
        const email = profile.emails?.[0]?.value;
        if (!email) return done(new Error('No email in Google profile'));

        // Not a JwtPayload — passport's `done()` is used here only to ferry the
        // Google profile through to the /google/callback route, which mints real tokens.
        done(null, {
          id: profile.id,
          email,
          firstName: profile.name?.givenName ?? '',
          lastName: profile.name?.familyName ?? '',
          avatarUrl: profile.photos?.[0]?.value,
        } as unknown as Express.User);
      },
    ),
  );
}

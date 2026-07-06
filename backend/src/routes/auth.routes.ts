import { Router } from 'express';
import passport from 'passport';
import { register, login, refresh, logout, me, updateMe } from '../controllers/auth.controller';
import { validate } from '../middleware/validate';
import { authenticate } from '../middleware/auth';
import { authRateLimiter } from '../middleware/rateLimiter';
import {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  updateProfileSchema,
} from '../validators/auth.validator';
import { AuthService } from '../services/auth.service';
import { env } from '../config/env';

const router = Router();
const authService = new AuthService();

router.post('/register', authRateLimiter, validate(registerSchema), register);
router.post('/login', authRateLimiter, validate(loginSchema), login);
router.post('/refresh', validate(refreshTokenSchema), refresh);
router.post('/logout', authenticate, validate(refreshTokenSchema), logout);
router.get('/me', authenticate, me);
router.patch('/me', authenticate, validate(updateProfileSchema), updateMe);

// Google OAuth
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'], session: false }));

router.get(
  '/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: `${env.FRONTEND_URL}/login?error=oauth_failed` }),
  async (req, res) => {
    const googleProfile = req.user as unknown as {
      id: string;
      email: string;
      firstName: string;
      lastName: string;
      avatarUrl?: string;
    };
    const tokens = await authService.handleGoogleOAuth(googleProfile);
    // Redirect to frontend with tokens in URL fragment (handled client-side)
    res.redirect(
      `${env.FRONTEND_URL}/auth/callback#access=${tokens.accessToken}&refresh=${tokens.refreshToken}`,
    );
  },
);

export default router;

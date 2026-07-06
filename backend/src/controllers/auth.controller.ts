import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service';
import { sendSuccess, sendCreated } from '../utils/response';
import { UpdateProfileDto } from '../validators/auth.validator';

const authService = new AuthService();

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: Register a new user and organization
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RegisterDto'
 *     responses:
 *       201:
 *         description: Registration successful, returns token pair
 */
export async function register(req: Request, res: Response): Promise<void> {
  const tokens = await authService.register(req.body);
  sendCreated(res, tokens);
}

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Authenticate user and return token pair
 */
export async function login(req: Request, res: Response): Promise<void> {
  const tokens = await authService.login(req.body, req.ip, req.get('user-agent'));
  sendSuccess(res, tokens);
}

/**
 * @swagger
 * /api/auth/refresh:
 *   post:
 *     tags: [Auth]
 *     summary: Refresh access token using refresh token
 */
export async function refresh(req: Request, res: Response): Promise<void> {
  const { refreshToken } = req.body as { refreshToken: string };
  const tokens = await authService.refreshTokens(refreshToken);
  sendSuccess(res, tokens);
}

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     tags: [Auth]
 *     summary: Revoke refresh token
 *     security:
 *       - bearerAuth: []
 */
export async function logout(req: Request, res: Response): Promise<void> {
  const { refreshToken } = req.body as { refreshToken: string };
  await authService.logout(refreshToken);
  sendSuccess(res, { message: 'Logged out' });
}

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     tags: [Auth]
 *     summary: Get current user profile
 *     security:
 *       - bearerAuth: []
 */
export async function me(req: Request, res: Response): Promise<void> {
  const { prisma } = await import('../config/database');
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: req.user!.sub },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      avatarUrl: true,
      role: true,
      organization: { select: { id: true, name: true, slug: true, logoUrl: true } },
    },
  });
  sendSuccess(res, user);
}

/**
 * @swagger
 * /api/auth/me:
 *   patch:
 *     tags: [Auth]
 *     summary: Update current user profile
 *     security:
 *       - bearerAuth: []
 */
export async function updateMe(req: Request, res: Response): Promise<void> {
  const { prisma } = await import('../config/database');
  const dto = req.body as UpdateProfileDto;
  const user = await prisma.user.update({
    where: { id: req.user!.sub },
    data: dto,
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      avatarUrl: true,
      role: true,
      organization: { select: { id: true, name: true, slug: true, logoUrl: true } },
    },
  });
  sendSuccess(res, user);
}

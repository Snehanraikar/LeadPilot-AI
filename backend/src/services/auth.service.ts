import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { Role } from '@prisma/client';
import { prisma } from '../config/database';
import { env } from '../config/env';
import { hashPassword, comparePassword, generateSecureToken } from '../utils/crypto';
import { ConflictError, UnauthorizedError, NotFoundError } from '../utils/errors';
import { JwtPayload } from '../middleware/auth';
import { RegisterDto, LoginDto } from '../validators/auth.validator';
import type { TokenPair } from '../domain/types';

function signAccessToken(payload: Omit<JwtPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN as jwt.SignOptions['expiresIn'],
  });
}

function signRefreshToken(): string {
  return generateSecureToken(64);
}

export class AuthService {
  async register(dto: RegisterDto): Promise<TokenPair> {
    const existing = await prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictError('Email already registered');

    const slug = dto.organizationName
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
      .slice(0, 50);

    const uniqueSlug = `${slug}-${uuidv4().slice(0, 8)}`;
    const passwordHash = await hashPassword(dto.password);

    const result = await prisma.$transaction(async (tx) => {
      const org = await tx.organization.create({
        data: { name: dto.organizationName, slug: uniqueSlug },
      });

      const user = await tx.user.create({
        data: {
          email: dto.email,
          passwordHash,
          firstName: dto.firstName,
          lastName: dto.lastName,
          role: Role.ADMIN,
          organizationId: org.id,
          isEmailVerified: false,
        },
      });

      await tx.subscription.create({
        data: { organizationId: org.id },
      });

      return { user, org };
    });

    return this._issueTokens(result.user.id, result.org.id, result.user.role, result.user.email);
  }

  async login(dto: LoginDto, ipAddress?: string, userAgent?: string): Promise<TokenPair> {
    const user = await prisma.user.findUnique({
      where: { email: dto.email },
      include: { organization: true },
    });

    if (!user || !user.passwordHash) throw new UnauthorizedError('Invalid credentials');
    if (!user.isActive) throw new UnauthorizedError('Account is deactivated');

    const valid = await comparePassword(dto.password, user.passwordHash);
    if (!valid) throw new UnauthorizedError('Invalid credentials');

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    return this._issueTokens(user.id, user.organizationId, user.role, user.email, ipAddress, userAgent);
  }

  async refreshTokens(rawToken: string): Promise<TokenPair> {
    const stored = await prisma.refreshToken.findUnique({ where: { token: rawToken } });

    if (!stored || stored.isRevoked || stored.expiresAt < new Date()) {
      throw new UnauthorizedError('Invalid or expired refresh token');
    }

    const user = await prisma.user.findUnique({
      where: { id: stored.userId },
      select: { id: true, organizationId: true, role: true, email: true, isActive: true },
    });

    if (!user || !user.isActive) throw new UnauthorizedError('User not found or inactive');

    // Token rotation — revoke used token
    await prisma.refreshToken.update({ where: { id: stored.id }, data: { isRevoked: true } });

    return this._issueTokens(user.id, user.organizationId, user.role, user.email);
  }

  async logout(rawToken: string): Promise<void> {
    await prisma.refreshToken.updateMany({
      where: { token: rawToken },
      data: { isRevoked: true },
    });
  }

  async logoutAll(userId: string): Promise<void> {
    await prisma.refreshToken.updateMany({
      where: { userId },
      data: { isRevoked: true },
    });
  }

  async handleGoogleOAuth(profile: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    avatarUrl?: string;
  }): Promise<TokenPair> {
    let user = await prisma.user.findFirst({
      where: { OR: [{ googleId: profile.id }, { email: profile.email }] },
    });

    if (!user) {
      const slug = `${profile.firstName.toLowerCase()}-org-${uuidv4().slice(0, 8)}`;
      const org = await prisma.organization.create({
        data: { name: `${profile.firstName}'s Organization`, slug },
      });
      user = await prisma.user.create({
        data: {
          email: profile.email,
          googleId: profile.id,
          firstName: profile.firstName,
          lastName: profile.lastName,
          avatarUrl: profile.avatarUrl,
          role: Role.ADMIN,
          organizationId: org.id,
          isEmailVerified: true,
        },
      });
      await prisma.subscription.create({ data: { organizationId: org.id } });
    } else if (!user.googleId) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { googleId: profile.id, isEmailVerified: true },
      });
    }

    return this._issueTokens(user.id, user.organizationId, user.role, user.email);
  }

  private async _issueTokens(
    userId: string,
    orgId: string,
    role: Role,
    email: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<TokenPair> {
    const accessToken = signAccessToken({ sub: userId, orgId, role, email });
    const refreshToken = signRefreshToken();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await prisma.refreshToken.create({
      data: { token: refreshToken, userId, expiresAt, ipAddress, userAgent },
    });

    return { accessToken, refreshToken };
  }
}

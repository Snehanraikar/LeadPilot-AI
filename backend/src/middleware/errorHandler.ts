import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import * as Sentry from '@sentry/node';
import { AppError, ValidationError, ConflictError } from '../utils/errors';
import { logger } from '../utils/logger';
import { env } from '../config/env';

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  // Zod validation errors
  if (err instanceof ZodError) {
    const details = err.flatten().fieldErrors;
    const appErr = new ValidationError(details);
    res.status(422).json({
      success: false,
      error: { code: appErr.code, message: appErr.message, details },
    });
    return;
  }

  // Prisma unique constraint
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
    const fields = (err.meta?.target as string[]) ?? [];
    const appErr = new ConflictError(`Unique constraint violation on: ${fields.join(', ')}`);
    res.status(409).json({ success: false, error: { code: appErr.code, message: appErr.message } });
    return;
  }

  // Prisma record not found
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
    res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Record not found' } });
    return;
  }

  // Known application errors
  if (err instanceof AppError) {
    if (err.statusCode >= 500) {
      logger.error({ err, req }, 'Application error');
      Sentry.captureException(err);
    }
    res.status(err.statusCode).json({
      success: false,
      error: { code: err.code ?? 'ERROR', message: err.message, details: err.details },
    });
    return;
  }

  // Unknown errors
  logger.error({ err, req }, 'Unhandled error');
  Sentry.captureException(err);

  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
    },
  });
}

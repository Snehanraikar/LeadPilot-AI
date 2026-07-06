import { Request, Response, NextFunction } from 'express';
import { AuditAction } from '@prisma/client';
import { prisma } from '../config/database';
import { logger } from '../utils/logger';

type AuditConfig = {
  action: AuditAction;
  entity: string;
  getEntityId: (req: Request, res: Response) => string;
};

export function auditLog(config: AuditConfig) {
  return (_req: Request, res: Response, next: NextFunction): void => {
    const originalJson = res.json.bind(res);

    res.json = function (body: unknown) {
      if (res.statusCode < 400 && _req.user) {
        const entityId = config.getEntityId(_req, res);
        prisma.auditLog
          .create({
            data: {
              action: config.action,
              entity: config.entity,
              entityId,
              organizationId: _req.user.orgId,
              userId: _req.user.sub,
              ipAddress: _req.ip,
              userAgent: _req.get('user-agent'),
            },
          })
          .catch((err) => logger.error({ err }, 'Failed to write audit log'));
      }
      return originalJson(body);
    };

    next();
  };
}

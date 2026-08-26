import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { FileLoggerService } from '../services/logger.service';

/**
 * AuditMiddleware
 *
 * Applied ONLY to sensitive routes (router-level, in AppModule):
 *   /documents/*   — case files and document uploads
 *   /billing/*     — financial invoices and payments
 *   /users/*       — user account management
 *
 * Writes a permanent record to logs/audit-YYYY-MM-DD.log including
 * the requesting user's ID, role, firm, IP, and the exact endpoint accessed.
 * Used for security accountability and compliance auditing.
 */
@Injectable()
export class AuditMiddleware implements NestMiddleware {
  private readonly fileLogger = FileLoggerService.getInstance();

  use(req: Request, res: Response, next: NextFunction): void {
    const userId    = req.headers['x-user-id'] as string | undefined;
    const role      = req.headers['role'] as string | undefined;
    const firmId    = req.headers['x-firm-id'] as string | undefined;
    const ip        = req.ip ?? req.socket.remoteAddress ?? 'unknown';
    const requestId = (req as unknown as Record<string, unknown>)['requestId'] as string | undefined;

    this.fileLogger.audit({
      timestamp: new Date().toISOString(),
      requestId,
      method: req.method,
      url: req.originalUrl,
      ip,
      message: `AUDIT: ${role ?? 'unknown'} accessed ${req.method} ${req.path}`,
      data: {
        userId: userId ?? 'anonymous',
        role:   role   ?? 'unknown',
        firmId: firmId ?? 'none',
        ip,
      },
    });

    next();
  }
}

import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { FileLoggerService } from '../services/logger.service';

/**
 * LoggingMiddleware
 *
 * Applied globally (all routes via router-level config in AppModule).
 * For every HTTP request:
 *  1. Generates (or reuses) a UUID request-ID for correlation.
 *  2. Attaches it to req, req.headers and the response X-Request-Id header.
 *  3. On response finish: writes a structured JSON line to
 *     logs/access-YYYY-MM-DD.log with method, url, status, duration, ip.
 */
@Injectable()
export class LoggingMiddleware implements NestMiddleware {
  private readonly fileLogger = FileLoggerService.getInstance();

  use(req: Request, res: Response, next: NextFunction): void {
    const startAt = Date.now();

    // ── Request-ID ─────────────────────────────────────────────────────────
    const requestId =
      (req.headers['x-request-id'] as string | undefined) ?? uuidv4();

    // Store on req for downstream use (e.g. exception filter)
    (req as unknown as Record<string, unknown>)['requestId'] = requestId;
    req.headers['x-request-id'] = requestId;
    res.setHeader('X-Request-Id', requestId);

    // ── Log on response finish ──────────────────────────────────────────────
    res.on('finish', () => {
      const { method, originalUrl } = req;
      const statusCode = res.statusCode;
      const duration = Date.now() - startAt;
      const ip = req.ip ?? req.socket.remoteAddress ?? 'unknown';
      const userAgent = req.headers['user-agent'] ?? 'unknown';

      const level = statusCode >= 400 ? 'WARN' : 'INFO';

      // Console log (NestJS style)
      console.log(
        `[HTTP] ${method} ${originalUrl} ${statusCode} — ${duration}ms [${requestId}]`,
      );

      // File log
      this.fileLogger.access({
        timestamp: new Date().toISOString(),
        requestId,
        method,
        url: originalUrl,
        statusCode,
        duration,
        ip,
        userAgent,
        message: `${method} ${originalUrl}`,
      });
    });

    next();
  }
}

import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { FileLoggerService } from '../services/logger.service';

/**
 * GlobalExceptionFilter
 *
 * Registered globally in main.ts via app.useGlobalFilters().
 * Catches ALL unhandled exceptions and:
 *  1. Returns a consistent, structured JSON error response.
 *  2. Writes error details (+ stack trace for 5xx errors) to
 *     logs/errors-YYYY-MM-DD.log.
 *
 * Response shape:
 * {
 *   "success":    false,
 *   "statusCode": 404,
 *   "error":      "NotFoundException",
 *   "message":    "User not found",
 *   "path":       "/users/nonexistent",
 *   "requestId":  "uuid",
 *   "timestamp":  "ISO string"
 * }
 */
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly fileLogger = FileLoggerService.getInstance();

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx       = host.switchToHttp();
    const req       = ctx.getRequest<Request>();
    const res       = ctx.getResponse<Response>();
    const requestId = (req as unknown as Record<string, unknown>)['requestId'] as string | undefined;

    // ── Determine status & message ─────────────────────────────────────────
    let status  = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'Internal server error';
    let errorName = 'InternalServerError';
    let stack: string | undefined;

    if (exception instanceof HttpException) {
      status    = exception.getStatus();
      errorName = exception.constructor.name;
      const resp = exception.getResponse();
      if (typeof resp === 'string') {
        message = resp;
      } else if (typeof resp === 'object' && resp !== null) {
        const r = resp as Record<string, unknown>;
        message = (r['message'] as string | string[]) ?? message;
      }
    } else if (exception instanceof Error) {
      message = exception.message;
      errorName = exception.constructor.name;
      stack   = exception.stack;
    }

    const messageStr = Array.isArray(message) ? message.join('; ') : message;

    // ── Write to error log file ────────────────────────────────────────────
    this.fileLogger.error({
      timestamp: new Date().toISOString(),
      requestId,
      method:     req.method,
      url:        req.originalUrl,
      statusCode: status,
      ip:         req.ip ?? 'unknown',
      message:    `${req.method} ${req.originalUrl} → ${status} ${errorName}: ${messageStr}`,
      stack:      status >= 500 ? stack : undefined,
    });

    // ── Console output ─────────────────────────────────────────────────────
    if (status >= 500) {
      console.error(`[ExceptionFilter] ${req.method} ${req.originalUrl} → ${status} ${errorName}: ${messageStr}`);
    } else {
      console.warn(`[ExceptionFilter] ${req.method} ${req.originalUrl} → ${status} ${errorName}: ${messageStr}`);
    }

    // ── Send structured JSON response ──────────────────────────────────────
    res.status(status).json({
      success:    false,
      statusCode: status,
      error:      errorName,
      message:    message,
      path:       req.originalUrl,
      requestId:  requestId ?? null,
      timestamp:  new Date().toISOString(),
    });
  }
}

import { Injectable, NestMiddleware, ForbiddenException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import * as crypto from 'crypto';

/**
 * SecurityMiddleware
 *
 * Applied globally (all routes via router-level config in AppModule).
 *
 * Responsibilities:
 *  1. CSRF Double-Submit Cookie protection
 *     - GET / HEAD / OPTIONS: generates a random token, stores it in the
 *       `csrf_token` cookie so the frontend JavaScript can read it, and
 *       also writes it to res.locals.csrfToken for the /api/csrf-token endpoint.
 *     - POST / PUT / PATCH / DELETE: validates that the X-CSRF-Token request
 *       header matches the csrf_token cookie using constant-time comparison.
 *     - Exempt paths bypass CSRF validation entirely (login, token endpoint, docs).
 *
 * No XSS body sanitisation — CORS + CSRF together are the cross-origin defence.
 */
@Injectable()
export class SecurityMiddleware implements NestMiddleware {
  private static readonly COOKIE_NAME = 'csrf_token';
  private static readonly HEADER_NAME = 'x-csrf-token';

  private static readonly MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

  /** Paths that MUST NOT require a CSRF token (public / auth endpoints) */
  private static readonly EXEMPT = [
    '/users/login',
    '/api/csrf-token',
    '/api/docs',
    '/data/',
    '/avatars/',
  ];

  use(req: Request, res: Response, next: NextFunction): void {
    const method = req.method.toUpperCase();
    const isMutating = SecurityMiddleware.MUTATING.has(method);
    const isExempt = SecurityMiddleware.EXEMPT.some(
      (p) => req.originalUrl.split('?')[0] === p || req.originalUrl.split('?')[0].startsWith(p),
    );

    if (!isMutating || isExempt) {
      // On safe / exempt requests: ensure cookie exists so frontend can read it
      if (!req.cookies?.[SecurityMiddleware.COOKIE_NAME]) {
        const token = crypto.randomBytes(32).toString('hex');
        res.cookie(SecurityMiddleware.COOKIE_NAME, token, {
          httpOnly: false,   // Frontend JS MUST read this cookie
          sameSite: 'strict',
          secure: process.env.NODE_ENV === 'production',
          maxAge: 60 * 60 * 1000, // 1 hour
        });
        res.locals.csrfToken = token;
      } else {
        res.locals.csrfToken = req.cookies[SecurityMiddleware.COOKIE_NAME] as string;
      }
      return next();
    }

    // ── CSRF validation on mutating requests ───────────────────────────────
    const cookieToken: string | undefined =
      req.cookies?.[SecurityMiddleware.COOKIE_NAME];
    const headerToken =
      (req.headers[SecurityMiddleware.HEADER_NAME] as string | undefined);

    if (!cookieToken || !headerToken) {
      throw new ForbiddenException(
        'CSRF token missing. Fetch a token from GET /api/csrf-token and include it as X-CSRF-Token header.',
      );
    }

    // Constant-time comparison to prevent timing attacks
    const a = Buffer.from(cookieToken);
    const b = Buffer.from(headerToken);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      throw new ForbiddenException('CSRF token invalid or expired.');
    }

    next();
  }
}

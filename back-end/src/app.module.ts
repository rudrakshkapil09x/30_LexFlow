import {
  Module,
  NestModule,
  MiddlewareConsumer,
  RequestMethod,
} from '@nestjs/common';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { UsersModule } from './users/users.module';
import { ConsultationsModule } from './consultations/consultations.module';
import { CasesModule } from './cases/cases.module';
import { DocumentsModule } from './documents/documents.module';
import { BillingModule } from './billing/billing.module';
import { TasksModule } from './tasks/tasks.module';
import { LawFirmsModule } from './law-firms/law-firms.module';

// ── Middleware ────────────────────────────────────────────────────────────────
import { LoggingMiddleware } from './common/middleware/logging.middleware';
import { SecurityMiddleware } from './common/middleware/security.middleware';
import { AuditMiddleware } from './common/middleware/audit.middleware';

@Module({
  imports: [
    // ── Rate Limiting ─────────────────────────────────────────────────────
    // Global default: 100 requests per 60 seconds per IP address.
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 60_000,
        limit: 100,
      },
    ]),

    // ── Feature Modules ───────────────────────────────────────────────────
    UsersModule,
    ConsultationsModule,
    CasesModule,
    DocumentsModule,
    BillingModule,
    TasksModule,
    LawFirmsModule,
  ],
  controllers: [AppController],
  providers: [
    // Apply ThrottlerGuard globally
    {
      provide:  APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule implements NestModule {
  /**
   * Router-Level Middleware Configuration
   *
   * LoggingMiddleware + SecurityMiddleware → ALL routes
   *   Records every HTTP request and enforces CSRF on mutating requests.
   *
   * AuditMiddleware → sensitive routes only
   *   Tracks who accessed confidential documents, billing, and user data.
   *   Uses NestJS 11 path-to-regexp v8 syntax (no bare '*' wildcards).
   */
  configure(consumer: MiddlewareConsumer): void {
    // ── Global: logging + security/CSRF ──────────────────────────────────
    consumer
      .apply(LoggingMiddleware, SecurityMiddleware)
      .forRoutes('*path');

    // ── Sensitive routes: audit logging only ─────────────────────────────
    consumer
      .apply(AuditMiddleware)
      .forRoutes(
        { path: 'documents', method: RequestMethod.ALL },
        { path: 'documents/*path', method: RequestMethod.ALL },
        { path: 'billing', method: RequestMethod.ALL },
        { path: 'billing/*path', method: RequestMethod.ALL },
        { path: 'users', method: RequestMethod.ALL },
        { path: 'users/*path', method: RequestMethod.ALL },
      );
  }
}

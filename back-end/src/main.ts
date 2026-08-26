import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import * as fs from 'fs';
import * as path from 'path';
import helmet from 'helmet';
import * as cookieParser from 'cookie-parser';

async function bootstrap() {
  // ── Ensure logs directory exists before anything else ──────────────────────
  const logsDir = path.join(process.cwd(), 'logs');
  fs.mkdirSync(logsDir, { recursive: true });

  // ── Ensure static-asset directories exist ─────────────────────────────────
  fs.mkdirSync(path.join(process.cwd(), 'data', 'docs'), { recursive: true });
  fs.mkdirSync(path.join(process.cwd(), 'data', 'avatars'), { recursive: true });

  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // ── cookie-parser (required for CSRF cookie reading in SecurityMiddleware) ─
  app.use(cookieParser());

  // ── Security HTTP headers (Helmet) ─────────────────────────────────────────
  // Sets X-Frame-Options, X-Content-Type-Options, HSTS, Referrer-Policy, etc.
  app.use(helmet());

  // ── Global Exception Filter ────────────────────────────────────────────────
  // Catches ALL unhandled exceptions and writes them to logs/errors-YYYY-MM-DD.log
  app.useGlobalFilters(new GlobalExceptionFilter());

  // ── Global Validation Pipe ─────────────────────────────────────────────────
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // ── CORS ───────────────────────────────────────────────────────────────────
  // credentials: true is required for the CSRF cookie to be sent cross-origin.
  app.enableCors({
    origin: [
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      'http://localhost:5500',
      'http://127.0.0.1:5500',
      'http://10.0.5.168:5500',
      'http://localhost:3001',
      'http://127.0.0.1:3001',
      'http://localhost:60504',
      'http://localhost:8080',
    ],
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'role',
      'x-user-id',
      'x-user-name',
      'x-client-id',
      'x-user-email',
      'x-firm-id',
      'x-request-id',
      'x-csrf-token',
    ],
    exposedHeaders: ['X-Request-Id'],
    credentials: true,
  });

  // ── Serve static files ─────────────────────────────────────────────────────
  app.useStaticAssets(path.join(process.cwd(), 'data', 'docs'), {
    prefix: '/data/docs/',
  });
  app.useStaticAssets(path.join(process.cwd(), 'data', 'avatars'), {
    prefix: '/data/avatars/',
  });

  // ── Swagger / OpenAPI ──────────────────────────────────────────────────────
  const config = new DocumentBuilder()
    .setTitle('LexFlow API')
    .setDescription(
      'REST API for the LexFlow Legal Platform.\n\n' +
      '**RBAC:** Pass `role` in the request header to identify the caller.\n' +
      'Accepted values: `client` | `lawyer` | `intern` | `firmadmin` | `superadmin`\n\n' +
      '**CSRF:** Fetch a token from `GET /api/csrf-token` and include it as `X-CSRF-Token` header on all mutating requests.',
    )
    .setVersion('1.0')
    .addApiKey(
      {
        type: 'apiKey',
        name: 'role',
        in: 'header',
        description: 'User role for RBAC. Values: client | lawyer | intern | firmadmin | superadmin',
      },
      'role-auth',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);

  // Write swagger.json to /docs
  const swaggerPath = path.join(process.cwd(), 'docs', 'swagger.json');
  fs.mkdirSync(path.dirname(swaggerPath), { recursive: true });
  fs.writeFileSync(swaggerPath, JSON.stringify(document, null, 2));

  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT ?? 3000;
  await app.listen(port, '0.0.0.0');

  console.log(`🚀  LexFlow API running on  → http://localhost:${port}`);
  console.log(`📚  Swagger UI available at → http://localhost:${port}/api/docs`);
  console.log(`🛡️   Security: Helmet + Rate-Limiting + CSRF active`);
  console.log(`📋  Logs directory          → ${logsDir}`);
  console.log(`✅  NestJS Backend listening on port ${port} (IPv4)`);
}

bootstrap();
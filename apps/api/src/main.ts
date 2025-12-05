// src/main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import {
  ValidationPipe,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { json, urlencoded } from 'express';
import * as helmet from 'helmet';
import * as compression from 'compression';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  // Create the Nest application (Express under the hood)
  const app = await NestFactory.create(AppModule, {
    // You can switch to Fastify if you prefer; the gateway works the same.
    // logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  // ------------------------------
  // Global middleware & security
  // ------------------------------
  app.use(helmet()); // basic HTTP headers
  app.use(compression()); // gzip responses
  app.use(json({ limit: '2mb' }));
  app.use(urlencoded({ extended: true, limit: '2mb' }));

  // ------------------------------
  // Global validation pipe
  // ------------------------------
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // strip unknown props
      forbidNonWhitelisted: false,
      transform: true,
      exceptionFactory: (errors) =>
        new BadRequestException({
          message: 'Validation failed',
          errors: errors.map((e) => ({
            property: e.property,
            constraints: e.constraints,
          })),
        }),
    }),
  );

  // ------------------------------
  // Server configuration
  // ------------------------------
  const PORT = process.env.PORT ?? 3000;
  const HOST = process.env.HOST ?? '0.0.0.0';

  // Optional: tighten Socket.IO ping settings
  const httpServer = app.getHttpServer();
  // If you need to adjust Socket.IO options globally you can do it here:
  // const io = require('socket.io')(httpServer, { pingInterval: 25000, pingTimeout: 5000 });

  await app.listen(PORT, HOST, () => {
    logger.log(`🚀 HTTP server listening on http://${HOST}:${PORT}`);
    logger.log(
      `🛰️  Socket.IO namespace ready at http://${HOST}:${PORT}/insights`,
    );
  });
}
bootstrap().catch((err) => {
  const logger = new Logger('Bootstrap');
  logger.error('Failed to start application', err);
  process.exit(1);
});

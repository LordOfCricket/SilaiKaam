import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import express from 'express';
import { createLogger, type Logger } from '@silaikaam/logger';
import { AppModule } from './app.module';
import { loadServiceEnv } from './config/configuration';

// Garment/reference photos are stored inline as base64 (no cloud storage
// provider exists yet), so requests can be a few MB — well past Express's
// 100kb JSON default.
const JSON_BODY_LIMIT = '20mb';

const SERVICE_NAME = 'fitting-service';

async function listenWithRetry(
  listen: () => Promise<unknown>,
  logger: Logger,
  port: number,
  attempts = 5,
) {
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      await listen();
      return;
    } catch (error) {
      const isPortBusy = (error as NodeJS.ErrnoException).code === 'EADDRINUSE';
      if (!isPortBusy || attempt === attempts) throw error;
      logger.warn(`port ${port} still in use, retrying (${attempt}/${attempts})...`);
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
  }
}

async function bootstrap() {
  const env = loadServiceEnv();
  const logger = createLogger({ serviceName: SERVICE_NAME });

  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bodyParser: false });
  app.use(express.json({ limit: JSON_BODY_LIMIT }));
  app.use(express.urlencoded({ extended: true, limit: JSON_BODY_LIMIT }));
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  await listenWithRetry(
    () => app.listen(env.FITTING_SERVICE_PORT),
    logger,
    env.FITTING_SERVICE_PORT,
  );
  logger.info(`listening on port ${env.FITTING_SERVICE_PORT}`);
}

bootstrap().catch((error) => {
  console.error(`[${SERVICE_NAME}] fatal bootstrap error:`, error);
  process.exit(1);
});

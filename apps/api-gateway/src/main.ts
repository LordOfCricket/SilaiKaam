import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { createLogger, type Logger } from '@silaikaam/logger';
import { AppModule } from './app.module';
import { loadGatewayEnv } from './config/configuration';

const SERVICE_NAME = 'api-gateway';

async function listenWithRetry(
  listen: () => Promise<void>,
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
  const env = loadGatewayEnv();
  const logger = createLogger({ serviceName: SERVICE_NAME });

  const app = await NestFactory.create(AppModule);

  app.enableCors();
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  await listenWithRetry(() => app.listen(env.API_PORT, env.API_HOST), logger, env.API_PORT);
  logger.info(`api-gateway listening on http://${env.API_HOST}:${env.API_PORT}`);
}

bootstrap().catch((error) => {
  console.error(`[${SERVICE_NAME}] fatal bootstrap error:`, error);
  process.exit(1);
});

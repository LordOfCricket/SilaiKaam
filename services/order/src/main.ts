import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { createLogger } from '@silaikaam/logger';
import { AppModule } from './app.module';
import { loadServiceEnv } from './config/configuration';

async function bootstrap() {
  const env = loadServiceEnv();
  const logger = createLogger({ serviceName: 'order-service' });

  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  await app.listen(env.ORDER_SERVICE_PORT);
  logger.info(`listening on port ${env.ORDER_SERVICE_PORT}`);
}

bootstrap();

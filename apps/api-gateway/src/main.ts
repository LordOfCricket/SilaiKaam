import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { createLogger } from '@silaikaam/logger';
import { AppModule } from './app.module';
import { loadGatewayEnv } from './config/configuration';

async function bootstrap() {
  const env = loadGatewayEnv();
  const logger = createLogger({ serviceName: 'api-gateway' });

  const app = await NestFactory.create(AppModule);

  app.enableCors();
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  await app.listen(env.API_PORT, env.API_HOST);
  logger.info(`api-gateway listening on http://${env.API_HOST}:${env.API_PORT}`);
}

bootstrap();

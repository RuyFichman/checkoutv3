import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';

import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter());
  const port = Number(process.env.API_PORT ?? 3333);

  app.enableCors({ origin: true, credentials: true });
  app.setGlobalPrefix('v1');
  app.enableShutdownHooks();

  await app.listen(port, '0.0.0.0');
  Logger.log(`API listening on http://localhost:${port}/v1`, 'Bootstrap');
}

void bootstrap();

import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import express from 'express';
import { AppModule } from './app.module';
import { StorageService } from './storage/storage.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  app.use(
    helmet({
      // Allow generated/uploaded images to be embedded by the web + admin apps.
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );
  app.use(cookieParser());

  // Serve locally-stored files (uploads + generated pages) when using the
  // local storage driver. With STORAGE_DRIVER=r2 these are served by R2/CDN.
  const storage = app.get(StorageService);
  if (storage.storageDriver === 'local') {
    app.use('/files', express.static(storage.localBaseDir));
  }

  app.enableCors({
    origin: [
      process.env.WEB_URL || 'http://localhost:3000',
      process.env.ADMIN_URL || 'http://localhost:3001',
    ],
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.setGlobalPrefix('api');

  const port = process.env.PORT || 4000;
  await app.listen(port);
  console.log(`Kutty Story API running on port ${port}`);
}

bootstrap();

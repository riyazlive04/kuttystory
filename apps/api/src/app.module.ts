import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { BullModule } from '@nestjs/bullmq';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { StoriesModule } from './stories/stories.module';
import { BooksModule } from './books/books.module';
import { OrdersModule } from './orders/orders.module';
import { UploadModule } from './upload/upload.module';
import { GenerationModule } from './generation/generation.module';
import { PrintModule } from './print/print.module';
import { WebhooksModule } from './webhooks/webhooks.module';
import { EmailModule } from './email/email.module';
import { AdminModule } from './admin/admin.module';
import { HealthModule } from './health/health.module';
import { SettingsModule } from './settings/settings.module';
import { StorageModule } from './storage/storage.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 1000,
        limit: 10,
      },
      {
        name: 'long',
        ttl: 60000,
        limit: 100,
      },
    ]),
    ScheduleModule.forRoot(),
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379', 10),
      },
    }),
    DatabaseModule,
    StorageModule,
    AuthModule,
    UsersModule,
    StoriesModule,
    BooksModule,
    OrdersModule,
    UploadModule,
    GenerationModule,
    PrintModule,
    WebhooksModule,
    EmailModule,
    AdminModule,
    HealthModule,
    SettingsModule,
  ],
})
export class AppModule {}

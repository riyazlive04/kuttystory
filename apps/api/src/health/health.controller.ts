import { Controller, Get } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Controller('health')
export class HealthController {
  constructor(private readonly db: DatabaseService) {}

  @Get()
  async check() {
    const dbHealthy = await this.db
      .$queryRaw`SELECT 1`
      .then(() => true)
      .catch(() => false);

    return {
      status: dbHealthy ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      services: {
        database: dbHealthy ? 'connected' : 'disconnected',
      },
    };
  }
}

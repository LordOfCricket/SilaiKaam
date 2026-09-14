import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  @Get()
  check() {
    return {
      status: 'ok',
      service: 'fitting-service',
      timestamp: new Date().toISOString(),
    };
  }
}

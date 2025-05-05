import { Controller, Get } from '@nestjs/common';

@Controller('api')
export class AppController {
  @Get('health-check')
  healthCheck() {
    return {
      status: true,
      message: 'server works fine!',
    };
  }
}

import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get('health-check')
  healthCheck() {
    return {
      status: true,
      message: 'server works fine!',
    };
  }
}

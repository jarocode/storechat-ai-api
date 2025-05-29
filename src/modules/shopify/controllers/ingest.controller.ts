import { Controller, Post, Body, Get, Logger } from '@nestjs/common';

import { IngestService } from '../services/ingest.service';

@Controller('shopify/ingest')
export class IngestController {
  private readonly logger = new Logger(IngestController.name);

  constructor(private readonly ingest: IngestService) {}

  @Get('health-check')
  healthCheck() {
    return {
      status: true,
      message: 'Ingest controller reachable!',
    };
  }

  @Post('all')
  async kickOff(@Body() b: { shop: string }) {
    this.logger.log('enqueueing resource ingestion jobs...');
    await this.ingest.enqueueAll(b.shop);
    return { status: 'started' };
  }

  @Post('status')
  status(@Body() b: { shop: string }) {
    return this.ingest.getProgress(b.shop);
  }
}

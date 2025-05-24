import { Controller, Post, Body } from '@nestjs/common';

import { IngestService } from '../services/ingest.service';

@Controller('shopify/ingest')
export class IngestController {
  constructor(private readonly ingest: IngestService) {}

  @Post('all')
  async kickOff(@Body() b: { shop: string }) {
    await this.ingest.enqueueAll(b.shop);
    return { status: 'started' };
  }

  @Post('status')
  status(@Body() b: { shop: string }) {
    return this.ingest.getProgress(b.shop);
  }
}

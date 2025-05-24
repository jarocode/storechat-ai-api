import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { BulkService } from './services/bulk.service';
import { ProcessorService } from './services/processor.service';
import { IngestService } from './services/ingest.service';
import { IngestProcessor } from './processors/injest.processor';
import { IngestController } from './controllers/ingest.controller';
import { LangchainService } from './services/langchain.service';

import { ShopModule } from '../shop/shop.module';

@Module({
  imports: [BullModule.registerQueue({ name: 'ingest' }), ShopModule],
  providers: [
    BulkService,
    ProcessorService,
    LangchainService,
    IngestService,
    IngestProcessor,
  ],
  controllers: [IngestController],
})
export class ShopifyModule {}

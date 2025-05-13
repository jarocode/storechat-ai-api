import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { BulkService } from './services/bulk.service';
import { ProcessorService } from './services/processor.service';
import { IngestService } from './services/ingest.service';
import { IngestProcessor } from './processors/injest.processor';
import { IngestController } from './controllers/ingest.controller';
import { LangchainService } from './services/langchain.service';

@Module({
  imports: [BullModule.registerQueue({ name: 'ingest' })],
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

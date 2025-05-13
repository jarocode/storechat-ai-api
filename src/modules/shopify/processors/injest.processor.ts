import { Logger } from '@nestjs/common';
import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { BulkService } from '../services/bulk.service';

@Processor('ingest')
export class IngestProcessor {
  private readonly logger = new Logger(BulkService.name);
  constructor(
    private readonly bulk: BulkService,
    // private readonly proc: ProcessorService,
    // private readonly lc: LangchainService,
  ) {}

  @Process()
  async handle(job: Job<{ shop: string; token: string; resource: string }>) {
    const { shop, token, resource } = job.data;
    const op = await this.bulk.startBulkQuery(shop, token, resource);
    const url = await this.bulk.waitForUrl(shop, token, op);
    const payload = await fetch(url).then((r) => r.json());
    this.logger.log('payload:', payload);
    // const docs = this.proc.mapResourceToDocs(shop, resource, payload);
    // await this.lc.ingest(docs);
  }
}

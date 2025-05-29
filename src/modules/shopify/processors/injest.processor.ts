import { Logger } from '@nestjs/common';
import { Processor, Process, OnQueueActive } from '@nestjs/bull';
import { Job } from 'bull';
import { BulkService } from '../services/bulk.service';
import { ShopService } from 'src/modules/shop/shop.service';

@Processor('ingest')
export class IngestProcessor {
  private readonly logger = new Logger(BulkService.name);
  constructor(
    private readonly shopService: ShopService,
    private readonly bulk: BulkService,
    // private readonly proc: ProcessorService,
    // private readonly lc: LangchainService,
  ) {}

  @Process()
  async handle(job: Job<{ shop: string; resource: string }>) {
    const { shop, resource } = job.data;

    // Retrieve the stored token instead of passing it from client
    const token = await this.shopService.getToken(shop);

    const op = await this.bulk.startBulkQuery(shop, token, resource);
    const url = await this.bulk.waitForUrl(shop, token, op);
    const payload = await fetch(url).then((r) => r.json());
    this.logger.log('payload:', payload);
    // const docs = this.proc.mapResourceToDocs(shop, resource, payload);
    // await this.lc.ingest(docs);
  }

  @OnQueueActive()
  onActive(job: Job) {
    this.logger.log(
      `Processing job ${job.id} of type ${job.name} with data: ${job.data?.resource}...`,
    );
  }
}

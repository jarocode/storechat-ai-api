// src/shopify/ingest.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';

@Injectable()
export class IngestService {
  private resources = [
    'products',
    'orders',
    'customers',
    'discounts',
    'faqPages',
    'shopPolicies',
    'productFaqs',
    'blogArticles',
  ] as const;

  private readonly logger = new Logger(IngestService.name);

  constructor(@InjectQueue('ingest') private readonly queue: Queue) {}

  async enqueueAll(shop: string) {
    for (const r of this.resources) {
      this.logger.log(`adding resource: ${r} to queue`);
      await this.queue.add(r, { shop, resource: r });
    }
  }

  async getProgress(shop: string) {
    const counts: any = {};
    const jobs = await this.queue.getJobs(
      ['completed', 'active', 'waiting'],
      0,
      1000,
    );
    for (const r of this.resources) {
      const js = jobs.filter((j) => j.data.shop === shop && j.name === r);
      counts[r] = {
        total: js.length,
        done: js.filter((j) => j.finishedOn).length,
      };
    }
    return counts;
  }
}

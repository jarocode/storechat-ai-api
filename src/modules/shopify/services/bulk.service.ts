// src/shopify/bulk.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { GraphqlClient, ApiVersion, Session } from '@shopify/shopify-api';
import { BULK_QUERIES } from '../constants/queries.constants';

@Injectable()
export class BulkService {
  private readonly logger = new Logger(BulkService.name);

  /**
   * Instantiate a GraphQL client for a shop.
   */
  private createClient(shop: string, token: string): GraphqlClient {
    const session: Session = {
      id: shop,
      shop,
      state: '',
      isOnline: false,
      accessToken: token,
    } as Session;
    return new GraphqlClient({ session, apiVersion: ApiVersion.January25 });
  }

  /**
   * Starts a BulkOperation for the given resource, returns its ID.
   */
  async startBulkQuery(
    shop: string,
    token: string,
    resource: string,
  ): Promise<string> {
    const client = this.createClient(shop, token);
    const query = BULK_QUERIES[resource];
    const mutation = `
      mutation {
        bulkOperationRunQuery(
          query: """${query}"""
        ) {
          bulkOperation { id status }
          userErrors    { message }
        }
      }
    `;

    // Execute GraphQL query
    const response = await client.query({ data: mutation });
    this.logger.log('graphQl query response:', response);
    // Cast body to any to handle typing
    const body: any = response.body;
    if (!body?.data?.bulkOperationRunQuery) {
      throw new Error('Invalid bulkOperationRunQuery response');
    }

    const result = body.data.bulkOperationRunQuery;
    if (result.userErrors?.length) {
      this.logger.error(
        `BulkOperation errors: ${result.userErrors.map((e: any) => e.message).join(', ')}`,
      );
    }

    const op = result.bulkOperation;
    this.logger.log(`Started BulkOperation for ${resource}, ID: ${op.id}`);
    return op.id;
  }

  /**
   * Polls until the BulkOperation completes, then returns the download URL.
   */
  async waitForUrl(
    shop: string,
    token: string,
    operationId: string,
  ): Promise<string> {
    const client = this.createClient(shop, token);

    while (true) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      const statusQuery = `
        {
          node(id: "${operationId}") {
            ... on BulkOperation { status url errorCode }
          }
        }
      `;
      const statusResp = await client.query({ data: statusQuery });
      const body: any = statusResp.body;
      if (!body?.data?.node) {
        throw new Error('Invalid bulkOperation status response');
      }

      const node = body.data.node;
      this.logger.log(`BulkOperation ${operationId} status=${node.status}`);

      if (node.status === 'COMPLETED') {
        if (!node.url)
          throw new Error(`Operation ${operationId} completed without URL`);
        return node.url;
      }
      if (node.status === 'FAILED') {
        throw new Error(`BulkOperation failed: ${node.errorCode}`);
      }
    }
  }
}

import { Injectable } from '@nestjs/common';
import { htmlToText } from 'html-to-text';
import { Document } from 'langchain/document';

@Injectable()
export class ProcessorService {
  normalize(html: string): string {
    return htmlToText(html, { wordwrap: false });
  }

  mapResourceToDocs(shop: string, resource: string, payload: any): Document[] {
    switch (resource) {
      case 'products':
      case 'orders':
      case 'customers':
      case 'discounts': {
        const nodes = payload[resource].edges.map((e: any) => e.node);
        return nodes.map(
          (node) =>
            new Document({
              metadata: { shop, resource, id: node.id },
              pageContent: this.normalize(JSON.stringify(node)),
            }),
        );
      }
      case 'faqPages':
        return payload.pages.edges.map(
          (e: any) =>
            new Document({
              metadata: { shop, resource, id: e.node.id },
              pageContent: this.normalize(e.node.body),
            }),
        );
      case 'shopPolicies':
        return Object.entries(payload.shop).map(
          ([key, val]: any) =>
            new Document({
              metadata: { shop, resource, policy: key },
              pageContent: this.normalize(val.body),
            }),
        );
      case 'productFaqs':
        return payload.products.edges.flatMap((e: any) =>
          e.node.metafields.edges.map(
            (mf: any) =>
              new Document({
                metadata: {
                  shop,
                  resource,
                  productId: e.node.id,
                  key: mf.node.key,
                },
                pageContent: this.normalize(mf.node.value),
              }),
          ),
        );
      case 'blogArticles':
        return payload.blogs.edges.flatMap((b: any) =>
          b.node.articles.edges.map(
            (a: any) =>
              new Document({
                metadata: {
                  shop,
                  resource,
                  blogId: b.node.id,
                  articleId: a.node.id,
                },
                pageContent: this.normalize(a.node.contentHtml),
              }),
          ),
        );
      default:
        return [];
    }
  }
}

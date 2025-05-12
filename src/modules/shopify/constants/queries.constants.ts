export const BULK_QUERIES: Record<string, string> = {
  products: `{
    products(first:250) {
      edges { node { id title descriptionHtml variants(first:10){ edges{ node{ sku price } } } images(first:5){ edges{ node{ src altText } } } } }
    }
  }`,
  orders: `{
    orders(first:250) {
      edges { node { id name lineItems(first:20){ edges{ node{ title quantity price } } } totalPrice customer{ email } } }
    }
  }`,
  customers: `{
    customers(first:250) {
      edges { node { id firstName lastName email ordersCount totalSpent } }
    }
  }`,
  discounts: `{
    discountCodes(first:250) {
      edges { node { id code usageCount createdAt } }
    }
  }`,
  faqPages: `{
    pages(first:10, query: 'title:FAQ') {
      edges { node { id title body } }
    }
  }`,
  shopPolicies: `{
    shop {
      refundPolicy { title body }
      shippingPolicy { title body }
      privacyPolicy { title body }
      termsOfService { title body }
    }
  }`,
  productFaqs: `{
    products(first:250) {
      edges { node { id title metafields(namespace: 'faq', first:10){ edges{ node{ key value } } } } }
    }
  }`,
  blogArticles: `{
    blogs(first:5) {
      edges { node { id title articles(first:20){ edges{ node{ id title contentHtml } } } } }
    }
  }`,
};

import exec from 'k6/execution';
import { group, sleep } from 'k6';
import { Counter, Trend } from 'k6/metrics';

import { api } from './api.ts';
import { validateCatalog, validateCreated, validateLoggedIn, validateStatus } from './checks.ts';
import { buildProduct, randomIntBetween, randomItem } from './data.ts';
import type { TestData } from './environment.ts';

export const checkoutDuration = new Trend('journey_checkout_duration', true);
export const purchasesCompleted = new Counter('purchases_completed');

const pickTwoProducts = (data: TestData) => {
  const first = randomItem(data.products);
  const others = data.products.filter(product => product._id !== first._id);
  return [first, randomItem(others)];
};

export const thinkTime = (min = 0.5, max = 1.5) => sleep(min + Math.random() * (max - min));

export const browse = (data: TestData) => {
  group('browse', () => {
    validateCatalog(api.listProducts(), data.products.length);
    validateStatus(api.getProduct(randomItem(data.products)._id), 200, 'product details');
  });
};

export const shop = (data: TestData) => {
  const shopper = data.shoppers[(exec.vu.idInTest - 1) % data.shoppers.length];

  browse(data);
  thinkTime();

  const started = Date.now();
  group('checkout', () => {
    const token = validateLoggedIn(api.login(shopper.email, shopper.password));
    if (!token) return;

    const items = pickTwoProducts(data).map(product => ({
      idProduto: product._id,
      quantidade: randomIntBetween(1, 3),
    }));
    if (!validateCreated(api.createCart(items, token), 'create cart')) return;

    if (validateStatus(api.concludePurchase(token), 200, 'conclude purchase')) purchasesCompleted.add(1);
  });
  checkoutDuration.add(Date.now() - started);
  thinkTime();
};

export const manageCatalog = (data: TestData) => {
  group('catalog management', () => {
    const product = buildProduct(data.runId);
    const id = validateCreated(api.createProduct(product, data.adminToken), 'create product');
    if (!id) return;

    validateStatus(
      api.updateProduct(id, { ...product, preco: product.preco + 1 }, data.adminToken),
      200,
      'update product',
    );
    validateStatus(api.deleteProduct(id, data.adminToken), 200, 'delete product');
  });
};

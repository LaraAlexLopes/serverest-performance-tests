import http from 'k6/http';

import { api, json, type Response } from './api.ts';
import { validateInvariant } from './checks.ts';
import { BASE_URL, PASSWORD } from './config.ts';
import { buildProduct, buildUser, productPrefix, userPrefix } from './data.ts';

export interface SeededProduct {
  _id: string;
  preco: number;
}

export interface Shopper {
  email: string;
  password: string;
}

export interface TestData {
  runId: string;
  adminToken: string;
  products: SeededProduct[];
  shoppers: Shopper[];
}

const JSON_HEADERS = { 'Content-Type': 'application/json' };
const BATCH = 25;

const inBatches = <T>(items: T[], send: (chunk: T[]) => Response[]): Response[] => {
  const responses: Response[] = [];
  for (let start = 0; start < items.length; start += BATCH) responses.push(...send(items.slice(start, start + BATCH)));
  return responses;
};

const expectStatus = (response: Response, status: number, action: string) => {
  if (response.status !== status) throw new Error(`setup: ${action} returned ${response.status}: ${response.body}`);
};

export const prepare = ({ shoppers = 0, products = 10, stock = 1_000_000 } = {}): TestData => {
  const runId = Date.now().toString(36);

  const admin = buildUser(runId, 'true');
  expectStatus(api.createUser(admin), 201, 'create admin');
  const login = api.login(admin.email, admin.password);
  expectStatus(login, 200, 'admin login');
  const adminToken = json<{ authorization: string }>(login).authorization;

  const seededProducts = inBatches(
    Array.from({ length: products }, () => buildProduct(runId, stock)),
    chunk =>
      http.batch(
        chunk.map(product => ({
          method: 'POST',
          url: `${BASE_URL}/produtos`,
          body: JSON.stringify(product),
          params: { headers: { ...JSON_HEADERS, Authorization: adminToken }, tags: { name: 'setup' } },
        })),
      ),
  ).map((response, index) => {
    expectStatus(response, 201, `create product ${index}`);
    return { _id: json<{ _id: string }>(response)._id, preco: 0 };
  });

  const catalog = json<{ produtos: { _id: string; preco: number }[] }>(api.listProducts()).produtos;
  seededProducts.forEach(product => {
    product.preco = catalog.find(item => item._id === product._id)?.preco ?? 0;
  });

  const shopperUsers = Array.from({ length: shoppers }, () => buildUser(runId));
  inBatches(shopperUsers, chunk =>
    http.batch(
      chunk.map(user => ({
        method: 'POST',
        url: `${BASE_URL}/usuarios`,
        body: JSON.stringify(user),
        params: { headers: JSON_HEADERS, tags: { name: 'setup' } },
      })),
    ),
  ).forEach((response, index) => expectStatus(response, 201, `create shopper ${index}`));

  return {
    runId,
    adminToken,
    products: seededProducts,
    shoppers: shopperUsers.map(user => ({ email: user.email, password: user.password })),
  };
};

export const cleanUp = (data: TestData): void => {
  const users = json<{ usuarios: { _id: string; email: string }[] }>(api.listUsers()).usuarios.filter(user =>
    user.email.startsWith(userPrefix(data.runId)),
  );
  const carts = json<{ carrinhos: { idUsuario: string }[] }>(api.listCarts()).carrinhos;

  users
    .filter(user => carts.some(cart => cart.idUsuario === user._id))
    .forEach(user => {
      const token = json<{ authorization?: string }>(api.login(user.email, PASSWORD)).authorization;
      if (token) api.cancelPurchase(token);
    });

  json<{ produtos: { _id: string; nome: string }[] }>(api.listProducts())
    .produtos.filter(product => product.nome.startsWith(productPrefix(data.runId)))
    .forEach(product => api.deleteProduct(product._id, data.adminToken));

  users.forEach(user => api.deleteUser(user._id));

  const leftovers = json<{ usuarios: { email: string }[] }>(api.listUsers()).usuarios.filter(user =>
    user.email.startsWith(userPrefix(data.runId)),
  );
  validateInvariant('every user created by the run was removed', leftovers.length === 0);
};

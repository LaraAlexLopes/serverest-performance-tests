import http, { type RefinedResponse, type ResponseType } from 'k6/http';

import { BASE_URL } from './config.ts';

export type Response = RefinedResponse<ResponseType | undefined>;

const headers = (token?: string) => ({
  'Content-Type': 'application/json',
  ...(token ? { Authorization: token } : {}),
});

const params = (name: string, token?: string) => ({ headers: headers(token), tags: { name } });

export interface User {
  nome: string;
  email: string;
  password: string;
  administrador: 'true' | 'false';
}

export interface Product {
  nome: string;
  preco: number;
  descricao: string;
  quantidade: number;
}

export interface CartItem {
  idProduto: string;
  quantidade: number;
}

export const api = {
  createUser: (user: User) => http.post(`${BASE_URL}/usuarios`, JSON.stringify(user), params('POST /usuarios')),
  listUsers: () => http.get(`${BASE_URL}/usuarios`, params('GET /usuarios')),
  deleteUser: (id: string) => http.del(`${BASE_URL}/usuarios/${id}`, null, params('DELETE /usuarios/{id}')),

  login: (email: string, password: string) =>
    http.post(`${BASE_URL}/login`, JSON.stringify({ email, password }), params('POST /login')),

  listProducts: () => http.get(`${BASE_URL}/produtos`, params('GET /produtos')),
  getProduct: (id: string) => http.get(`${BASE_URL}/produtos/${id}`, params('GET /produtos/{id}')),
  createProduct: (product: Product, token: string) =>
    http.post(`${BASE_URL}/produtos`, JSON.stringify(product), params('POST /produtos', token)),
  updateProduct: (id: string, product: Product, token: string) =>
    http.put(`${BASE_URL}/produtos/${id}`, JSON.stringify(product), params('PUT /produtos/{id}', token)),
  deleteProduct: (id: string, token: string) =>
    http.del(`${BASE_URL}/produtos/${id}`, null, params('DELETE /produtos/{id}', token)),

  createCart: (items: CartItem[], token: string) =>
    http.post(`${BASE_URL}/carrinhos`, JSON.stringify({ produtos: items }), params('POST /carrinhos', token)),
  listCarts: () => http.get(`${BASE_URL}/carrinhos`, params('GET /carrinhos')),
  concludePurchase: (token: string) =>
    http.del(`${BASE_URL}/carrinhos/concluir-compra`, null, params('DELETE /carrinhos/concluir-compra', token)),
  cancelPurchase: (token: string) =>
    http.del(`${BASE_URL}/carrinhos/cancelar-compra`, null, params('DELETE /carrinhos/cancelar-compra', token)),
};

export const json = <T>(response: Response): T => response.json() as T;

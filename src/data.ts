import type { Product, User } from './api.ts';
import { EMAIL_DOMAIN, PASSWORD } from './config.ts';

const ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789';

export const randomString = (length: number): string =>
  Array.from({ length }, () => ALPHABET[Math.floor(Math.random() * ALPHABET.length)]).join('');

export const randomIntBetween = (min: number, max: number): number => Math.floor(Math.random() * (max - min + 1)) + min;

export const randomItem = <T>(items: T[]): T => items[Math.floor(Math.random() * items.length)];

export const userPrefix = (runId: string) => `perf.${runId}.`;
export const productPrefix = (runId: string) => `PERF ${runId} `;

export const buildUser = (runId: string, administrador: 'true' | 'false' = 'false'): User => ({
  nome: `Perf ${randomString(6)}`,
  email: `${userPrefix(runId)}${randomString(10)}@${EMAIL_DOMAIN}`,
  password: PASSWORD,
  administrador,
});

const NAMES = ['Mouse', 'Keyboard', 'Monitor', 'Headset', 'Webcam', 'Laptop stand', 'USB hub', 'Desk lamp'];

export const buildProduct = (runId: string, quantidade = 1_000_000): Product => ({
  nome: `${productPrefix(runId)}${randomItem(NAMES)} ${randomString(8)}`,
  preco: randomIntBetween(10, 900),
  descricao: 'Product created by the performance suite',
  quantidade,
});

import { check } from 'k6';

import type { Response } from './api.ts';

const body = (response: Response) => {
  try {
    return response.json() as Record<string, unknown>;
  } catch {
    return {};
  }
};

export const validateStatus = (response: Response, status: number, action: string): boolean =>
  check(response, { [`${action} responds ${status}`]: r => r.status === status });

export const validateLoggedIn = (response: Response): string | undefined => {
  const ok = check(response, {
    'login responds 200': r => r.status === 200,
    'login returns a bearer token': r => String(body(r).authorization ?? '').startsWith('Bearer '),
  });
  return ok ? String(body(response).authorization) : undefined;
};

export const validateCatalog = (response: Response, minimum: number): boolean =>
  check(response, {
    'catalog responds 200': r => r.status === 200,
    [`catalog lists at least ${minimum} products`]: r => Number(body(r).quantidade) >= minimum,
  });

export const validateCreated = (response: Response, action: string): string | undefined => {
  const ok = check(response, {
    [`${action} responds 201`]: r => r.status === 201,
    [`${action} returns an id`]: r => typeof body(r)._id === 'string',
  });
  return ok ? String(body(response)._id) : undefined;
};

export const validateInvariant = (description: string, holds: boolean): boolean =>
  check(null, { [description]: () => holds }, { kind: 'invariant' });

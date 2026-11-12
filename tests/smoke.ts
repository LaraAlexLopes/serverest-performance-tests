import { cleanUp, prepare, type TestData } from '../src/environment.ts';
import { manageCatalog, shop } from '../src/journeys.ts';
import { sloThresholds } from '../src/thresholds.ts';

export const options = {
  scenarios: {
    shoppers: { executor: 'per-vu-iterations', vus: 2, iterations: 3, exec: 'shopper' },
    catalog: { executor: 'per-vu-iterations', vus: 1, iterations: 2, exec: 'admin' },
  },
  thresholds: { ...sloThresholds, checks: ['rate==1'], http_req_failed: ['rate==0'] },
};

export const setup = (): TestData => prepare({ shoppers: 2 });
export const shopper = (data: TestData) => shop(data);
export const admin = (data: TestData) => manageCatalog(data);
export const teardown = (data: TestData) => cleanUp(data);

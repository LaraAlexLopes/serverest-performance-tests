import { cleanUp, prepare, type TestData } from '../src/environment.ts';
import { browse, manageCatalog, shop } from '../src/journeys.ts';
import { sloThresholds } from '../src/thresholds.ts';

const DURATION = __ENV.SOAK_DURATION || '15m';

export const options = {
  scenarios: {
    shoppers: { executor: 'constant-vus', exec: 'shopper', vus: 20, duration: DURATION },
    visitors: {
      executor: 'constant-arrival-rate',
      exec: 'visitor',
      rate: 10,
      timeUnit: '1s',
      duration: DURATION,
      preAllocatedVUs: 10,
    },
    catalog: {
      executor: 'constant-arrival-rate',
      exec: 'admin',
      rate: 1,
      timeUnit: '1s',
      duration: DURATION,
      preAllocatedVUs: 5,
    },
  },
  thresholds: sloThresholds,
};

export const setup = (): TestData => prepare({ shoppers: 25 });
export const shopper = (data: TestData) => shop(data);
export const visitor = (data: TestData) => browse(data);
export const admin = (data: TestData) => manageCatalog(data);
export const teardown = (data: TestData) => cleanUp(data);

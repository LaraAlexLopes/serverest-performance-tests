import { cleanUp, prepare, type TestData } from '../src/environment.ts';
import { browse, manageCatalog, shop } from '../src/journeys.ts';
import { sloThresholds } from '../src/thresholds.ts';

export const options = {
  scenarios: {
    shoppers: {
      executor: 'ramping-vus',
      exec: 'shopper',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 30 },
        { duration: '2m', target: 30 },
        { duration: '20s', target: 0 },
      ],
    },
    visitors: {
      executor: 'constant-arrival-rate',
      exec: 'visitor',
      rate: 20,
      timeUnit: '1s',
      duration: '2m50s',
      preAllocatedVUs: 20,
    },
    catalog: {
      executor: 'constant-arrival-rate',
      exec: 'admin',
      rate: 1,
      timeUnit: '1s',
      duration: '2m50s',
      preAllocatedVUs: 5,
    },
  },
  thresholds: sloThresholds,
};

export const setup = (): TestData => prepare({ shoppers: 40 });
export const shopper = (data: TestData) => shop(data);
export const visitor = (data: TestData) => browse(data);
export const admin = (data: TestData) => manageCatalog(data);
export const teardown = (data: TestData) => cleanUp(data);

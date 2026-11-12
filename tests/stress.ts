import { cleanUp, prepare, type TestData } from '../src/environment.ts';
import { browse, shop } from '../src/journeys.ts';

export const options = {
  scenarios: {
    shoppers: {
      executor: 'ramping-vus',
      exec: 'shopper',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 50 },
        { duration: '1m', target: 50 },
        { duration: '30s', target: 100 },
        { duration: '1m', target: 100 },
        { duration: '30s', target: 200 },
        { duration: '1m', target: 200 },
        { duration: '30s', target: 0 },
      ],
    },
    visitors: {
      executor: 'ramping-arrival-rate',
      exec: 'visitor',
      startRate: 20,
      timeUnit: '1s',
      preAllocatedVUs: 50,
      maxVUs: 200,
      stages: [
        { duration: '2m', target: 50 },
        { duration: '2m', target: 100 },
        { duration: '1m', target: 20 },
      ],
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.05'],
    'http_req_duration{group:::browse}': ['p(95)<1000'],
    journey_checkout_duration: ['p(95)<3000'],
    'checks{kind:invariant}': ['rate==1'],
  },
};

export const setup = (): TestData => prepare({ shoppers: 220 });
export const shopper = (data: TestData) => shop(data);
export const visitor = (data: TestData) => browse(data);
export const teardown = (data: TestData) => cleanUp(data);

import { cleanUp, prepare, type TestData } from '../src/environment.ts';
import { browse } from '../src/journeys.ts';

export const options = {
  scenarios: {
    visitors: {
      executor: 'ramping-arrival-rate',
      exec: 'visitor',
      startRate: 10,
      timeUnit: '1s',
      preAllocatedVUs: 100,
      maxVUs: 400,
      stages: [
        { duration: '20s', target: 10 },
        { duration: '10s', target: 400 },
        { duration: '30s', target: 400 },
        { duration: '10s', target: 10 },
        { duration: '30s', target: 10 },
      ],
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.05'],
    'http_req_duration{group:::browse}': ['p(95)<1000'],
    'checks{kind:invariant}': ['rate==1'],
  },
};

export const setup = (): TestData => prepare();
export const visitor = (data: TestData) => browse(data);
export const teardown = (data: TestData) => cleanUp(data);

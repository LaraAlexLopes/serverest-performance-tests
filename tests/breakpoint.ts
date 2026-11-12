import { cleanUp, prepare, type TestData } from '../src/environment.ts';
import { browse } from '../src/journeys.ts';

export const options = {
  scenarios: {
    visitors: {
      executor: 'ramping-arrival-rate',
      exec: 'visitor',
      startRate: 20,
      timeUnit: '1s',
      preAllocatedVUs: 100,
      maxVUs: 1000,
      stages: [{ duration: '5m', target: 1500 }],
    },
  },
  thresholds: {
    'http_req_duration{group:::browse}': [{ threshold: 'p(95)<500', abortOnFail: true, delayAbortEval: '10s' }],
    http_req_failed: [{ threshold: 'rate<0.02', abortOnFail: true, delayAbortEval: '10s' }],
  },
};

export const setup = (): TestData => prepare();
export const visitor = (data: TestData) => browse(data);
export const teardown = (data: TestData) => cleanUp(data);

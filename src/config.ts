export const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export const PASSWORD = 'PerfTest!2026';

export const EMAIL_DOMAIN = 'perf-suite.dev';

export const SLO = {
  errorRate: 0.01,
  checksRate: 0.99,
  browseP95: 300,
  writeP95: 500,
  journeyP95: 1500,
};

# ServeRest Performance Tests

[![Performance](https://github.com/LaraAlexLopes/serverest-performance-tests/actions/workflows/performance.yml/badge.svg)](https://github.com/LaraAlexLopes/serverest-performance-tests/actions/workflows/performance.yml)
[![Dashboards](https://img.shields.io/badge/dashboards-k6-7d64ff)](https://laraalexlopes.github.io/serverest-performance-tests)

Performance tests for [ServeRest](https://github.com/ServeRest/ServeRest) with **k6** and **TypeScript**: smoke, load, stress, spike, breakpoint, soak and a stock contention test that checks correctness under concurrency.

The tests run **only against ServeRest in Docker**, never against the public serverest.dev. Load testing a shared public service would be a denial of service against someone else's server.

Companion project: [ServeRest API Tests](https://github.com/LaraAlexLopes/serverest-api-tests) covers the same API functionally, with Postman and Newman.

## Stack

k6 2.3 · TypeScript · Docker · GitHub Actions

## Test types

| Test                              | Load profile                                                                | Gate                                           |
| --------------------------------- | --------------------------------------------------------------------------- | ---------------------------------------------- |
| [Smoke](tests/smoke.ts)           | 2 shoppers × 3 journeys, 2 catalog changes                                  | Zero errors, every check passes                |
| [Load](tests/load.ts)             | 30 shoppers, 20 visitors/s, 1 catalog change/s for 3 min                    | The SLOs below                                 |
| [Stress](tests/stress.ts)         | Shoppers 50 → 100 → 200, visitors up to 100/s                               | Errors < 5%, browse p95 < 1 s                  |
| [Spike](tests/spike.ts)           | Visitors 10/s → 400/s in 10 s, hold 30 s, back to 10/s                      | Errors < 5%, browse p95 < 1 s                  |
| [Breakpoint](tests/breakpoint.ts) | Visitors rising from 20/s to 1,500/s over 5 min                             | Aborts when browse p95 > 500 ms or errors > 2% |
| [Soak](tests/soak.ts)             | 20 shoppers, 10 visitors/s, 1 catalog change/s for 15 min (`SOAK_DURATION`) | The SLOs below                                 |
| [Contention](tests/contention.ts) | 120 buyers try to buy 1 of 50 units at the same time                        | Stock invariants (see Findings)                |

**Journeys.** A _shopper_ browses the catalog, opens a product, logs in, creates a cart with two products and concludes the purchase, with think time between steps. A _visitor_ only browses. The _catalog_ scenario creates, updates and deletes a product as an admin.

**SLOs used as thresholds**

| Metric                                                         | Threshold |
| -------------------------------------------------------------- | --------- |
| Failed requests (`http_req_failed`)                            | < 1%      |
| Checks                                                         | > 99%     |
| Browse requests, p95                                           | < 300 ms  |
| `POST /carrinhos` and `DELETE /carrinhos/concluir-compra`, p95 | < 500 ms  |
| Checkout journey (login → cart → purchase), p95                | < 1.5 s   |

## Results

Measured locally, with ServeRest limited to **1 CPU and 512 MB** (k6 2.3.0, ServeRest 3.2.2). The limits make results comparable between runs and machines. Absolute numbers differ in CI.

| Test       | Requests | Throughput | p95    | Max    | Errors | Result                                                                           |
| ---------- | -------- | ---------- | ------ | ------ | ------ | -------------------------------------------------------------------------------- |
| Load       | 18,143   | 105 req/s  | 36 ms  | 362 ms | 0%     | ✅ every SLO met: browse p95 25 ms, checkout journey p95 121 ms, 2,144 purchases |
| Stress     | 102,056  | 338 req/s  | 412 ms | 1.4 s  | 0%     | ✅ no errors at 200 shoppers, but p95 is 11× the load test                       |
| Spike      | 32,660   | 326 req/s  | 325 ms | 10.9 s | 0%     | ✅ gate met, but some users waited up to 11 s and 283 iterations could not start |
| Breakpoint | 75,645   | 584 req/s  | 507 ms | 31.8 s | 0%     | ⛔ stopped after about 2 min 10 s, when the offered load was about 1,300 req/s   |

**Reading the results**

- **ServeRest degrades by queueing, not by failing.** No test produced a single HTTP error. When the CPU saturates, requests wait: the median stays at a few milliseconds, while p95 and the maximum grow by orders of magnitude.
- **Capacity on 1 CPU:** comfortable at about 100 req/s, still without errors at about 340 req/s, and past the 500 ms p95 limit at an average of about 580 req/s. Above that, k6 dropped 4,267 iterations because responses no longer kept up.
- **A spike hurts more than steady stress.** At a similar average throughput, the spike produced a maximum of 10.9 s, against 1.4 s in the stress test, because the queue builds up all at once.

The k6 web dashboards (HTML) with every metric over time are written to `reports/` and published on GitHub Pages for each run on `main`.

## Findings

### [KI-01](https://github.com/LaraAlexLopes/serverest-performance-tests/issues/1): ServeRest oversells stock under concurrent orders

**120 buyers** try to put **1 unit** of a product with **stock 50** in their cart at the same time.

| Run                          | Carts accepted | Stock left | Expected             |
| ---------------------------- | -------------- | ---------- | -------------------- |
| 1 buyer at a time            | 50             | 0          | ✅ 50 carts, stock 0 |
| 120 concurrent buyers, run 1 | **120**        | **44**     | ❌ 50 carts, stock 0 |
| 120 concurrent buyers, run 2 | **120**        | **46**     | ❌                   |
| 120 concurrent buyers, run 3 | **120**        | **44**     | ❌                   |

Every concurrent buyer gets a cart, and the stock barely moves: most of the decrements are lost. The control run, with one buyer at a time, behaves correctly, so the defect only shows up under concurrency. It points to a non-atomic read-check-write on the stock (lost update). The fix is an atomic, conditional decrement, or a lock around the stock check.

Tracked in [issue #1](https://github.com/LaraAlexLopes/serverest-performance-tests/issues/1). The test runs in CI as a known issue: it fails while the defect exists, without blocking the pipeline.

## How it is built

```
src/
├── api.ts          ServeRest endpoints, each request tagged by route (POST /carrinhos…)
├── checks.ts       validateStatus, validateLoggedIn, validateCatalog, validateCreated, validateInvariant
├── data.ts         users and products tagged with the run id
├── environment.ts  setup (admin, catalog, shopper pool via http.batch) and teardown (cleanup by run prefix)
├── journeys.ts     shop, browse and manageCatalog, plus custom metrics
└── thresholds.ts   the SLOs as k6 thresholds
tests/              one file per test type
scripts/k6.sh       runs k6 in Docker with the web dashboard export
```

- **Requests are tagged by route**, so thresholds and dashboards break latency down per endpoint instead of mixing `GET /produtos` with `POST /carrinhos`.
- **Custom metrics:** `journey_checkout_duration` (login → cart → purchase, without think time) and `purchases_completed`.
- **Invariants as checks:** cleanup and the contention rules are recorded with `validateInvariant`, tagged `kind:invariant` and gated with `rate==1`.
- **Data hygiene:** `setup` creates an admin, a catalog and one shopper per VU, so no two VUs share a cart. `teardown` cancels carts (restoring stock), then deletes the run's products and users, and checks that nothing was left.

## Running locally

**Requirements:** Docker. Node 24 only for lint and typecheck.

```bash
npm install
npm run server:up         # ServeRest on http://localhost:3000, limited to 1 CPU and 512 MB
npm run test:smoke
npm run test:load
npm run test:stress
npm run test:spike
npm run test:breakpoint
npm run test:soak         # 15 min; SOAK_DURATION=5m npm run test:soak for a shorter run
npm run test:contention   # known issue: fails while ServeRest oversells
npm run server:down
```

k6 runs from the `grafana/k6:2.3.0` image, so nothing needs to be installed on the machine. Each run writes `reports/<test>.html` (web dashboard) and `reports/<test>-summary.json`.

## CI

[`.github/workflows/performance.yml`](.github/workflows/performance.yml) runs lint and typecheck, then smoke and load as gates, and contention as a non-blocking known issue. Stress, spike, breakpoint and soak run on demand (**Run workflow → test**), so heavy tests do not run on every push. The dashboards are published to GitHub Pages.

## Conventions

- Code, test names, commits and docs are in English.
- Commits follow [Conventional Commits](https://www.conventionalcommits.org), enforced by commitlint.
- The pre-commit hook runs lint, typecheck and the format check.

## Author

**Lara Lopes**, QA Engineer · [LinkedIn](https://linkedin.com/in/laraalexandralopes) · [GitHub](https://github.com/LaraAlexLopes)

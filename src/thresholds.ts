import { SLO } from './config.ts';

export const sloThresholds = {
  http_req_failed: [`rate<${SLO.errorRate}`],
  checks: [`rate>${SLO.checksRate}`],
  'http_req_duration{group:::browse}': [`p(95)<${SLO.browseP95}`],
  'http_req_duration{name:POST /carrinhos}': [`p(95)<${SLO.writeP95}`],
  'http_req_duration{name:DELETE /carrinhos/concluir-compra}': [`p(95)<${SLO.writeP95}`],
  journey_checkout_duration: [`p(95)<${SLO.journeyP95}`],
  'checks{kind:invariant}': ['rate==1'],
};

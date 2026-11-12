import exec from 'k6/execution';

import { api, json } from '../src/api.ts';
import { validateCreated, validateInvariant, validateLoggedIn } from '../src/checks.ts';
import { cleanUp, prepare, type TestData } from '../src/environment.ts';

const STOCK = 50;
const BUYERS = 120;

export const options = {
  scenarios: {
    buyers: {
      executor: 'shared-iterations',
      vus: Number(__ENV.CONCURRENCY || BUYERS),
      iterations: BUYERS,
      maxDuration: '2m',
    },
  },
  thresholds: { 'checks{kind:invariant}': ['rate==1'] },
};

export const setup = (): TestData => prepare({ shoppers: BUYERS, products: 2, stock: STOCK });

export default function (data: TestData) {
  const buyer = data.shoppers[exec.scenario.iterationInTest];
  const token = validateLoggedIn(api.login(buyer.email, buyer.password));
  if (!token) return;
  const response = api.createCart([{ idProduto: data.products[0]._id, quantidade: 1 }], token);
  if (response.status === 201) validateCreated(response, 'create cart');
}

export const teardown = (data: TestData) => {
  const productId = data.products[0]._id;
  const stock = json<{ quantidade: number }>(api.getProduct(productId)).quantidade;
  const reserved = json<{ carrinhos: { produtos: { idProduto: string; quantidade: number }[] }[] }>(api.listCarts())
    .carrinhos.flatMap(cart => cart.produtos)
    .filter(item => item.idProduto === productId)
    .reduce((total, item) => total + item.quantidade, 0);

  console.log(`contention: stock left ${stock}, units in carts ${reserved}, initial stock ${STOCK}`);
  validateInvariant('stock never goes negative', stock >= 0);
  validateInvariant('no more units are reserved than the initial stock', reserved <= STOCK);
  validateInvariant('stock left plus units in carts equals the initial stock', stock + reserved === STOCK);

  cleanUp(data);
};

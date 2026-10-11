import { test } from 'node:test';
import assert from 'node:assert/strict';
import { claimDelivery } from '../delivery.mjs';
test('claim uses a hashed private marker and creates only once transactionally', async () => {
  let marker; let created = false;
  const ref = {};
  const db = {
    collection: name => { assert.equal(name, 'notification-deliveries'); return {
      doc: key => { assert.match(key, /^[a-f0-9]{64}$/); assert.notEqual(key, 'email-id'); return ref; },
    }; },
    runTransaction: async fn => fn({
      get: async actual => { assert.equal(actual, ref); return { exists: created }; },
      create: (actual, value) => { assert.equal(actual, ref); created = true; marker = value; },
    }),
  };
  assert.equal(await claimDelivery(db, 'email-id'), true);
  assert.equal(await claimDelivery(db, 'email-id'), false);
  assert.deepEqual(Object.keys(marker).sort(), ['createdAt', 'version']);
});

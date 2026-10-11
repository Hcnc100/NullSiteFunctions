import { test } from 'node:test';
import assert from 'node:assert/strict';
test('exports only the existing gen1 trigger with dedicated identity', async () => {
  process.env.GCLOUD_PROJECT = 'nullpointer-716ae';
  const module = await import('../index.mjs');
  assert.deepEqual(Object.keys(module), ['notifyEmail']);
  const endpoint = module.notifyEmail.__endpoint;
  assert.equal(endpoint.platform, 'gcfv1');
  assert.equal(endpoint.serviceAccountEmail, 'notify-runtime@nullpointer-716ae.iam.gserviceaccount.com');
  assert.deepEqual(endpoint.region, ['us-central1']);
  assert.equal(endpoint.eventTrigger.eventFilters.resource,
    'projects/nullpointer-716ae/databases/(default)/documents/emails/{idEmail}');
  assert.equal(endpoint.eventTrigger.retry, false);
});

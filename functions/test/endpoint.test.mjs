import { test } from 'node:test';
import assert from 'node:assert/strict';
test('exports only the gen2 trigger with dedicated identity', async () => {
  process.env.GCLOUD_PROJECT = 'nullpointer-716ae';
  const module = await import('../index.mjs');
  assert.deepEqual(Object.keys(module), ['notifyEmailV2']);
  const endpoint = module.notifyEmailV2.__endpoint;
  assert.equal(endpoint.platform, 'gcfv2');
  assert.equal(endpoint.serviceAccountEmail, 'notify-runtime@nullpointer-716ae.iam.gserviceaccount.com');
  assert.deepEqual(endpoint.region, ['us-central1']);
  assert.equal(endpoint.eventTrigger.eventType, 'google.cloud.firestore.document.v1.created');
  assert.equal(endpoint.eventTrigger.eventFilterPathPatterns.document, 'emails/{idEmail}');
  assert.equal(endpoint.eventTrigger.retry, false);
});

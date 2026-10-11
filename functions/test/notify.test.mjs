import { test } from 'node:test';
import assert from 'node:assert/strict';
import { notificationData, notifyCreatedEmail } from '../notify.mjs';
const email = { email: 'example@example.com', name: 'Example', subject: 'Test', message: 'Hello',
  isOpen: false, createdAt: { toMillis: () => 1000 }, updatedAt: { toMillis: () => 2000 } };
test('preserves deployed keys and string values', () => {
  assert.deepEqual(notificationData(email, 'id'), { idEmail: 'id', email: email.email, name: 'Example',
    subject: 'Test', message: 'Hello', isOpen: 'false', createdAt: '1000', updatedAt: '2000' });
});
test('rejects malformed documents and oversized Unicode payloads', () => {
  for (const value of [null, {}, { ...email, isOpen: null }, { ...email, createdAt: {} },
    { ...email, updatedAt: { toMillis: () => NaN } }, { ...email, message: '😀'.repeat(1000) }]) assert.equal(notificationData(value, 'id'), null);
});
test('invalid document does not read phones or send', async () => {
  const forbidden = () => { throw Error('must not execute'); };
  assert.equal((await notifyCreatedEmail({}, 'id', { readPhones: forbidden, send: forbidden })).invalidDocument, true);
});
test('uses tokenGCM, deduplicates, awaits sends and isolates failures', async () => {
  const sent = [];
  const result = await notifyCreatedEmail(email, 'id', {
    readPhones: async () => [{ tokenGCM: 'good' }, { tokenGCM: 'good' }, {}, { tokenGCM: 'invalid' }, { tokenGCM: 'transient' }],
    send: async message => {
      await Promise.resolve();
      if (message.token === 'invalid') throw { code: 'messaging/registration-token-not-registered' };
      if (message.token === 'transient') throw { code: 'messaging/internal-error' };
      sent.push(message);
    },
  });
  assert.equal(sent.length, 1); assert.equal(sent[0].data.idEmail, 'id');
  assert.deepEqual(result, { sent: 1, invalid: 1, failed: 1, skipped: 2, invalidDocument: false });
});
test('empty collection is a successful no-op', async () => {
  const result = await notifyCreatedEmail(email, 'id', { readPhones: async () => [], send: () => assert.fail() });
  assert.equal(result.sent, 0);
});
test('database failure remains observable', async () => {
  await assert.rejects(notifyCreatedEmail(email, 'id', { readPhones: async () => { throw Error('db unavailable'); }, send: () => assert.fail() }), /db unavailable/);
});
test('shared delivery claim prevents the second trigger sending again', async () => {
  let claimed = false; let sends = 0;
  const deps = {
    readPhones: async () => [{ tokenGCM: 'device' }],
    claim: async () => { if (claimed) return false; claimed = true; return true; },
    send: async () => { sends++; },
  };
  const [old, next] = await Promise.all([
    notifyCreatedEmail(email, 'same-email', deps), notifyCreatedEmail(email, 'same-email', deps),
  ]);
  assert.equal(sends, 1);
  assert.equal([old, next].filter(result => result.duplicate).length, 1);
});

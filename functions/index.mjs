import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';
import { info } from 'firebase-functions/logger';
import { notifyCreatedEmail } from './notify.mjs';
import { claimDelivery } from './delivery.mjs';
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
initializeApp();
export const notifyEmailV2 = onDocumentCreated({
  document: 'emails/{idEmail}', region: 'us-central1',
  serviceAccount: 'notify-runtime@nullpointer-716ae.iam.gserviceaccount.com',
  memory: '256MiB', timeoutSeconds: 120, maxInstances: 3, concurrency: 1,
  minInstances: 0, retry: false,
}, async event => {
  const result = await notifyCreatedEmail(event.data?.data(), event.params.idEmail, {
    readPhones: async () => (await getFirestore().collection('phones').get()).docs.map(doc => doc.data()),
    send: message => getMessaging().send(message),
    claim: idEmail => claimDelivery(getFirestore(), idEmail),
  });
  info('notifyEmailV2 result', result);
});

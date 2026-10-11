import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';
import * as functions from 'firebase-functions/v1';
import { notifyCreatedEmail } from './notify.mjs';
import { claimDelivery } from './delivery.mjs';
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
initializeApp();
export const notifyEmail = functions.region('us-central1').runWith({
  serviceAccount: 'notify-runtime@nullpointer-716ae.iam.gserviceaccount.com',
  memory: '256MB', timeoutSeconds: 120, maxInstances: 3, failurePolicy: false,
}).firestore.document('/emails/{idEmail}').onCreate(async (snapshot, context) => {
  const result = await notifyCreatedEmail(snapshot.data(), context.params.idEmail, {
    readPhones: async () => (await getFirestore().collection('phones').get()).docs.map(doc => doc.data()),
    send: message => getMessaging().send(message),
    claim: idEmail => claimDelivery(getFirestore(), idEmail),
  });
  // Counts only: no contact content, addresses or FCM tokens in logs.
  functions.logger.info('notifyEmail result', result);
  return null;
});

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
  functions.logger.info('notifyEmailV2 result', result);
});

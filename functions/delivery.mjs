import { createHash } from 'node:crypto';
import { FieldValue } from 'firebase-admin/firestore';

/** Atomic claim shared by the old and new trigger during cutover. No contact/token data. */
export async function claimDelivery(db, idEmail) {
  const key = createHash('sha256').update('notify-email:' + idEmail).digest('hex');
  const ref = db.collection('notification-deliveries').doc(key);
  return db.runTransaction(async transaction => {
    if ((await transaction.get(ref)).exists) return false;
    transaction.create(ref, { createdAt: FieldValue.serverTimestamp(), version: 1 });
    return true;
  });
}

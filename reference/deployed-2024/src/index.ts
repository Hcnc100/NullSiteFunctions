import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import {EmailData} from "./models/EmailData";
import {COLLECTION_EMAILS, COLLECTION_PHONES} from "./utils/Constants";
import {PhoneInfoData} from "./models/PhoneInfoData";
import {Message} from "firebase-admin/lib/messaging/messaging-api";

admin.initializeApp();
const database = admin.firestore();

/**
 * Function triggered when a new email document is created in Firestore.
 * Sends a notification to all devices with the corresponding phone tokens.
 * Deletes the Firebase app after sending notifications.
 *
 * @param snapshot - The snapshot of the newly created email document.
 * @param context - The context object containing the parameters of the function.
 * @returns A Promise that resolves when all notifications are sent and the Firebase app is deleted.
 */
export const notifyEmail = functions.firestore.document(`/${COLLECTION_EMAILS}/{idEmail}`).onCreate(async (snapshot, context) => {
  const phoneList = await database.collection(COLLECTION_PHONES).get() as FirebaseFirestore.QuerySnapshot<PhoneInfoData>;

  const newEmail = snapshot.data() as EmailData;
  newEmail.idEmail = context.params.idEmail;

  const payloadNotify = {
    "idEmail": newEmail.idEmail,
    "email": newEmail.email,
    "name": newEmail.name,
    "subject": newEmail.subject,
    "isOpen": newEmail.isOpen.toString(),
    "message": newEmail.message,
    "createdAt": newEmail.createdAt.toMillis().toString(),
    "updatedAt": newEmail.updatedAt.toMillis().toString(),
  };

  const notifications = phoneList.docs.map(async (document) => {
    const phoneInfo = document.data() as PhoneInfoData;
    try {
      const message: Message = {
        data: payloadNotify,
        token: phoneInfo.tokenGCM,
      };
      await admin.messaging().send(message);
    } catch (error) {
      console.error("Error sending notification to device:", error);
    }
  });

  await Promise.all(notifications);
});

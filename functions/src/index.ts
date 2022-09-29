import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import {EmailContact} from "./models/EmailContact";

admin.initializeApp();
const database = admin.firestore();

// eslint-disable-next-line max-len
export const notifyEmail = functions.firestore.document("/emails/{idEmail}").onCreate(async (snapshot, context) => {
  const allTokens = await database.collection("tokens").get();
  const email = snapshot.data() as EmailContact;
  email.id=context.params.idEmail;
  email.timestamp=snapshot.get("timestamp").toMillis();
  return allTokens.docs.map((document)=>{
    const mapTokens = document.get("tokens") as Map<string, any>;
    Object.keys(mapTokens).forEach((token) => {
      admin.messaging().sendToDevice(token, {
        data: {
          notify: JSON.stringify(email),
        },
      });
    });
  });
});

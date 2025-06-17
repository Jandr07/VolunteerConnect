// ✅ CHANGED: We now import 'onCall' and 'HttpsError' directly from the v2 HTTPS module.
import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

admin.initializeApp();
const db = admin.firestore();

// ✅ CHANGED: The export syntax is different and the function name must be all lowercase.
export const deletegrouponlastleave = onCall(async (request) => {
  // ✅ CHANGED: The handler now receives a single 'request' object.
  // 'request.auth' replaces 'context.auth'.
  const auth = request.auth;

  if (!auth) {
    // ✅ CHANGED: 'HttpsError' is now used directly since we imported it.
    throw new HttpsError(
      "unauthenticated",
      "You must be logged in to perform this action.",
    );
  }

  const uid = auth.uid;
  // ✅ CHANGED: Client data is now in 'request.data'.
  const groupId = request.data.groupId;

  if (!groupId || typeof groupId !== "string") {
    throw new HttpsError(
      "invalid-argument",
      "A valid groupId must be provided.",
    );
  }

  // --- All of the Firestore logic below remains exactly the same ---
  try {
    const membersRef = db.collection("group_members");
    const membersQuery = membersRef.where("groupId", "==", groupId);
    const membersSnap = await membersQuery.get();

    if (membersSnap.size !== 1 || membersSnap.docs[0].data().userId !== uid) {
      throw new HttpsError(
        "permission-denied",
        "You are not the last member and cannot delete this group.",
      );
    }

    const batch = db.batch();
    const groupRef = db.collection("groups").doc(groupId);
    batch.delete(groupRef);
    batch.delete(membersSnap.docs[0].ref);

    const requestsRef = db.collection("join_requests");
    const requestsQuery = requestsRef.where("groupId", "==", groupId);
    const requestsSnap = await requestsQuery.get();
    requestsSnap.forEach((doc) => batch.delete(doc.ref));

    const eventsRef = db.collection("events");
    const eventsQuery = eventsRef.where("groupId", "==", groupId);
    const eventsSnap = await eventsQuery.get();
    const eventIds: string[] = eventsSnap.docs.map((doc) => doc.id);

    if (eventIds.length > 0) {
      for (const eventId of eventIds) {
        const eventDocRef = db.collection("events").doc(eventId);
        batch.delete(eventDocRef);

        const signupsRef = db.collection("event_signups");
        const signupsQuery = signupsRef.where("eventId", "==", eventId);
        const signupsSnap = await signupsQuery.get();
        signupsSnap.forEach((doc) => batch.delete(doc.ref));
      }
    }

    await batch.commit();

    return {
      status: "success",
      message: `Successfully deleted group ${groupId}`,
    };
  } catch (error) {
    console.error("Error deleting group:", error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError(
      "internal",
      "An unexpected error occurred while deleting the group.",
    );
  }
});
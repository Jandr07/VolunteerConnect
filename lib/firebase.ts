// src/lib/firebase.ts
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth'; // Import getAuth
import { collection, query, where, getDocs, deleteDoc, doc, writeBatch } from "firebase/firestore";
import { 
  GoogleAuthProvider, 
  signInWithPopup, 
  UserCredential 
} from "firebase/auth";
import { getDoc, setDoc, serverTimestamp } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);
const auth = getAuth(app); // Initialize Firebase Auth and get a reference to the service


/**
 * Removes a user's signup for a specific event.
 * @param eventId The ID of the event to leave.
 * @param userId The ID of the user leaving.
 */
export const removeSignup = async (eventId: string, userId: string): Promise<void> => {
  const signupsCollectionRef = collection(db, 'event_signups');
  // Create a query to find the specific signup document
  const q = query(signupsCollectionRef, where('eventId', '==', eventId), where('userId', '==', userId));

  const querySnapshot = await getDocs(q);

  if (querySnapshot.empty) {
    throw new Error("Signup not found. Could not remove.");
  }

  // There should only be one, but we'll loop just in case
  const batch = writeBatch(db);
  querySnapshot.forEach((doc) => {
    batch.delete(doc.ref);
  });

  await batch.commit();
};

/**
 * Deletes an event and all of its associated signups.
 * @param eventId The ID of the event to delete.
 */
export const deleteEventAndSignups = async (eventId: string): Promise<void> => {
  const batch = writeBatch(db);

  // 1. Reference to the event document
  const eventRef = doc(db, 'events', eventId);

  // 2. Query for all signups for this event
  const signupsCollectionRef = collection(db, 'event_signups');
  const q = query(signupsCollectionRef, where('eventId', '==', eventId));
  const signupsSnapshot = await getDocs(q);

  // 3. Add all signup docs to the batch for deletion
  signupsSnapshot.forEach((doc) => {
    batch.delete(doc.ref);
  });

  // 4. Add the event doc itself to the batch for deletion
  batch.delete(eventRef);

  // 5. Commit the batch
  await batch.commit();
};
/**
 * Handles the Google Sign-In process and creates a user profile if it's a new user.
 * @returns The user credential upon successful sign-in.
 */
export const signInWithGoogle = async (): Promise<UserCredential> => {
  const provider = new GoogleAuthProvider();
  
  try {
    const result = await signInWithPopup(auth, provider);
    const user = result.user;

    // Check if a user document already exists in Firestore
    const userDocRef = doc(db, "users", user.uid);
    const userDocSnap = await getDoc(userDocRef);

    // If the user document does not exist, create it
    if (!userDocSnap.exists()) {
      await setDoc(userDocRef, {
        fullName: user.displayName,
        email: user.email,
        createdAt: serverTimestamp(),
        uid: user.uid
      });
      console.log("New user profile created in Firestore for:", user.displayName);
    }

    return result;
  } catch (error) {
    // Handle specific errors, e.g., user closes popup
    console.error("Error during Google sign-in:", error);
    throw error;
  }
};

export { db, auth }; // Export auth
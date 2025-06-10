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
import { getDoc, setDoc, serverTimestamp,limit } from "firebase/firestore";

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

/**
 * Allows a user to join a public group or request to join a private group.
 * @param groupId The ID of the group.
 * @param groupPrivacy The privacy setting of the group ('public' or 'private').
 * @param user The authenticated user object from useAuth.
 */
export const requestToJoinGroup = async (groupId: string, groupPrivacy: 'public' | 'private', user: any) => {
  if (!user) throw new Error("User not authenticated");

  if (groupPrivacy === 'public') {
    // For public groups, add the user directly to members with 'member' role.
    const memberDocRef = doc(db, 'group_members', `${groupId}_${user.uid}`);
    await setDoc(memberDocRef, {
      groupId: groupId,
      userId: user.uid,
      userName: user.fullName || user.displayName,
      userEmail: user.email,
      role: 'member',
      joinedAt: serverTimestamp(),
    });
  } else {
    // For private groups, create a join request.
    const requestDocRef = doc(db, 'join_requests', `${groupId}_${user.uid}`);
    await setDoc(requestDocRef, {
      groupId: groupId,
      userId: user.uid,
      userName: user.fullName || user.displayName,
      requestedAt: serverTimestamp(),
    });
  }
};

/**
 * Approves a join request for a private group.
 * This function creates a member document and deletes the join request.
 * @param groupId The group ID.
 * @param targetUser An object containing the target user's id and name.
 */
export const approveJoinRequest = async (groupId: string, targetUser: { id: string; name: string }) => {
  const memberDocRef = doc(db, 'group_members', `${groupId}_${targetUser.id}`);
  await setDoc(memberDocRef, {
    groupId: groupId,
    userId: targetUser.id,
    userName: targetUser.name,
    role: 'member',
    joinedAt: serverTimestamp(),
  });

  const requestDocRef = doc(db, 'join_requests', `${groupId}_${targetUser.id}`);
  await deleteDoc(requestDocRef);
};

/**
 * Denies a join request for a private group by deleting the request document.
 * @param groupId The group ID.
 * @param targetUserId The user ID of the request to deny.
 */
export const denyJoinRequest = async (groupId: string, targetUserId: string) => {
  const requestDocRef = doc(db, 'join_requests', `${groupId}_${targetUserId}`);
  await deleteDoc(requestDocRef);
};

/**
 * Promotes a member to an admin role.
 * @param groupId The group ID.
 * @param targetUserId The user ID of the member to promote.
 */
export const promoteToAdmin = async (groupId: string, targetUserId: string) => {
    const memberDocRef = doc(db, 'group_members', `${groupId}_${targetUserId}`);
    await setDoc(memberDocRef, { role: 'admin' }, { merge: true });
};

/**
 * Removes a member from a group.
 * @param groupId The group ID.
 * @param targetUserId The user ID of the member to kick.
 */
export const kickMember = async (groupId: string, targetUserId: string) => {
    const memberDocRef = doc(db, 'group_members', `${groupId}_${targetUserId}`);
    await deleteDoc(memberDocRef);
};

/**
 * Searches for groups by name.
 * This performs a "starts with" search, case-sensitive.
 * @param name The search term for the group name.
 * @returns An array of found groups.
 */
export const searchGroups = async (name: string) => {
  const groupsRef = collection(db, 'groups');
  // Firestore query to find documents where the 'name' field starts with the search term
  // '\uf8ff' is a very high code point in Unicode, so this acts like a "prefix" search
  const q = query(
    groupsRef, 
    where('name', '>=', name), 
    where('name', '<=', name + '\uf8ff'),
    limit(20) // Limit results to avoid fetching too much data
  );

  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[]; // Adjust type as needed
};


export { db, auth }; // Export auth
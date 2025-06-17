// src/lib/firebase.ts

import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  query, 
  where, 
  getDocs, 
  deleteDoc, 
  doc, 
  writeBatch, 
  getDoc, 
  setDoc, 
  serverTimestamp, 
  limit 
} from 'firebase/firestore';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  UserCredential 
} from "firebase/auth";

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
const auth = getAuth(app);

/**
 * Removes a user's signup for a specific event.
 * @param eventId The ID of the event to leave.
 * @param userId The ID of the user leaving.
 */
export const removeSignup = async (eventId: string, userId: string): Promise<void> => {
  const signupsCollectionRef = collection(db, 'event_signups');
  const q = query(signupsCollectionRef, where('eventId', '==', eventId), where('userId', '==', userId));
  const querySnapshot = await getDocs(q);

  if (querySnapshot.empty) {
    throw new Error("Signup not found. Could not remove.");
  }

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
  const eventRef = doc(db, 'events', eventId);
  const signupsCollectionRef = collection(db, 'event_signups');
  const q = query(signupsCollectionRef, where('eventId', '==', eventId));
  const signupsSnapshot = await getDocs(q);

  signupsSnapshot.forEach((doc) => {
    batch.delete(doc.ref);
  });
  batch.delete(eventRef);
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
    const userDocRef = doc(db, "users", user.uid);
    const userDocSnap = await getDoc(userDocRef);

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
    console.error("Error during Google sign-in:", error);
    throw error;
  }
};

/**
 * FIXED: Allows a user to join a public group or request to join a private group.
 * This version is more robust because it fetches the user's profile directly
 * to ensure the correct user name is used.
 * @param groupId The ID of the group.
 * @param groupPrivacy The privacy setting of the group ('public' or 'private').
 * @param user The authenticated user object from useAuth (must contain uid).
 */
export const requestToJoinGroup = async (groupId: string, groupPrivacy: 'public' | 'private', user: { uid: string; displayName: string | null; email: string | null; }) => {
  if (!user || !user.uid) throw new Error("User not authenticated or UID missing");

  // Fetch the user's profile from Firestore to get the correct name.
  const userDocRef = doc(db, "users", user.uid);
  const userDocSnap = await getDoc(userDocRef);

  // Determine the user's name robustly.
  // Priority: Firestore 'fullName' > Auth 'displayName' > Fallback.
  let userName = "A New User"; // A sensible fallback
  if (userDocSnap.exists() && userDocSnap.data().fullName) {
    userName = userDocSnap.data().fullName;
  } else if (user.displayName) {
    userName = user.displayName;
  }

  // Proceed with the original logic using the reliably-fetched userName.
  if (groupPrivacy === 'public') {
    // For public groups, add the user directly to members with 'member' role.
    const memberDocRef = doc(db, 'group_members', `${groupId}_${user.uid}`);
    await setDoc(memberDocRef, {
      groupId: groupId,
      userId: user.uid,
      userName: userName, // Use the robustly determined name
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
      userName: userName, // Use the robustly determined name
      requestedAt: serverTimestamp(),
    });
  }
};

/**
 * Approves a join request for a private group.
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
 * Denies a join request for a private group.
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
 * @param name The search term for the group name.
 * @returns An array of found groups.
 */
export const searchGroups = async (name: string) => {
  const groupsRef = collection(db, 'groups');
  const q = query(
    groupsRef, 
    where('name', '>=', name), 
    where('name', '<=', name + '\uf8ff'),
    limit(20)
  );

  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];
};

export { db, auth };
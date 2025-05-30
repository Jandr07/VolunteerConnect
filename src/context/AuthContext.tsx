// src/context/AuthContext.tsx
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { onAuthStateChanged, User as FirebaseUser, signOut as firebaseSignOut } from 'firebase/auth';
import { doc, getDoc, onSnapshot } from 'firebase/firestore'; // Import getDoc or onSnapshot
import { auth, db } from '@/lib/firebase';

// Define a more detailed User type for your context
export interface AppUser extends FirebaseUser {
  fullName?: string; // Add our custom field
  // add other custom fields from your 'users' collection if needed
}

interface AuthContextType {
  user: AppUser | null;
  loading: boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // User is signed in, now get their profile from Firestore
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        
        // Use onSnapshot for real-time updates to user profile, or getDoc for one-time fetch
        const unsubscribeSnapshot = onSnapshot(userDocRef, (docSnap) => {
          if (docSnap.exists()) {
            const userData = docSnap.data();
            setUser({
              ...firebaseUser, // Spread Firebase user properties
              fullName: userData.fullName || firebaseUser.displayName, // Use Firestore name, fallback to Auth displayName
              // ...any other custom fields
            });
          } else {
            // No custom profile found, maybe new user before Firestore doc is created
            // or profile was deleted. Fallback to basic Firebase user.
            setUser({
                ...firebaseUser,
                fullName: firebaseUser.displayName || undefined
            });
          }
          setLoading(false);
        }, (error) => {
            console.error("Error fetching user profile:", error);
            setUser(firebaseUser as AppUser); // Fallback to Firebase user info on error
            setLoading(false);
        });
        return () => unsubscribeSnapshot(); // Cleanup Firestore listener

      } else {
        // User is signed out
        setUser(null);
        setLoading(false);
      }
    });

    return () => unsubscribeAuth(); // Cleanup auth listener
  }, []);

  const logout = async () => {
    setLoading(true);
    try {
      await firebaseSignOut(auth);
      setUser(null);
    } catch (error) {
      console.error("Failed to log out:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
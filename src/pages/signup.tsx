// src/pages/signup.tsx
import { useState } from 'react';
import { useRouter } from 'next/router';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth'; // Import updateProfile
import { doc, setDoc, serverTimestamp } from 'firebase/firestore'; // Import Firestore functions
import { auth, db } from '@/lib/firebase'; // Import db

export default function SignUpPage() {
  const [fullName, setFullName] = useState(''); // New state for full name
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (!fullName.trim()) {
      setError('Please enter your full name.');
      setLoading(false);
      return;
    }
    if (password.length < 6) {
      setError('Password should be at least 6 characters.');
      setLoading(false);
      return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Update Firebase Auth profile (optional but good practice)
      await updateProfile(user, { displayName: fullName });

      // Create a document in 'users' collection in Firestore
      const userDocRef = doc(db, 'users', user.uid);
      await setDoc(userDocRef, {
        uid: user.uid,
        fullName: fullName,
        email: user.email,
        createdAt: serverTimestamp(),
        // You can add more profile fields here later (e.g., photoURL)
      });

      router.push('/'); // Redirect to homepage (or dashboard)
    } catch (err: unknown) { // Changed from any to unknown
        console.error("Failed to sign up:", err); // Log the full error
        if (err instanceof Error) {
          setError(err.message);
        } else if (typeof err === 'string') {
          setError(err);
        } else {
          setError('An unexpected error occurred during signup.');
        }
      } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '400px', margin: 'auto', padding: '20px' }}>
      <h1>Sign Up</h1>
      <form onSubmit={handleSignUp}>
        {/* Full Name Field */}
        <div style={{ marginBottom: '10px' }}>
          <label htmlFor="fullName">Full Name:</label>
          <input
            type="text"
            id="fullName"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
            style={{ width: '100%', padding: '8px' }}
          />
        </div>
        {/* Email Field */}
        <div style={{ marginBottom: '10px' }}>
          <label htmlFor="email">Email:</label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{ width: '100%', padding: '8px' }}
          />
        </div>
        {/* Password Field */}
        <div style={{ marginBottom: '10px' }}>
          <label htmlFor="password">Password:</label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{ width: '100%', padding: '8px' }}
          />
        </div>
        {error && <p style={{ color: 'red' }}>{error}</p>}
        <button type="submit" disabled={loading} style={{ padding: '10px 15px' }}>
          {loading ? 'Signing Up...' : 'Sign Up'}
        </button>
      </form>
    </div>
  );
}
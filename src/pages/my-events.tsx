// src/pages/my-events.tsx
import { useEffect, useState } from 'react';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useRouter } from 'next/router';
import { useAuth } from '../context/AuthContext';
import Link from 'next/link';

interface SignedUpEvent {
  id: string; // Event ID
  title: string;
  date: string;
  location: string;
  signedUpAt: string; // Or Date
}

export default function MyEventsPage() {
  const { user, loading: authLoading } = useAuth();
  const [signedUpEvents, setSignedUpEvents] = useState<SignedUpEvent[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const router = useRouter(); // Import from 'next/router'

  useEffect(() => {
    if (authLoading) return; // Wait for auth state to resolve
    if (!user) {
      router.push('/login'); // Redirect to login if not authenticated
      return;
    }

    const fetchMyEvents = async () => {
      setLoadingEvents(true);
      try {
        const signupsRef = collection(db, 'event_signups');
        const q = query(signupsRef, where('userId', '==', user.uid));
        const signupSnapshot = await getDocs(q);

        const eventsData: SignedUpEvent[] = [];
        for (const signupDoc of signupSnapshot.docs) {
          const signupData = signupDoc.data();
          const eventRef = doc(db, 'events', signupData.eventId);
          const eventSnap = await getDoc(eventRef);

          if (eventSnap.exists()) {
            const eventData = eventSnap.data();
            eventsData.push({
              id: eventSnap.id,
              title: eventData.title,
              // Ensure date is a string. Convert if it's a Firestore Timestamp.
              date: eventData.date.toDate ? eventData.date.toDate().toISOString() : eventData.date,
              location: eventData.location,
              signedUpAt: signupData.signedUpAt.toDate ? signupData.signedUpAt.toDate().toISOString() : signupData.signedUpAt,
            });
          }
        }
        setSignedUpEvents(eventsData);
      } catch (error) {
        console.error("Error fetching signed up events:", error);
      } finally {
        setLoadingEvents(false);
      }
    };

    fetchMyEvents();
  }, [user, authLoading, router]);

  if (authLoading || loadingEvents) {
    return <p>Loading your events...</p>;
  }

  if (!user) {
    // This case should ideally be handled by the redirect, but as a fallback:
    return <p>Please <Link href="/login">login</Link> to see your events.</p>;
  }

  return (
    <div style={{ padding: '20px' }}>
      <h1>My Signed-Up Events</h1>
      {signedUpEvents.length === 0 ? (
        <p>You haven't signed up for any events yet. <Link href="/">Browse events</Link>.</p>
      ) : (
        <ul>
          {signedUpEvents.map((event) => (
            <li key={event.id} style={{ marginBottom: '15px', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>
              <h2>{event.title}</h2>
              <p>Date: {new Date(event.date).toLocaleDateString()}</p>
              <p>Location: {event.location}</p>
              <p>Signed up on: {new Date(event.signedUpAt).toLocaleDateString()}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
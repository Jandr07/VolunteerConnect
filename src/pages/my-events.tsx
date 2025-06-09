// src/pages/my-events.tsx
import { useEffect, useState } from 'react';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db, removeSignup } from '@/lib/firebase'; // Import removeSignup
import { useRouter } from 'next/router';
import { useAuth } from '../context/AuthContext';
import Link from 'next/link';
import Layout from '../components/Layout'; // Import Layout component

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
  const router = useRouter();

  const fetchMyEvents = async () => {
    if (!user) return; // Guard clause
    setLoadingEvents(true);
    try {
      const signupsRef = collection(db, 'event_signups');
      const q = query(signupsRef, where('userId', '==', user.uid));
      const signupSnapshot = await getDocs(q);

      const eventsDataPromises = signupSnapshot.docs.map(async (signupDoc) => {
        const signupData = signupDoc.data();
        const eventRef = doc(db, 'events', signupData.eventId);
        const eventSnap = await getDoc(eventRef);

        if (eventSnap.exists()) {
          const eventData = eventSnap.data();
          return {
            id: eventSnap.id,
            title: eventData.title,
            date: eventData.date?.toDate ? eventData.date.toDate().toISOString() : eventData.date,
            location: eventData.location,
            signedUpAt: signupData.signedUpAt?.toDate ? signupData.signedUpAt.toDate().toISOString() : signupData.signedUpAt,
          };
        }
        return null;
      });
      
      const eventsData = (await Promise.all(eventsDataPromises)).filter(event => event !== null) as SignedUpEvent[];
      setSignedUpEvents(eventsData);
    } catch (error) {
      console.error("Error fetching signed up events:", error);
    } finally {
      setLoadingEvents(false);
    }
  };

  useEffect(() => {
    if (authLoading) return; // Wait for auth state to resolve
    if (!user) {
      router.push('/login'); // Redirect to login if not authenticated
      return;
    }
    fetchMyEvents();
  }, [user, authLoading, router]);

  // Handler for leaving an event
  const handleLeaveEvent = async (eventId: string) => {
    if (!user) return;

    if (window.confirm("Are you sure you want to leave this event?")) {
      try {
        await removeSignup(eventId, user.uid);
        alert("You have successfully left the event.");
        // Refresh the list of events after leaving one
        fetchMyEvents();
      } catch (err) {
        console.error(err);
        alert("There was an error trying to leave the event. Please try again.");
      }
    }
  };

  if (authLoading || loadingEvents) {
    return <div><p>Loading your events...</p></div>;
  }

  return (
    <div>
      <h1>My Signed-Up Events</h1>
      {signedUpEvents.length === 0 ? (
        <p>You haven&apos;t signed up for any events yet. <Link href="/events">Browse events</Link>.</p>
      ) : (
        <div className="events-list">
          {signedUpEvents.map((event) => (
            <div key={event.id} className="sticky-note-card">
              <h3>{event.title}</h3>
              <p><strong>Date:</strong> {new Date(event.date).toLocaleDateString()}</p>
              <p><strong>Location:</strong> {event.location}</p>
              <p><em>Signed up on: {new Date(event.signedUpAt).toLocaleDateString()}</em></p>
              <button
                onClick={() => handleLeaveEvent(event.id)}
                className="button-danger"
                style={{ marginTop: '10px' }}
              >
                Leave Event
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

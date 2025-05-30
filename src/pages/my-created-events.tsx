// src/pages/my-created-events.tsx
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '../context/AuthContext'; // Adjust path
import { Event } from '../pages/events'; // Assuming you have src/types/index.ts or adjust path

export default function MyCreatedEventsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter(); // Import from 'next/router'
  const [myEvents, setMyEvents] = useState<Event[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login?redirect=/my-created-events');
      return;
    }

    if (user) {
      const fetchMyEvents = async () => {
        setLoadingEvents(true);
        try {
          const eventsRef = collection(db, 'events');
          const q = query(eventsRef, where('creatorId', '==', user.uid));
          const querySnapshot = await getDocs(q);
          
          const eventsDataPromises = querySnapshot.docs.map(async (doc) => {
            const data = doc.data();
            // Fetch signup count for each of my events
            const signupsQuery = query(collection(db, 'event_signups'), where('eventId', '==', doc.id));
            const countSnapshot = await getCountFromServer(signupsQuery);
            const currentSignups = countSnapshot.data().count;

            return {
              id: doc.id,
              ...data,
              date: data.date?.toDate ? data.date.toDate().toISOString() : data.date,
              description: data.description || "No description.",
              maxParticipants: data.maxParticipants || 0,
              currentSignups: currentSignups,
            } as Event;
          });
          const eventsData = await Promise.all(eventsDataPromises);
          setMyEvents(eventsData);
        } catch (error) {
          console.error("Error fetching created events:", error);
        } finally {
          setLoadingEvents(false);
        }
      };
      fetchMyEvents();
    }
  }, [user, authLoading, router]);

  if (authLoading || loadingEvents) {
    return <p>Loading your created events...</p>;
  }

  if (!user) {
    return <p>Please login to see your created events.</p>; // Fallback
  }

  const formatDate = (dateInput: any): string => { // You can move this to a utils file
    if (!dateInput) return 'N/A';
    if (dateInput && typeof dateInput.toDate === 'function') {
      return dateInput.toDate().toLocaleDateString();
    }
    try {
      return new Date(dateInput).toLocaleDateString();
    } catch (e) {
      return String(dateInput);
    }
  };


  return (
    <div style={{ padding: '20px' }}>
      <h1>My Created Events</h1>
      {myEvents.length === 0 ? (
        <p>You haven&apos;t created any events yet. <Link href="/create-event">Create one now!</Link></p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {myEvents.map((event) => (
            <li key={event.id} style={{ border: '1px solid #eee', padding: '15px', marginBottom: '10px', borderRadius: '4px' }}>
              <h2>{event.title}</h2>
              <p>Date: {formatDate(event.date)}</p>
              <p>Location: {event.location}</p>
              <p>Slots: {event.currentSignups ?? 'N/A'} / {event.maxParticipants}</p>
              <Link href={`/event-signups/${event.id}`} style={{ display: 'inline-block', marginTop: '10px', color: 'blue' }}>
                View Signups ({event.currentSignups ?? 0})
              </Link>
              {/* Add Edit/Delete buttons here later if needed */}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// Import useRouter and getCountFromServer if not already present
import { useRouter } from 'next/router';
import { getCountFromServer } from 'firebase/firestore';
// src/pages/my-created-events.tsx
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { collection, query, where, getDocs, getCountFromServer } from 'firebase/firestore';
import { db, deleteEventAndSignups } from '../../lib/firebase'; // Import delete function
import { useAuth } from '../context/AuthContext';
import { Event } from '../pages/events'; // Adjust path if needed
import Layout from '../components/Layout'; // Import Layout component

export default function MyCreatedEventsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [myEvents, setMyEvents] = useState<Event[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);

  const fetchMyEvents = async () => {
    if (!user) return;
    setLoadingEvents(true);
    try {
      const eventsRef = collection(db, 'events');
      const q = query(eventsRef, where('creatorId', '==', user.uid));
      const querySnapshot = await getDocs(q);
      
      const eventsDataPromises = querySnapshot.docs.map(async (doc) => {
        const data = doc.data();
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

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login?redirect=/my-created-events');
      return;
    }

    if (user) {
      fetchMyEvents();
    }
  }, [user, authLoading, router]);

  // Handler for deleting an event
  const handleDeleteEvent = async (eventId: string) => {
    if (window.confirm("Are you sure you want to permanently delete this event? This will remove all user signups and cannot be undone.")) {
      try {
        await deleteEventAndSignups(eventId);
        alert("Event successfully deleted.");
        // Refresh the list
        fetchMyEvents();
      } catch (err) {
        console.error(err);
        alert("Failed to delete the event. Please try again.");
      }
    }
  };
  
  if (authLoading || loadingEvents) {
    return <div><p>Loading your created events...</p></div>;
  }

  return (
    <div >
      <h1>My Created Events</h1>
      {myEvents.length === 0 ? (
        <p>You haven&apos;t created any events yet. <Link href="/create-event">Create one now!</Link></p>
      ) : (
        <div className="events-list">
          {myEvents.map((event) => (
            <div key={event.id} className="sticky-note-card">
              <h3>{event.title}</h3>
              <p><strong>Date:</strong> {new Date(event.date).toLocaleDateString()}</p>
              <p><strong>Location:</strong> {event.location}</p>
              <p><strong>Slots:</strong> {event.currentSignups ?? 'N/A'} / {event.maxParticipants}</p>
              <div style={{ marginTop: '15px', display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                <Link href={`/event-signups/${event.id}`} passHref>
                  <button className="button">View Signups ({event.currentSignups ?? 0})</button>
                </Link>
                <button
                  onClick={() => handleDeleteEvent(event.id)}
                  className="button-danger"
                >
                  Delete Event
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

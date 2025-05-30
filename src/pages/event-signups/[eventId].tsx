// src/pages/event-signups/[eventId].tsx
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { doc, getDoc, collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '../../context/AuthContext'; // Adjust path
import { Event } from '../../pages/events'; // Adjust path
import Link from 'next/link';

interface Signup {
    id: string;
    userId: string;
    userName: string; // Add this
    userEmail: string;
    eventName: string;
    signedUpAt: any;
  }

export default function EventSignupsPage() {
  const router = useRouter();
  const { eventId } = router.query;
  const { user, loading: authLoading } = useAuth();

  const [event, setEvent] = useState<Event | null>(null);
  const [signups, setSignups] = useState<Signup[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push(`/login?redirect=/event-signups/${eventId}`);
      return;
    }

    if (eventId && user) {
      const fetchEventAndSignups = async () => {
        setLoadingData(true);
        setError(null);
        try {
          // 1. Fetch event details
          const eventRef = doc(db, 'events', eventId as string);
          const eventSnap = await getDoc(eventRef);

          if (!eventSnap.exists()) {
            setError("Event not found.");
            setLoadingData(false);
            return;
          }

          const eventData = { id: eventSnap.id, ...eventSnap.data() } as Event;
          
          // 2. Authorization: Check if current user is the event creator
          if (eventData.creatorId !== user.uid) {
            setError("You are not authorized to view signups for this event.");
            setEvent(eventData); // Still set event to display title, but hide signups
            setLoadingData(false);
            return;
          }
          setEvent(eventData);

          // 3. Fetch signups for this event
          const signupsRef = collection(db, 'event_signups');
          const q = query(signupsRef, where('eventId', '==', eventId));
          const signupSnapshot = await getDocs(q);
          const signupsData = signupSnapshot.docs.map(d => ({
            id: d.id,
            ...d.data(),
            signedUpAt: d.data().signedUpAt?.toDate ? d.data().signedUpAt.toDate().toLocaleString() : d.data().signedUpAt,
          })) as Signup[];
          setSignups(signupsData);

        } catch (err: any) {
          console.error("Error fetching event/signups:", err);
          setError(err.message || "Failed to load data.");
        } finally {
          setLoadingData(false);
        }
      };
      fetchEventAndSignups();
    }
  }, [eventId, user, authLoading, router]);

  if (authLoading || loadingData) {
    return <p>Loading event signup details...</p>;
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
      {event && <h1>Signups for: {event.title}</h1>}
      {event && <p>Date: {formatDate(event.date)} | Max Participants: {event.maxParticipants}</p>}
      
      {error && <p style={{ color: 'red' }}>Error: {error}</p>}

      {!error && event && event.creatorId === user?.uid && ( // Only show list if no error and authorized
        <>
          <h3>Total Signups: {signups.length} / {event.maxParticipants}</h3>
          {signups.length === 0 ? (
            <p>No one has signed up for this event yet.</p>
          ) : (
            <ul style={{ listStyle: 'decimal', paddingLeft: '20px' }}>
              {signups.map((signup) => (
                <li key={signup.id} style={{ marginBottom: '8px' }}>
                    <strong>{signup.userName || 'N/A'}</strong> ({signup.userEmail})
                    <br />
                    <small>Signed up on: {signup.signedUpAt}</small>
                </li>
                ))}
            </ul>
          )}
        </>
      )}
      {!error && event && event.creatorId !== user?.uid && (
         <p style={{ marginTop: '20px' }}>You do not have permission to view the detailed signup list for this event.</p>
      )}

        <Link href="/my-created-events" style={{ display: 'block', marginTop: '20px' }}>
         &larr; Back to My Created Events
        </Link>
    </div>
  );
}
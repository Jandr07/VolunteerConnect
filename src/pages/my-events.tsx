// src/pages/my-events.tsx (Updated to separate upcoming and past events)
import { useEffect, useState } from 'react';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db, removeSignup } from '../../lib/firebase'; // Import removeSignup
import { useRouter } from 'next/router';
import { useAuth } from '../context/AuthContext';
import Link from 'next/link';
import Layout from '../components/Layout'; // Import Layout component

interface SignedUpEvent {
  id: string; // Event ID
  title: string;
  date: string; // Storing as ISO string for easier date math
  location: string;
  signedUpAt: string;
}

export default function MyEventsPage() {
  const { user, loading: authLoading } = useAuth();
  // ✅ State is now split into two categories
  const [upcomingEvents, setUpcomingEvents] = useState<SignedUpEvent[]>([]);
  const [pastEvents, setPastEvents] = useState<SignedUpEvent[]>([]);
  const [showPastEvents, setShowPastEvents] = useState(false); // UI toggle

  const [loadingEvents, setLoadingEvents] = useState(true);
  const router = useRouter();

  const fetchMyEvents = async () => {
    if (!user) return;
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
            signedUpAt: signupData.signedUpAt?.toDate ? signupData.signedUpAt.toDate().toISOString() : "N/A",
          };
        }
        return null;
      });
      
      const allEvents = (await Promise.all(eventsDataPromises)).filter(event => event !== null) as SignedUpEvent[];
      
      // ✅ Partition the events into upcoming and past
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Set to midnight for accurate date comparison

      const upcoming: SignedUpEvent[] = [];
      const past: SignedUpEvent[] = [];

      allEvents.forEach(event => {
        if (new Date(event.date) >= today) {
          upcoming.push(event);
        } else {
          past.push(event);
        }
      });

      // ✅ Sort events for better display
      upcoming.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      past.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      setUpcomingEvents(upcoming);
      setPastEvents(past);

    } catch (error) {
      console.error("Error fetching signed up events:", error);
    } finally {
      setLoadingEvents(false);
    }
  };

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push('/login');
      return;
    }
    fetchMyEvents();
  }, [user, authLoading, router]);

  const handleLeaveEvent = async (eventId: string) => {
    if (!user) return;

    if (window.confirm("Are you sure you want to leave this event?")) {
      try {
        await removeSignup(eventId, user.uid);
        alert("You have successfully left the event.");
        fetchMyEvents(); // Refresh the list
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
      <h1>My Upcoming & Current Events</h1>
      {upcomingEvents.length === 0 ? (
        <p>You haven&apos;t signed up for any upcoming events. <Link href="/events">Browse events</Link>.</p>
      ) : (
        <div className="events-list">
          {upcomingEvents.map((event) => (
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

      <hr style={{ margin: '40px 0' }} />

      {/* ✅ Section for toggling and displaying past events */}
      <div className="past-events-section">
        {pastEvents.length > 0 && (
          <p style={{ textAlign: 'center' }}>
            <a 
              href="#" 
              onClick={(e) => { e.preventDefault(); setShowPastEvents(!showPastEvents); }}
              style={{ color: 'gray', textDecoration: 'underline', cursor: 'pointer' }}
            >
              {showPastEvents ? 'Hide Past Events' : 'Show Past Events'}
            </a>
          </p>
        )}
        
        {showPastEvents && (
          <>
            <h2 style={{ marginTop: '20px' }}>My Past Events</h2>
            <div className="events-list">
              {pastEvents.map((event) => (
                <div key={event.id} className="sticky-note-card" style={{ backgroundColor: '#f0f0f0', borderColor: '#ccc' }}>
                  <h3>{event.title}</h3>
                  <p><strong>Date:</strong> {new Date(event.date).toLocaleDateString()}</p>
                  <p><strong>Location:</strong> {event.location}</p>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
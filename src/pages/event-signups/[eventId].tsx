import { useRouter } from 'next/router';
import { useEffect, useState, useCallback } from 'react';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
// Import the necessary Firebase functions
import { db, removeSignup, deleteEventAndSignups } from '../../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import { Event } from '../events';

// Define types for this page
interface Signup {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
}

const EventDetailPage = () => {
  const router = useRouter();
  const { eventId } = router.query;
  const { user } = useAuth();
  
  const [event, setEvent] = useState<Event | null>(null);
  const [signups, setSignups] = useState<Signup[]>([]);
  const [isGroupAdmin, setIsGroupAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Memoized function to fetch all event data
  const fetchEventAndSignups = useCallback(async () => {
    if (!eventId || typeof eventId !== 'string') return;
    setLoading(true);
    setError(null);

    try {
      const eventRef = doc(db, 'events', eventId);
      const eventSnap = await getDoc(eventRef);
      if (!eventSnap.exists()) {
        setError("Event not found.");
        return;
      }
      const eventData = { id: eventSnap.id, ...eventSnap.data() } as Event;
      setEvent(eventData);

      // Check for admin status to control UI buttons
      let isAdmin = false;
      if (user && eventData.groupId) {
        const memberRef = doc(db, 'group_members', `${eventData.groupId}_${user.uid}`);
        const memberSnap = await getDoc(memberRef);
        if (memberSnap.exists() && memberSnap.data().role === 'admin') {
          isAdmin = true;
        }
      }
      setIsGroupAdmin(isAdmin);
      
      // ✅ MODIFICATION: Fetch signups for ANY user who can view the event.
      // NOTE: This requires a security rule change to work for non-admins.
      const signupsQuery = query(collection(db, 'event_signups'), where('eventId', '==', eventId));
      const signupsSnap = await getDocs(signupsQuery);
      const signupsData = signupsSnap.docs.map(d => ({ id: d.id, ...d.data() })) as Signup[];
      setSignups(signupsData);

    } catch (err) {
      console.error("Error fetching event details:", err);
      setError("Failed to load event details. Your security rules may be preventing access.");
    } finally {
      setLoading(false);
    }
  }, [eventId, user]);

  useEffect(() => {
    fetchEventAndSignups();
  }, [fetchEventAndSignups]);

  // Handler to remove a single user from the event
  const handleRemoveUser = async (userIdToRemove: string) => {
    if (!eventId || typeof eventId !== 'string') return;
    try {
      await removeSignup(eventId, userIdToRemove);
      alert("User removed from event.");
      fetchEventAndSignups(); // Refresh the list
    } catch (err) {
      console.error("Failed to remove user:", err);
      alert("Error removing user. Please try again.");
    }
  };

  // Handler to delete the entire event
  const handleDeleteEvent = async () => {
    if (!eventId || typeof eventId !== 'string' || !event?.groupId) return;
    if (window.confirm("Are you sure you want to permanently delete this event? This action cannot be undone.")) {
      try {
        await deleteEventAndSignups(eventId);
        alert("Event successfully deleted.");
        router.push(`/groups/${event.groupId}`); // Redirect back to the group page
      } catch (err) {
        console.error("Failed to delete event:", err);
        alert("Error deleting the event. Please try again.");
      }
    }
  };


  if (loading) return <div><p>Loading event details...</p></div>;
  if (error) return <div><p style={{ color: 'red' }}>{error}</p></div>;
  if (!event) return <div><p>Event could not be loaded.</p></div>;

  return (
    <div>
      <div className="event-header" style={{ marginBottom: '30px', borderBottom: '1px solid #eee', paddingBottom: '20px' }}>
        <h1>{event.title}</h1>
        <p><strong>Date:</strong> {event.date?.toDate ? new Date(event.date.toDate()).toLocaleString() : 'Not specified'}</p>
        <p><strong>Location:</strong> {event.location}</p>
        <p><strong>Description:</strong> {event.description}</p>
      </div>

      {/* ✅ MODIFICATION: This section is now visible to all users */}
      <section className="signups-section">
        <h2>Event Signups ({signups.length} / {event.maxParticipants || '∞'})</h2>
        {signups.length > 0 ? (
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {signups.map(signup => (
              <li key={signup.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f9f9f9', border: '1px solid #ddd', padding: '10px 15px', marginBottom: '10px', borderRadius: '5px' }}>
                <div>
                  <p style={{ margin: 0, fontWeight: 'bold' }}>{signup.userName}</p>
                  <p style={{ margin: '5px 0 0', color: '#555', fontSize: '0.9em' }}>{signup.userEmail}</p>
                </div>
                {/* The remove button is still only visible to admins */}
                {isGroupAdmin && (
                    <button onClick={() => handleRemoveUser(signup.userId)} className="button-danger-small">
                      Remove
                    </button>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p>No one has signed up for this event yet.</p>
        )}
      </section>

      {/* ✅ MODIFICATION: Admin controls are now in their own separate section */}
      {isGroupAdmin && (
        <section className="admin-actions-section" style={{marginTop: '40px', borderTop: '2px solid #ddd', paddingTop: '20px'}}>
           <h2>Admin Controls</h2>
           <div className="delete-event-section" style={{marginTop: '20px'}}>
             <h3>Delete Event</h3>
             <p>This will permanently delete the event and all associated signups.</p>
             <button onClick={handleDeleteEvent} className="button-danger">
                Delete This Event
             </button>
          </div>
        </section>
      )}
    </div>
  );
};

export default EventDetailPage;

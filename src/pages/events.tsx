// src/pages/events.tsx (Modified)
import { useEffect, useState } from 'react';
import { collection, query, where, getDocs, doc, addDoc, serverTimestamp, getCountFromServer } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';
import Link from 'next/link';
import { useRouter } from 'next/router';

// Updated interface to include all necessary fields
export interface Event {
  id: string;
  title: string;
  date: any;
  location: string;
  description: string;
  maxParticipants: number;
  creatorId: string;
  creatorEmail?: string;
  groupId: string; // Crucial for linking event to a group
  groupName?: string; // Optional, for display purposes
  currentSignups?: number;
}

const EventsPage = () => {
  const { user, loading: authLoading } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  // State for signup functionality
  const [signupMessage, setSignupMessage] = useState<{ [key: string]: string }>({});
  const [signupLoading, setSignupLoading] = useState<{ [key: string]: boolean }>({});
  const [userSignedUpEvents, setUserSignedUpEvents] = useState<string[]>([]);
  const router = useRouter();

  // --- Data Fetching Logic ---

  // Function to fetch current signup count for a single event
  const fetchSignupCount = async (eventId: string): Promise<number> => {
    try {
      const signupsQuery = query(collection(db, 'event_signups'), where('eventId', '==', eventId));
      const snapshot = await getCountFromServer(signupsQuery);
      return snapshot.data().count;
    } catch (error) {
      console.error(`Error fetching signup count for event ${eventId}:`, error);
      return 0;
    }
  };

  // Function to check which events the current user has signed up for
  const fetchUserSignups = async (userId: string) => {
    if (!userId) return;
    try {
      const signupsRef = collection(db, 'event_signups');
      const q = query(signupsRef, where('userId', '==', userId));
      const querySnapshot = await getDocs(q);
      const signedUpEventIds = querySnapshot.docs.map(doc => doc.data().eventId as string);
      setUserSignedUpEvents(signedUpEventIds);
    } catch (error) {
      console.error("Error fetching user signups:", error)
    }
  };

  useEffect(() => {
    if (user && !authLoading) {
      fetchUserSignups(user.uid);
    } else if (!user && !authLoading) {
      setUserSignedUpEvents([]);
    }
  }, [user, authLoading]);


  // Main effect to fetch all visible events
  useEffect(() => {
    const fetchVisibleEvents = async () => {
      setLoading(true);
      try {
        let visibleGroupIds: string[] = [];

        // 1. Get all public group IDs
        const publicGroupsQuery = query(collection(db, 'groups'), where('privacy', '==', 'public'));
        const publicGroupsSnap = await getDocs(publicGroupsQuery);
        visibleGroupIds = publicGroupsSnap.docs.map(doc => doc.id);

        // 2. If user is logged in, get IDs of groups they are a member of
        if (user) {
          const memberGroupsQuery = query(collection(db, 'group_members'), where('userId', '==', user.uid));
          const memberGroupsSnap = await getDocs(memberGroupsQuery);
          const memberGroupIds = memberGroupsSnap.docs.map(doc => doc.data().groupId);
          visibleGroupIds = [...new Set([...visibleGroupIds, ...memberGroupIds])];
        }

        if (visibleGroupIds.length === 0) {
            setEvents([]);
            setLoading(false);
            return;
        }
        
        // 3. Fetch all events from those groups
        const eventsQuery = query(collection(db, 'events'), where('groupId', 'in', visibleGroupIds));
        const eventsSnap = await getDocs(eventsQuery);
        let eventsData = eventsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Event[];
        
        // 4. Fetch group names for context
        const groupIds = [...new Set(eventsData.map(e => e.groupId))];
        const groupsQuery = query(collection(db, 'groups'), where('__name__', 'in', groupIds));
        const groupsSnap = await getDocs(groupsQuery);
        const groupNameMap = new Map<string, string>();
        groupsSnap.forEach(doc => groupNameMap.set(doc.id, doc.data().name));

        // 5. Fetch signup counts and add group names
        const eventsWithDetails = await Promise.all(eventsData.map(async (event) => {
            const currentSignups = await fetchSignupCount(event.id);
            return {
                ...event,
                groupName: groupNameMap.get(event.groupId) || 'Unknown Group',
                currentSignups: currentSignups,
            };
        }));
        
        setEvents(eventsWithDetails);

      } catch (error) {
        console.error("Error fetching events:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchVisibleEvents();
  }, [user]);

  // --- Event Handling ---

  const handleEventSignup = async (event: Event) => {
    if (!user) {
      router.push('/login');
      return;
    }
  
    setSignupLoading(prev => ({ ...prev, [event.id]: true }));
    setSignupMessage(prev => ({ ...prev, [event.id]: '' }));
  
    try {
      const currentSignups = await fetchSignupCount(event.id);
  
      if (event.maxParticipants > 0 && currentSignups >= event.maxParticipants) {
        setSignupMessage(prev => ({ ...prev, [event.id]: 'Sorry, this event is already full.' }));
        return;
      }
  
      await addDoc(collection(db, 'event_signups'), {
        eventId: event.id,
        userId: user.uid,
        userName: user.fullName || 'Anonymous Volunteer',
        userEmail: user.email,
        eventName: event.title,
        signedUpAt: serverTimestamp(),
      });
  
      setSignupMessage(prev => ({ ...prev, [event.id]: 'Successfully signed up!' }));
      await fetchUserSignups(user.uid);
      setEvents(prevEvents => prevEvents.map(e => e.id === event.id ? { ...e, currentSignups: (e.currentSignups || 0) + 1 } : e));
  
    } catch (error) {
        console.error("Error signing up for event:", error);
        setSignupMessage(prev => ({ ...prev, [event.id]: `Failed to sign up.` }));
    } finally {
      setSignupLoading(prev => ({ ...prev, [event.id]: false }));
    }
  };

  return (
    <div>
      <h1>Upcoming Events</h1>
      {loading && <p>Loading events...</p>}
      {!loading && events.length === 0 && <p>No events to show. Try joining some groups!</p>}
      
      <div className="events-list">
        {events.map((event) => {
          const isFull = (event.currentSignups || 0) >= event.maxParticipants;
          const alreadySignedUp = userSignedUpEvents.includes(event.id);

          return (
            <div key={event.id} className="sticky-note-card">
              <p style={{ fontWeight: 'bold', color: '#c79100' }}>From Group: <Link href={`/groups/${event.groupId}`}>{event.groupName}</Link></p>
              <h3>{event.title}</h3>
              <p><strong>Date:</strong> {new Date(event.date.toDate()).toLocaleString()}</p>
              <p><strong>Location:</strong> {event.location}</p>
              <p>{event.description}</p>
              <p>
                <strong>Slots:</strong> {event.currentSignups} / {event.maxParticipants}
                {isFull && !alreadySignedUp && <span style={{ color: 'orange', marginLeft: '10px' }}>(Full)</span>}
              </p>

              {user && (
                <div style={{ marginTop: '10px' }}>
                  {alreadySignedUp ? (
                    <p style={{ color: 'green', fontWeight: 'bold' }}>You are signed up for this event.</p>
                  ) : isFull ? (
                    <p style={{ color: 'orange', fontWeight: 'bold' }}>This event is currently full.</p>
                  ) : (
                    <button
                      onClick={() => handleEventSignup(event)}
                      disabled={signupLoading[event.id]}
                      className="button"
                    >
                      {signupLoading[event.id] ? 'Signing Up...' : 'Sign Up'}
                    </button>
                  )}
                </div>
              )}
              {!user && (
                <p style={{ marginTop: '10px' }}>
                  Please <Link href="/login">login</Link> to sign up.
                </p>
              )}
              {signupMessage[event.id] && (
                <p style={{ marginTop: '5px', color: signupMessage[event.id].startsWith('Successfully') ? 'green' : 'red' }}>
                  {signupMessage[event.id]}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default EventsPage;

import { useEffect, useState } from 'react';
import { collection, query, where, getDocs, doc, setDoc, serverTimestamp, getCountFromServer } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';
import Link from 'next/link';
import { useRouter } from 'next/router';

export interface Event {
  id: string;
  title: string;
  date: any; // Firestore Timestamp
  location: string;
  description: string;
  maxParticipants: number;
  creatorId: string;
  creatorEmail?: string;
  groupId: string;
  groupName?: string;
  currentSignups?: number;
}

const EventsPage = () => {
  const { user, loading: authLoading } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [signupMessage, setSignupMessage] = useState<{ [key: string]: string }>({});
  const [signupLoading, setSignupLoading] = useState<{ [key: string]: boolean }>({});
  const [userSignedUpEvents, setUserSignedUpEvents] = useState<string[]>([]);
  const router = useRouter();

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

  const fetchUserSignups = async (userId: string) => {
    if (!userId) return;
    try {
      const signupsRef = collection(db, 'event_signups');
      const q = query(signupsRef, where('userId', '==', userId));
      const querySnapshot = await getDocs(q);
      const signedUpEventIds = querySnapshot.docs.map(doc => doc.data().eventId as string);
      setUserSignedUpEvents(signedUpEventIds);
    } catch (error) {
      console.error("Error fetching user signups:", error);
    }
  };

  useEffect(() => {
    if (user && !authLoading) {
      fetchUserSignups(user.uid);
    } else if (!user && !authLoading) {
      setUserSignedUpEvents([]);
    }
  }, [user, authLoading]);

  useEffect(() => {
    const fetchEventsFromJoinedGroups = async () => {
      setLoading(true);

      if (!user) {
        setEvents([]);
        setLoading(false);
        return;
      }

      try {
        const memberGroupsQuery = query(collection(db, 'group_members'), where('userId', '==', user.uid));
        const memberGroupsSnap = await getDocs(memberGroupsQuery);
        const joinedGroupIds = memberGroupsSnap.docs.map(doc => doc.data().groupId);

        if (joinedGroupIds.length === 0) {
            setEvents([]);
            setLoading(false);
            return;
        }

        const eventsQuery = query(collection(db, 'events'), where('groupId', 'in', joinedGroupIds));
        const eventsSnap = await getDocs(eventsQuery);
        let eventsData = eventsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Event[];

        const groupIds = [...new Set(eventsData.map(e => e.groupId))];
        if (groupIds.length > 0) {
            const groupsQuery = query(collection(db, 'groups'), where('__name__', 'in', groupIds));
            const groupsSnap = await getDocs(groupsQuery);
            const groupNameMap = new Map<string, string>();
            groupsSnap.forEach(doc => groupNameMap.set(doc.id, doc.data().name));

            const eventsWithDetails = await Promise.all(eventsData.map(async (event) => {
                const currentSignups = await fetchSignupCount(event.id);
                return {
                    ...event,
                    groupName: groupNameMap.get(event.groupId) || 'Unknown Group',
                    currentSignups: currentSignups,
                };
            }));

            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const futureEvents = eventsWithDetails.filter(event => {
                return event.date && typeof event.date.toDate === 'function' && event.date.toDate() >= today;
            });

            futureEvents.sort((a, b) => a.date.toDate().getTime() - b.date.toDate().getTime());

            setEvents(futureEvents);
            
        } else {
            setEvents([]);
        }

      } catch (error) {
        console.error("Error fetching events:", error);
      } finally {
        setLoading(false);
      }
    };

    if (!authLoading) {
        fetchEventsFromJoinedGroups();
    }
  }, [user, authLoading]);

  const handleEventSignup = async (event: Event) => {
    if (!user) {
      router.push('/login');
      return;
    }
    if (userSignedUpEvents.includes(event.id)) {
      setSignupMessage(prev => ({ ...prev, [event.id]: 'You are already signed up.' }));
      return;
    }

    setSignupLoading(prev => ({ ...prev, [event.id]: true }));
    setSignupMessage(prev => ({ ...prev, [event.id]: '' }));

    try {
      if (event.maxParticipants > 0 && (event.currentSignups ?? 0) >= event.maxParticipants) {
        setSignupMessage(prev => ({ ...prev, [event.id]: 'Sorry, this event is already full.' }));
        return;
      }

      const signupDocRef = doc(db, 'event_signups', `${event.id}_${user.uid}`);
      await setDoc(signupDocRef, {
        eventId: event.id,
        userId: user.uid,
        userName: user.displayName || user.email || 'Anonymous Volunteer',
        userEmail: user.email,
        eventName: event.title,
        signedUpAt: serverTimestamp(),
      });

      setUserSignedUpEvents(prev => [...prev, event.id]);
      setEvents(prevEvents => prevEvents.map(e => e.id === event.id ? { ...e, currentSignups: (e.currentSignups || 0) + 1 } : e));
      setSignupMessage(prev => ({ ...prev, [event.id]: 'Successfully signed up!' }));

    } catch (error) {
        console.error("Error signing up for event:", error);
        setSignupMessage(prev => ({ ...prev, [event.id]: `Failed to sign up.` }));
    } finally {
      setSignupLoading(prev => ({ ...prev, [event.id]: false }));
    }
  };

  const renderContent = () => {
    if (loading || authLoading) {
        return <p>Loading events...</p>;
    }

    if (!user) {
        return <p>Please <Link href="/login" legacyBehavior><a>login</a></Link> to see events from your groups.</p>;
    }

    if (events.length === 0) {
        return (
            <div>
                <p>No upcoming events found in your groups.</p>
                <p>Try joining more groups or check back later!</p>
                <Link href="/groups" passHref>
                    <button className="button">Browse Groups</button>
                </Link>
            </div>
        );
    }

    return (
        <div className="events-list">
        {events.map((event) => {
          const isFull = event.maxParticipants > 0 && (event.currentSignups || 0) >= event.maxParticipants;
          const alreadySignedUp = userSignedUpEvents.includes(event.id);

          return (
            <div key={event.id} className="sticky-note-card">
              <p style={{ fontWeight: 'bold', color: '#c79100' }}>From Group: <Link href={`/groups/${event.groupId}`} legacyBehavior><a>{event.groupName}</a></Link></p>
              
              <Link href={`/event-signups/${event.id}`} legacyBehavior>
                <a><h3>{event.title}</h3></a>
              </Link>
              
              <p><strong>Date:</strong> {event.date?.toDate ? new Date(event.date.toDate()).toLocaleString() : 'Date not set'}</p>
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
              {signupMessage[event.id] && (
                <p style={{ marginTop: '5px', color: signupMessage[event.id].startsWith('Successfully') ? 'green' : 'red' }}>
                  {signupMessage[event.id]}
                </p>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div>
      <h1>Upcoming Events From Your Groups</h1>
      {renderContent()}
    </div>
  );
};

export default EventsPage;
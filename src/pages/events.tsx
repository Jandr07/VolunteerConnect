// src/pages/index.tsx
import { useEffect, useState } from "react";
import Link from 'next/link';
import { useRouter } from 'next/router'; // Import useRouter
import { db } from "@/lib/firebase"; // Your existing import
import { useAuth } from '../context/AuthContext'; // Assuming AuthContext.tsx is in src/context
import {
  collection,
  getDocs,
  addDoc,
  serverTimestamp,
  query,
  where,
  Timestamp, // Import Timestamp if you're using it directly
  getCountFromServer
} from "firebase/firestore";

// Define an interface for your event data
export interface Event {
  id: string;
  title: string;
  date: any; // Or string (ISO), number (ms), or Timestamp for more type safety
  location: string;
  description: string;     // New
  maxParticipants: number; // New
  creatorId: string;       // New
  creatorEmail?: string;   // Optional: store creator's email for display
  // any other fields
  currentSignups?: number;
}

export default function Home() {
  const [events, setEvents] = useState<Event[]>([]);
  const { user, loading: authLoading, logout } = useAuth(); // Use authLoading to avoid conflict
  const router = useRouter(); // Initialize router

  const [signupMessage, setSignupMessage] = useState<{ [key: string]: string }>({});
  const [signupLoading, setSignupLoading] = useState<{ [key: string]: boolean }>({});
  const [userSignedUpEvents, setUserSignedUpEvents] = useState<string[]>([]);

  // Fetch events (your existing logic)
  useEffect(() => {
    const fetchEventsAndCounts = async () => {
      try {
        const snapshot = await getDocs(collection(db, "events"));
        const eventsListPromises = snapshot.docs.map(async (doc) => {
          const data = doc.data();
          const currentSignups = await fetchSignupCount(doc.id); // Fetch count for each event
          return {
            id: doc.id,
            title: data.title,
            date: data.date?.toDate ? data.date.toDate().toISOString() : data.date,
            location: data.location,
            description: data.description || 'No description available.', // Provide default
            maxParticipants: data.maxParticipants || 0, // Provide default
            creatorId: data.creatorId,
            creatorEmail: data.creatorEmail,
            currentSignups: currentSignups, // Add current signups
          } as Event;
        });        
        const eventsList = await Promise.all(eventsListPromises);
        setEvents(eventsList);
      } catch (error) {
        console.error("Error fetching events:", error);
      }
    };

    fetchEventsAndCounts();
  }, []); // Re-fetch if needed based on other dependencies, or implement a refresh mechanism


  //Function to fetch current signup count for a single event
  const fetchSignupCount = async (eventId: string): Promise<number> => {
    try {
      const signupsQuery = query(collection(db, 'event_signups'), where('eventId', '==', eventId));
      const snapshot = await getCountFromServer(signupsQuery);
      return snapshot.data().count;
    } catch (error) {
      console.error(`Error fetching signup count for event ${eventId}:`, error);
      return 0; // Default to 0 on error
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

  // Fetch user signups when user is loaded or changes
  useEffect(() => {
    if (user && !authLoading) {
      fetchUserSignups(user.uid);
    } else if (!user && !authLoading) {
      setUserSignedUpEvents([]); // Clear if user logs out or is not loaded
    }
  }, [user, authLoading]);


  const handleEventSignup = async (event: Event) => {
    // Ensure 'user' is available from useAuth() in your component's scope
    // Ensure 'setSignupMessage', 'setSignupLoading', 'userSignedUpEvents', 'fetchUserSignups', 'setEvents'
    // are available from useState/props in your component's scope.
  
    if (!user) {
      setSignupMessage(prev => ({ ...prev, [event.id]: 'Please login to sign up.' }));
      // Optionally, you could redirect to login here: router.push('/login');
      return;
    }
  
    setSignupLoading(prev => ({ ...prev, [event.id]: true }));
    setSignupMessage(prev => ({ ...prev, [event.id]: '' })); // Clear previous message
  
    try {
      // 1. Check if user is already signed up (client-side check for quick feedback)
      if (userSignedUpEvents.includes(event.id)) {
        setSignupMessage(prev => ({ ...prev, [event.id]: 'You are already signed up for this event.' }));
        setSignupLoading(prev => ({ ...prev, [event.id]: false }));
        return;
      }
  
      // 2. Fetch the most current number of signups for THIS event
      const currentSignups = await fetchSignupCount(event.id);
  
      // 3. Check if the event is full
      if (event.maxParticipants > 0 && currentSignups >= event.maxParticipants) { // Check maxParticipants > 0 to avoid issues with unconfigured events
        setSignupMessage(prev => ({ ...prev, [event.id]: 'Sorry, this event is already full.' }));
        // Optionally update the event in local state to reflect it's full if not already done
        setEvents(prevEvents => prevEvents.map(e => e.id === event.id ? {...e, currentSignups} : e));
        setSignupLoading(prev => ({ ...prev, [event.id]: false }));
        return;
      }
  
      // 4. Proceed with signup
      const signupsCollectionRef = collection(db, 'event_signups');
      if (!user.uid) { // Should not happen if user is logged in, but good check
          throw new Error("User ID is not available.");
      }
  
      await addDoc(signupsCollectionRef, {
        eventId: event.id,
        userId: user.uid,
        userName: user.fullName || user.displayName || 'Anonymous Volunteer', // Use name from AuthContext
        userEmail: user.email,
        eventName: event.title, // Denormalizing for easier display in signup lists
        signedUpAt: serverTimestamp(),
      });
  
      // 5. Success! Update UI.
      setSignupMessage(prev => ({ ...prev, [event.id]: 'Successfully signed up!' }));
      
      // Refresh the list of events the user is signed up for
      await fetchUserSignups(user.uid); 
      
      // Update the currentSignups count for this event in the local 'events' state
      setEvents(prevEvents => prevEvents.map(e => {
        if (e.id === event.id) {
          // If currentSignups was undefined, initialize from fetched, else increment
          const newCount = (e.currentSignups !== undefined ? e.currentSignups : currentSignups) + 1;
          return { ...e, currentSignups: newCount };
        }
        return e;
      }));
  
    } catch (error: any) {
      console.error("Error signing up for event:", error);
      setSignupMessage(prev => ({ 
        ...prev, 
        [event.id]: `Failed to sign up: ${error.message || 'An unknown error occurred.'}` 
      }));
    } finally {
      setSignupLoading(prev => ({ ...prev, [event.id]: false }));
    }
  };

  // Helper function to format date
  const formatDate = (dateInput: any): string => {
    if (!dateInput) return 'N/A';
    // If it's a Firestore Timestamp object, call toDate()
    if (dateInput && typeof dateInput.toDate === 'function') {
      return dateInput.toDate().toLocaleDateString();
    }
    // If it's an ISO string or number (milliseconds)
    try {
      return new Date(dateInput).toLocaleDateString();
    } catch (e) {
      return String(dateInput); // Fallback to string representation
    }
  };


  if (authLoading) {
    return <p>Loading application...</p>; // Or a spinner component
  }

  return (
    <div style={{ padding: '20px' }}>
    
      


      {events.length === 0 && !authLoading && <p>No events scheduled at the moment. Please check back later!</p>}
      {authLoading && <p>Loading events...</p>}


      <ul style={{ listStyle: 'none', padding: 0 }}>
        {events.map((event) => {
          const isFull = (event.currentSignups || 0) >= event.maxParticipants;
          const alreadySignedUp = userSignedUpEvents.includes(event.id);

          return (
            <li key={event.id} style={{ border: '1px solid #ddd', padding: '15px', marginBottom: '15px', borderRadius: '5px' }}>
              <h2>{event.title}</h2>
              <p><strong>Date:</strong> {formatDate(event.date)}</p>
              <p><strong>Location:</strong> {event.location}</p>
              <p><strong>Description:</strong> {event.description}</p>
              <p>
                <strong>Slots:</strong> {event.currentSignups === undefined ? 'Loading...' : `${event.currentSignups} / ${event.maxParticipants}`}
                {isFull && !alreadySignedUp && <span style={{ color: 'orange', marginLeft: '10px' }}>(Full)</span>}
              </p>
              {event.creatorEmail && <p><small><i>Created by: {event.creatorEmail}</i></small></p>}


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
                      style={{ padding: '8px 12px', cursor: 'pointer' }}
                    >
                      {signupLoading[event.id] ? 'Signing Up...' : 'Sign Up for Event'}
                    </button>
                  )}
                </div>
              )}
              {!user && (
                <p style={{ marginTop: '10px' }}>
                  Please <Link href="/login" style={{ color: 'blue', textDecoration: 'underline' }}>login</Link> to sign up for this event.
                </p>
              )}
              {signupMessage[event.id] && (
                <p style={{ marginTop: '5px', color: signupMessage[event.id].startsWith('Successfully') ? 'green' : 'red' }}>
                  {signupMessage[event.id]}
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
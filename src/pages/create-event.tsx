// src/pages/create-event.tsx
import { useState } from 'react';
import { useRouter } from 'next/router';
import { collection, addDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '../context/AuthContext'; // Adjust path as needed

export default function CreateEventPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [title, setTitle] = useState('');
  const [date, setDate] = useState(''); // Store as YYYY-MM-DDTHH:mm for datetime-local input
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [maxParticipants, setMaxParticipants] = useState<number>(10); // Default or ''
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Redirect if not logged in or auth is still loading
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login?redirect=/create-event'); // Redirect to login, then back here
    }
  }, [user, authLoading, router]);

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!user) {
      setError("You must be logged in to create an event.");
      return;
    }

    if (!title || !date || !location || !description || maxParticipants <= 0) {
      setError("Please fill in all fields and ensure max participants is greater than 0.");
      return;
    }

    setLoading(true);

    try {
      const eventDate = new Date(date); // Convert input string to Date object
      if (isNaN(eventDate.getTime())) {
        setError("Invalid date format.");
        setLoading(false);
        return;
      }

      await addDoc(collection(db, 'events'), {
        title,
        date: Timestamp.fromDate(eventDate), // Store as Firestore Timestamp
        location,
        description,
        maxParticipants: Number(maxParticipants),
        creatorId: user.uid,
        creatorEmail: user.email || '', // Store creator's email
        createdAt: serverTimestamp(), // Optional: track when event was created
      });
      // Optionally, redirect to a "my events" page or the new event's page
      router.push('/'); // Redirect to homepage for now
    } catch (err: unknown) {
        console.error("Error creating event:", err);
        if (err instanceof Error) {
          setError(err.message);
        } else if (typeof err === 'string') {
          setError(err);
        } else {
          setError("An unexpected error occurred while creating the event.");
        }
      } finally {
      setLoading(false);
    }
  };

  if (authLoading || !user) {
    return <p>Loading user information or redirecting...</p>; // Or a proper loader
  }

  return (
    <div style={{ maxWidth: '600px', margin: 'auto', padding: '20px' }}>
      <h1>Create New Volunteer Event</h1>
      <form onSubmit={handleCreateEvent}>
        <div style={{ marginBottom: '15px' }}>
          <label htmlFor="title">Event Title:</label>
          <input
            type="text"
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            style={{ width: '100%', padding: '8px' }}
          />
        </div>
        <div style={{ marginBottom: '15px' }}>
          <label htmlFor="date">Date and Time:</label>
          <input
            type="datetime-local" // For easy date and time picking
            id="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
            style={{ width: '100%', padding: '8px' }}
          />
        </div>
        <div style={{ marginBottom: '15px' }}>
          <label htmlFor="location">Location:</label>
          <input
            type="text"
            id="location"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            required
            style={{ width: '100%', padding: '8px' }}
          />
        </div>
        <div style={{ marginBottom: '15px' }}>
          <label htmlFor="description">Description:</label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            rows={4}
            style={{ width: '100%', padding: '8px' }}
          />
        </div>
        <div style={{ marginBottom: '15px' }}>
          <label htmlFor="maxParticipants">Max Participants:</label>
          <input
            type="number"
            id="maxParticipants"
            value={maxParticipants}
            onChange={(e) => setMaxParticipants(Number(e.target.value))}
            min="1"
            required
            style={{ width: '100%', padding: '8px' }}
          />
        </div>

        {error && <p style={{ color: 'red', marginBottom: '10px' }}>{error}</p>}

        <button type="submit" disabled={loading} style={{ padding: '10px 20px' }}>
          {loading ? 'Creating Event...' : 'Create Event'}
        </button>
      </form>
    </div>
  );
}

// Import useEffect if not already imported
import { useEffect } from 'react';
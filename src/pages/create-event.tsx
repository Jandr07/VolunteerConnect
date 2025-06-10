// src/pages/create-event.tsx
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { collection, addDoc, serverTimestamp, Timestamp, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';
import Link from 'next/link';

// Interface for groups where user is an admin
interface AdminGroup {
  id: string;
  name: string;
}

export default function CreateEventPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  // State for form fields
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [maxParticipants, setMaxParticipants] = useState<number>(10);
  
  // State for group selection
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [adminGroups, setAdminGroups] = useState<AdminGroup[]>([]);

  // General state
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Effect to fetch the groups where the user is an admin
  useEffect(() => {
    if (!user) return;

    const fetchAdminGroups = async () => {
      const q = query(collection(db, 'group_members'), where('userId', '==', user.uid), where('role', '==', 'admin'));
      const querySnapshot = await getDocs(q);
      
      const groupIds = querySnapshot.docs.map(doc => doc.data().groupId);
      if (groupIds.length === 0) {
        setAdminGroups([]);
        return;
      }
      
      const groupsQuery = query(collection(db, 'groups'), where('__name__', 'in', groupIds));
      const groupsSnapshot = await getDocs(groupsQuery);
      const groupsData = groupsSnapshot.docs.map(doc => ({ id: doc.id, name: doc.data().name })) as AdminGroup[];
      setAdminGroups(groupsData);

      // Pre-select group if passed as a query parameter from a group page
      const { groupId } = router.query;
      if (typeof groupId === 'string' && groupIds.includes(groupId)) {
        setSelectedGroupId(groupId);
      }
    };

    fetchAdminGroups();
  }, [user, router.query]);

  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login?redirect=/create-event');
    }
  }, [user, authLoading, router]);

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!user) {
      setError("You must be logged in to create an event.");
      return;
    }
    
    // Validate that a group is selected
    if (!selectedGroupId) {
        setError("You must select a group to post this event to.");
        return;
    }

    setLoading(true);

    try {
      const eventDate = new Date(date);
      if (isNaN(eventDate.getTime())) {
        setError("Invalid date format.");
        setLoading(false);
        return;
      }

      await addDoc(collection(db, 'events'), {
        title,
        date: Timestamp.fromDate(eventDate),
        location,
        description,
        maxParticipants: Number(maxParticipants),
        creatorId: user.uid,
        creatorEmail: user.email || '',
        groupId: selectedGroupId, // Add the selected group ID
        createdAt: serverTimestamp(),
      });
      
      alert("Event created successfully!");
      router.push(`/groups/${selectedGroupId}`); // Redirect to the group's page
    } catch (err: unknown) {
        console.error("Error creating event:", err);
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError("An unexpected error occurred while creating the event.");
        }
      } finally {
      setLoading(false);
    }
  };

  if (authLoading || !user) {
    return <div><p>Loading user information...</p></div>;
  }

  return (
    <div>
      <div className="form-container">
        <h2>Create New Volunteer Event</h2>
        <form onSubmit={handleCreateEvent}>
          <div className="form-group">
            <label htmlFor="group-select">Post Event To Group</label>
            <select id="group-select" value={selectedGroupId} onChange={(e) => setSelectedGroupId(e.target.value)} required>
              <option value="" disabled>Select a group...</option>
              {adminGroups.map(group => (
                  <option key={group.id} value={group.id}>{group.name}</option>
              ))}
            </select>
          </div>
          {adminGroups.length === 0 && <p>You must be an admin of a group to create an event. <Link href="/create-group">Create a group</Link>.</p>}
          
          <div className="form-group">
            <label htmlFor="title">Event Title</label>
            <input type="text" id="title" value={title} onChange={(e) => setTitle(e.target.value)} required />
          </div>
          
          <div className="form-group">
            <label htmlFor="date">Date and Time</label>
            <input type="datetime-local" id="date" value={date} onChange={(e) => setDate(e.target.value)} required />
          </div>
          
          <div className="form-group">
            <label htmlFor="location">Location</label>
            <input type="text" id="location" value={location} onChange={(e) => setLocation(e.target.value)} required />
          </div>
          
          <div className="form-group">
            <label htmlFor="description">Description</label>
            <textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} required rows={4} />
          </div>
          
          <div className="form-group">
            <label htmlFor="maxParticipants">Max Participants</label>
            <input type="number" id="maxParticipants" value={maxParticipants} onChange={(e) => setMaxParticipants(Number(e.target.value))} min="1" required />
          </div>

          {error && <p className="error-message">{error}</p>}

          <button type="submit" className="button" disabled={loading || adminGroups.length === 0}>
            {loading ? 'Creating Event...' : 'Create Event'}
          </button>
        </form>
      </div>
    </div>
  );
}

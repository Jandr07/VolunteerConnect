import { useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../context/AuthContext';
import { db } from '../../lib/firebase';
import { collection, addDoc, doc, setDoc, serverTimestamp, query, where, getDocs, writeBatch } from 'firebase/firestore'; // Import writeBatch
import Layout from '../components/Layout';

const CreateGroupPage = () => {
  const { user } = useAuth();
  const router = useRouter();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [privacy, setPrivacy] = useState<'public' | 'private'>('public');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) { /* ... */ return; }
    setLoading(true);
    setError(null);

    try {
      // Step 1: Check for uniqueness
      const groupsRef = collection(db, 'groups');
      const q = query(groupsRef, where('name', '==', name.trim()));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        setError('A group with this name already exists. Please choose another.');
        setLoading(false);
        return;
      }

      // Use a write batch to make the operation atomic
      const batch = writeBatch(db);

      // Step 2: Create the group document
      const newGroupRef = doc(collection(db, 'groups')); // Create a reference with a new ID
      batch.set(newGroupRef, {
        name: name.trim(),
        description,
        privacy,
        creatorId: user.uid,
        createdAt: serverTimestamp(),
      });
      
      // Step 3: Create the admin membership document
      const memberDocRef = doc(db, 'group_members', `${newGroupRef.id}_${user.uid}`);
      batch.set(memberDocRef, {
        groupId: newGroupRef.id,
        userId: user.uid,
        userName: user.fullName || 'Group Creator',
        role: 'admin',
        joinedAt: serverTimestamp(),
      });
      
      // Commit the batch
      await batch.commit();
      
      alert("Group created successfully!");
      router.push(`/groups/${newGroupRef.id}`);

    } catch (err: any) {
      console.error("Error creating group:", err);
      setError("Failed to create group. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="form-container">
        <h2>Create a New Group</h2>
        <form onSubmit={handleCreateGroup}>
          {error && <p className="error-message">{error}</p>}
          <div className="form-group">
            <label htmlFor="group-name">Group Name</label>
            <input
              id="group-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="group-description">Description</label>
            <textarea
              id="group-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              rows={4}
            />
          </div>
          <div className="form-group">
            <label>Privacy Setting</label>
            {/* ... radio buttons ... */}
             <div style={{ display: 'flex', gap: '20px' }}>
              <label>
                <input
                  type="radio"
                  name="privacy"
                  value="public"
                  checked={privacy === 'public'}
                  onChange={() => setPrivacy('public')}
                /> Public
              </label>
              <label>
                <input
                  type="radio"
                  name="privacy"
                  value="private"
                  checked={privacy === 'private'}
                  onChange={() => setPrivacy('private')}
                /> Private
              </label>
            </div>
          </div>
          <button type="submit" className="button" disabled={loading}>
            {loading ? 'Creating...' : 'Create Group'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default CreateGroupPage;

// src/pages/my-groups.tsx
import { useEffect, useState } from 'react';
import { collection, query, where, getDocs, documentId } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';
import Link from 'next/link';
import { useRouter } from 'next/router';

interface Group {
  id: string;
  name: string;
  description: string;
  privacy: 'public' | 'private';
}

const MyGroupsPage = () => {
  const { user, loading: authLoading } = useAuth();
  const [myGroups, setMyGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Redirect if user is not logged in
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }
    
    if (user) {
      const fetchMyGroups = async () => {
        setLoading(true);
        try {
          // 1. Find all memberships for the current user
          const membershipsQuery = query(collection(db, 'group_members'), where('userId', '==', user.uid));
          const membershipSnapshot = await getDocs(membershipsQuery);
          const groupIds = membershipSnapshot.docs.map(doc => doc.data().groupId);

          if (groupIds.length === 0) {
            setMyGroups([]);
            setLoading(false);
            return;
          }

          // 2. Fetch the actual group documents using the collected IDs
          const groupsQuery = query(collection(db, 'groups'), where(documentId(), 'in', groupIds));
          const groupsSnapshot = await getDocs(groupsQuery);
          const groupsData = groupsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Group[];
          
          setMyGroups(groupsData);
        } catch (error) {
          console.error("Error fetching 'My Groups':", error);
        } finally {
          setLoading(false);
        }
      };
      fetchMyGroups();
    }
  }, [user, authLoading, router]);

  if (authLoading || loading) {
    return (
      <div>
        <p>Loading your groups...</p>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1>My Groups</h1>
        <button className="button" onClick={() => router.push('/groups')}>
          Discover More Groups
        </button>
      </div>
      
      <div className="events-list">
        {myGroups.length > 0 ? (
          myGroups.map(group => (
            // This is the corrected part: The <a> tag is removed, and its className is moved to the <Link> component.
            <Link key={group.id} href={`/groups/${group.id}`} className="sticky-note-card interactive">
              <h3>{group.name}</h3>
              <p>{group.description.substring(0, 100)}...</p>
              <span className={`privacy-tag ${group.privacy}`}>{group.privacy}</span>
            </Link>
          ))
        ) : (
          <p>You haven't joined any groups yet. Why not <Link href="/groups">browse the list</Link>?</p>
        )}
      </div>
    </div>
  );
};

export default MyGroupsPage;

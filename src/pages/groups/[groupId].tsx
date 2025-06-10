// src/pages/groups/[groupId].tsx (Updated)
import { useRouter } from 'next/router';
import { useEffect, useState, useCallback } from 'react';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db, requestToJoinGroup } from '../../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import Layout from '../../components/Layout';
import { Event } from '../events';
import JoinRequests from '../../components/JoinRequests'; // Import new component
import MemberManagement from '../../components/MemberManagement'; // Import new component

// Define types
interface Group {
  id: string;
  name: string;
  description: string;
  privacy: 'public' | 'private';
  creatorId: string;
}
interface Member {
  userId: string;
  userName: string;
  role: 'admin' | 'member';
}
interface JoinRequest {
  userId: string;
  userName: string;
}

const GroupDetailPage = () => {
  const router = useRouter();
  const { groupId } = router.query;
  const { user } = useAuth();

  const [group, setGroup] = useState<Group | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [requests, setRequests] = useState<JoinRequest[]>([]); // New state for requests
  const [userStatus, setUserStatus] = useState<'admin' | 'member' | 'pending' | 'non-member'>('non-member');
  const [loading, setLoading] = useState(true);

  // Use useCallback to memoize the data fetching function to prevent re-renders
  const fetchGroupData = useCallback(async () => {
    if (!groupId || typeof groupId !== 'string') return;
    setLoading(true);

    try {
      // Fetch group details
      const groupRef = doc(db, 'groups', groupId);
      const groupSnap = await getDoc(groupRef);
      if (!groupSnap.exists()) { setGroup(null); return; }
      const groupData = { id: groupSnap.id, ...groupSnap.data() } as Group;
      setGroup(groupData);

      // Fetch members and determine user role
      const membersQuery = query(collection(db, 'group_members'), where('groupId', '==', groupId));
      const membersSnap = await getDocs(membersQuery);
      const membersData = membersSnap.docs.map(d => d.data() as Member);
      setMembers(membersData);

      // Fetch events
      const eventsQuery = query(collection(db, 'events'), where('groupId', '==', groupId));
      const eventsSnap = await getDocs(eventsQuery);
      const eventsData = eventsSnap.docs.map(d => ({ id: d.id, ...d.data() })) as Event[];
      setEvents(eventsData);

      // Determine current user's status
      if (user) {
        const currentUserMembership = membersData.find(m => m.userId === user.uid);
        if (currentUserMembership) {
          setUserStatus(currentUserMembership.role);
        } else {
            // Check for pending join request
            const requestRef = doc(db, 'join_requests', `${groupId}_${user.uid}`);
            const requestSnap = await getDoc(requestRef);
            setUserStatus(requestSnap.exists() ? 'pending' : 'non-member');
        }

        // If user is an admin, fetch join requests
        if (currentUserMembership?.role === 'admin') {
          const requestsQuery = query(collection(db, 'join_requests'), where('groupId', '==', groupId));
          const requestsSnap = await getDocs(requestsQuery);
          const requestsData = requestsSnap.docs.map(r => ({ userId: r.data().userId, userName: r.data().userName })) as JoinRequest[];
          setRequests(requestsData);
        }
      }
    } catch (error) {
      console.error("Error fetching group data:", error);
    } finally {
      setLoading(false);
    }
  }, [groupId, user]);

  useEffect(() => {
    fetchGroupData();
  }, [fetchGroupData]);

  const handleJoinGroup = async () => {
    if (!user || !group) return;
    try {
      await requestToJoinGroup(group.id, group.privacy, user);
      alert(group.privacy === 'public' ? "You have joined the group!" : "Your request to join has been sent.");
      fetchGroupData(); // Refresh data to show new status
    } catch (error) {
      console.error(error);
      alert("Failed to send request.");
    }
  };
  
  const handleCreateEvent = () => router.push(`/create-event?groupId=${groupId}`);

  if (loading) return <div><p>Loading group details...</p></div>;
  if (!group) return <div><p>Sorry, this group could not be found.</p></div>;

  const canViewContent = userStatus === 'member' || userStatus === 'admin' || group.privacy === 'public';

  return (
    <div>
      <div className="group-header">
        <h1>{group.name}</h1>
        <p>{group.description}</p>
        <p><strong>Privacy:</strong> {group.privacy}</p>
      </div>

      {user && userStatus === 'non-member' && (
         <button onClick={handleJoinGroup} className="button">
            {group.privacy === 'public' ? 'Join Group' : 'Request to Join'}
         </button>
      )}
      {user && userStatus === 'pending' && <p style={{color: 'orange', fontWeight: 'bold'}}>Your request to join is pending approval.</p>}
      
      {userStatus === 'admin' && (
         <button onClick={handleCreateEvent} className="button-secondary" style={{marginBottom: '20px'}}>+ Create Event for this Group</button>
      )}

      <hr style={{margin: '30px 0'}} />

      {/* Admin Section */}
      {userStatus === 'admin' && (
        <section className="admin-panel" style={{background: '#fafafa', padding: '20px', borderRadius: '8px', marginBottom: '20px'}}>
          <h3>Admin Panel</h3>
          <JoinRequests requests={requests} groupId={group.id} onUpdateRequest={fetchGroupData} />
          <hr style={{margin: '20px 0'}}/>
          <MemberManagement members={members} groupId={group.id} currentUserId={user!.uid} onUpdateMembers={fetchGroupData} />
        </section>
      )}

      <div className="group-content">
        <section>
          <h2>Events</h2>
          {canViewContent ? (
            events.length > 0 ? (
              <div className="events-list">
                {events.map(event => (
                  <div key={event.id} className="sticky-note-card">
                    <h3>{event.title}</h3>
                    {/* Ensure date is a valid object with toDate method before calling it */}
                    <p>{event.date?.toDate ? new Date(event.date.toDate()).toLocaleString() : 'Date not available'}</p>
                  </div>
                ))}
              </div>
            ) : <p>No events have been created for this group yet.</p>
          ) : <p>This is a private group. Join to see their events.</p>}
        </section>

        <section>
          <h2>Members ({members.length})</h2>
           {canViewContent ? (
            <ul>{members.map(member => <li key={member.userId}>{member.userName} ({member.role})</li>)}</ul>
           ) : <p>Member list is private.</p>}
        </section>
      </div>
    </div>
  );
};

export default GroupDetailPage;

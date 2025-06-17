// src/pages/groups/[groupId].tsx (Updated with explicit types and Link fix)

import { useRouter } from 'next/router';
import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
// Import necessary types from Firestore
import { doc, getDoc, collection, query, where, getDocs, QueryDocumentSnapshot, DocumentData } from 'firebase/firestore';
import { db, requestToJoinGroup } from '../../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import { Event } from '../events';
import JoinRequests from '../../components/JoinRequests';
import MemberManagement from '../../components/MemberManagement';

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
interface Feedback {
  type: 'success' | 'error';
  message: string;
}

const GroupDetailPage = () => {
  const router = useRouter();
  const { groupId } = router.query;
  const { user } = useAuth();

  const [group, setGroup] = useState<Group | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [requests, setRequests] = useState<JoinRequest[]>([]);
  const [userStatus, setUserStatus] = useState<'admin' | 'member' | 'pending' | 'non-member'>('non-member');
  const [loading, setLoading] = useState(true);
  const [feedbackMessage, setFeedbackMessage] = useState<Feedback | null>(null);

  const fetchGroupData = useCallback(async () => {
    if (!groupId || typeof groupId !== 'string') return;
    setLoading(true);

    try {
      const groupRef = doc(db, 'groups', groupId);
      const groupSnap = await getDoc(groupRef);
      if (!groupSnap.exists()) {
        setGroup(null);
        setLoading(false);
        return;
      }
      const groupData = { id: groupSnap.id, ...groupSnap.data() } as Group;
      setGroup(groupData);

      const membersQuery = query(collection(db, 'group_members'), where('groupId', '==', groupId));
      const membersSnap = await getDocs(membersQuery);
      const membersData = membersSnap.docs.map((d: QueryDocumentSnapshot<DocumentData>) => d.data() as Member);
      setMembers(membersData);

      let canViewContent = groupData.privacy === 'public';
      let isAdmin = false;

      if (user) {
        const currentUserMembership = membersData.find(m => m.userId === user.uid);
        if (currentUserMembership) {
          canViewContent = true;
          isAdmin = currentUserMembership.role === 'admin';
          setUserStatus(currentUserMembership.role);
        } else {
          const requestRef = doc(db, 'join_requests', `${groupId}_${user.uid}`);
          const requestSnap = await getDoc(requestRef);
          setUserStatus(requestSnap.exists() ? 'pending' : 'non-member');
        }
      }

      if (canViewContent) {
        const eventsQuery = query(collection(db, 'events'), where('groupId', '==', groupId));
        const eventsSnap = await getDocs(eventsQuery);
        const eventsData = eventsSnap.docs.map((d: QueryDocumentSnapshot<DocumentData>) => ({ id: d.id, ...d.data() }) as Event);
        setEvents(eventsData);
      } else {
        setEvents([]);
      }
      
      if (isAdmin) {
        const requestsQuery = query(collection(db, 'join_requests'), where('groupId', '==', groupId));
        const requestsSnap = await getDocs(requestsQuery);
        const requestsData = requestsSnap.docs.map((r: QueryDocumentSnapshot<DocumentData>) => r.data() as JoinRequest);
        setRequests(requestsData);
      }

    } catch (error) {
      console.error("Error fetching group data:", error);
      setFeedbackMessage({ type: 'error', message: "Could not load group data."});
    } finally {
      setLoading(false);
    }
  }, [groupId, user]);

  useEffect(() => {
    if (groupId) {
      fetchGroupData();
    }
  }, [groupId, fetchGroupData]);

  const handleJoinGroup = async () => {
    if (!user || !group) return;
    setFeedbackMessage(null);
    try {
      await requestToJoinGroup(group.id, group.privacy, user);
      const successMsg = group.privacy === 'public' 
        ? "You have successfully joined the group!" 
        : "Your request to join has been sent for approval.";
      setFeedbackMessage({ type: 'success', message: successMsg });
      fetchGroupData();
    } catch (error) {
      console.error("FirebaseError:", error);
      setFeedbackMessage({ type: 'error', message: "Failed to send request." });
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

      {feedbackMessage && (
        <p style={{ color: feedbackMessage.type === 'error' ? 'red' : 'green', fontWeight: 'bold' }}>
          {feedbackMessage.message}
        </p>
      )}

      {user && userStatus === 'non-member' && (
         <button onClick={handleJoinGroup} className="button">
            {group.privacy === 'public' ? 'Join Group' : 'Request to Join'}
         </button>
      )}
      {user && userStatus === 'pending' && !feedbackMessage && (
        <p style={{color: 'orange', fontWeight: 'bold'}}>Your request to join is pending approval.</p>
      )}
      
      {userStatus === 'admin' && (
         <button onClick={handleCreateEvent} className="button-secondary" style={{marginBottom: '20px'}}>+ Create Event for this Group</button>
      )}

      <hr style={{margin: '30px 0'}} />

      {userStatus === 'admin' && user && (
        <section className="admin-panel">
          <h3>Admin Panel</h3>
          <JoinRequests requests={requests} groupId={group.id} onUpdateRequest={fetchGroupData} />
          <hr/>
          <MemberManagement members={members} groupId={group.id} currentUserId={user.uid} onUpdateMembers={fetchGroupData} />
        </section>
      )}

      <div className="group-content">
        <section>
          <h2>Events</h2>
          {canViewContent ? (
            events.length > 0 ? (
              <div className="events-list">
                {events.map(event => (
                  // ✅ FIX: Added legacyBehavior prop to the Link component
                  <Link key={event.id} href={`/event-signups/${event.id}`} legacyBehavior>
                    <a className="sticky-note-card-link">
                      <div className="sticky-note-card">
                        <h3>{event.title}</h3>
                        <p>{event.date?.toDate ? new Date(event.date.toDate()).toLocaleString() : 'Date not available'}</p>
                      </div>
                    </a>
                  </Link>
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

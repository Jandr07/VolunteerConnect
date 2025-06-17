// src/pages/groups/[groupId].tsx (Regenerated and Finalized)

import { useRouter } from 'next/router';
import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { getFunctions, httpsCallable } from 'firebase/functions';
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  QueryDocumentSnapshot,
  DocumentData,
  deleteDoc,
  writeBatch,
} from 'firebase/firestore';
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
  const [members, setMembers] = useState<(Member & { id: string })[]>([]);
  const [requests, setRequests] = useState<JoinRequest[]>([]);
  const [userStatus, setUserStatus] = useState<'admin' | 'member' | 'pending' | 'non-member'>('non-member');
  const [loading, setLoading] = useState(true);
  const [feedbackMessage, setFeedbackMessage] = useState<Feedback | null>(null);
  const [isLeaving, setIsLeaving] = useState(false);

  const fetchGroupData = useCallback(async () => {
    if (!groupId || typeof groupId !== 'string') return;
    setLoading(true);

    try {
      const groupRef = doc(db, 'groups', groupId as string);
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
      const membersData = membersSnap.docs.map(d => ({ id: d.id, ...d.data() }) as Member & { id: string });
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
      } else {
        setUserStatus('non-member');
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

  const handleLeaveGroup = async () => {
    if (!user || !group || (userStatus !== 'member' && userStatus !== 'admin')) {
      return;
    }
    
    const confirmationMessage = members.length === 1
      ? "You are the last member. Leaving will permanently delete this group and all its events. Are you sure?"
      : "Are you sure you want to leave this group?";
      
    if (!confirm(confirmationMessage)) return;

    setIsLeaving(true);
    setFeedbackMessage(null);

    try {
      if (members.length === 1 && members[0].userId === user.uid) {
        const functions = getFunctions();
        // ✅ UPDATED: The function name is now all lowercase to match the new v2 Cloud Function.
        const deleteGroup = httpsCallable(functions, 'deletegrouponlastleave');
        await deleteGroup({ groupId: group.id });
        
        router.push('/groups?status=deleted');
        return;
      }

      const membershipId = `${group.id}_${user.uid}`;
      const memberDocRef = doc(db, 'group_members', membershipId);

      if (userStatus === 'admin') {
        const otherMembers = members.filter(m => m.userId !== user.uid);
        if (otherMembers.length > 0) {
          const newAdmin = otherMembers[0];
          const newAdminDocRef = doc(db, 'group_members', `${group.id}_${newAdmin.userId}`);
          const batch = writeBatch(db);
          batch.delete(memberDocRef);
          batch.update(newAdminDocRef, { role: 'admin' });
          await batch.commit();
        } else {
          await deleteDoc(memberDocRef);
        }
      } else {
        await deleteDoc(memberDocRef);
      }

      router.push('/groups?status=left');

    } catch (error: any) {
      console.error("Error leaving group:", error);
      setFeedbackMessage({ type: 'error', message: error.message || "Failed to leave the group. Please try again."});
      setIsLeaving(false);
    }
  };

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
    } catch (error: any) {
      console.error("FirebaseError:", error);
      setFeedbackMessage({ type: 'error', message: error.message || "Failed to send request." });
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

      <div className="group-actions" style={{ display: 'flex', gap: '10px', margin: '20px 0' }}>
        {user && userStatus === 'non-member' && (
           <button onClick={handleJoinGroup} className="button">
              {group.privacy === 'public' ? 'Join Group' : 'Request to Join'}
           </button>
        )}
        
        {userStatus === 'admin' && (
           <button onClick={handleCreateEvent} className="button-secondary">+ Create Event</button>
        )}
        
        {(userStatus === 'member' || userStatus === 'admin') && (
           <button onClick={handleLeaveGroup} disabled={isLeaving} className="button-danger">
              {isLeaving ? 'Processing...' : 'Leave Group'}
           </button>
        )}
      </div>

      {user && userStatus === 'pending' && !feedbackMessage && (
        <p style={{color: 'orange', fontWeight: 'bold'}}>Your request to join is pending approval.</p>
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
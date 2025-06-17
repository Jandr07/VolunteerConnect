// src/pages/groups/[groupId].tsx (Updated to allow leaving groups)

import { useRouter } from 'next/router';
import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
// ✅ Import deleteDoc and writeBatch for the new leave functionality
import { doc, getDoc, collection, query, where, getDocs, QueryDocumentSnapshot, DocumentData, deleteDoc, writeBatch, updateDoc } from 'firebase/firestore';
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
  const [events, setEvents] =useState<Event[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [requests, setRequests] = useState<JoinRequest[]>([]);
  const [userStatus, setUserStatus] = useState<'admin' | 'member' | 'pending' | 'non-member'>('non-member');
  const [loading, setLoading] = useState(true);
  const [feedbackMessage, setFeedbackMessage] = useState<Feedback | null>(null);
  const [isLeaving, setIsLeaving] = useState(false); // For button loading state

  const fetchGroupData = useCallback(async () => {
    // This function remains the same
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
      // We need the document ID for updates/deletes, so let's store it.
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

  const handleJoinGroup = async () => {
    // This function remains the same
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
  
  // ✅ --- NEW FUNCTION: handleLeaveGroup ---
  const handleLeaveGroup = async () => {
    if (!user || !group || (userStatus !== 'member' && userStatus !== 'admin')) {
      return;
    }
    
    const confirmation = confirm("Are you sure you want to leave this group?");
    if (!confirmation) return;

    setIsLeaving(true);
    setFeedbackMessage(null);

    try {
      const membershipId = `${group.id}_${user.uid}`;
      const memberDocRef = doc(db, 'group_members', membershipId);

      // Case 1: The user is an admin
      if (userStatus === 'admin') {
        const otherMembers = members.filter(m => m.userId !== user.uid);

        // If there are other members, promote one to admin
        if (otherMembers.length > 0) {
          const newAdmin = otherMembers[0]; // Promote the first member
          const newAdminDocRef = doc(db, 'group_members', `${group.id}_${newAdmin.userId}`);

          // Use a batch write to ensure both actions succeed or fail together
          const batch = writeBatch(db);
          batch.delete(memberDocRef); // 1. Delete the old admin
          batch.update(newAdminDocRef, { role: 'admin' }); // 2. Promote the new admin
          await batch.commit();

        } else {
          // If the admin is the last member, just delete them
          await deleteDoc(memberDocRef);
        }
      } 
      // Case 2: The user is a regular member
      else {
        await deleteDoc(memberDocRef);
      }

      // On success, redirect the user away from the group
      router.push('/groups?status=left');

    } catch (error) {
      console.error("Error leaving group:", error);
      setFeedbackMessage({ type: 'error', message: "Failed to leave the group. Please try again."});
      setIsLeaving(false);
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

      {/* --- Button Controls --- */}
      <div className="group-actions" style={{ display: 'flex', gap: '10px', margin: '20px 0' }}>
        {user && userStatus === 'non-member' && (
           <button onClick={handleJoinGroup} className="button">
              {group.privacy === 'public' ? 'Join Group' : 'Request to Join'}
           </button>
        )}
        
        {userStatus === 'admin' && (
           <button onClick={handleCreateEvent} className="button-secondary">+ Create Event</button>
        )}
        
        {/* ✅ NEW "Leave Group" button */}
        {(userStatus === 'member' || userStatus === 'admin') && (
           <button onClick={handleLeaveGroup} disabled={isLeaving} className="button-danger">
              {isLeaving ? 'Leaving...' : 'Leave Group'}
           </button>
        )}
      </div>

      {user && userStatus === 'pending' && !feedbackMessage && (
        <p style={{color: 'orange', fontWeight: 'bold'}}>Your request to join is pending approval.</p>
      )}
      
      <hr style={{margin: '30px 0'}} />

      {/* Admin Panel remains the same */}
      {userStatus === 'admin' && user && (
        <section className="admin-panel">
          <h3>Admin Panel</h3>
          <JoinRequests requests={requests} groupId={group.id} onUpdateRequest={fetchGroupData} />
          <hr/>
          <MemberManagement members={members} groupId={group.id} currentUserId={user.uid} onUpdateMembers={fetchGroupData} />
        </section>
      )}

      {/* Group Content remains the same */}
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
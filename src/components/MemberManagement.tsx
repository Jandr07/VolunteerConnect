// src/components/MemberManagement.tsx
import { promoteToAdmin, kickMember } from '../../lib/firebase';

interface Member {
  userId: string;
  userName: string;
  role: 'admin' | 'member';
}

interface Props {
  members: Member[];
  groupId: string;
  currentUserId: string; // To prevent kicking yourself
  onUpdateMembers: () => void; // Function to refresh data
}

const MemberManagement = ({ members, groupId, currentUserId, onUpdateMembers }: Props) => {

  const handlePromote = async (userId: string, userName: string) => {
    if(window.confirm(`Are you sure you want to make ${userName} an admin?`)) {
      await promoteToAdmin(groupId, userId);
      onUpdateMembers();
    }
  };

  const handleKick = async (userId: string, userName: string) => {
     if(window.confirm(`Are you sure you want to remove ${userName} from the group?`)) {
      await kickMember(groupId, userId);
      onUpdateMembers();
    }
  };

  return (
    <div>
      <h4>Manage Members</h4>
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {members.map(member => (
          <li key={member.userId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px', borderBottom: '1px solid #eee' }}>
            <div>
              <strong>{member.userName}</strong>
              <span style={{ marginLeft: '10px', color: '#666', fontSize: '0.9em' }}>({member.role})</span>
            </div>
            {/* Only show controls for other members, not for yourself */}
            {member.userId !== currentUserId && (
              <div style={{ display: 'flex', gap: '10px' }}>
                {member.role === 'member' && (
                  <button onClick={() => handlePromote(member.userId, member.userName)} className="button-secondary">Promote</button>
                )}
                <button onClick={() => handleKick(member.userId, member.userName)} className="button-danger">Kick</button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default MemberManagement;

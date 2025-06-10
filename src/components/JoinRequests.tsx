// src/components/JoinRequests.tsx
import { approveJoinRequest, denyJoinRequest } from '../../lib/firebase';

interface JoinRequest {
  userId: string;
  userName: string;
}

interface Props {
  requests: JoinRequest[];
  groupId: string;
  onUpdateRequest: () => void; // Function to refresh data after an action
}

const JoinRequests = ({ requests, groupId, onUpdateRequest }: Props) => {

  const handleApprove = async (userId: string, userName: string) => {
    if (window.confirm(`Are you sure you want to approve ${userName}?`)) {
      await approveJoinRequest(groupId, { id: userId, name: userName });
      onUpdateRequest();
    }
  };

  const handleDeny = async (userId: string, userName: string) => {
    if (window.confirm(`Are you sure you want to deny ${userName}?`)) {
      await denyJoinRequest(groupId, userId);
      onUpdateRequest();
    }
  };

  if (requests.length === 0) {
    return <p>No pending join requests.</p>;
  }

  return (
    <div>
      <h4>Pending Requests</h4>
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {requests.map(req => (
          <li key={req.userId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px', borderBottom: '1px solid #eee' }}>
            <span>{req.userName}</span>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => handleApprove(req.userId, req.userName)} className="button-success">Approve</button>
              <button onClick={() => handleDeny(req.userId, req.userName)} className="button-danger">Deny</button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default JoinRequests;

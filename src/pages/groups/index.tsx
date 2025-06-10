import { useEffect, useState } from 'react';
import { collection, getDocs, query } from 'firebase/firestore'; // Removed orderBy
import { db } from '../../../lib/firebase';
import Layout from '../../components/Layout';
import Link from 'next/link';
import { useRouter } from 'next/router';

interface Group {
  id: string;
  name: string;
  description: string;
  privacy: 'public' | 'private';
  createdAt?: any; // Keep the field in the interface
}

const BrowseGroupsPage = () => {
    const [groups, setGroups] = useState<Group[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        const fetchGroups = async () => {
            setLoading(true);
            try {
                // CORRECTED: The query no longer tries to sort by 'createdAt', removing the need for an index.
                const groupsQuery = query(collection(db, 'groups'));
                const querySnapshot = await getDocs(groupsQuery);
                const groupsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Group[];
                
                // Optional: Sort the results on the client-side after fetching
                groupsData.sort((a, b) => (b.createdAt?.toDate() || 0) - (a.createdAt?.toDate() || 0));

                setGroups(groupsData);
            } catch (error) {
                console.error("Error fetching groups:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchGroups();
    }, []);

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h1>Discover Groups</h1>
                <button className="button" onClick={() => router.push('/create-group')}>
                    + Create New Group
                </button>
            </div>
            {loading ? (
                <p>Loading groups...</p>
            ) : (
                <div className="events-list"> {/* Using events-list for consistent spacing */}
                    {groups.length > 0 ? (
                        groups.map(group => (
                            <Link key={group.id} href={`/groups/${group.id}`} passHref>
                                <div className="sticky-note-card interactive">
                                    <h3>{group.name}</h3>
                                    <p>{group.description.substring(0, 100)}...</p>
                                    <span className={`privacy-tag ${group.privacy}`}>{group.privacy}</span>
                                </div>
                            </Link>
                        ))
                    ) : (
                        <p>No groups have been created yet. Why not be the first?</p>
                    )}
                </div>
            )}
        </div>
    );
};

export default BrowseGroupsPage;
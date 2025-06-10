// src/pages/search-groups.tsx
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../context/AuthContext';
import { searchGroups, requestToJoinGroup } from '../../lib/firebase';
import Layout from '../components/Layout';

// Define the shape of a group object from search results
interface GroupSearchResult {
  id: string;
  name: string;
  description: string;
  privacy: 'public' | 'private';
}

const SearchGroupsPage = () => {
  const { user } = useAuth();
  const router = useRouter();
  const [results, setResults] = useState<GroupSearchResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    // This effect runs when the URL query parameter 'q' changes
    const doSearch = async (query: string) => {
      setLoading(true);
      setSearchTerm(query);
      const foundGroups = await searchGroups(query);
      setResults(foundGroups);
      setLoading(false);
    };

    if (router.query.q && typeof router.query.q === 'string') {
      doSearch(router.query.q);
    } else {
        setLoading(false);
        setResults([]);
    }
  }, [router.query.q]);
  
  const handleJoin = async (group: GroupSearchResult) => {
    if (!user) {
        alert("Please log in to join a group.");
        return;
    }
    try {
        await requestToJoinGroup(group.id, group.privacy, user);
        alert(group.privacy === 'public' ? `You have successfully joined ${group.name}!` : `Your request to join ${group.name} has been sent.`);
    } catch (error) {
        console.error("Failed to join group:", error);
        alert("There was an error. Please try again.");
    }
  }

  return (
    <div>
      <div className="search-results-container">
        <h1>Search Results</h1>
        {searchTerm && <p>Showing results for: <strong>"{searchTerm}"</strong></p>}
        
        {loading && <p>Searching...</p>}
        
        {!loading && results.length === 0 && (
          <p>No groups found matching your search.</p>
        )}

        {results.length > 0 && (
          <div className="search-results-list">
            {results.map((group) => (
              <div key={group.id} className="sticky-note-card" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                <div>
                  <h4>{group.name}</h4>
                  <p>{group.description}</p>
                </div>
                <button className="button-secondary" onClick={() => handleJoin(group)}>
                  {group.privacy === 'public' ? 'Join' : 'Request to Join'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchGroupsPage;

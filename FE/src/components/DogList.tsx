import { useState, useEffect } from 'react';

interface Dog {
  dogId: string;
  shelter: string;
  city: string;
  state: string;
  species: string;
  description: string;
  birthday: string;
  weight: number;
  color: string;
  originalImageUrl?: string;
  resizedImageUrl?: string;
  thumbnailUrl?: string;
}

const API_URL = 'https://iw7dv4kkca.execute-api.us-east-2.amazonaws.com/prod';

interface DogListProps {
  user?: any;
}

export default function DogList({ user }: DogListProps) {
  const [dogs, setDogs] = useState<Dog[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDog, setSelectedDog] = useState<Dog | null>(null);
  const [votingDogId, setVotingDogId] = useState<string | null>(null);
  const [userVotes, setUserVotes] = useState<Record<string, 'wag' | 'growl'>>({});
  const [voteMessage, setVoteMessage] = useState<{dogId: string, message: string, type: 'success' | 'error'} | null>(null);

  useEffect(() => {
    fetchDogs();
    fetchUserVotes();
  }, []);

  const fetchUserVotes = async () => {
    try {
      // Use actual user ID from Cognito
      const userId = user?.userId || user?.username || 'anonymous-user';
      console.log('Fetching votes for userId:', userId);
      const response = await fetch(`${API_URL}/users/${userId}/votes`);
      
      if (response.ok) {
        const data = await response.json();
        setUserVotes(data.votes || {});
      } else {
        console.log('No votes found for user');
        setUserVotes({});
      }
    } catch (error) {
      console.error('Error fetching user votes:', error);
      setUserVotes({});
    }
  };

  const fetchDogs = async () => {
    try {
      const response = await fetch(`${API_URL}/dogs`);
      const data = await response.json();
      setDogs(data.dogs || []);
    } catch (error) {
      console.error('Error fetching dogs:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateAge = (birthday: string) => {
    const birthDate = new Date(birthday);
    const today = new Date();
    const age = Math.floor((today.getTime() - birthDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25));
    return age;
  };

  const handleVote = async (dogId: string, voteType: 'wag' | 'growl') => {
    setVotingDogId(dogId);
    
    try {
      // Check if user is clicking the same vote type (toggle off)
      const currentVote = userVotes[dogId];
      let newVoteType = voteType;
      let isRemoving = false;
      
      if (currentVote === voteType) {
        // User clicked same vote type - remove the vote
        isRemoving = true;
        // We'll still send the vote to backend but remove from frontend
      }
      
      const userId = user?.userId || user?.username || 'anonymous-user';
      
      const response = await fetch(`${API_URL}/dogs/${dogId}/vote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          voteType: newVoteType,
          userId: userId,
          isRemoving: isRemoving
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to record vote');
      }

      const result = await response.json();
      console.log('Vote recorded:', result);
      
      // Update user votes state and show feedback
      if (isRemoving) {
        // Remove the vote from local state
        const { [dogId]: removed, ...remainingVotes } = userVotes;
        setUserVotes(remainingVotes);
        setVoteMessage({dogId, message: 'Vote removed!', type: 'success'});
      } else {
        // Add or change the vote in local state
        setUserVotes(prev => ({
          ...prev,
          [dogId]: voteType
        }));
        setVoteMessage({dogId, message: `${voteType === 'wag' ? 'Wag' : 'Growl'} recorded!`, type: 'success'});
      }
      
      // Clear message after 2 seconds
      setTimeout(() => setVoteMessage(null), 2000);
      
      // Refresh votes from server to ensure consistency
      setTimeout(() => fetchUserVotes(), 500);
      
    } catch (error) {
      console.error('Error voting:', error);
      setVoteMessage({dogId, message: 'Failed to record vote', type: 'error'});
      setTimeout(() => setVoteMessage(null), 3000);
    } finally {
      setVotingDogId(null);
    }
  };

  if (loading) return <div>Loading dogs...</div>;

  return (
    <div style={{ padding: '20px' }}>
      <h1>Available Dogs for Adoption</h1>
      
      {dogs.length === 0 ? (
        <p>No dogs available for adoption at the moment.</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
          {dogs.map((dog) => (
            <div key={dog.dogId} style={{ 
              border: '1px solid #ddd', 
              borderRadius: '8px', 
              padding: '15px',
              backgroundColor: '#f9f9f9'
            }}>
              {dog.thumbnailUrl && (
                <img 
                  src={dog.thumbnailUrl} 
                  alt={`Dog from ${dog.shelter}`}
                  style={{ 
                    width: '100%', 
                    height: '200px', 
                    objectFit: 'cover', 
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                  onClick={() => setSelectedDog(dog)}
                />
              )}
              
              <h3>{dog.shelter}</h3>
              <p><strong>Location:</strong> {dog.city}, {dog.state}</p>
              <p><strong>Age:</strong> {calculateAge(dog.birthday)} years old</p>
              <p><strong>Weight:</strong> {dog.weight} lbs</p>
              <p><strong>Color:</strong> {dog.color}</p>
              <p><strong>Description:</strong> {dog.description}</p>
              
              {/* Vote feedback message */}
              {voteMessage && voteMessage.dogId === dog.dogId && (
                <div style={{
                  padding: '5px 10px',
                  borderRadius: '4px',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  backgroundColor: voteMessage.type === 'success' ? '#d4edda' : '#f8d7da',
                  color: voteMessage.type === 'success' ? '#155724' : '#721c24',
                  border: `1px solid ${voteMessage.type === 'success' ? '#c3e6cb' : '#f5c6cb'}`,
                  marginTop: '5px'
                }}>
                  {voteMessage.message}
                </div>
              )}
              
              <div style={{ marginTop: '10px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <button 
                  onClick={() => setSelectedDog(dog)}
                  style={{
                    backgroundColor: '#007bff',
                    color: 'white',
                    border: 'none',
                    padding: '8px 16px',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  View Full Image
                </button>
                
                <button 
                  onClick={() => handleVote(dog.dogId, 'wag')}
                  disabled={votingDogId === dog.dogId}
                  style={{
                    backgroundColor: votingDogId === dog.dogId ? '#6c757d' : 
                                   userVotes[dog.dogId] === 'wag' ? '#155724' : '#28a745',
                    color: 'white',
                    border: userVotes[dog.dogId] === 'wag' ? '2px solid #28a745' : 'none',
                    padding: '8px 16px',
                    borderRadius: '4px',
                    cursor: votingDogId === dog.dogId ? 'not-allowed' : 'pointer',
                    fontWeight: userVotes[dog.dogId] === 'wag' ? 'bold' : 'normal'
                  }}
                >
                  {votingDogId === dog.dogId ? 'Voting...' : 
                   userVotes[dog.dogId] === 'wag' ? '✅ Wagged!' : '🐕 Wag'}
                </button>
                
                <button 
                  onClick={() => handleVote(dog.dogId, 'growl')}
                  disabled={votingDogId === dog.dogId}
                  style={{
                    backgroundColor: votingDogId === dog.dogId ? '#6c757d' : 
                                   userVotes[dog.dogId] === 'growl' ? '#721c24' : '#dc3545',
                    color: 'white',
                    border: userVotes[dog.dogId] === 'growl' ? '2px solid #dc3545' : 'none',
                    padding: '8px 16px',
                    borderRadius: '4px',
                    cursor: votingDogId === dog.dogId ? 'not-allowed' : 'pointer',
                    fontWeight: userVotes[dog.dogId] === 'growl' ? 'bold' : 'normal'
                  }}
                >
                  {votingDogId === dog.dogId ? 'Voting...' : 
                   userVotes[dog.dogId] === 'growl' ? '❌ Growled!' : '😤 Growl'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal for full image */}
      {selectedDog && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.8)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }} onClick={() => setSelectedDog(null)}>
          <div style={{
            backgroundColor: 'white',
            padding: '20px',
            borderRadius: '8px',
            maxWidth: '90%',
            maxHeight: '90%',
            overflow: 'auto'
          }} onClick={(e) => e.stopPropagation()}>
            <h2>{selectedDog.shelter}</h2>
            {selectedDog.originalImageUrl && (
              <img 
                src={selectedDog.originalImageUrl} 
                alt={`Dog from ${selectedDog.shelter}`}
                style={{ 
                  maxWidth: '100%', 
                  maxHeight: '400px',
                  objectFit: 'contain'
                }}
              />
            )}
            <p>{selectedDog.description}</p>
            <button 
              onClick={() => setSelectedDog(null)}
              style={{
                backgroundColor: '#6c757d',
                color: 'white',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '4px',
                cursor: 'pointer',
                marginTop: '10px'
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
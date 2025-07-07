import { useState, useEffect } from 'react';

interface Dog {
  dogId: string;
  name: string;
  shelter: string;
  city: string;
  state: string;
  species: string;
  description: string;
  birthday: string;
  weight: number;
  color: string;
  status?: 'available' | 'adopted';
  originalImageUrl?: string;
  resizedImageUrl?: string;
  thumbnailUrl?: string;
}

const API_URL = 'https://iw7dv4kkca.execute-api.us-east-2.amazonaws.com/prod';

interface FavoritesProps {
  user?: any;
}

export default function Favorites({ user }: FavoritesProps) {
  const [favoriteDogs, setFavoriteDogs] = useState<Dog[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDog, setSelectedDog] = useState<Dog | null>(null);

  useEffect(() => {
    fetchFavoriteDogs();
  }, []);

  const fetchFavoriteDogs = async () => {
    try {
      // Get all dogs first
      const dogsResponse = await fetch(`${API_URL}/dogs`);
      const dogsData = await dogsResponse.json();
      const allDogs = dogsData.dogs || [];

      // Get user votes from server
      const userId = user?.userId || user?.username || 'anonymous-user';
      console.log('Fetching favorites for userId:', userId);
      const votesResponse = await fetch(`${API_URL}/users/${userId}/votes`);
      
      let userVotes: Record<string, string> = {};
      if (votesResponse.ok) {
        const votesData = await votesResponse.json();
        userVotes = votesData.votes || {};
      }
      
      // Filter dogs that user has wagged
      const waggedDogIds = Object.keys(userVotes).filter(dogId => userVotes[dogId] === 'wag');
      const waggedDogs = allDogs.filter((dog: Dog) => waggedDogIds.includes(dog.dogId));
      
      setFavoriteDogs(waggedDogs);
    } catch (error) {
      console.error('Error fetching favorite dogs:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateAge = (birthday: string) => {
    const birthDate = new Date(birthday);
    const today = new Date();
    const diffTime = today.getTime() - birthDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 30) {
      return `${diffDays} ${diffDays === 1 ? 'day' : 'days'}`;
    } else if (diffDays < 365) {
      const months = Math.floor(diffDays / 30);
      return `${months} ${months === 1 ? 'month' : 'months'}`;
    } else {
      const years = Math.floor(diffDays / 365);
      const remainingMonths = Math.floor((diffDays % 365) / 30);
      if (remainingMonths > 0) {
        return `${years} ${years === 1 ? 'year' : 'years'}, ${remainingMonths} ${remainingMonths === 1 ? 'month' : 'months'}`;
      }
      return `${years} ${years === 1 ? 'year' : 'years'}`;
    }
  };

  if (loading) return <div>Loading your favorite dogs...</div>;

  return (
    <div style={{ padding: '20px' }}>
      <h1>My Favorite Dogs 💖</h1>
      <p>Dogs you've wagged</p>
      
      {favoriteDogs.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <h3>No favorite dogs yet!</h3>
          <p>Go back to the home page and wag some dogs to see them here.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
          {favoriteDogs.map((dog) => (
            <div key={dog.dogId} style={{ 
              border: '2px solid #28a745', 
              borderRadius: '8px', 
              padding: '15px',
              backgroundColor: '#f8fff9'
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
              
              <div style={{ display: 'flex', alignItems: 'center', marginTop: '10px' }}>
                <h3 style={{ margin: 0, flex: 1 }}>{dog.name || dog.shelter}</h3>
                <span style={{ 
                  backgroundColor: '#28a745', 
                  color: 'white', 
                  padding: '4px 8px', 
                  borderRadius: '12px', 
                  fontSize: '12px',
                  fontWeight: 'bold'
                }}>
                  ✅ WAGGED
                </span>
              </div>
              
              <p><strong>Shelter:</strong> {dog.shelter}</p>
              <p><strong>Location:</strong> {dog.city}, {dog.state}</p>
              <p><strong>Age:</strong> {calculateAge(dog.birthday)}</p>
              <p><strong>Weight:</strong> {dog.weight} lbs</p>
              <p><strong>Color:</strong> {dog.color}</p>
              <p><strong>Description:</strong> {dog.description}</p>
              
              <button 
                onClick={() => setSelectedDog(dog)}
                style={{
                  backgroundColor: '#007bff',
                  color: 'white',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  marginTop: '10px'
                }}
              >
                View Full Image
              </button>
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
            <h2>{selectedDog.shelter} ❤️</h2>
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
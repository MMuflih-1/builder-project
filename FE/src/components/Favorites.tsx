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
  userGroups?: string[];
}

export default function Favorites({ user, userGroups = [] }: FavoritesProps) {
  const [favoriteDogs, setFavoriteDogs] = useState<Dog[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDog, setSelectedDog] = useState<Dog | null>(null);
  const [adoptionForm, setAdoptionForm] = useState<{dogId: string, shelter: string, dogName: string} | null>(null);
  const [adoptionData, setAdoptionData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    experience: '',
    livingSpace: '',
    hasKids: ''
  });
  const [submitMessage, setSubmitMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);
  const [userApplications, setUserApplications] = useState<string[]>([]);
  const [votingDogId, setVotingDogId] = useState<string | null>(null);
  const [voteMessage, setVoteMessage] = useState<{dogId: string, message: string, type: 'success' | 'error'} | null>(null);

  useEffect(() => {
    fetchFavoriteDogs();
    fetchUserApplications();
  }, []);

  const fetchUserApplications = async () => {
    try {
      const userId = user?.username || user?.userId || 'anonymous-user';
      const response = await fetch(`${API_URL}/applications`);
      
      if (response.ok) {
        const data = await response.json();
        const userApps = data.applications
          .filter((app: any) => app.adopterId === userId)
          .map((app: any) => app.dogId);
        setUserApplications(userApps);
      }
    } catch (error) {
      console.error('Error fetching user applications:', error);
      setUserApplications([]);
    }
  };

  const handleVote = async (dogId: string, voteType: 'wag' | 'growl') => {
    setVotingDogId(dogId);
    
    try {
      const userId = user?.userId || user?.username || 'anonymous-user';
      
      const response = await fetch(`${API_URL}/dogs/${dogId}/vote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          voteType: voteType,
          userId: userId,
          isRemoving: true
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to record vote');
      }

      setVoteMessage({dogId, message: 'Removed from favorites!', type: 'success'});
      setTimeout(() => setVoteMessage(null), 2000);
      
      // Refresh favorites list
      setTimeout(() => fetchFavoriteDogs(), 500);
      
    } catch (error) {
      console.error('Error voting:', error);
      setVoteMessage({dogId, message: 'Failed to remove from favorites', type: 'error'});
      setTimeout(() => setVoteMessage(null), 3000);
    } finally {
      setVotingDogId(null);
    }
  };

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
              
              <div style={{ marginTop: '10px', display: 'flex', gap: '10px' }}>
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
                    backgroundColor: votingDogId === dog.dogId ? '#6c757d' : '#dc3545',
                    color: 'white',
                    border: 'none',
                    padding: '8px 16px',
                    borderRadius: '4px',
                    cursor: votingDogId === dog.dogId ? 'not-allowed' : 'pointer'
                  }}
                >
                  {votingDogId === dog.dogId ? 'Removing...' : '❌ Unwag'}
                </button>
                
                {userGroups.includes('adopter') && (
                  userApplications.includes(dog.dogId) ? (
                    <button 
                      disabled
                      style={{
                        backgroundColor: '#6c757d',
                        color: 'white',
                        border: 'none',
                        padding: '8px 16px',
                        borderRadius: '4px',
                        cursor: 'not-allowed',
                        fontWeight: 'bold'
                      }}
                    >
                      ✓ Already Applied
                    </button>
                  ) : (
                    <button 
                      onClick={() => setAdoptionForm({dogId: dog.dogId, shelter: dog.shelter, dogName: dog.name || dog.shelter})}
                      style={{
                        backgroundColor: '#28a745',
                        color: 'white',
                        border: 'none',
                        padding: '8px 16px',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontWeight: 'bold'
                      }}
                    >
                      🏠 Adopt
                    </button>
                  )
                )}
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

      {/* Adoption form modal */}
      {adoptionForm && (
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
          zIndex: 1002
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '30px',
            borderRadius: '8px',
            maxWidth: '500px',
            width: '90%',
            maxHeight: '90vh',
            overflow: 'auto'
          }}>
            <h3 style={{ color: '#28a745', marginBottom: '15px' }}>Adopt {adoptionForm.dogName} from {adoptionForm.shelter}</h3>
            <p style={{ marginBottom: '20px', color: '#666' }}>Please fill out this form to apply for adoption:</p>
            
            <form style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div>
                <label style={{ fontWeight: 'bold', marginBottom: '5px', display: 'block' }}>Full Name *</label>
                <input
                  type="text"
                  value={adoptionData.name}
                  onChange={(e) => setAdoptionData(prev => ({...prev, name: e.target.value}))}
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '4px',
                    border: '1px solid #ccc'
                  }}
                  required
                />
              </div>
              
              <div>
                <label style={{ fontWeight: 'bold', marginBottom: '5px', display: 'block' }}>Email *</label>
                <input
                  type="email"
                  value={adoptionData.email}
                  onChange={(e) => setAdoptionData(prev => ({...prev, email: e.target.value}))}
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '4px',
                    border: '1px solid #ccc'
                  }}
                  required
                />
              </div>
              
              <div>
                <label style={{ fontWeight: 'bold', marginBottom: '5px', display: 'block' }}>Phone *</label>
                <input
                  type="tel"
                  value={adoptionData.phone}
                  onChange={(e) => setAdoptionData(prev => ({...prev, phone: e.target.value}))}
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '4px',
                    border: '1px solid #ccc'
                  }}
                  required
                />
              </div>
              
              <div>
                <label style={{ fontWeight: 'bold', marginBottom: '5px', display: 'block' }}>Address *</label>
                <textarea
                  value={adoptionData.address}
                  onChange={(e) => setAdoptionData(prev => ({...prev, address: e.target.value}))}
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '4px',
                    border: '1px solid #ccc',
                    minHeight: '60px'
                  }}
                  required
                />
              </div>
              
              <div>
                <label style={{ fontWeight: 'bold', marginBottom: '5px', display: 'block' }}>Pet Experience</label>
                <textarea
                  value={adoptionData.experience}
                  onChange={(e) => setAdoptionData(prev => ({...prev, experience: e.target.value}))}
                  placeholder="Tell us about your experience with pets..."
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '4px',
                    border: '1px solid #ccc',
                    minHeight: '60px'
                  }}
                />
              </div>
              
              <div>
                <label style={{ fontWeight: 'bold', marginBottom: '5px', display: 'block' }}>Living Space *</label>
                <select
                  value={adoptionData.livingSpace}
                  onChange={(e) => setAdoptionData(prev => ({...prev, livingSpace: e.target.value}))}
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '4px',
                    border: '1px solid #ccc'
                  }}
                  required
                >
                  <option value="">Select your living space</option>
                  <option value="house-yard">House with yard</option>
                  <option value="house-no-yard">House without yard</option>
                  <option value="apartment">Apartment</option>
                  <option value="condo">Condo</option>
                </select>
              </div>
              
              <div>
                <label style={{ fontWeight: 'bold', marginBottom: '5px', display: 'block' }}>Are there kids in the house? *</label>
                <select
                  value={adoptionData.hasKids}
                  onChange={(e) => setAdoptionData(prev => ({...prev, hasKids: e.target.value}))}
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '4px',
                    border: '1px solid #ccc'
                  }}
                  required
                >
                  <option value="">Select an option</option>
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                </select>
              </div>
            </form>
            
            {submitMessage && (
              <div style={{
                padding: '10px',
                borderRadius: '4px',
                marginTop: '15px',
                backgroundColor: submitMessage.type === 'success' ? '#d4edda' : '#f8d7da',
                color: submitMessage.type === 'success' ? '#155724' : '#721c24',
                border: `1px solid ${submitMessage.type === 'success' ? '#c3e6cb' : '#f5c6cb'}`,
                textAlign: 'center'
              }}>
                {submitMessage.text}
              </div>
            )}
            
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginTop: '25px' }}>
              <button 
                onClick={() => {
                  setAdoptionForm(null);
                  setAdoptionData({
                    name: '',
                    email: '',
                    phone: '',
                    address: '',
                    experience: '',
                    livingSpace: '',
                    hasKids: ''
                  });
                }}
                style={{
                  backgroundColor: '#6c757d',
                  color: 'white',
                  border: 'none',
                  padding: '12px 24px',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button 
                onClick={async () => {
                  try {
                    const adopterId = user?.username || user?.userId || 'anonymous-user';
                    const response = await fetch(`${API_URL}/applications`, {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                      },
                      body: JSON.stringify({
                        dogId: adoptionForm.dogId,
                        shelter: adoptionForm.shelter,
                        adopterId: adopterId,
                        ...adoptionData
                      }),
                    });

                    if (!response.ok) {
                      const errorData = await response.json();
                      throw new Error(errorData.error || 'Failed to submit application');
                    }

                    setSubmitMessage({type: 'success', text: 'Application submitted successfully! The shelter will review your application.'});
                    setTimeout(() => setSubmitMessage(null), 3000);
                    
                    setAdoptionForm(null);
                    setAdoptionData({
                      name: '',
                      email: '',
                      phone: '',
                      address: '',
                      experience: '',
                      livingSpace: '',
                      hasKids: ''
                    });
                    
                    fetchUserApplications();
                  } catch (error) {
                    console.error('Error submitting application:', error);
                    setSubmitMessage({type: 'error', text: 'Failed to submit application. Please try again.'});
                  }
                }}
                style={{
                  backgroundColor: '#28a745',
                  color: 'white',
                  border: 'none',
                  padding: '12px 24px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: 'bold'
                }}
              >
                Submit Application
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
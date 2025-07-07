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
  createdBy?: string;
}

const API_URL = 'https://iw7dv4kkca.execute-api.us-east-2.amazonaws.com/prod';

interface DogListProps {
  user?: any;
  userGroups?: string[];
}

export default function DogList({ user, userGroups = [] }: DogListProps) {
  const [dogs, setDogs] = useState<Dog[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDog, setSelectedDog] = useState<Dog | null>(null);
  const [votingDogId, setVotingDogId] = useState<string | null>(null);
  const [userVotes, setUserVotes] = useState<Record<string, 'wag' | 'growl'>>({});
  const [voteMessage, setVoteMessage] = useState<{dogId: string, message: string, type: 'success' | 'error'} | null>(null);
  const [deletingDogId, setDeletingDogId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{dogId: string, name: string} | null>(null);
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
  const [selectedState, setSelectedState] = useState<string>('');
  const [selectedColor, setSelectedColor] = useState<string>('');
  const [minAge, setMinAge] = useState<string>('');
  const [maxAge, setMaxAge] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [userApplications, setUserApplications] = useState<string[]>([]); // Array of dogIds user has applied to

  useEffect(() => {
    fetchDogs();
    fetchUserVotes();
    fetchUserApplications();
  }, [selectedState, selectedColor, minAge, maxAge, searchTerm]); // Re-fetch when filters change

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

  const fetchUserApplications = async () => {
    try {
      const userId = user?.username || user?.userId || 'anonymous-user';
      console.log('Fetching applications for userId:', userId);
      const response = await fetch(`${API_URL}/applications`);
      
      if (response.ok) {
        const data = await response.json();
        console.log('All applications:', data.applications);
        
        // Filter applications by current user and extract dogIds
        const userApps = data.applications
          .filter((app: any) => {
            console.log(`Checking app: adopterId=${app.adopterId}, userId=${userId}`);
            return app.adopterId === userId;
          })
          .map((app: any) => app.dogId);
        
        console.log('User has applied to dogs:', userApps);
        setUserApplications(userApps);
      } else {
        console.log('Failed to fetch applications:', response.status);
      }
    } catch (error) {
      console.error('Error fetching user applications:', error);
      setUserApplications([]);
    }
  };

  const fetchDogs = async () => {
    try {
      let url = `${API_URL}/dogs`;
      const params = new URLSearchParams();
      
      if (selectedState) params.append('state', selectedState);
      if (selectedColor) params.append('color', selectedColor);
      if (minAge) params.append('minAge', minAge);
      if (maxAge) params.append('maxAge', maxAge);
      
      if (params.toString()) {
        url += `?${params.toString()}`;
      }
      
      const response = await fetch(url);
      const data = await response.json();
      let filteredDogs = data.dogs || [];
      
      // Debug: Check dog data
      console.log('Dogs from API:', filteredDogs.slice(0, 2)); // Show first 2 dogs
      
      // Filter out adopted dogs
      filteredDogs = filteredDogs.filter((dog: Dog) => {
        console.log(`Dog ${dog.name || dog.shelter} status:`, dog.status);
        return dog.status !== 'adopted';
      });
      
      // Client-side search filtering
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        filteredDogs = filteredDogs.filter((dog: Dog) => 
          dog.description.toLowerCase().includes(searchLower) ||
          dog.shelter.toLowerCase().includes(searchLower) ||
          dog.city.toLowerCase().includes(searchLower) ||
          dog.color.toLowerCase().includes(searchLower)
        );
      }
      
      setDogs(filteredDogs);
    } catch (error) {
      console.error('Error fetching dogs:', error);
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

  const handleDeleteDog = async (dogId: string) => {
    setConfirmDelete(null);
    setDeletingDogId(dogId);
    
    try {
      const userId = user?.username || 'anonymous-user';
      const response = await fetch(`${API_URL}/dogs/${dogId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete dog');
      }

      // Remove dog from local state
      setDogs(prev => prev.filter(dog => dog.dogId !== dogId));
      setVoteMessage({dogId, message: 'Dog deleted successfully', type: 'success'});
      setTimeout(() => setVoteMessage(null), 3000);
      
    } catch (error) {
      console.error('Error deleting dog:', error);
      setVoteMessage({dogId, message: 'Failed to delete dog', type: 'error'});
      setTimeout(() => setVoteMessage(null), 3000);
    } finally {
      setDeletingDogId(null);
    }
  };

  if (loading) return <div>Loading dogs...</div>;

  return (
    <div style={{ padding: '20px' }}>
      <h1>Available Dogs for Adoption</h1>
      
      {/* Filter Controls */}
      <div style={{ 
        marginBottom: '20px', 
        padding: '15px', 
        backgroundColor: '#f8f9fa', 
        borderRadius: '8px',
        border: '1px solid #dee2e6'
      }}>
        <h3 style={{ margin: '0 0 10px 0', fontSize: '16px' }}>Search & Filter Dogs</h3>
        
        {/* Search Box */}
        <div style={{ marginBottom: '15px' }}>
          <input
            type="text"
            placeholder="Search by description, shelter, city, or color..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '10px',
              borderRadius: '4px',
              border: '1px solid #ccc',
              fontSize: '14px'
            }}
          />
        </div>
        
        <div style={{ display: 'flex', gap: '15px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div>
            <label style={{ marginRight: '8px', fontWeight: 'bold' }}>State:</label>
            <select 
              value={selectedState} 
              onChange={(e) => setSelectedState(e.target.value)}
              style={{ 
                padding: '5px 10px', 
                borderRadius: '4px', 
                border: '1px solid #ccc',
                backgroundColor: 'white'
              }}
            >
              <option value="">All States</option>
              <option value="AL">Alabama</option>
              <option value="AK">Alaska</option>
              <option value="AZ">Arizona</option>
              <option value="AR">Arkansas</option>
              <option value="CA">California</option>
              <option value="CO">Colorado</option>
              <option value="CT">Connecticut</option>
              <option value="DE">Delaware</option>
              <option value="FL">Florida</option>
              <option value="GA">Georgia</option>
              <option value="HI">Hawaii</option>
              <option value="ID">Idaho</option>
              <option value="IL">Illinois</option>
              <option value="IN">Indiana</option>
              <option value="IA">Iowa</option>
              <option value="KS">Kansas</option>
              <option value="KY">Kentucky</option>
              <option value="LA">Louisiana</option>
              <option value="ME">Maine</option>
              <option value="MD">Maryland</option>
              <option value="MA">Massachusetts</option>
              <option value="MI">Michigan</option>
              <option value="MN">Minnesota</option>
              <option value="MS">Mississippi</option>
              <option value="MO">Missouri</option>
              <option value="MT">Montana</option>
              <option value="NE">Nebraska</option>
              <option value="NV">Nevada</option>
              <option value="NH">New Hampshire</option>
              <option value="NJ">New Jersey</option>
              <option value="NM">New Mexico</option>
              <option value="NY">New York</option>
              <option value="NC">North Carolina</option>
              <option value="ND">North Dakota</option>
              <option value="OH">Ohio</option>
              <option value="OK">Oklahoma</option>
              <option value="OR">Oregon</option>
              <option value="PA">Pennsylvania</option>
              <option value="RI">Rhode Island</option>
              <option value="SC">South Carolina</option>
              <option value="SD">South Dakota</option>
              <option value="TN">Tennessee</option>
              <option value="TX">Texas</option>
              <option value="UT">Utah</option>
              <option value="VT">Vermont</option>
              <option value="VA">Virginia</option>
              <option value="WA">Washington</option>
              <option value="WV">West Virginia</option>
              <option value="WI">Wisconsin</option>
              <option value="WY">Wyoming</option>
            </select>
          </div>
          
          <div>
            <label style={{ marginRight: '8px', fontWeight: 'bold' }}>Color:</label>
            <select 
              value={selectedColor} 
              onChange={(e) => setSelectedColor(e.target.value)}
              style={{ 
                padding: '5px 10px', 
                borderRadius: '4px', 
                border: '1px solid #ccc',
                backgroundColor: 'white'
              }}
            >
              <option value="">All Colors</option>
              <option value="Black">Black</option>
              <option value="Brown">Brown</option>
              <option value="Yellow">Yellow</option>
              <option value="Blonde">Blonde</option>
              <option value="Golden">Golden</option>
              <option value="Chocolate">Chocolate</option>
              <option value="Silver">Silver</option>
              <option value="White">White</option>
            </select>
          </div>
          
          <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
            <label style={{ fontWeight: 'bold' }}>Age:</label>
            <input
              type="number"
              placeholder="Min"
              value={minAge}
              onChange={(e) => setMinAge(e.target.value)}
              style={{ 
                width: '60px', 
                padding: '5px', 
                borderRadius: '4px', 
                border: '1px solid #ccc'
              }}
            />
            <span>to</span>
            <input
              type="number"
              placeholder="Max"
              value={maxAge}
              onChange={(e) => setMaxAge(e.target.value)}
              style={{ 
                width: '60px', 
                padding: '5px', 
                borderRadius: '4px', 
                border: '1px solid #ccc'
              }}
            />
            <span style={{ fontSize: '12px', color: '#666' }}>years</span>
          </div>
          
          {(selectedState || selectedColor || minAge || maxAge || searchTerm) && (
            <button 
              onClick={() => {
                setSelectedState('');
                setSelectedColor('');
                setMinAge('');
                setMaxAge('');
                setSearchTerm('');
              }}
              style={{
                padding: '5px 10px',
                backgroundColor: '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px'
              }}
            >
              Clear All Filters
            </button>
          )}
        </div>
      </div>
      
      {dogs.length === 0 ? (
        <p>No dogs match your current filters.</p>
      ) : (
        <>
          <p style={{ marginBottom: '15px', color: '#666' }}>
            Showing {dogs.length} dogs
            {searchTerm && ` matching "${searchTerm}"`}
            {selectedState && ` • in ${selectedState}`}
            {selectedColor && ` • ${selectedColor} color`}
            {(minAge || maxAge) && ` • Age: ${minAge || '0'}-${maxAge || '∞'} years`}
          </p>
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
              
              <h3>{dog.name || dog.shelter}</h3>
              <p><strong>Shelter:</strong> {dog.shelter}</p>
              <p><strong>Location:</strong> {dog.city}, {dog.state}</p>
              <p><strong>Status:</strong> 
                <span style={{ 
                  color: dog.status === 'adopted' ? '#28a745' : '#007bff',
                  fontWeight: 'bold',
                  textTransform: 'uppercase'
                }}>
                  {dog.status === 'adopted' ? '🏠 ADOPTED' : '📋 AVAILABLE'}
                </span>
              </p>
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
                
                {/* Adopt button only for adopter users */}
                {userGroups.includes('adopter') && (
                  (() => {
                    const hasApplied = userApplications.includes(dog.dogId);
                    console.log(`Dog ${dog.name || dog.shelter} (${dog.dogId}): hasApplied=${hasApplied}, userApplications=`, userApplications);
                    return hasApplied;
                  })() ? (
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
                
                {/* Delete button only for dogs created by current user */}
                {(() => {
                  const currentUserId = user?.username || user?.userId;
                  console.log('Current user ID:', currentUserId);
                  console.log('Dog created by:', dog.createdBy);
                  console.log('User groups:', userGroups);
                  console.log('Is shelter:', userGroups.includes('shelter'));
                  console.log('Is owner:', dog.createdBy === currentUserId);
                  return userGroups.includes('shelter') && dog.createdBy === currentUserId;
                })() && (
                  <button 
                    onClick={() => setConfirmDelete({dogId: dog.dogId, name: dog.shelter})}
                    disabled={deletingDogId === dog.dogId}
                    style={{
                      backgroundColor: deletingDogId === dog.dogId ? '#6c757d' : '#dc3545',
                      color: 'white',
                      border: 'none',
                      padding: '8px 16px',
                      borderRadius: '4px',
                      cursor: deletingDogId === dog.dogId ? 'not-allowed' : 'pointer',
                      fontSize: '12px'
                    }}
                  >
                    {deletingDogId === dog.dogId ? 'Deleting...' : '🗑️ Delete'}
                  </button>
                )}
              </div>
            </div>
          ))}
          </div>
        </>
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
            
            {/* Success/Error message */}
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
                    console.log('Submitting application with adopterId:', adopterId);
                    console.log('User object:', user);
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

                    const result = await response.json();
                    console.log('Application submitted:', result);
                    setSubmitMessage({type: 'success', text: 'Application submitted successfully! The shelter will review your application.'});
                      
                      setTimeout(() => {
                        setSubmitMessage(null);
                      }, 3000);
                    
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
                    
                    // Refresh user applications to update "Already Applied" status
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

      {/* Delete confirmation modal */}
      {confirmDelete && (
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
          zIndex: 1001
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '30px',
            borderRadius: '8px',
            maxWidth: '400px',
            textAlign: 'center'
          }}>
            <h3 style={{ color: '#dc3545', marginBottom: '15px' }}>Delete Dog</h3>
            <p>Are you sure you want to delete the dog from <strong>{confirmDelete.name}</strong>?</p>
            <p style={{ color: '#666', fontSize: '14px' }}>This action cannot be undone.</p>
            
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginTop: '20px' }}>
              <button 
                onClick={() => setConfirmDelete(null)}
                style={{
                  backgroundColor: '#6c757d',
                  color: 'white',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button 
                onClick={() => handleDeleteDog(confirmDelete.dogId)}
                style={{
                  backgroundColor: '#dc3545',
                  color: 'white',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Delete
              </button>
            </div>
          </div>
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
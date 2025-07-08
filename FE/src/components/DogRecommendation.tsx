import { useState } from 'react';

interface Dog {
  dogId: string;
  name: string;
  shelter: string;
  city: string;
  state: string;
  description: string;
  birthday: string;
  weight: number;
  color: string;
  thumbnailUrl?: string;
  resizedImageUrl?: string;
}

const API_URL = 'https://iw7dv4kkca.execute-api.us-east-2.amazonaws.com/prod';

export default function DogRecommendation() {
  const [userInput, setUserInput] = useState('');
  const [loading, setLoading] = useState(false);
  
  const fetchUserApplications = async () => {
    try {
      const userId = 'anonymous-user'; // You may want to get actual user ID
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
  const [recommendation, setRecommendation] = useState<{
    explanation: string;
    dog: Dog | null;
  } | null>(null);
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

  const handleGetRecommendation = async () => {
    if (!userInput.trim()) return;
    
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/recommend-dog`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userPreferences: userInput
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get recommendation');
      }

      const data = await response.json();
      setRecommendation({
        explanation: data.recommendation,
        dog: data.recommendedDog
      });
      
      // Fetch user applications to check if already applied
      fetchUserApplications();
    } catch (error) {
      console.error('Error getting recommendation:', error);
      alert('Failed to get dog recommendation. Please try again.');
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
      return `${years} ${years === 1 ? 'year' : 'years'}`;
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h1>🤖 Find Your Perfect Dog Match</h1>
      <p>Tell us about yourself and what you're looking for in a dog, and our AI will recommend the best match!</p>
      
      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '10px', fontWeight: 'bold' }}>
          What are you looking for in a dog?
        </label>
        <textarea
          value={userInput}
          onChange={(e) => setUserInput(e.target.value)}
          placeholder="Example: I live in an apartment, work from home, and want a calm, medium-sized dog that's good with kids. I prefer dogs that don't shed much and are easy to train."
          style={{
            width: '100%',
            minHeight: '120px',
            padding: '12px',
            borderRadius: '8px',
            border: '1px solid #ddd',
            fontSize: '14px',
            resize: 'vertical'
          }}
        />
      </div>
      
      <button
        onClick={handleGetRecommendation}
        disabled={loading || !userInput.trim()}
        style={{
          backgroundColor: loading ? '#6c757d' : '#007bff',
          color: 'white',
          border: 'none',
          padding: '12px 24px',
          borderRadius: '8px',
          cursor: loading ? 'not-allowed' : 'pointer',
          fontSize: '16px',
          fontWeight: 'bold'
        }}
      >
        {loading ? '🤖 Finding Your Match...' : '🔍 Get My Dog Recommendation'}
      </button>

      {recommendation && (
        <div style={{
          marginTop: '30px',
          padding: '20px',
          backgroundColor: '#f8f9fa',
          borderRadius: '8px',
          border: '1px solid #dee2e6'
        }}>
          <h3 style={{ color: '#007bff', marginBottom: '15px' }}>🎯 AI Recommendation</h3>
          <p style={{ marginBottom: '20px', lineHeight: '1.6' }}>{recommendation.explanation}</p>
          
          {recommendation.dog && (
            <div style={{
              backgroundColor: 'white',
              padding: '20px',
              borderRadius: '8px',
              border: '2px solid #007bff'
            }}>
              {recommendation.dog.thumbnailUrl && (
                <img 
                  src={recommendation.dog.thumbnailUrl} 
                  alt={`${recommendation.dog.name || recommendation.dog.shelter}`}
                  style={{ 
                    width: '100%', 
                    maxWidth: '300px',
                    height: '200px', 
                    objectFit: 'cover', 
                    borderRadius: '8px',
                    cursor: 'pointer',
                    marginBottom: '15px'
                  }}
                  onClick={() => setSelectedDog(recommendation.dog)}
                />
              )}
              
              <h4 style={{ margin: '0 0 10px 0', color: '#007bff' }}>
                {recommendation.dog.name || recommendation.dog.shelter}
              </h4>
              <p><strong>Shelter:</strong> {recommendation.dog.shelter}</p>
              <p><strong>Location:</strong> {recommendation.dog.city}, {recommendation.dog.state}</p>
              <p><strong>Age:</strong> {calculateAge(recommendation.dog.birthday)}</p>
              <p><strong>Weight:</strong> {recommendation.dog.weight} lbs</p>
              <p><strong>Color:</strong> {recommendation.dog.color}</p>
              <p><strong>Description:</strong> {recommendation.dog.description}</p>
              
              <div style={{ marginTop: '10px', display: 'flex', gap: '10px' }}>
                <button 
                  onClick={() => setSelectedDog(recommendation.dog)}
                  style={{
                    backgroundColor: '#007bff',
                    color: 'white',
                    border: 'none',
                    padding: '10px 20px',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  View Full Image
                </button>
                
                {userApplications.includes(recommendation.dog.dogId) ? (
                  <button 
                    disabled
                    style={{
                      backgroundColor: '#6c757d',
                      color: 'white',
                      border: 'none',
                      padding: '10px 20px',
                      borderRadius: '4px',
                      cursor: 'not-allowed',
                      fontWeight: 'bold'
                    }}
                  >
                    ✓ Already Applied
                  </button>
                ) : (
                  <button 
                    onClick={() => setAdoptionForm({dogId: recommendation.dog.dogId, shelter: recommendation.dog.shelter, dogName: recommendation.dog.name || recommendation.dog.shelter})}
                    style={{
                      backgroundColor: '#28a745',
                      color: 'white',
                      border: 'none',
                      padding: '10px 20px',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontWeight: 'bold'
                    }}
                  >
                    🏠 Adopt This Dog
                  </button>
                )}
              </div>
            </div>
          )}
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
            <h2>{selectedDog.name || selectedDog.shelter} 🐕</h2>
            {selectedDog.resizedImageUrl && (
              <img 
                src={selectedDog.resizedImageUrl} 
                alt={`${selectedDog.name || selectedDog.shelter}`}
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
                    const adopterId = 'anonymous-user'; // You may want to get actual user ID
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
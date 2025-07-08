import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import './App.css'
import { Authenticator } from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css';
import { Amplify } from 'aws-amplify';
import { fetchAuthSession } from 'aws-amplify/auth';
import DogList from './components/DogList';
import AddDog from './components/AddDog';
import Favorites from './components/Favorites';
import MyDogs from './components/MyDogs';
import Applications from './components/Applications';
import MyApplications from './components/MyApplications';
import Dashboard from './components/Dashboard';
import DogRecommendation from './components/DogRecommendation';

function App() {
  const [userGroups, setUserGroups] = useState<string[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  
  const getUserGroups = async () => {
    try {
      const session = await fetchAuthSession();
      const groups = session.tokens?.idToken?.payload?.['cognito:groups'] as string[] || [];
      setUserGroups(groups);
    } catch (error) {
      console.log('Error fetching groups:', error);
      setUserGroups([]);
    }
  };
  
  useEffect(() => {
    if (currentUser) {
      getUserGroups();
    }
  }, [currentUser]);
  const user_pool_id = import.meta.env.VITE_USER_POOL_ID;
  const client_id = import.meta.env.VITE_CLIENT_ID;

  const formFields = {
    signUp: {
      email: {
        order: 1
      },
      name: {
        order: 2,
        label: 'Full Name',
      },
      'custom:user_role': {
        order: 3,
        label: 'I am a (type "adopter" or "shelter"):',
        placeholder: 'adopter or shelter',
        required: true
      },
      password: {
        order: 4
      },
      confirm_password: {
        order: 5
      }
    }
  };

  Amplify.configure({
    Auth: {
      Cognito: {
        userPoolId: user_pool_id,
        userPoolClientId: client_id,
        loginWith: {
          username: true,
          email: true,
        },
      }
    }
  });

  const Home = ({ user }: { user: any }) => <DogList user={user} userGroups={userGroups} />;
  const DogDetail = () => <div>Dog Details</div>;

  return (
    <Authenticator formFields={formFields}>
      {({ signOut, user }) => {
        // Store current user email in localStorage
        if (user?.signInDetails?.loginId) {
          localStorage.setItem('currentUserEmail', user.signInDetails.loginId);
        }
        
        // Update current user state
        if (user !== currentUser) {
          setCurrentUser(user);
        }
        
        return (
        <>
          <Router>
            <nav style={{
              background: 'linear-gradient(135deg, #065f46 0%, #047857 100%)',
              padding: '0',
              boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
              position: 'sticky',
              top: 0,
              zIndex: 1000
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0 40px',
                height: '70px',
                width: '100%'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '32px'
                }}>
                  <Link to="/" style={{
                    fontSize: '24px',
                    fontWeight: 'bold',
                    color: 'white',
                    textDecoration: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    🐕 Pupper
                  </Link>
                  
                  <div style={{ display: 'flex', gap: '24px' }}>
                    <Link to="/" style={{
                      color: 'rgba(255,255,255,0.9)',
                      textDecoration: 'none',
                      fontWeight: '500',
                      padding: '8px 16px',
                      borderRadius: '8px',
                      transition: 'all 0.2s',
                      ':hover': { backgroundColor: 'rgba(255,255,255,0.1)' }
                    }}>Browse Dogs</Link>
                    
                    {userGroups.includes('shelter') && (
                      <Link to="/add-dog" style={{
                        color: 'rgba(255,255,255,0.9)',
                        textDecoration: 'none',
                        fontWeight: '500',
                        padding: '8px 16px',
                        borderRadius: '8px'
                      }}>Add Dog</Link>
                    )}
                    
                    {userGroups.includes('shelter') && (
                      <Link to="/my-dogs" style={{
                        color: 'rgba(255,255,255,0.9)',
                        textDecoration: 'none',
                        fontWeight: '500',
                        padding: '8px 16px',
                        borderRadius: '8px'
                      }}>My Dogs</Link>
                    )}
                    
                    {userGroups.includes('shelter') && (
                      <Link to="/applications" style={{
                        color: 'rgba(255,255,255,0.9)',
                        textDecoration: 'none',
                        fontWeight: '500',
                        padding: '8px 16px',
                        borderRadius: '8px'
                      }}>Applications</Link>
                    )}
                    
                    {userGroups.includes('shelter') && (
                      <Link to="/dashboard" style={{
                        color: 'rgba(255,255,255,0.9)',
                        textDecoration: 'none',
                        fontWeight: '500',
                        padding: '8px 16px',
                        borderRadius: '8px'
                      }}>Dashboard</Link>
                    )}
                    
                    <Link to="/favorites" style={{
                      color: 'rgba(255,255,255,0.9)',
                      textDecoration: 'none',
                      fontWeight: '500',
                      padding: '8px 16px',
                      borderRadius: '8px'
                    }}>❤️ Favorites</Link>
                    
                    {userGroups.includes('adopter') && (
                      <Link to="/recommend" style={{
                        color: 'rgba(255,255,255,0.9)',
                        textDecoration: 'none',
                        fontWeight: '500',
                        padding: '8px 16px',
                        borderRadius: '8px'
                      }}>🤖 Find Match</Link>
                    )}
                    
                    {userGroups.includes('adopter') && (
                      <Link to="/my-applications" style={{
                        color: 'rgba(255,255,255,0.9)',
                        textDecoration: 'none',
                        fontWeight: '500',
                        padding: '8px 16px',
                        borderRadius: '8px'
                      }}>My Applications</Link>
                    )}
                  </div>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{
                    backgroundColor: 'rgba(255,255,255,0.2)',
                    padding: '6px 12px',
                    borderRadius: '20px',
                    fontSize: '12px',
                    color: 'white',
                    fontWeight: '500'
                  }}>
                    {userGroups.includes('shelter') ? '🏠 Shelter' : '🐕 Adopter'}
                  </div>
                  <button onClick={signOut} style={{
                    backgroundColor: 'rgba(255,255,255,0.2)',
                    color: 'white',
                    border: '1px solid rgba(255,255,255,0.3)',
                    padding: '8px 16px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontWeight: '500',
                    transition: 'all 0.2s'
                  }}>Sign Out</button>
                </div>
              </div>
            </nav>
            
            <div style={{
              minHeight: '100vh',
              backgroundColor: '#fef7ed'
            }}>
            <Routes>
              <Route path="/" element={<Home user={user} />} />
              <Route path="/add-dog" element={
                userGroups.includes('shelter') ? 
                <AddDog /> : 
                <div style={{ padding: '20px', textAlign: 'center' }}>
                  <h2>Access Denied</h2>
                  <p>Only registered shelters can add dogs for adoption.</p>
                  <p>Please contact an administrator to be added to the shelter group.</p>
                </div>
              } />
              <Route path="/favorites" element={<Favorites user={user} userGroups={userGroups} />} />
              <Route path="/my-dogs" element={
                userGroups.includes('shelter') ? 
                <MyDogs user={user} /> : 
                <div style={{ padding: '20px', textAlign: 'center' }}>
                  <h2>Access Denied</h2>
                  <p>Only registered shelters can view this page.</p>
                </div>
              } />
              <Route path="/applications" element={
                userGroups.includes('shelter') ? 
                <Applications user={user} /> : 
                <div style={{ padding: '20px', textAlign: 'center' }}>
                  <h2>Access Denied</h2>
                  <p>Only registered shelters can view this page.</p>
                </div>
              } />
              <Route path="/my-applications" element={
                userGroups.includes('adopter') ? 
                <MyApplications user={user} /> : 
                <div style={{ padding: '20px', textAlign: 'center' }}>
                  <h2>Access Denied</h2>
                  <p>Only registered adopters can view this page.</p>
                </div>
              } />
              <Route path="/dashboard" element={
                userGroups.includes('shelter') ? 
                <Dashboard user={user} /> : 
                <div style={{ padding: '20px', textAlign: 'center' }}>
                  <h2>Access Denied</h2>
                  <p>Only registered shelters can view this page.</p>
                </div>
              } />
              <Route path="/recommend" element={
                userGroups.includes('adopter') ? 
                <DogRecommendation /> : 
                <div style={{ padding: '20px', textAlign: 'center' }}>
                  <h2>Access Denied</h2>
                  <p>Only registered adopters can use the dog recommendation feature.</p>
                </div>
              } />
              <Route path="/dogs/:id" element={<DogDetail />} />
            </Routes>
            </div>
          </Router>
        </>
        );
      }}
    </Authenticator>
  );
}

export default App;

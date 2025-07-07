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
            <nav style={{ padding: '10px', borderBottom: '1px solid #ddd', marginBottom: '20px' }}>
              <Link to="/" style={{ marginRight: '20px', textDecoration: 'none', color: '#007bff' }}>Home</Link>
              {userGroups.includes('shelter') && (
                <Link to="/add-dog" style={{ marginRight: '20px', textDecoration: 'none', color: '#007bff' }}>Add Dog</Link>
              )}
              {userGroups.includes('shelter') && (
                <Link to="/my-dogs" style={{ marginRight: '20px', textDecoration: 'none', color: '#007bff' }}>🏠 My Dogs</Link>
              )}
              {userGroups.includes('shelter') && (
                <Link to="/applications" style={{ marginRight: '20px', textDecoration: 'none', color: '#007bff' }}>📋 Applications</Link>
              )}
              {userGroups.includes('shelter') && (
                <Link to="/dashboard" style={{ marginRight: '20px', textDecoration: 'none', color: '#007bff' }}>📈 Dashboard</Link>
              )}
              <Link to="/favorites" style={{ marginRight: '20px', textDecoration: 'none', color: '#28a745' }}>💖 My Favorites</Link>
              {userGroups.includes('adopter') && (
                <Link to="/my-applications" style={{ marginRight: '20px', textDecoration: 'none', color: '#007bff' }}>📝 My Applications</Link>
              )}
              <div style={{ float: 'right', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '12px', color: '#666' }}>
                  {userGroups.includes('shelter') ? '🏠 Shelter' : '🐕 Adopter'}
                </span>
                <button onClick={signOut} style={{ backgroundColor: '#dc3545', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '4px' }}>Logout</button>
              </div>
            </nav>
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
              <Route path="/dogs/:id" element={<DogDetail />} />
            </Routes>
          </Router>
        </>
        );
      }}
    </Authenticator>
  );
}

export default App;

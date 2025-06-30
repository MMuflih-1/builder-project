import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { useState } from 'react'
import './App.css'
import { Authenticator } from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css';
import { Amplify } from 'aws-amplify';

function App() {
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

  const Home = () => <div>Welcome to Pupper!</div>;
  const DogDetail = () => <div>Dog Details</div>;

  return (
    <Authenticator formFields={formFields}>
      {({ signOut, user }) => (
        <>
          <Router>
            <nav>
              <Link to="/">Home</Link>
              <button onClick={signOut}>Logout</button>
            </nav>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/dogs/:id" element={<DogDetail />} />
            </Routes>
          </Router>
        </>
      )}
    </Authenticator>
  );
}

export default App;

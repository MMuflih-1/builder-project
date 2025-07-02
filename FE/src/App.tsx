import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import './App.css'
import { Authenticator } from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css';
import { Amplify } from 'aws-amplify';
import DogList from './components/DogList';
import AddDog from './components/AddDog';
import Favorites from './components/Favorites';

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

  const Home = ({ user }: { user: any }) => <DogList user={user} />;
  const DogDetail = () => <div>Dog Details</div>;

  return (
    <Authenticator formFields={formFields}>
      {({ signOut, user }) => {
        // Store current user email in localStorage
        if (user?.signInDetails?.loginId) {
          localStorage.setItem('currentUserEmail', user.signInDetails.loginId);
        }
        
        return (
        <>
          <Router>
            <nav style={{ padding: '10px', borderBottom: '1px solid #ddd', marginBottom: '20px' }}>
              <Link to="/" style={{ marginRight: '20px', textDecoration: 'none', color: '#007bff' }}>Home</Link>
              <Link to="/add-dog" style={{ marginRight: '20px', textDecoration: 'none', color: '#007bff' }}>Add Dog</Link>
              <Link to="/favorites" style={{ marginRight: '20px', textDecoration: 'none', color: '#28a745' }}>💖 My Favorites</Link>
              <button onClick={signOut} style={{ float: 'right', backgroundColor: '#dc3545', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '4px' }}>Logout</button>
            </nav>
            <Routes>
              <Route path="/" element={<Home user={user} />} />
              <Route path="/add-dog" element={<AddDog />} />
              <Route path="/favorites" element={<Favorites user={user} />} />
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

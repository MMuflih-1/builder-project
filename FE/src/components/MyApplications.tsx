import { useState, useEffect } from 'react';

interface Application {
  applicationId: string;
  dogId: string;
  dogName: string;
  shelter: string;
  adopterId: string;
  status: 'pending' | 'approved' | 'rejected';
  adopterName: string;
  adopterEmail: string;
  adopterPhone: string;
  adopterAddress: string;
  experience: string;
  livingSpace: string;
  hasKids: string;
  createdAt: string;
  updatedAt: string;
}

const API_URL = 'https://iw7dv4kkca.execute-api.us-east-2.amazonaws.com/prod';

interface MyApplicationsProps {
  user?: any;
}

export default function MyApplications({ user }: MyApplicationsProps) {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMyApplications();
  }, []);

  const fetchMyApplications = async () => {
    try {
      const userId = user?.username || user?.userId || 'anonymous-user';
      console.log('Fetching applications for userId:', userId);
      
      // Use the new all-applications endpoint
      const response = await fetch(`${API_URL}/applications`);
      
      if (response.ok) {
        const data = await response.json();
        console.log('All applications from API:', data.applications);
        console.log('Current userId for filtering:', userId);
        
        // Filter applications submitted by current user
        const myApplications = data.applications.filter((app: Application) => {
          console.log(`Comparing app.adopterId '${app.adopterId}' with userId '${userId}'`);
          return app.adopterId === userId;
        });
        
        console.log('My filtered applications:', myApplications);
        setApplications(myApplications);
      } else {
        console.log('API response not ok:', response.status);
        setApplications([]);
      }
    } catch (error) {
      console.error('Error fetching my applications:', error);
      setApplications([]);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return '#ffc107';
      case 'approved': return '#28a745';
      case 'rejected': return '#dc3545';
      default: return '#6c757d';
    }
  };

  const getStatusMessage = (status: string) => {
    switch (status) {
      case 'pending': return 'Your application is being reviewed by the shelter.';
      case 'approved': return 'Congratulations! Your application has been approved. The shelter will contact you soon.';
      case 'rejected': return 'Unfortunately, your application was not approved this time.';
      default: return '';
    }
  };

  if (loading) return <div>Loading your applications...</div>;

  return (
    <div style={{ padding: '20px' }}>
      <h1>My Applications 📝</h1>
      <p>Track the status of your adoption applications</p>
      
      {applications.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <h3>No applications yet!</h3>
          <p>When you apply to adopt dogs, your applications will appear here.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {applications.map((app) => (
            <div key={app.applicationId} style={{ 
              border: '2px solid #007bff', 
              borderRadius: '8px', 
              padding: '20px',
              backgroundColor: '#f8f9ff'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                <div>
                  <h3 style={{ margin: 0 }}>Application for {app.dogName}</h3>
                  <p style={{ margin: '5px 0 0 0', color: '#666', fontSize: '14px' }}>from {app.shelter}</p>
                </div>
                <span style={{ 
                  backgroundColor: getStatusColor(app.status), 
                  color: 'white', 
                  padding: '6px 12px', 
                  borderRadius: '12px', 
                  fontSize: '12px',
                  fontWeight: 'bold',
                  textTransform: 'uppercase'
                }}>
                  {app.status}
                </span>
              </div>
              
              <div style={{ 
                backgroundColor: getStatusColor(app.status) + '20', 
                padding: '15px', 
                borderRadius: '6px', 
                marginBottom: '15px',
                border: `1px solid ${getStatusColor(app.status)}40`
              }}>
                <p style={{ margin: 0, fontWeight: 'bold', color: getStatusColor(app.status) }}>
                  {getStatusMessage(app.status)}
                </p>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '15px' }}>
                <div>
                  <h4 style={{ marginBottom: '8px', color: '#007bff', fontSize: '14px' }}>Application Details</h4>
                  <p style={{ margin: '2px 0', fontSize: '14px' }}><strong>Submitted:</strong> {formatDate(app.createdAt)}</p>
                  <p style={{ margin: '2px 0', fontSize: '14px' }}><strong>Living Space:</strong> {app.livingSpace.replace('-', ' ')}</p>
                  <p style={{ margin: '2px 0', fontSize: '14px' }}><strong>Has Kids:</strong> {app.hasKids === 'yes' ? 'Yes' : 'No'}</p>
                </div>
                
                <div>
                  <h4 style={{ marginBottom: '8px', color: '#007bff', fontSize: '14px' }}>Contact Info</h4>
                  <p style={{ margin: '2px 0', fontSize: '14px' }}><strong>Email:</strong> {app.adopterEmail}</p>
                  <p style={{ margin: '2px 0', fontSize: '14px' }}><strong>Phone:</strong> {app.adopterPhone}</p>
                </div>
              </div>
              
              <div style={{ marginTop: '15px', paddingTop: '15px', borderTop: '1px solid #ddd', fontSize: '12px', color: '#666' }}>
                <p><strong>Application ID:</strong> {app.applicationId}</p>
                {app.status !== 'pending' && (
                  <p><strong>Last Updated:</strong> {formatDate(app.updatedAt)}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
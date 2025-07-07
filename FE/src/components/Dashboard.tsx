import { useState, useEffect } from 'react';

interface DashboardStats {
  totalDogs: number;
  availableDogs: number;
  adoptedDogs: number;
  totalApplications: number;
  pendingApplications: number;
  approvedApplications: number;
  rejectedApplications: number;
  adoptionRate: number;
}

interface Application {
  applicationId: string;
  dogId: string;
  dogName: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

interface Dog {
  dogId: string;
  name: string;
  shelter: string;
  status?: 'available' | 'adopted';
  createdAt: string;
}

const API_URL = 'https://iw7dv4kkca.execute-api.us-east-2.amazonaws.com/prod';

interface DashboardProps {
  user?: any;
}

export default function Dashboard({ user }: DashboardProps) {
  const [stats, setStats] = useState<DashboardStats>({
    totalDogs: 0,
    availableDogs: 0,
    adoptedDogs: 0,
    totalApplications: 0,
    pendingApplications: 0,
    approvedApplications: 0,
    rejectedApplications: 0,
    adoptionRate: 0
  });
  const [loading, setLoading] = useState(true);
  const [recentApplications, setRecentApplications] = useState<Application[]>([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const userId = user?.username || user?.userId || 'anonymous-user';
      console.log('Dashboard fetching data for userId:', userId);
      
      // Fetch dogs and applications using correct endpoints
      const [dogsResponse, applicationsResponse] = await Promise.all([
        fetch(`${API_URL}/dogs`), // Get all dogs, then filter
        fetch(`${API_URL}/users/${userId}/applications`) // Get applications for this shelter
      ]);

      let dogs: Dog[] = [];
      let applications: Application[] = [];

      if (dogsResponse.ok) {
        const dogsData = await dogsResponse.json();
        // Filter dogs created by this shelter user
        const allDogs = dogsData.dogs || [];
        dogs = allDogs.filter((dog: any) => dog.createdBy === userId);
        console.log('Filtered dogs for shelter:', dogs);
      } else {
        console.log('Dogs fetch failed:', dogsResponse.status);
      }

      if (applicationsResponse.ok) {
        const appsData = await applicationsResponse.json();
        applications = appsData.applications || [];
        console.log('Applications for shelter:', applications);
      } else {
        console.log('Applications fetch failed:', applicationsResponse.status);
      }

      // Calculate statistics
      const totalDogs = dogs.length;
      const adoptedDogs = dogs.filter(dog => dog.status === 'adopted').length;
      const availableDogs = totalDogs - adoptedDogs;
      
      const totalApplications = applications.length;
      const pendingApplications = applications.filter(app => app.status === 'pending').length;
      const approvedApplications = applications.filter(app => app.status === 'approved').length;
      const rejectedApplications = applications.filter(app => app.status === 'rejected').length;
      
      const adoptionRate = totalDogs > 0 ? Math.round((adoptedDogs / totalDogs) * 100) : 0;

      console.log('Calculated stats:', {
        totalDogs,
        availableDogs,
        adoptedDogs,
        totalApplications,
        pendingApplications,
        approvedApplications,
        rejectedApplications,
        adoptionRate
      });

      setStats({
        totalDogs,
        availableDogs,
        adoptedDogs,
        totalApplications,
        pendingApplications,
        approvedApplications,
        rejectedApplications,
        adoptionRate
      });

      // Get recent applications (last 5)
      const recent = applications
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 5);
      setRecentApplications(recent);

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
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

  if (loading) return <div>Loading dashboard...</div>;

  return (
    <div style={{ padding: '20px' }}>
      <h1>Shelter Dashboard 📊</h1>
      <p>Overview of your adoption activities</p>

      {/* Statistics Cards */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
        gap: '20px', 
        marginBottom: '30px' 
      }}>
        {/* Dogs Statistics */}
        <div style={{ 
          backgroundColor: '#e3f2fd', 
          padding: '20px', 
          borderRadius: '8px', 
          textAlign: 'center',
          border: '1px solid #bbdefb'
        }}>
          <h3 style={{ margin: '0 0 10px 0', color: '#1976d2' }}>🐕 Total Dogs</h3>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#1976d2' }}>{stats.totalDogs}</div>
        </div>

        <div style={{ 
          backgroundColor: '#e8f5e8', 
          padding: '20px', 
          borderRadius: '8px', 
          textAlign: 'center',
          border: '1px solid #c8e6c9'
        }}>
          <h3 style={{ margin: '0 0 10px 0', color: '#388e3c' }}>📋 Available</h3>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#388e3c' }}>{stats.availableDogs}</div>
        </div>

        <div style={{ 
          backgroundColor: '#fff3e0', 
          padding: '20px', 
          borderRadius: '8px', 
          textAlign: 'center',
          border: '1px solid #ffcc02'
        }}>
          <h3 style={{ margin: '0 0 10px 0', color: '#f57c00' }}>🏠 Adopted</h3>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#f57c00' }}>{stats.adoptedDogs}</div>
        </div>

        <div style={{ 
          backgroundColor: '#f3e5f5', 
          padding: '20px', 
          borderRadius: '8px', 
          textAlign: 'center',
          border: '1px solid #ce93d8'
        }}>
          <h3 style={{ margin: '0 0 10px 0', color: '#7b1fa2' }}>📈 Adoption Rate</h3>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#7b1fa2' }}>{stats.adoptionRate}%</div>
        </div>

        {/* Applications Statistics */}
        <div style={{ 
          backgroundColor: '#e1f5fe', 
          padding: '20px', 
          borderRadius: '8px', 
          textAlign: 'center',
          border: '1px solid #b3e5fc'
        }}>
          <h3 style={{ margin: '0 0 10px 0', color: '#0277bd' }}>📝 Total Applications</h3>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#0277bd' }}>{stats.totalApplications}</div>
        </div>

        <div style={{ 
          backgroundColor: '#fff8e1', 
          padding: '20px', 
          borderRadius: '8px', 
          textAlign: 'center',
          border: '1px solid #ffecb3'
        }}>
          <h3 style={{ margin: '0 0 10px 0', color: '#f9a825' }}>⏳ Pending</h3>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#f9a825' }}>{stats.pendingApplications}</div>
        </div>

        <div style={{ 
          backgroundColor: '#e8f5e8', 
          padding: '20px', 
          borderRadius: '8px', 
          textAlign: 'center',
          border: '1px solid #c8e6c9'
        }}>
          <h3 style={{ margin: '0 0 10px 0', color: '#388e3c' }}>✅ Approved</h3>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#388e3c' }}>{stats.approvedApplications}</div>
        </div>

        <div style={{ 
          backgroundColor: '#ffebee', 
          padding: '20px', 
          borderRadius: '8px', 
          textAlign: 'center',
          border: '1px solid #ffcdd2'
        }}>
          <h3 style={{ margin: '0 0 10px 0', color: '#d32f2f' }}>❌ Rejected</h3>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#d32f2f' }}>{stats.rejectedApplications}</div>
        </div>
      </div>

      {/* Recent Applications */}
      <div style={{ 
        backgroundColor: '#f8f9fa', 
        padding: '20px', 
        borderRadius: '8px',
        border: '1px solid #dee2e6'
      }}>
        <h3 style={{ margin: '0 0 15px 0' }}>Recent Applications</h3>
        {recentApplications.length === 0 ? (
          <p style={{ color: '#666', fontStyle: 'italic' }}>No recent applications</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {recentApplications.map((app) => (
              <div key={app.applicationId} style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                padding: '10px',
                backgroundColor: 'white',
                borderRadius: '4px',
                border: '1px solid #ddd'
              }}>
                <div>
                  <strong>{app.dogName}</strong>
                  <span style={{ color: '#666', marginLeft: '10px' }}>
                    {formatDate(app.createdAt)}
                  </span>
                </div>
                <span style={{ 
                  backgroundColor: getStatusColor(app.status), 
                  color: 'white', 
                  padding: '2px 8px', 
                  borderRadius: '12px', 
                  fontSize: '12px',
                  fontWeight: 'bold',
                  textTransform: 'uppercase'
                }}>
                  {app.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
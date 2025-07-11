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

interface ApplicationsProps {
  user?: any;
}

export default function Applications({ user }: ApplicationsProps) {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingAppId, setUpdatingAppId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'dogName' | 'status'>('date');

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    try {
      const userId = user?.username || user?.userId || 'anonymous-user';
      const response = await fetch(`${API_URL}/users/${userId}/applications`);
      
      if (response.ok) {
        const data = await response.json();
        // Filter applications for dogs from this shelter user's posts
        // For now, we'll show all applications since we don't have shelter filtering yet
        setApplications(data.applications || []);
      } else {
        console.log('No applications found');
        setApplications([]);
      }
    } catch (error) {
      console.error('Error fetching applications:', error);
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

  const handleUpdateApplication = async (applicationId: string, status: 'approved' | 'rejected') => {
    setUpdatingAppId(applicationId);
    
    try {
      const userId = user?.username || user?.userId || 'anonymous-user';
      const response = await fetch(`${API_URL}/applications/${applicationId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status, userId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update application');
      }

      // Update local state
      setApplications(prev => 
        prev.map(app => 
          app.applicationId === applicationId 
            ? { ...app, status, updatedAt: new Date().toISOString() }
            : app
        )
      );
      
      console.log(`Application ${status}`);
      
    } catch (error) {
      console.error('Error updating application:', error);
      alert('Failed to update application. Please try again.');
    } finally {
      setUpdatingAppId(null);
    }
  };

  // Filter and sort applications
  const filteredAndSortedApplications = applications
    .filter(app => {
      // Status filter
      if (statusFilter !== 'all' && app.status !== statusFilter) return false;
      
      // Search filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        return (
          app.dogName.toLowerCase().includes(searchLower) ||
          app.adopterName.toLowerCase().includes(searchLower) ||
          app.adopterEmail.toLowerCase().includes(searchLower)
        );
      }
      
      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'dogName':
          return a.dogName.localeCompare(b.dogName);
        case 'status':
          return a.status.localeCompare(b.status);
        case 'date':
        default:
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });

  if (loading) return <div>Loading applications...</div>;

  return (
    <div style={{ padding: '20px' }}>
      <h1>Adoption Applications 📋</h1>
      <p>Applications for dogs you've posted</p>
      
      {/* Filter and Search Controls */}
      <div style={{ 
        marginBottom: '20px', 
        padding: '15px', 
        backgroundColor: '#f8f9fa', 
        borderRadius: '8px',
        border: '1px solid #dee2e6'
      }}>
        <h3 style={{ margin: '0 0 15px 0', fontSize: '16px' }}>Filter & Search Applications</h3>
        
        {/* Search Box */}
        <div style={{ marginBottom: '15px' }}>
          <input
            type="text"
            placeholder="Search by dog name, adopter name, or email..."
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
          {/* Status Filter */}
          <div>
            <label style={{ marginRight: '8px', fontWeight: 'bold' }}>Status:</label>
            <select 
              value={statusFilter} 
              onChange={(e) => setStatusFilter(e.target.value as 'all' | 'pending' | 'approved' | 'rejected')}
              style={{ 
                padding: '5px 10px', 
                borderRadius: '4px', 
                border: '1px solid #ccc',
                backgroundColor: 'white'
              }}
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
          
          {/* Sort By */}
          <div>
            <label style={{ marginRight: '8px', fontWeight: 'bold' }}>Sort by:</label>
            <select 
              value={sortBy} 
              onChange={(e) => setSortBy(e.target.value as 'date' | 'dogName' | 'status')}
              style={{ 
                padding: '5px 10px', 
                borderRadius: '4px', 
                border: '1px solid #ccc',
                backgroundColor: 'white'
              }}
            >
              <option value="date">Date (Newest First)</option>
              <option value="dogName">Dog Name</option>
              <option value="status">Status</option>
            </select>
          </div>
          
          {/* Clear Filters */}
          {(statusFilter !== 'all' || searchTerm || sortBy !== 'date') && (
            <button 
              onClick={() => {
                setStatusFilter('all');
                setSearchTerm('');
                setSortBy('date');
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
              Clear Filters
            </button>
          )}
        </div>
      </div>
      
      {/* Results Summary */}
      <p style={{ marginBottom: '15px', color: '#666' }}>
        Showing {filteredAndSortedApplications.length} of {applications.length} applications
        {statusFilter !== 'all' && ` • Status: ${statusFilter}`}
        {searchTerm && ` • Search: "${searchTerm}"`}
        {sortBy !== 'date' && ` • Sorted by: ${sortBy}`}
      </p>
      
      {filteredAndSortedApplications.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <h3>{applications.length === 0 ? 'No applications yet!' : 'No applications match your filters'}</h3>
          <p>{applications.length === 0 ? 'When people apply to adopt your dogs, they\'ll appear here.' : 'Try adjusting your search or filter criteria.'}</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {filteredAndSortedApplications.map((app) => (
            <div key={app.applicationId} style={{ 
              border: '1px solid #ddd', 
              borderRadius: '8px', 
              padding: '20px',
              backgroundColor: '#f9f9f9'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                <h3 style={{ margin: 0 }}>Application for {app.dogName}</h3>
                <span style={{ 
                  backgroundColor: getStatusColor(app.status), 
                  color: 'white', 
                  padding: '4px 12px', 
                  borderRadius: '12px', 
                  fontSize: '12px',
                  fontWeight: 'bold',
                  textTransform: 'uppercase'
                }}>
                  {app.status}
                </span>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
                <div>
                  <h4 style={{ marginBottom: '10px', color: '#007bff' }}>Applicant Information</h4>
                  <p><strong>Name:</strong> {app.adopterName}</p>
                  <p><strong>Email:</strong> {app.adopterEmail}</p>
                  <p><strong>Phone:</strong> {app.adopterPhone}</p>
                  <p><strong>Address:</strong> {app.adopterAddress}</p>
                </div>
                
                <div>
                  <h4 style={{ marginBottom: '10px', color: '#007bff' }}>Living Situation</h4>
                  <p><strong>Living Space:</strong> {app.livingSpace.replace('-', ' ')}</p>
                  <p><strong>Has Kids:</strong> {app.hasKids === 'yes' ? 'Yes' : 'No'}</p>
                  {app.experience && (
                    <p><strong>Pet Experience:</strong> {app.experience}</p>
                  )}
                </div>
              </div>
              
              <div style={{ marginTop: '15px', paddingTop: '15px', borderTop: '1px solid #ddd', fontSize: '12px', color: '#666' }}>
                <p><strong>Applied:</strong> {formatDate(app.createdAt)}</p>
                <p><strong>Application ID:</strong> {app.applicationId}</p>
              </div>
              
              {/* Approve/Reject buttons for pending applications */}
              {app.status === 'pending' && (
                <div style={{ marginTop: '15px', display: 'flex', gap: '10px', justifyContent: 'center' }}>
                  <button 
                    onClick={() => handleUpdateApplication(app.applicationId, 'approved')}
                    disabled={updatingAppId === app.applicationId}
                    style={{
                      backgroundColor: updatingAppId === app.applicationId ? '#6c757d' : '#28a745',
                      color: 'white',
                      border: 'none',
                      padding: '10px 20px',
                      borderRadius: '4px',
                      cursor: updatingAppId === app.applicationId ? 'not-allowed' : 'pointer',
                      fontWeight: 'bold'
                    }}
                  >
                    {updatingAppId === app.applicationId ? 'Updating...' : '✅ Approve'}
                  </button>
                  <button 
                    onClick={() => handleUpdateApplication(app.applicationId, 'rejected')}
                    disabled={updatingAppId === app.applicationId}
                    style={{
                      backgroundColor: updatingAppId === app.applicationId ? '#6c757d' : '#dc3545',
                      color: 'white',
                      border: 'none',
                      padding: '10px 20px',
                      borderRadius: '4px',
                      cursor: updatingAppId === app.applicationId ? 'not-allowed' : 'pointer',
                      fontWeight: 'bold'
                    }}
                  >
                    {updatingAppId === app.applicationId ? 'Updating...' : '❌ Reject'}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { VendorContext } from '../../context/VendorContext';

const PMLogin = () => {
  const [credentials, setCredentials] = useState({
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const { setUser, logout } = useContext(VendorContext);
  const navigate = useNavigate();

  // Sample PM accounts for testing
  const samplePMs = [
    {
      id: 'pm-001',
      email: 'pm@construction.com',
      password: 'pm123',
      name: 'John Smith',
      role: 'pm',
      company: 'ABC Construction',
      specialization: 'Construction Projects'
    },
    {
      id: 'pm-002', 
      email: 'sarah@engineering.com',
      password: 'pm123',
      name: 'Sarah Johnson',
      role: 'pm',
      company: 'Engineering Solutions',
      specialization: 'Engineering Projects'
    }
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Clear any existing user data first
      logout();
      console.log("PM Login: Cleared all existing user data");

      // Check against sample PM accounts
      const pmUser = samplePMs.find(pm => 
        pm.email === credentials.email && pm.password === credentials.password
      );

      if (pmUser) {
        const persistedPmUser = {
          ...pmUser,
          accessedFrom: 'pm-dashboard',
          timestamp: Date.now()
        };

        sessionStorage.setItem('pmUser', JSON.stringify(persistedPmUser));
        localStorage.setItem('pmUser', JSON.stringify(persistedPmUser));

        // Set PM user in context
        setUser({
          ...persistedPmUser,
          vendorId: pmUser.id, // For compatibility with existing system
          isAuthenticated: true
        });

        // Navigate to PM dashboard
        navigate('/pm-dashboard');
      } else {
        setError('Invalid PM credentials. Try: pm@construction.com / pm123');
      }
    } catch (error) {
      setError('Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = (pmUser) => {
    // Clear any existing user data first
    logout();
    console.log("PM Quick Login: Cleared all existing user data");

    const persistedPmUser = {
      ...pmUser,
      accessedFrom: 'pm-dashboard',
      timestamp: Date.now()
    };

    sessionStorage.setItem('pmUser', JSON.stringify(persistedPmUser));
    localStorage.setItem('pmUser', JSON.stringify(persistedPmUser));
    
    setUser({
      ...persistedPmUser,
      vendorId: pmUser.id,
      isAuthenticated: true
    });
    navigate('/pm-dashboard');
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold text-ink">
            Project Manager Login
          </h2>
          <p className="mt-2 text-sm text-dim">
            Access your collaborative project dashboard
          </p>
        </div>

        {/* Login Form */}
        <form className="mt-8 space-y-6 bg-surface p-8 rounded-xl shadow-lg" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-danger/10 border border-danger/20 text-danger px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-ink">
                Email Address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                value={credentials.email}
                onChange={(e) => setCredentials({...credentials, email: e.target.value})}
                className="mt-1 block w-full px-3 py-2 border border-line rounded-md  focus:outline-none focus:ring-info focus:border-info"
                placeholder="Enter your PM email"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-ink">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                value={credentials.password}
                onChange={(e) => setCredentials({...credentials, password: e.target.value})}
                className="mt-1 block w-full px-3 py-2 border border-line rounded-md  focus:outline-none focus:ring-info focus:border-info"
                placeholder="Enter your password"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md  text-sm font-medium text-white bg-info hover:bg-info focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-info disabled:opacity-50"
          >
            {loading ? 'Signing in...' : 'Sign in as PM'}
          </button>
        </form>

        {/* Quick Login Options */}
        <div className="bg-surface p-6 rounded-xl shadow-lg">
          <h3 className="text-lg font-medium text-ink mb-4">Quick Login (Testing)</h3>
          <div className="space-y-3">
            {samplePMs.map((pm) => (
              <button
                key={pm.id}
                onClick={() => handleQuickLogin(pm)}
                className="w-full text-left p-3 border border-line rounded-lg hover:bg-canvas transition-colors"
              >
                <div className="font-medium text-ink">{pm.name}</div>
                <div className="text-sm text-dim">{pm.email}</div>
                <div className="text-xs text-dim">{pm.company} • {pm.specialization}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Back to Vendor Login */}
        <div className="text-center">
          <button
            onClick={() => navigate('/login')}
            className="text-sm text-info hover:text-info"
          >
            ← Back to Vendor Login
          </button>
        </div>
      </div>
    </div>
  );
};

export default PMLogin;

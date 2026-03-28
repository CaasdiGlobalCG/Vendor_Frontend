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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Project Manager Login
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Access your collaborative project dashboard
          </p>
        </div>

        {/* Login Form */}
        <form className="mt-8 space-y-6 bg-white p-8 rounded-xl shadow-lg" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email Address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                value={credentials.email}
                onChange={(e) => setCredentials({...credentials, email: e.target.value})}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter your PM email"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                value={credentials.password}
                onChange={(e) => setCredentials({...credentials, password: e.target.value})}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter your password"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {loading ? 'Signing in...' : 'Sign in as PM'}
          </button>
        </form>

        {/* Quick Login Options */}
        <div className="bg-white p-6 rounded-xl shadow-lg">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Login (Testing)</h3>
          <div className="space-y-3">
            {samplePMs.map((pm) => (
              <button
                key={pm.id}
                onClick={() => handleQuickLogin(pm)}
                className="w-full text-left p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="font-medium text-gray-900">{pm.name}</div>
                <div className="text-sm text-gray-600">{pm.email}</div>
                <div className="text-xs text-gray-500">{pm.company} • {pm.specialization}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Back to Vendor Login */}
        <div className="text-center">
          <button
            onClick={() => navigate('/login')}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            ← Back to Vendor Login
          </button>
        </div>
      </div>
    </div>
  );
};

export default PMLogin;

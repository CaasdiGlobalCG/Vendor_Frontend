import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useCandidateAuth } from '../contexts/CandidateAuthContext';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useCandidateAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        backgroundColor: 'rgb(var(--surface-hover))'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '50px',
            height: '50px',
            border: '4px solid #e5e7eb',
            borderTopColor: 'rgb(var(--success))',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 1rem'
          }}></div>
          <p style={{ color: 'rgb(var(--info))' }}>Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    // Redirect to login page with the current location
    return <Navigate to="/careers/login" state={{ from: location.pathname }} replace />;
  }

  return children;
};

export default ProtectedRoute;

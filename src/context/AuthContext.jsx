import React, { createContext, useContext } from 'react';
import { VendorContext } from './VendorContext';

// Create AuthContext that wraps VendorContext for compatibility with NewQuote component
const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const { currentUser } = useContext(VendorContext);
  
  // Create a token-like structure for compatibility
  const authValue = {
    token: currentUser ? `vendor_${currentUser.vendorId}` : null,
    user: currentUser,
    isAuthenticated: !!currentUser,
    login: () => {}, // Not implemented for vendor context
    logout: () => {}, // Not implemented for vendor context
  };

  return (
    <AuthContext.Provider value={authValue}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export { AuthContext };

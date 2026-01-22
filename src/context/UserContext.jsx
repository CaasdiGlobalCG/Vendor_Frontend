import { createContext, useState, useEffect } from 'react';

export const UserContext = createContext();

export function UserProvider({ children }) {
  console.log("UserContext - Initializing");
  
  // Do NOT hydrate identity/profile from localStorage (prevents stale/cross-user leakage)
  const [currentUser, setCurrentUser] = useState(null);
  
  // Debug effect to log when currentUser changes
  useEffect(() => {
    console.log("UserContext - Current user updated:", currentUser);
  }, [currentUser]);
  
  // Function to set user (in-memory only)
  const setUser = (user) => {
    console.log("UserContext - Setting user:", user);
    setCurrentUser(user);
  };

  // Logout function to clear all user data
  const logout = () => {
    console.log("UserContext: Logging out user");
    
    // Reset state
    setCurrentUser(null);
    
    // Clear ALL authentication-related localStorage keys
    const keysToRemove = [
      'currentUser',
      'pmUser', 
      'user',
      'vendorUser',
      'token',
      'pmToken',
      'authToken',
      'vendorId',
      'email'
    ];
    
    keysToRemove.forEach(key => {
      localStorage.removeItem(key);
      console.log(`UserContext: Removed ${key} from localStorage`);
    });
    
    console.log("UserContext: User logged out, all data cleared");
  };

  return (
    <UserContext.Provider value={{ currentUser, setCurrentUser: setUser, logout }}>
      {children}
    </UserContext.Provider>
  );
}

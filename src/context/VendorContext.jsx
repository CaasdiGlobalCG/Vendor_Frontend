import React, { createContext, useState, useEffect } from "react";

export const VendorContext = createContext();

// Define initial data with proper structure to avoid undefined properties
const initialData = {
  vendorDetails: {},
  companyDetails: {},
  serviceProductDetails: {},
  bankDetails: {},
  complianceCertifications: {},
  additionalDetails: {},
};

export const VendorProvider = ({ children }) => {
  // Initialize currentUser from localStorage
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem('currentUser');
      const parsedUser = savedUser ? JSON.parse(savedUser) : null;
      console.log("VendorContext - Loaded user from localStorage:", parsedUser);
      return parsedUser;
    } catch (error) {
      console.error("Error loading user from localStorage:", error);
      return null;
    }
  });
  const [vendorData, setVendorData] = useState(initialData);

  // Debug effect to log when currentUser changes
  useEffect(() => {
    console.log("VendorContext - Current user updated:", currentUser);
  }, [currentUser]);

  // Set current user and reset vendor data if needed
  const setUser = (user) => {
    console.log("VendorContext: Setting new user:", user);
    
    // Clear previous user data if changing users (check by email since that's our primary identifier)
    if (currentUser && (!user || currentUser.email !== user.email)) {
      console.log("VendorContext: Resetting vendor data for new user");
      setVendorData(initialData);
    }
    
    // Set the new user
    setCurrentUser(user);
    
    // Save user to localStorage
    if (user) {
      try {
        localStorage.setItem('currentUser', JSON.stringify(user));
        console.log("VendorContext - Saved user to localStorage");
      } catch (error) {
        console.error("Error saving user to localStorage:", error);
      }
    }
  };

  // Logout function to clear all user data
  const logout = () => {
    console.log("VendorContext: Logging out user");
    
    // Reset state
    setCurrentUser(null);
    setVendorData(initialData);
    
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
      console.log(`VendorContext: Removed ${key} from localStorage`);
    });
    
    console.log("VendorContext: User logged out, all data cleared");
  };

  return (
    <VendorContext.Provider value={{ 
      vendorData, 
      setVendorData,
      currentUser,
      setUser,
      logout
    }}>
      {children}
    </VendorContext.Provider>
  );
};

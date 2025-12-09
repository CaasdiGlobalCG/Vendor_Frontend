import React, { useState, useEffect, useContext } from 'react';
import { Mail, MapPin, Phone, BuildingIcon as LucideBuildingIcon } from 'lucide-react'; // Renamed to avoid conflict if a local BuildingIcon is passed
import { UserContext } from '../../context/UserContext';
import { VendorContext } from '../../context/VendorContext';
import config from '../../config/env';

// Default BuildingIcon (can be overridden by prop if needed)
const DefaultBuildingIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 22V2a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v20"></path>
        <path d="M2 22h20"></path>
        <path d="M12 13H6.5"></path>
        <path d="M12 18H6.5"></path>
        <path d="M12 8H6.5"></path>
        <path d="M17.5 8H22"></path>
        <path d="M17.5 13H22"></path>
        <path d="M17.5 18H22"></path>
    </svg>
);


export default function UserProfileCard({
  profileData: externalProfileData,
  loading: externalLoading,
  error: externalError,
  onEditProfileClick,
  BuildingIconComponent, // Prop to allow passing a custom BuildingIcon
  vendorId: propVendorId // New prop to allow fetching data by vendorId
}) {
  const BuildingIcon = BuildingIconComponent || LucideBuildingIcon; // Use passed component or default Lucide one
  
  // Get user data from both contexts
  const { currentUser, setCurrentUser } = useContext(UserContext);
  const { currentUser: vendorUser } = useContext(VendorContext);
  
  const vendorId = propVendorId || currentUser?.vendorId || vendorUser?.vendorId;
  const userEmail = currentUser?.email || vendorUser?.email;
  
  // Internal state to handle data fetching
  const [internalProfileData, setInternalProfileData] = useState(null);
  const [internalLoading, setInternalLoading] = useState(false);
  const [internalError, setInternalError] = useState(null);
  const [fetchAttempted, setFetchAttempted] = useState(false);
  const [fetchMethod, setFetchMethod] = useState(null); // 'id' or 'email'
  const [attemptedVendorIdFetch, setAttemptedVendorIdFetch] = useState(false);
  const [delayedFetchStarted, setDelayedFetchStarted] = useState(false);
  
  // Determine whether to use external or internal data
  const profileData = externalProfileData || internalProfileData;
  const loading = externalLoading || internalLoading;
  const error = externalError || internalError;

  // Debug logging
  useEffect(() => {
    console.log("UserProfileCard - Initialization");
    console.log("UserProfileCard - VendorId from props:", propVendorId);
    console.log("UserProfileCard - UserContext data:", currentUser);
    console.log("UserProfileCard - VendorContext data:", vendorUser);
    console.log("UserProfileCard - Using vendorId:", vendorId);
    console.log("UserProfileCard - Using email:", userEmail);
  }, [propVendorId, currentUser, vendorUser, vendorId, userEmail]);

  // Initial attempt to load current user if none exists
  useEffect(() => {
    const attemptUserRecovery = async () => {
      // Skip if we already have a current user with email in either context
      if ((currentUser && currentUser.email) || (vendorUser && vendorUser.email)) {
        console.log("UserProfileCard - User already exists in context:", 
          currentUser?.email ? "UserContext" : "VendorContext");
        return;
      }

      console.log("UserProfileCard - Attempting to recover user from localStorage");
      try {
        // Try to get user from localStorage
        const savedUser = localStorage.getItem('currentUser');
        if (savedUser) {
          const parsedUser = JSON.parse(savedUser);
          console.log("UserProfileCard - Recovered user from localStorage:", parsedUser);
          if (parsedUser && parsedUser.email) {
            setCurrentUser(parsedUser);
          }
        } else {
          console.log("UserProfileCard - No user found in localStorage");
        }
      } catch (error) {
        console.error("UserProfileCard - Error recovering user:", error);
      }
    };
    
    attemptUserRecovery();
  }, [currentUser, vendorUser, setCurrentUser]);

  // Set up a delayed fetch to make sure contexts are fully initialized
  useEffect(() => {
    if (delayedFetchStarted || fetchMethod) {
      return; // Don't set up another delayed fetch if one has already started or we have a fetch method
    }

    console.log("UserProfileCard - Setting up delayed fetch");
    setDelayedFetchStarted(true);
    
    // Add delay to ensure contexts are fully loaded
    const timer = setTimeout(() => {
      console.log("UserProfileCard - Delayed fetch timer triggered");
      
      // If we have a vendorId, use that
      if (vendorId) {
        console.log("UserProfileCard - Using vendorId for fetch method:", vendorId);
        setFetchMethod('id');
      } 
      // Otherwise if we have an email, use that
      else if (userEmail) {
        console.log("UserProfileCard - Using email for fetch method:", userEmail);
        setFetchMethod('email');
      }
      // In case neither is available, try one more recovery attempt
      else {
        console.log("UserProfileCard - No user identifier available after delay, checking localStorage again");
        try {
          const savedUser = localStorage.getItem('currentUser');
          if (savedUser) {
            const parsedUser = JSON.parse(savedUser);
            if (parsedUser?.email) {
              console.log("UserProfileCard - Found email in localStorage, using for fetch:", parsedUser.email);
              setFetchMethod('email');
            } else if (parsedUser?.vendorId) {
              console.log("UserProfileCard - Found vendorId in localStorage, using for fetch:", parsedUser.vendorId);
              setFetchMethod('id');
            }
          }
        } catch (error) {
          console.error("UserProfileCard - Error in final recovery attempt:", error);
          setInternalError("Failed to identify user. Please try logging in again.");
        }
      }
    }, 600); // Use a slightly longer delay than the Home component
    
    return () => clearTimeout(timer);
  }, [vendorId, userEmail, delayedFetchStarted, fetchMethod]);

  // Step 1: Try to get vendorId if we don't have one but have email
  useEffect(() => {
    const getVendorIdFromEmail = async () => {
      // Skip if we already have vendorId or don't have email or have already attempted this fetch
      if (vendorId || !userEmail || fetchMethod !== 'email' || attemptedVendorIdFetch) {
        return;
      }
      
      try {
        console.log("UserProfileCard - Attempting to get vendorId from email:", userEmail);
        setInternalLoading(true);
        setAttemptedVendorIdFetch(true);
        
        // First, get the vendor by email to find the correct vendorId
        const response = await fetch(`${config.VENDOR_BACKEND_URL}/api/vendor/vendor-by-email?email=${encodeURIComponent(userEmail)}`);
        
        if (!response.ok) {
          throw new Error(`Server responded with status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log("UserProfileCard - Email lookup response:", data);
        
        if (data.success && data.data) {
          // Get the vendorId from the response
          const foundVendorId = data.data.vendorId || data.data.id || data.data._id;
          console.log("UserProfileCard - Found vendorId from email:", foundVendorId);
          
          if (foundVendorId) {
            // Update the currentUser with the found vendorId
            const updatedUser = {
              ...currentUser,
              vendorId: foundVendorId
            };
            setCurrentUser(updatedUser);
            
            // Also update localStorage
            localStorage.setItem('currentUser', JSON.stringify(updatedUser));
            
            console.log("UserProfileCard - Updated currentUser with vendorId:", foundVendorId);
            
            // Set fetch method to 'id' to trigger the next fetch with the found ID
            setFetchMethod('id');
          } else {
            // Keep email-based fetch
            console.log("UserProfileCard - No vendorId found in response, using email directly");
          }
        }
        
        setInternalLoading(false);
      } catch (error) {
        console.error('UserProfileCard - Error getting vendorId from email:', error);
        setInternalLoading(false);
      }
    };
    
    getVendorIdFromEmail();
  }, [userEmail, vendorId, currentUser, setCurrentUser, fetchMethod, attemptedVendorIdFetch]);

  // Step 2: Fetch vendor data using either vendorId or email
  useEffect(() => {
    // Skip if we have external data or have already attempted to fetch
    if (externalProfileData || fetchAttempted) {
      return;
    }
    
    // Skip if we don't have the necessary info yet
    if (!fetchMethod) {
      return;
    }
    
    // Skip if using 'id' method but don't have a vendorId
    if (fetchMethod === 'id' && !vendorId) {
      console.log("UserProfileCard - Fetch method is 'id' but no vendorId available, waiting...");
      return;
    }
    
    // Skip if using 'email' method but don't have an email
    if (fetchMethod === 'email' && !userEmail) {
      console.log("UserProfileCard - Fetch method is 'email' but no email available, waiting...");
      return;
    }
    
    const fetchVendorData = async () => {
      try {
        setInternalLoading(true);
        setFetchAttempted(true);
        
        let url;
        if (fetchMethod === 'id') {
          url = `${config.VENDOR_BACKEND_URL}/api/vendor/vendor/${vendorId}`;
          console.log("UserProfileCard - Fetching data by vendorId:", vendorId);
        } else {
          url = `${config.VENDOR_BACKEND_URL}/api/vendor/vendors?email=${encodeURIComponent(userEmail)}`;
          console.log("UserProfileCard - Fetching data by email:", userEmail);
        }
        
        const response = await fetch(url);
        
        if (!response.ok) {
          throw new Error(`Server responded with status: ${response.status}`);
        }
        
        let vendorDetail;
        if (fetchMethod === 'id') {
          const data = await response.json();
          console.log("UserProfileCard - Vendor detail response by ID:", data);
          vendorDetail = data.data || data;
        } else {
          const data = await response.json();
          console.log("UserProfileCard - Vendor detail response by email:", data);
          vendorDetail = data.success && data.data && data.data.length > 0 ? data.data[0] : null;
        }
        
        if (vendorDetail) {
          // If we fetched by email and found a vendorId, update the user context
          if (fetchMethod === 'email' && currentUser && !currentUser.vendorId && (vendorDetail.id || vendorDetail._id || vendorDetail.vendorId)) {
            const foundVendorId = vendorDetail.vendorId || vendorDetail.id || vendorDetail._id;
            const updatedUser = {
              ...currentUser,
              vendorId: foundVendorId
            };
            
            setCurrentUser(updatedUser);
            
            // Also update localStorage
            localStorage.setItem('currentUser', JSON.stringify(updatedUser));
            
            console.log("UserProfileCard - Updated currentUser with vendorId from email fetch:", foundVendorId);
          }
          
          // Format the data for the profile card
          const vendorDetails = vendorDetail.vendorDetails || {};
          const companyDetails = vendorDetail.companyDetails || {};
          
          setInternalProfileData({
            vendorId: vendorDetail.vendorId || vendorDetail.id || vendorDetail._id,
            name: vendorDetails.primaryContactName || vendorDetail.name || '',
            companyName: companyDetails.companyName || vendorDetails.companyName || '',
            phone: vendorDetails.primaryContactPhone || vendorDetails.phoneNumber || '',
            location: companyDetails.city && companyDetails.country 
              ? `${companyDetails.city}, ${companyDetails.country}` 
              : companyDetails.state && companyDetails.country 
                ? `${companyDetails.state}, ${companyDetails.country}`
                : companyDetails.country || companyDetails.state || '',
            email: vendorDetails.primaryContactEmail || vendorDetail.email || userEmail || '',
            image: vendorDetail.profileImage || 'https://images.app.goo.gl/DWEbTsdssMENZXe27'
          });
          
          console.log("UserProfileCard - Profile data set successfully");
        } else {
          console.log("UserProfileCard - No vendor details found in response");
          setInternalError("No vendor profile data found");
        }
        
        setInternalLoading(false);
      } catch (error) {
        console.error('UserProfileCard - Error fetching vendor data:', error);
        setInternalError(`Failed to fetch vendor data: ${error.message}`);
        setInternalLoading(false);
      }
    };
    
    fetchVendorData();
  }, [externalProfileData, fetchAttempted, fetchMethod, vendorId, userEmail, currentUser, setCurrentUser]);

  if (loading) {
    return (
      <section className="w-full lg:w-1/3 min-w-[300px] max-w-[350px] bg-white rounded-lg shadow-md p-4 lg:sticky lg:top-8">
        <div className="flex flex-col items-center justify-center h-64 w-full">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-700"></div>
          <p className="mt-4 text-gray-600">Loading profile...</p>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="w-full lg:w-1/3 min-w-[300px] max-w-[350px] bg-white rounded-lg shadow-md p-4 lg:sticky lg:top-8">
        <div className="flex flex-col items-center justify-center h-64 w-full">
          <div className="text-red-500 mb-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <p className="text-center text-red-600">{typeof error === 'string' ? error : 'Failed to load profile.'}</p>
          <button 
            onClick={() => {
              setFetchAttempted(false);
              setFetchMethod(null);
              setAttemptedVendorIdFetch(false);
              setInternalError(null);
            }} 
            className="mt-4 px-4 py-2 bg-emerald-700 text-white rounded-md hover:bg-emerald-800"
          >
            Retry
          </button>
        </div>
      </section>
    );
  }

  if (!profileData) {
    return (
      <section className="w-full lg:w-1/3 min-w-[300px] max-w-[350px] bg-white rounded-lg shadow-md p-4 lg:sticky lg:top-8">
        <div className="flex flex-col items-center justify-center h-64 w-full">
          <p className="text-center text-gray-600 mb-4">No profile data available.</p>
          {!vendorId && !userEmail && (
            <p className="text-center text-red-600 text-sm mb-4">No Vendor ID or email found.</p>
          )}
          {!vendorId && userEmail && (
            <p className="text-center text-amber-600 text-sm mb-4">Using email to fetch profile data.</p>
          )}
          <button 
            onClick={() => {
              setFetchAttempted(false);
              setFetchMethod(null);
              setAttemptedVendorIdFetch(false);
              setInternalError(null);
            }}
            className="px-4 py-2 bg-emerald-700 text-white rounded-md hover:bg-emerald-800"
          >
            Retry
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="w-full lg:w-1/3 min-w-[300px] max-w-[350px] bg-white rounded-lg shadow-md p-4 lg:sticky lg:top-8">
      <div className="flex flex-col items-center w-full">
        <div className="relative w-28 h-28 lg:w-32 lg:h-32 mb-2 -mt-16">
          <img
            src={profileData.image}
            alt={profileData.name}
            className="absolute top-0 rounded-full object-cover border-6 border-white w-full h-full"
            onError={(e) => { e.target.onerror = null; e.target.src = "https://images.app.goo.gl/DWEbTsdssMENZXe27"; }} // Generic placeholder
            style={profileData.imageStyle || {}} // Allow passing custom styles for image if needed
          />
        </div>
        <h1 className="text-xl lg:text-2xl font-bold text-gray-800 mt-2 text-center">
          {profileData.vendorId || 'Vendor'}
        </h1>
        <p className="text-gray-500 mb-3 text-center text-base">
          {profileData.name}
        </p>
        
        <div className="w-full space-y-2 mt-2 text-left">
          <div className="flex items-start gap-2">
            <div className="w-5 flex-shrink-0 text-gray-700 pt-1"><BuildingIcon className="h-5 w-5" /></div>
            <div><p className="text-sm text-gray-500 leading-tight">Company name</p><p className="font-medium text-base">{profileData.companyName}</p></div>
          </div>
          <div className="flex items-start gap-2">
            <div className="w-5 flex-shrink-0 text-gray-700 pt-1"><Phone className="h-5 w-5" /></div>
            <div><p className="text-sm text-gray-500 leading-tight">Phone</p><p className="font-medium text-base">{profileData.phone}</p></div>
          </div>
          <div className="flex items-start gap-2">
            <div className="w-5 flex-shrink-0 text-gray-700 pt-1"><MapPin className="h-5 w-5" /></div>
            <div><p className="text-sm text-gray-500 leading-tight">Location</p><p className="font-medium text-base">{profileData.location}</p></div>
          </div>
          <div className="flex items-start gap-2">
            <div className="w-5 flex-shrink-0 text-gray-700 pt-1"><Mail className="h-5 w-5" /></div>
            <div><p className="text-sm text-gray-500 leading-tight">Email</p><p className="font-medium text-base">{profileData.email}</p></div>
          </div>
        </div>
        
        <button
          onClick={onEditProfileClick}
          className="w-full mt-4 bg-gradient-to-l from-[#095B49] to-[#000000] text-white py-2 px-4 rounded-md hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition-opacity text-base"
        >
          Edit Profile
        </button>
      </div>
    </section>
  );
}

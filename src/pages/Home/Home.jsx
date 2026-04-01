import React from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { Link } from "react-router-dom";
import { useState, useEffect, useContext } from "react";
import {
    Mail, Award, Share2, BuildingIcon, MapPin, Phone, ChevronDown, Eye, Download, Settings, Edit,
    Upload, // Added Upload icon for certification uploads
    X as CloseIcon // Use X as CloseIcon for modal close
} from "lucide-react";
import { VendorContext } from "../../context/VendorContext";
import { UserContext } from "../../context/UserContext";
// Use a relative path or import from assets folder
import profileplaceholder from '../../assets/profileplaceholder.jpg' // Adjust the path as necessary
import AppHeader from "../../components/AppHeader/Appheader";
import { useLocation } from 'react-router-dom'; // Added useLocation
import UserProfileCard from '../../components/UserProfileCard/UserProfileCard'; // Import the new component
import VendorTabPanel from '../../components/layout/VendorTabPanel';
import config from '../../config/env';

export default function CompanyProfile() {
  const navigate = useNavigate();
  const { currentUser } = useContext(UserContext);
  const { currentUser: vendorUser, vendorData, setVendorData } = useContext(VendorContext);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dataFetched, setDataFetched] = useState(false);
  const location = useLocation(); // Added useLocation

  const navigateTo = (path) => {
    navigate(path);
  };

  // Profile modal state
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [profileData, setProfileData] = useState({
      name: currentUser?.name || vendorUser?.name || 'Loading...',
      vendorId: '#Loading',
      image: profileplaceholder,
      companyName: 'Loading...',
      phone: 'Loading...',
      location: 'Loading...',
      email: currentUser?.email || vendorUser?.email || 'Loading...',
      gstNumber: '',
      panNumber: '',
  });
  const [profileFormData, setProfileFormData] = useState({ ...profileData });
  const [imagePreview, setImagePreview] = useState(profileData.image);
  const [selectedCountry, setSelectedCountry] = useState('');
  const [states, setStates] = useState([]);
  const [selectedState, setSelectedState] = useState('');
  const [phoneCountryCode, setPhoneCountryCode] = useState('');
  const [phoneNumberWithoutCode, setPhoneNumberWithoutCode] = useState('');
  
  // Company modal state
  const [isCompanyModalOpen, setIsCompanyModalOpen] = useState(false);
  const [companyFormData, setCompanyFormData] = useState({
    industryType: '',
    segments: [],
    yearOfEstablishment: '',
    visionAndMission: '',
    companyOverview: '',
    industryOverview: '',
    coreValues: [],
    certifications: [],
    teamSize: '',
    uniqueSellingProposition: '',
    socialImpact: ''
  });
  const [newSegment, setNewSegment] = useState('');
  const [newCoreValue, setNewCoreValue] = useState('');
  const [certificationFiles, setCertificationFiles] = useState([]);
  const [saving, setSaving] = useState(false);
  const [companyError, setCompanyError] = useState(null);
  const [companySuccessMessage, setCompanySuccessMessage] = useState("");
  
  // First useEffect just to log context values
  useEffect(() => {
    console.log("Home Component - Current User Context:", currentUser);
    console.log("Home Component - Vendor User Context:", vendorUser);
  }, [currentUser, vendorUser]);

  // Do not recover identity from localStorage; VendorContext hydrates from backend.

  // Fetch vendor data from backend with a delay to ensure context is properly initialized
  useEffect(() => {
    // Skip if we've already fetched data
    if (dataFetched) {
      return;
    }
    
    // Define the fetch function
    const fetchVendorData = async () => {
      try {
        setLoading(true);

        const token = localStorage.getItem('authToken');
        const response = await fetch(`${config.VENDOR_BACKEND_URL}/api/vendor/me`, {
          credentials: 'include',
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        
        if (!response.ok) {
          throw new Error(`Server responded with status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log("Vendor data response:", data);
        
        if (data.success && data.data) {
          const vendor = data.data;
          
          // Prepare profile data first
          const newProfileData = {
            name: vendor.vendorDetails?.primaryContactName || currentUser?.name || vendorUser?.name || '',
            vendorId: `#${vendor._id.substring(0, 6)}` || '#CXV001',
            image: vendor.profileImage?.url || profileplaceholder,
            companyName: vendor.companyDetails?.companyName || vendor.vendorDetails?.companyName || '',
            phone: vendor.vendorDetails?.primaryContactPhone || '',
            location: `${vendor.companyDetails?.state || ''}, ${vendor.companyDetails?.country || ''}`,
            email: vendor.vendorDetails?.primaryContactEmail || vendor.email || currentUser?.email || vendorUser?.email || '',
            gstNumber: vendor.companyDetails?.gstNumber || '',
            panNumber: vendor.companyDetails?.panNumber || '',
          };
          
          // Set profile data immediately
          setProfileData(newProfileData);
          
          // Update the vendor data in context
          setVendorData({
            vendorDetails: vendor.vendorDetails || {},
            companyDetails: vendor.companyDetails || {},
            serviceProductDetails: vendor.serviceProductDetails || {},
            bankDetails: vendor.bankDetails || {},
            complianceCertifications: vendor.complianceCertifications || {},
            additionalDetails: vendor.additionalDetails || {}
          });
          
          // Set company form data
          setCompanyFormData({
            industryType: vendor.companyDetails?.industryType || '',
            segments: vendor.companyDetails?.segments || [],
            yearOfEstablishment: vendor.companyDetails?.yearOfEstablishment || '',
            visionAndMission: vendor.companyDetails?.visionAndMission || '',
            companyOverview: vendor.companyDetails?.companyOverview || '',
            industryOverview: vendor.companyDetails?.industryOverview || '',
            coreValues: vendor.companyDetails?.coreValues || [],
            certifications: vendor.companyDetails?.certifications || [],
            teamSize: vendor.companyDetails?.teamSize || '',
            uniqueSellingProposition: vendor.companyDetails?.uniqueSellingProposition || '',
            socialImpact: vendor.companyDetails?.socialImpact || ''
          });

          setDataFetched(true);
        } else {
          setError("No vendor data found");
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Error fetching vendor data:', error);
        setError("Failed to fetch vendor data");
        setLoading(false);
      }
    };
    
    // Add a small delay to ensure context is properly initialized
    const timer = setTimeout(() => {
      console.log("Home Component - Executing delayed data fetch");
      fetchVendorData();
    }, 500);
    
    return () => clearTimeout(timer);
  }, [currentUser, vendorUser, profileData.email, dataFetched]);

    const countryCodes = [
      { code: '+1', country: 'USA' },
      { code: '+44', country: 'UK' },
      { code: '+91', country: 'India' },
      { code: '+81', country: 'Japan' },
      // Add more country codes as needed
  ];
  
  const countryStateData = {
      'USA': ['California', 'New York', 'Texas'],
      'UK': ['London', 'Manchester', 'Birmingham'],
      'India': ['Karnataka', 'Maharashtra', 'Delhi'],
      'Japan': ['Tokyo', 'Osaka', 'Kyoto'],
      // Add more countries and their states
  };

    // Manage body overflow when modals are open
  useEffect(() => {
    if (isProfileModalOpen || isCompanyModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isProfileModalOpen, isCompanyModalOpen]);

  // Setup form data when modal opens
    useEffect(() => {
      if (isProfileModalOpen) {
          // First, update the form data from profile data
          setProfileFormData({...profileData});
          
          // Parse location into country and state
          const locationParts = profileData.location.split(', ');
          if (locationParts.length === 2) {
            // The format is "State, Country"
            const state = locationParts[0];
            const country = locationParts[1];
            
            setSelectedCountry(country || '');
            setSelectedState(state || '');
            setStates(countryStateData[country] || []);
            
            console.log(`Parsed location: State=${state}, Country=${country}`);
          } else {
            setSelectedCountry('');
            setSelectedState('');
            console.log('Could not parse location properly:', profileData.location);
          }

          // Parse phone into country code and number
          const phoneParts = profileData.phone.split(' ');
          if (phoneParts.length >= 1) {
            const [code, ...numberParts] = phoneParts;
            setPhoneCountryCode(code || '');
            setPhoneNumberWithoutCode(numberParts.join(' ') || '');
            
            console.log(`Parsed phone: Code=${code}, Number=${numberParts.join(' ')}`);
          } else {
            setPhoneCountryCode('');
            setPhoneNumberWithoutCode('');
            console.log('Could not parse phone properly:', profileData.phone);
          }
          
          setImagePreview(profileData.image);
      }
  }, [isProfileModalOpen, profileData]);

  useEffect(() => {
      const isObjectURL = typeof imagePreview === 'string' && imagePreview.startsWith('blob:');
      return () => {
          if (isObjectURL) {
              URL.revokeObjectURL(imagePreview);
          }
      };
  }, [imagePreview]);

  const handleProfileEditClick = () => {
    setIsProfileModalOpen(true);
};

const handleProfileCloseModal = () => {
    setIsProfileModalOpen(false);
};

const handleProfileInputChange = (e) => {
    const { name, value } = e.target;
    setProfileFormData(prevData => {
        // Only update if the value has actually changed
        if (prevData[name] !== value) {
            return { ...prevData, [name]: value };
        }
        return prevData;
    });
};

const handleProfileFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
        const previewUrl = URL.createObjectURL(file);
        if (typeof imagePreview === 'string' && imagePreview.startsWith('blob:')) {
            URL.revokeObjectURL(imagePreview);
        }
        setImagePreview(previewUrl);
        setProfileFormData((prevData) => ({ ...prevData, imageFile: file, imageUrl: previewUrl }));
    }
};

const handleProfileSave = async () => {
    try {
        // Construct the updated location and phone
        // Make sure both state and country are provided
        if (!selectedState || !selectedCountry) {
            alert("Please select both state and country");
            return;
        }
        
        const updatedLocation = `${selectedState}, ${selectedCountry}`;
        const updatedPhone = `${phoneCountryCode} ${phoneNumberWithoutCode}`;
        
        console.log("Saving with location:", updatedLocation);
        
        // Create a new object with the updated data
        const dataToSave = { 
            ...profileFormData, 
            location: updatedLocation, 
            phone: updatedPhone 
        };
        
        // Remove the imageFile property if it exists
        if (dataToSave.imageFile) {
            delete dataToSave.imageFile;
        }
        
        // Update local state first for immediate UI feedback
        setProfileData(dataToSave);
        
        // Prepare data for backend
        const vendorUpdateData = {
            vendorDetails: {
                ...vendorData.vendorDetails,
                primaryContactName: dataToSave.name,
                primaryContactPhone: updatedPhone,
                primaryContactEmail: dataToSave.email,
                companyName: dataToSave.companyName,
                // Add location to vendorDetails as well to ensure it's updated
                location: updatedLocation
            },
            companyDetails: {
                ...vendorData.companyDetails,
                companyName: dataToSave.companyName,
                country: selectedCountry,
                state: selectedState
            }
        };
        
        console.log("Updating vendor data:", vendorUpdateData);
        
        // Create FormData object for the API call
        const formData = new FormData();
        formData.append('vendorDetails', JSON.stringify(vendorUpdateData.vendorDetails));
        formData.append('companyDetails', JSON.stringify(vendorUpdateData.companyDetails));
        
        // If there's a new profile image
        if (profileFormData.imageFile) {
            formData.append('profileImage', profileFormData.imageFile);
        }
        
        // Log the data being sent to the backend
        console.log("Sending to backend:", {
            vendorDetails: JSON.parse(formData.get('vendorDetails')),
            companyDetails: JSON.parse(formData.get('companyDetails'))
        });
        
        // Send update to backend
        const response = await fetch(`${config.VENDOR_BACKEND_URL}/api/vendor/update-profile`, {
            method: 'POST',
            headers: {
                // Don't set Content-Type when using FormData
            },
            body: formData
        });
        
        if (!response.ok) {
            throw new Error(`Server responded with status: ${response.status}`);
        }
        
        const result = await response.json();
        console.log("Profile update result:", result);
        
        // Update vendor data in context
        setVendorData({
            ...vendorData,
            vendorDetails: vendorUpdateData.vendorDetails,
            companyDetails: vendorUpdateData.companyDetails
        });
        
        // Update profile image if a new one was uploaded
        if (result.data && result.data.profileImage && result.data.profileImage.url) {
            setProfileData(prevData => ({
                ...prevData,
                image: result.data.profileImage.url
            }));
        }
        
        // Close modal
        setIsProfileModalOpen(false);
        
        // Show success message
        alert("Profile updated successfully!");
    } catch (error) {
        console.error("Error updating profile:", error);
        alert(`Failed to update profile: ${error.message}`);
    }
};

// Company modal handlers
const handleCompanyInputChange = (e) => {
    const { name, value } = e.target;
    setCompanyFormData(prev => ({ ...prev, [name]: value }));
};

// Handle adding a new segment
const handleAddSegment = () => {
    if (newSegment.trim() !== "") {
        setCompanyFormData(prev => ({
            ...prev,
            segments: [...prev.segments, newSegment.trim()]
        }));
        setNewSegment("");
    }
};

// Handle removing a segment
const handleRemoveSegment = (index) => {
    setCompanyFormData(prev => ({
        ...prev,
        segments: prev.segments.filter((_, i) => i !== index)
    }));
};

// Handle adding a new core value
const handleAddCoreValue = () => {
    if (newCoreValue.trim() !== "") {
        setCompanyFormData(prev => ({
            ...prev,
            coreValues: [...prev.coreValues, newCoreValue.trim()]
        }));
        setNewCoreValue("");
    }
};

// Handle removing a core value
const handleRemoveCoreValue = (index) => {
    setCompanyFormData(prev => ({
        ...prev,
        coreValues: prev.coreValues.filter((_, i) => i !== index)
    }));
};

// Handle certification file upload
const handleCertificationUpload = (e) => {
    const files = Array.from(e.target.files);
    setCertificationFiles(prev => [...prev, ...files]);
};

// Handle removing a certification file
const handleRemoveCertificationFile = (index) => {
    setCertificationFiles(prev => prev.filter((_, i) => i !== index));
};

// Function to open company modal with pre-filled data
const handleCompanyEditClick = () => {
    // Pre-fill form data from vendorData
    setCompanyFormData({
        industryType: vendorData.companyDetails?.industryType || '',
        segments: vendorData.companyDetails?.segments || [],
        yearOfEstablishment: vendorData.companyDetails?.yearOfEstablishment || '',
        visionAndMission: vendorData.companyDetails?.visionAndMission || '',
        companyOverview: vendorData.companyDetails?.companyOverview || '',
        industryOverview: vendorData.companyDetails?.industryOverview || '',
        coreValues: vendorData.companyDetails?.coreValues || [],
        certifications: vendorData.companyDetails?.certifications || [],
        teamSize: vendorData.companyDetails?.teamSize || '',
        uniqueSellingProposition: vendorData.companyDetails?.uniqueSellingProposition || '',
        socialImpact: vendorData.companyDetails?.socialImpact || ''
    });
    
    // Reset error and success messages
    setCompanyError(null);
    setCompanySuccessMessage("");
    
    // Open the modal
    setIsCompanyModalOpen(true);
};

// Handle company form submission
const handleCompanySave = async (e) => {
    if (e) e.preventDefault();
    
    try {
        setSaving(true);
        setCompanyError(null);
        
        // Create FormData object for the API call
        const formDataToSend = new FormData();
        
        // Add company details
        formDataToSend.append('companyDetails', JSON.stringify({
            ...companyFormData,
            // Ensure we keep the original industry type
            industryType: vendorData.companyDetails?.industryType || companyFormData.industryType
        }));
        
        // Add certification files
        certificationFiles.forEach(file => {
            formDataToSend.append('certifications', file);
        });
        
        // Add email for identification
        formDataToSend.append('vendorDetails', JSON.stringify({
            primaryContactEmail: currentUser?.email
        }));
        
        // Send update to backend
        const response = await fetch(`${config.VENDOR_BACKEND_URL}/api/vendor/update-company`, {
            method: 'POST',
            body: formDataToSend
        });
        
        if (!response.ok) {
            throw new Error(`Server responded with status: ${response.status}`);
        }
        
        const result = await response.json();
        console.log("Company update result:", result);
        
        // Update vendor data in context
        setVendorData({
            ...vendorData,
            companyDetails: {
                ...vendorData.companyDetails,
                ...companyFormData,
                // Ensure we keep the original industry type
                industryType: vendorData.companyDetails?.industryType || companyFormData.industryType
            }
        });
        
        // Show success message
        setCompanySuccessMessage("Company details updated successfully!");
        
        // Close modal after a delay
        setTimeout(() => {
            setIsCompanyModalOpen(false);
            setCompanySuccessMessage("");
        }, 2000);
    } catch (error) {
        console.error("Error updating company details:", error);
        setCompanyError(`Failed to update company details: ${error.message}`);
    } finally {
        setSaving(false);
    }
};


  return (
    <div className="min-h-screen bg-slate-50 font-sans w-full pb-24">
      {/* Header Banner */}
      <AppHeader />

      <div className="mx-auto mt-4 flex w-full max-w-[1400px] flex-col gap-8 px-4 py-8 md:px-8 lg:flex-row">
        {/* Profile Card */}
        <UserProfileCard
          profileData={profileData}
          loading={loading}
          error={error}
          onEditProfileClick={handleProfileEditClick}
          // BuildingIconComponent will use the default from lucide-react in UserProfileCard
        />

        {/* Company Details */}
        <VendorTabPanel
          title="Company details"
          description="Manage the business information shown across your vendor portfolio."
          actions={(
            <div className="flex items-center gap-2">
              <button className="p-2">
                <Download className="w-5 h-5 text-gray-600" />
              </button>
              <button 
                onClick={handleCompanyEditClick} 
                className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100"
              >
                Edit
              </button>
            </div>
          )}
          bodyClassName="p-6"
        >

          <div className="space-y-4 text-sm">
            <DetailRow 
              title="Industry Type" 
              value={vendorData.companyDetails?.industryType || "Not specified"} 
            />
            <DetailRow 
              title="Segments" 
              value={
                <div className="flex flex-wrap gap-2">
                  {(vendorData.companyDetails?.segments && vendorData.companyDetails.segments.length > 0) ? 
                    vendorData.companyDetails.segments.map((segment) => (
                      <span
                        key={segment}
                        className="bg-gray-100 px-3 py-1 rounded-full text-xs font-medium"
                      >
                        {segment}
                      </span>
                    )) : 
                    <span className="text-gray-400">No segments specified</span>
                  }
                </div>
              } 
            />
            <DetailRow 
              title="Year of establishment" 
              value={vendorData.companyDetails?.yearOfEstablishment || "Not specified"} 
            />
            <DetailRow
              title="Vision and Mission"
              value={vendorData.companyDetails?.visionAndMission || "Not specified"}
            />
            <DetailRow 
              title="Company Overview"
              value={vendorData.companyDetails?.companyOverview || "Not specified"}
            />
            <DetailRow
              title="Industry Overview"
              value={vendorData.companyDetails?.industryOverview || "Not specified"}
            />
            <DetailRow
              title="Core values"
              value={
                <div className="flex flex-wrap gap-2">
                  {(vendorData.companyDetails?.coreValues && vendorData.companyDetails.coreValues.length > 0) ? 
                    vendorData.companyDetails.coreValues.map((value) => (
                      <span
                        key={value}
                        className="bg-gray-100 px-3 py-1 rounded-full text-xs font-medium"
                      >
                        {value}
                      </span>
                    )) : 
                    <span className="text-gray-400">No core values specified</span>
                  }
                </div>
              }
            />
            <DetailRow
              title="Certifications"
              value={
                <div className="flex flex-wrap gap-4">
                  {(vendorData.companyDetails?.certifications && vendorData.companyDetails.certifications.length > 0) ? 
                    vendorData.companyDetails.certifications.map((cert, index) => (
                      <span key={index} className="bg-gray-100 px-3 py-1 rounded text-xs font-medium">
                        {typeof cert === 'string' ? cert : cert.name || `Certification ${index + 1}`}
                      </span>
                    )) : 
                    <span className="text-gray-400">No certifications uploaded</span>
                  }
                </div>
              }
            />
            <DetailRow
              title="Team size"
              value={vendorData.companyDetails?.teamSize || "Not specified"}
            />
            <DetailRow
              title="Unique selling Proposition"
              value={vendorData.companyDetails?.uniqueSellingProposition || "Not specified"}
            />
            <DetailRow
              title="Social Impact/ECG focus"
              value={vendorData.companyDetails?.socialImpact || "Not specified"}
            />
          </div>
        </VendorTabPanel>
  
      {isProfileModalOpen && (
                      <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 sm:p-6">
                          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
                              {/* Modal Header */}
                              <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200 flex-shrink-0 bg-white">
                                  <h2 className="text-xl font-semibold text-gray-800">Edit Profile</h2>
                                  <button onClick={handleProfileCloseModal} className="text-gray-400 hover:text-gray-600 transition-colors">
                                      <CloseIcon size={20} />
                                  </button>
                              </div>
                              {/* Modal Form */}
                              <div className="overflow-y-auto p-6 flex-1 bg-white">
                                  <form onSubmit={(e) => e.preventDefault()} className="space-y-4">
                                  <div className="flex flex-col items-center space-y-3">
                                      <img src={imagePreview} alt="Profile Preview" className="w-32 h-32 rounded-full object-cover border-2 border-gray-300 shadow-sm" onError={(e) => { e.target.onerror = null; e.target.src = "https://via.placeholder.com/160"; }} />
                                      <label htmlFor="profileImage" className="cursor-pointer bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium px-4 py-2 rounded-md transition-colors">Change Image</label>
                                      <input id="profileImage" name="profileImage" type="file" accept="image/png, image/jpeg, image/gif" onChange={handleProfileFileChange} className="hidden" />
                                  </div>
                                  {/* Input Fields */}
                                  <div><label htmlFor="companyName" className="block text-sm font-medium text-gray-700 mb-1">Company Name</label><input type="text" id="companyName" name="companyName" value={profileFormData.companyName} onChange={handleProfileInputChange} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent" /></div>
                                  <div>
                                      <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                                      <div className="flex rounded-md shadow-sm">
                                          <select
                                              value={phoneCountryCode}
                                              onChange={(e) => {
                                                  setPhoneCountryCode(e.target.value);
                                              }}
                                              className="px-3 py-2 border border-gray-300 rounded-l-md focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
                                          >
                                              <option value="">Code</option>
                                              {countryCodes.map(c => (
                                                  <option key={c.code} value={c.code}>{c.code} ({c.country})</option>
                                              ))}
                                          </select>
                                          <input
                                              type="tel"
                                              id="phone"
                                              name="phoneNumber"
                                              value={phoneNumberWithoutCode}
                                              onChange={(e) => {
                                                  setPhoneNumberWithoutCode(e.target.value);
                                              }}
                                              className="flex-1 px-3 py-2 border-t border-b border-r border-gray-300 rounded-r-md shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
                                              placeholder="Phone number"
                                          />
                                      </div>
                                  </div>
                                  <div>
                                      <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                                      <div className="flex rounded-md shadow-sm">
                                          <select
                                              value={selectedCountry}
                                              onChange={(e) => {
                                                  const newCountry = e.target.value;
                                                  setSelectedCountry(newCountry);
                                                  setStates(countryStateData[newCountry] || []);
                                                  setSelectedState('');
                                              }}
                                              className="px-3 py-2 border border-gray-300 rounded-l-md focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
                                          >
                                              <option value="">Country</option>
                                              {Object.keys(countryStateData).map(country => (
                                                  <option key={country} value={country}>{country}</option>
                                              ))}
                                          </select>
                                          <select
                                              value={selectedState}
                                              onChange={(e) => {
                                                  const newState = e.target.value;
                                                  setSelectedState(newState);
                                              }}
                                              className="flex-1 px-3 py-2 border-t border-b border-r border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
                                              disabled={states.length === 0}
                                          >
                                              <option value="">State/Region</option>
                                              {states.map(state => (
                                                  <option key={state} value={state}>{state}</option>
                                              ))}
                                          </select>
                                      </div>
                                  </div>
                                  <div><label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Email</label><input type="email" id="email" name="email" value={profileFormData.email} onChange={handleProfileInputChange} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent" required /></div>
                                  {/* Action Buttons */}
                                  <div className="flex justify-end gap-3 pt-6 border-t mt-6 border-gray-200">
                                      <button type="button" onClick={handleProfileCloseModal} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400 transition-colors">Cancel</button>
                                      <button type="button" onClick={handleProfileSave} className="px-4 py-2 bg-gradient-to-l from-[#095B49] to-[#000000] text-white rounded-md hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition-opacity">Save Changes</button>
                                  </div>
                              </form>
                              </div>
                          </div>
                      </div>
                  )}
                  
      {/* Company Edit Modal */}
      {isCompanyModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 sm:p-6">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200 flex-shrink-0 bg-white">
              <h2 className="text-xl font-semibold text-gray-800">Edit Company Details</h2>
              <button onClick={() => setIsCompanyModalOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                <CloseIcon size={20} />
              </button>
            </div>
            
            <div className="overflow-y-auto flex-1 p-6 bg-white">
            {companyError && (
              <div className="mb-6 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                <p>{companyError}</p>
              </div>
            )}
            
            {companySuccessMessage && (
              <div className="mb-6 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
                <p>{companySuccessMessage}</p>
              </div>
            )}
            
            <form onSubmit={handleCompanySave} className="space-y-6">
              {/* Industry Type - Read-only */}
              <div>
                <label htmlFor="industryType" className="block text-sm font-medium text-gray-700 mb-1">
                  Industry Type
                </label>
                <input
                  type="text"
                  id="industryType"
                  name="industryType"
                  value={companyFormData.industryType || "Not specified"}
                  readOnly
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-100 text-gray-700 cursor-not-allowed"
                />
                <p className="mt-1 text-xs text-gray-500">Industry type cannot be changed</p>
              </div>

              {/* Segments */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Segments
                </label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {companyFormData.segments.map((segment, index) => (
                    <div key={index} className="bg-gray-100 px-3 py-1 rounded-full text-sm font-medium flex items-center">
                      <span>{segment}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveSegment(index)}
                        className="ml-2 text-gray-500 hover:text-red-500"
                      >
                        <CloseIcon size={14} />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="flex">
                  <input
                    type="text"
                    value={newSegment}
                    onChange={(e) => setNewSegment(e.target.value)}
                    placeholder="Add a segment"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-l-md shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  />
                  <button
                    type="button"
                    onClick={handleAddSegment}
                    className="bg-emerald-800 text-white px-4 py-2 rounded-r-md hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
                  >
                    Add
                  </button>
                </div>
              </div>

              {/* Year of Establishment */}
              <div>
                <label htmlFor="yearOfEstablishment" className="block text-sm font-medium text-gray-700 mb-1">
                  Year of Establishment
                </label>
                <input
                  type="text"
                  id="yearOfEstablishment"
                  name="yearOfEstablishment"
                  value={companyFormData.yearOfEstablishment}
                  onChange={handleCompanyInputChange}
                  placeholder="e.g., 25th March, 1990"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
              </div>

              {/* Vision and Mission */}
              <div>
                <label htmlFor="visionAndMission" className="block text-sm font-medium text-gray-700 mb-1">
                  Vision and Mission
                </label>
                <textarea
                  id="visionAndMission"
                  name="visionAndMission"
                  value={companyFormData.visionAndMission}
                  onChange={handleCompanyInputChange}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  placeholder="Describe your company's vision and mission"
                />
              </div>

              {/* Company Overview */}
              <div>
                <label htmlFor="companyOverview" className="block text-sm font-medium text-gray-700 mb-1">
                  Company Overview
                </label>
                <textarea
                  id="companyOverview"
                  name="companyOverview"
                  value={companyFormData.companyOverview}
                  onChange={handleCompanyInputChange}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  placeholder="Provide an overview of your company"
                />
              </div>
              
              {/* Industry Overview */}
              <div>
                <label htmlFor="industryOverview" className="block text-sm font-medium text-gray-700 mb-1">
                  Industry Overview
                </label>
                <textarea
                  id="industryOverview"
                  name="industryOverview"
                  value={companyFormData.industryOverview}
                  onChange={handleCompanyInputChange}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  placeholder="Provide an overview of your industry"
                />
              </div>

              {/* Core Values */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Core Values
                </label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {companyFormData.coreValues.map((value, index) => (
                    <div key={index} className="bg-gray-100 px-3 py-1 rounded-full text-sm font-medium flex items-center">
                      <span>{value}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveCoreValue(index)}
                        className="ml-2 text-gray-500 hover:text-red-500"
                      >
                        <CloseIcon size={14} />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="flex">
                  <input
                    type="text"
                    value={newCoreValue}
                    onChange={(e) => setNewCoreValue(e.target.value)}
                    placeholder="Add a core value"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-l-md shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  />
                  <button
                    type="button"
                    onClick={handleAddCoreValue}
                    className="bg-emerald-800 text-white px-4 py-2 rounded-r-md hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
                  >
                    Add
                  </button>
                </div>
              </div>
              
              {/* Certifications */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Certifications
                </label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {companyFormData.certifications && companyFormData.certifications.map((cert, index) => (
                    <div key={index} className="bg-gray-100 px-3 py-1 rounded-full text-sm font-medium">
                      {cert.name || "Certificate"}
                    </div>
                  ))}
                  {certificationFiles && certificationFiles.map((file, index) => (
                    <div key={`new-${index}`} className="bg-emerald-100 px-3 py-1 rounded-full text-sm font-medium flex items-center">
                      <span>{file.name}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveCertificationFile(index)}
                        className="ml-2 text-gray-500 hover:text-red-500"
                      >
                        <CloseIcon size={14} />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="mt-2">
                  <label htmlFor="certifications" className="cursor-pointer bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium px-4 py-2 rounded-md transition-colors flex items-center w-fit">
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Certifications
                    <input
                      id="certifications"
                      type="file"
                      multiple
                      onChange={handleCertificationUpload}
                      className="hidden"
                      accept=".pdf,.jpg,.jpeg,.png"
                    />
                  </label>
                  <p className="text-xs text-gray-500 mt-1">Upload certification documents (PDF, JPG, PNG)</p>
                </div>
              </div>

              {/* Team Size */}
              <div>
                <label htmlFor="teamSize" className="block text-sm font-medium text-gray-700 mb-1">
                  Team Size
                </label>
                <textarea
                  id="teamSize"
                  name="teamSize"
                  value={companyFormData.teamSize}
                  onChange={handleCompanyInputChange}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  placeholder="Describe your team size and global presence"
                />
              </div>

              {/* Unique Selling Proposition */}
              <div>
                <label htmlFor="uniqueSellingProposition" className="block text-sm font-medium text-gray-700 mb-1">
                  Unique Selling Proposition
                </label>
                <textarea
                  id="uniqueSellingProposition"
                  name="uniqueSellingProposition"
                  value={companyFormData.uniqueSellingProposition}
                  onChange={handleCompanyInputChange}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  placeholder="What makes your company unique?"
                />
              </div>
              
              {/* Social Impact */}
              <div>
                <label htmlFor="socialImpact" className="block text-sm font-medium text-gray-700 mb-1">
                  Social Impact/ECG Focus
                </label>
                <textarea
                  id="socialImpact"
                  name="socialImpact"
                  value={companyFormData.socialImpact}
                  onChange={handleCompanyInputChange}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  placeholder="Describe your company's social impact initiatives"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-6 border-t mt-6 border-gray-200">
                <button 
                  type="button" 
                  onClick={() => setIsCompanyModalOpen(false)} 
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400 transition-colors"
                  disabled={saving}
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-4 py-2 bg-gradient-to-l from-[#095B49] to-[#000000] text-white rounded-md hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition-opacity flex items-center"
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                      Saving...
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </button>
              </div>
            </form>
            </div>
          </div>
        </div>
      )}

    </div>
  </div>
    
  );
}

// DetailRow helper
const DetailRow = ({ title, value }) => (
  <div className="border-t pt-4">
    <p className="text-gray-500 font-semibold mb-1 text-base">{title}</p>
    <div className="text-gray-700 whitespace-pre-line text-base">{value}</div>
  </div>
);
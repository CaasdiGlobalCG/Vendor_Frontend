import React from "react";
import { useState, useEffect, useContext } from "react";
import { Link } from "react-router-dom";
import {
    Mail, Award, Share2, BuildingIcon, MapPin, Phone, ChevronDown, Eye, Download, Settings, Edit,
    X as CloseIcon // Use X as CloseIcon for modal close
} from "lucide-react";
import { VendorContext } from "../../context/VendorContext";
import config from '../../config/env';

// Use a placeholder image that's accessible
const profilePlaceholder = "https://via.placeholder.com/160";

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

export const Profile = () => {
    const { currentUser, vendorData } = useContext(VendorContext);
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
    
    // Initialize profile data from context
    const [profileData, setProfileData] = useState({
        name: vendorData?.vendorDetails?.primaryContactName || currentUser?.name || 'User',
        vendorId: currentUser?.vendorId || '#N/A',
        image: profilePlaceholder,
        companyName: vendorData?.companyDetails?.companyName || vendorData?.vendorDetails?.companyName || 'Company',
        phone: vendorData?.vendorDetails?.phoneNumber || '+1 000-000-0000',
        location: `${vendorData?.companyDetails?.state || 'State'}, ${vendorData?.companyDetails?.country || 'Country'}`,
        email: vendorData?.vendorDetails?.primaryContactEmail || currentUser?.email || 'email@example.com',
    });
    
    // Update profile data when vendorData or currentUser changes
    useEffect(() => {
        if (vendorData || currentUser) {
            setProfileData({
                name: vendorData?.vendorDetails?.primaryContactName || currentUser?.name || 'User',
                vendorId: currentUser?.vendorId || '#N/A',
                image: vendorData?.profileImage?.url || profilePlaceholder,
                companyName: vendorData?.companyDetails?.companyName || vendorData?.vendorDetails?.companyName || 'Company',
                phone: vendorData?.vendorDetails?.phoneNumber || '+1 000-000-0000',
                location: `${vendorData?.companyDetails?.state || 'State'}, ${vendorData?.companyDetails?.country || 'Country'}`,
                email: vendorData?.vendorDetails?.primaryContactEmail || currentUser?.email || 'email@example.com',
            });
        }
    }, [vendorData, currentUser]);
    
    const [profileFormData, setProfileFormData] = useState({ ...profileData });
    const [imagePreview, setImagePreview] = useState(profileData.image);
    const [selectedCountry, setSelectedCountry] = useState('');
    const [states, setStates] = useState([]);
    const [selectedState, setSelectedState] = useState('');
    const [phoneCountryCode, setPhoneCountryCode] = useState('');
    const [phoneNumberWithoutCode, setPhoneNumberWithoutCode] = useState('');
    // Update form data when profile data changes
    useEffect(() => {
        setProfileFormData({ ...profileData });
    }, [profileData]);
    
    // Update profile data when currentUser changes
    useEffect(() => {
        if (currentUser) {
            setProfileData(prevData => ({
                ...prevData,
                name: vendorData?.vendorDetails?.primaryContactName || currentUser.name || 'User',
                email: vendorData?.vendorDetails?.primaryContactEmail || currentUser.email || 'email@example.com',
            }));
        }
    }, [currentUser, vendorData]);
    
    // Initialize form data when modal opens
    useEffect(() => {
        if (isProfileModalOpen) {
            // Reset form data to current profile data
            setProfileFormData({ ...profileData });
            
            // Parse location
            const locationParts = profileData.location.split(', ');
            const currentCountry = locationParts.length > 1 ? locationParts[1] : '';
            const currentCountryState = locationParts.length > 0 ? locationParts[0] : '';
            
            setSelectedCountry(currentCountry || '');
            setSelectedState(currentCountryState || '');
            setStates(countryStateData[currentCountry] || []);

            // Parse phone number
            const phoneParts = profileData.phone.split(' ');
            const code = phoneParts.length > 0 ? phoneParts[0] : '';
            const numberWithoutCode = phoneParts.slice(1).join(' ') || '';
            
            setPhoneCountryCode(code || '');
            setPhoneNumberWithoutCode(numberWithoutCode || '');
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
        setProfileFormData((prevData) => ({ ...prevData, [name]: value }));
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
            const updatedLocation = `${selectedState}, ${selectedCountry}`;
            const updatedPhone = `${phoneCountryCode} ${phoneNumberWithoutCode}`;
            const dataToSave = { ...profileFormData, location: updatedLocation, phone: updatedPhone };
            delete dataToSave.imageFile;
            
            // Update local state
            setProfileData(dataToSave);
            
            // Prepare data for API
            const vendorDetails = {
                primaryContactName: dataToSave.name,
                primaryContactEmail: dataToSave.email,
                phoneNumber: dataToSave.phone,
                companyName: dataToSave.companyName
            };
            
            const companyDetails = {
                companyName: dataToSave.companyName,
                state: selectedState,
                country: selectedCountry
            };
            
            // Create form data for file upload
            const formData = new FormData();
            formData.append('vendorDetails', JSON.stringify(vendorDetails));
            formData.append('companyDetails', JSON.stringify(companyDetails));
            
            if (profileFormData.imageFile) {
                formData.append('profileImage', profileFormData.imageFile);
            }
            
            // Send update to backend
            const response = await fetch(`${config.VENDOR_BACKEND_URL}/api/vendor/update-profile`, {
                method: 'POST',
                body: formData
            });
            
            if (!response.ok) {
                throw new Error('Failed to update profile');
            }
            
            console.log('Profile updated successfully');
            setIsProfileModalOpen(false);
        } catch (error) {
            console.error('Error updating profile:', error);
            alert('Failed to update profile. Please try again.');
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 font-sans">
            <section className="bg-gradient-to-r from-[#095B49] to-[#000000] text-white rounded-xl p-4 relative rounded-b-lg" style={{ height: "200px" }}>
                    <div className="absolute top-2 left-4 text-xs text-white/80">
                      GSTIN:{vendorData?.vendorDetails?.gstin || 'Not Available'}
                    </div>
            
                    {/* Top right icons */}
                    <div className="absolute top-4 right-4 flex items-center gap-4">
                      <Award className="w-5 h-5 text-yellow-400" />
                      <button>
                        <Share2 className="w-5 h-5 text-white" />
                      </button>
                      <button>
                        <Settings className="w-5 h-5 text-white" />
                      </button>
                    </div>
            
                    {/* Tabs */}
                    <div className="flex justify-center pt-6">
                      <div className="bg-white rounded-full overflow-hidden flex shadow-md">
                        <Link to="/vendor-home">
                          <button className="text-gray-700 px-6 py-2 hover:bg-gray-100">
                            Portfolio
                          </button>
                        </Link>
                        
                        <Link to="/userproject">
                        <button
                          className="bg-emerald-800 text-white px-6 py-2 rounded-full"
                        >
                          Projects
                        </button>
                        </Link>
                        <Link to={"/userproduct"}>
                        <button
                          className="text-gray-700 px-6 py-2 hover:bg-gray-100"
                        >
                          Products
                        </button></Link>
                      </div>
                    </div>
                </section>
                <div className="absolute flex flex-col md:flex-row gap-4 p-4" style={{ top: '30%' }}>
                    <section className="w-full md:w-1/3 bg-white rounded-lg shadow-md p-6">
                              <div className="lg:col-span-1 w-full lg:sticky lg:top-8">
                                              <div className="bg-white rounded-lg shadow-md p-6 flex flex-col items-center mx-auto" style={{ maxWidth: '350px' }}>
                                                  {/* Profile Image */}
                                                  <div className="relative w-32 h-32 lg:w-40 lg:h-40 mb-2 -mt-16">
                                                      <img
                                                          src={profileData.image}
                                                          alt={profileData.name}
                                                          className="absolute top-0 rounded-full object-cover border-8 border-white w-full h-full"
                                                          onError={(e) => { e.target.onerror = null; e.target.src = "https://images.app.goo.gl/DWEbTsdssMENZXe27"; }}
                                                      />
                                                  </div>
                                                  {/* Profile Name & ID */}
                                                  <h1 className="text-xl lg:text-2xl font-bold text-gray-800 mt-2 text-center">{profileData.name}</h1>
                                                  <p className="text-gray-500 mb-4 text-center">{profileData.vendorId}</p>
                                                  {/* Profile Details */}
                                                  <div className="w-full space-y-4 mt-4 text-left">
                                                      <div className="flex items-start gap-3">
                                                          <div className="w-6 flex-shrink-0 text-gray-700 pt-1"><BuildingIcon /></div>
                                                          <div><p className="text-sm text-gray-500 leading-tight">Company name</p><p className="font-medium">{profileData.companyName}</p></div>
                                                      </div>
                                                      <div className="flex items-start gap-3">
                                                          <div className="w-6 flex-shrink-0 text-gray-700 pt-1"><Phone className="h-5 w-5" /></div>
                                                          <div><p className="text-sm text-gray-500 leading-tight">Phone</p><p className="font-medium">{profileData.phone}</p></div>
                                                      </div>
                                                      <div className="flex items-start gap-3">
                                                          <div className="w-6 flex-shrink-0 text-gray-700 pt-1"><MapPin className="h-5 w-5" /></div>
                                                          <div><p className="text-sm text-gray-500 leading-tight">Location</p><p className="font-medium">{profileData.location}</p></div>
                                                      </div>
                                                      <div className="flex items-start gap-3">
                                                          <div className="w-6 flex-shrink-0 text-gray-700 pt-1"><Mail className="h-5 w-5" /></div>
                                                          <div><p className="text-sm text-gray-500 leading-tight">Email</p><p className="font-medium">{profileData.email}</p></div>
                                                      </div>
                                                  </div>
                                                  {/* Edit Profile Button */}
                                                  <button
                                                      onClick={handleProfileEditClick}
                                                      className="w-full mt-6 bg-gradient-to-l from-[#095B49] to-[#000000] text-white py-2 px-4 rounded-md hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition-opacity"
                                                  >
                                                      Edit Profile
                                                  </button>
                                              </div>
                                          </div>
                            
                            </section>
                             {isProfileModalOpen && (
                                            <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 transition-opacity duration-300 ease-in-out">
                                                <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto transform transition-all duration-300 ease-in-out scale-100">
                                                    {/* Modal Header */}
                                                    <div className="flex justify-between items-center mb-4 border-b pb-2">
                                                        <h2 className="text-xl font-semibold text-gray-800">Edit Profile</h2>
                                                        <button onClick={handleProfileCloseModal} className="text-gray-400 hover:text-gray-600">
                                                            <CloseIcon size={20} />
                                                        </button>
                                                    </div>
                                                    {/* Modal Form */}
                                                    <form onSubmit={(e) => e.preventDefault()} className="space-y-4">
                                                        <div className="flex flex-col items-center space-y-3">
                                                            <img src={imagePreview} alt="Profile Preview" className="w-32 h-32 rounded-full object-cover border-2 border-gray-300 shadow-sm" onError={(e) => { e.target.onerror = null; e.target.src = "https://via.placeholder.com/160"; }} />
                                                            <label htmlFor="profileImage" className="cursor-pointer bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium px-4 py-2 rounded-md transition-colors">Change Image</label>
                                                            <input id="profileImage" name="profileImage" type="file" accept="image/png, image/jpeg, image/gif" onChange={handleProfileFileChange} className="hidden" />
                                                        </div>
                                                        {/* Input Fields */}
                                                        <div><label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">Name</label><input type="text" id="name" name="name" value={profileFormData.name} onChange={handleProfileInputChange} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent" required /></div>
                                                        <div><label htmlFor="companyName" className="block text-sm font-medium text-gray-700 mb-1">Company Name</label><input type="text" id="companyName" name="companyName" value={profileFormData.companyName} onChange={handleProfileInputChange} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent" /></div>
                                                        <div>
                                                            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                                                            <div className="flex rounded-md shadow-sm">
                                                                <select
                                                                    value={phoneCountryCode}
                                                                    onChange={(e) => {
                                                                        setPhoneCountryCode(e.target.value);
                                                                        setProfileFormData(prev => ({ ...prev, phone: `${e.target.value} ${phoneNumberWithoutCode}` }));
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
                                                                    name="phone"
                                                                    value={phoneNumberWithoutCode}
                                                                    onChange={(e) => {
                                                                        setPhoneNumberWithoutCode(e.target.value);
                                                                        setProfileFormData(prev => ({ ...prev, phone: `${phoneCountryCode} ${e.target.value}` }));
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
                                                                        setProfileFormData(prev => ({ ...prev, location: `${selectedState || ''}, ${newCountry}` }));
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
                                                                        setProfileFormData(prev => ({ ...prev, location: `${newState}, ${selectedCountry}` }));
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
                                                        <div className="flex justify-end gap-3 pt-4 border-t mt-6">
                                                            <button type="button" onClick={handleProfileCloseModal} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400 transition-colors">Cancel</button>
                                                            <button type="button" onClick={handleProfileSave} className="px-4 py-2 bg-gradient-to-l from-[#095B49] to-[#000000] text-white rounded-md hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition-opacity">Save Changes</button>
                                                        </div>
                                                    </form>
                                                </div>
                                            </div>
                                        )}
                </div>
        </div>
    );
}
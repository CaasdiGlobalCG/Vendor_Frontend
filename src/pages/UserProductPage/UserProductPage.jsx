import React from "react";
import { useState, useEffect, useContext } from "react";
import {
  Search,
  Plus,
  ChevronRight,
  ChevronDown,
  Share2,
  Settings,
  MapPin,
  Phone,
  Mail,
  BuildingIcon,
  ChevronUp,
  X,
  X as CloseIcon,
  Award
} from "lucide-react";
import ServiceEditDialog from "./ServiceEditDialog";
import ProductEditDialog from "./ProductEditDialog";
import { Link } from 'react-router-dom';
import { useNavigate } from "react-router-dom";
import { Button } from "/src/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "/src/components/ui/tabs";
import { Input } from "/src/components/ui/input";
import profilePlaceholder from '../../assets/profileplaceholder.jpg' // Adjust the path as necessary
import { UserContext } from "../../context/UserContext";
import { VendorContext } from "../../context/VendorContext";
import AppHeader from "../../components/AppHeader/Appheader";
import UserProfileCard from '../../components/UserProfileCard/UserProfileCard'; // Import the new component
import config from '../../config/env';

export default function UserPortfolio() {
  const { currentUser } = useContext(UserContext);
  const { currentUser: vendorUser, vendorData, setVendorData } = useContext(VendorContext);
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState("products");
  const [productSearchQuery, setProductSearchQuery] = useState("");
  const [expandedProductId, setExpandedProductId] = useState(null);
  const [showAddProductForm, setShowAddProductForm] = useState(false);
  const [dynamicFields, setDynamicFields] = useState([]);
  const [customFields, setCustomFields] = useState([]); // ADD THIS LINE
  const [editProduct, setEditProduct] = useState(null);
  const [showEditServiceDialog, setShowEditServiceDialog] = useState(false);
  const [editServiceData, setEditServiceData] = useState({});
  const [expandedSections, setExpandedSections] = useState({});
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dataFetched, setDataFetched] = useState(false);
  
  // Initialize with default values that will be replaced with data from backend
  const [profileData, setProfileData] = useState({
      name: currentUser?.name || vendorUser?.name || 'Loading...',
      vendorId: '#Loading',
      image: profilePlaceholder,
      companyName: 'Loading...',
      phone: 'Loading...',
      location: 'Loading...',
      email: currentUser?.email || vendorUser?.email || 'Loading...',
  });
  const [profileFormData, setProfileFormData] = useState({ ...profileData });
  const [imagePreview, setImagePreview] = useState(profileData.imageUrl);

const [selectedCountry, setSelectedCountry] = useState('');
  const [states, setStates] = useState([]);
  const [selectedState, setSelectedState] = useState('');
  const [phoneCountryCode, setPhoneCountryCode] = useState('');
  const [phoneNumberWithoutCode, setPhoneNumberWithoutCode] = useState('');

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

  // First useEffect just to log context values
  useEffect(() => {
    console.log("UserProductPage - Current User Context:", currentUser);
    console.log("UserProductPage - Vendor User Context:", vendorUser);
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
                  image: profilePlaceholder, // Use placeholder for now
                  companyName: vendor.companyDetails?.companyName || vendor.vendorDetails?.companyName || '',
                  phone: vendor.vendorDetails?.primaryContactPhone || '',
                  location: `${vendor.companyDetails?.state || ''}, ${vendor.companyDetails?.country || ''}`,
                    email: vendor.vendorDetails?.primaryContactEmail || vendor.email || currentUser?.email || vendorUser?.email || '',
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
      console.log("UserProductPage - Executing delayed data fetch");
      fetchVendorData();
    }, 500);
    
    return () => clearTimeout(timer);
  }, [currentUser, vendorUser, profileData.email, dataFetched, setVendorData]);

  useEffect(() => {
    if (isProfileModalOpen) {
      // Handle different location formats
      let currentState = '';
      let currentCountry = '';
      
      if (profileFormData.location && profileFormData.location !== 'Location not specified') {
        const locationParts = profileFormData.location.split(', ');
        if (locationParts.length === 2) {
          // Format is "State, Country"
          currentState = locationParts[0];
          currentCountry = locationParts[1];
        } else if (locationParts.length === 1) {
          // If only one part, check if it matches a country in our data
          const singlePart = locationParts[0];
          if (Object.keys(countryStateData).includes(singlePart)) {
            currentCountry = singlePart;
          } else {
            // Assume it's a state if not a known country
            currentState = singlePart;
          }
        }
      }
      
      setSelectedCountry(currentCountry || '');
      setSelectedState(currentState || '');
      setStates(countryStateData[currentCountry] || []);

      // Handle phone number
      const phoneValue = profileFormData.phone || '';
      const phoneMatch = phoneValue.match(/^(\+\d+)?\s*(.*)$/);
      
      if (phoneMatch) {
        setPhoneCountryCode(phoneMatch[1] || '');
        setPhoneNumberWithoutCode(phoneMatch[2] || '');
      } else {
        setPhoneCountryCode('');
        setPhoneNumberWithoutCode(phoneValue);
      }
      
      setImagePreview(profileData.image);
    }
  }, [isProfileModalOpen]); // Only depends on isProfileModalOpen to prevent infinite loops

  // Separate useEffect for cleanup of object URLs
  useEffect(() => {
      const isObjectURL = typeof imagePreview === 'string' && imagePreview.startsWith('blob:');
      return () => {
          if (isObjectURL) {
              URL.revokeObjectURL(imagePreview);
          }
      };
  }, [imagePreview]);

  const handleProfileEditClick = () => {
    // Update profile form data when opening the modal to ensure it has the latest data
    setProfileFormData({...profileData});
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

const [isSaving, setIsSaving] = useState(false);

const handleProfileSave = async () => {
  try {
      // Construct the updated location and phone
      if (!selectedState || !selectedCountry) {
          alert("Please select both state and country");
          return;
      }
      
      const updatedLocation = `${selectedState}, ${selectedCountry}`;
      const updatedPhone = `${phoneCountryCode} ${phoneNumberWithoutCode}`;
      
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
              location: updatedLocation
          },
          companyDetails: {
              ...vendorData.companyDetails,
              companyName: dataToSave.companyName,
              country: selectedCountry,
              state: selectedState
          }
      };
      
      // Create FormData object for the API call
      const formData = new FormData();
      formData.append('vendorDetails', JSON.stringify(vendorUpdateData.vendorDetails));
      formData.append('companyDetails', JSON.stringify(vendorUpdateData.companyDetails));
      
      // If there's a new profile image
      if (profileFormData.imageFile) {
          formData.append('profileImage', profileFormData.imageFile);
      }
      
      // Send update to backend
      const response = await fetch(`${config.VENDOR_BACKEND_URL}/api/vendor/update-profile`, {
          method: 'POST',
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
      
      // Close modal
      setIsProfileModalOpen(false);
      
      // Show success message
      alert("Profile updated successfully!");
  } catch (error) {
      console.error("Error updating profile:", error);
      alert(`Failed to update profile: ${error.message}`);
  }
};



const [newImages, setNewImages] = useState([null, null, null]);
const [showEditDialog, setShowEditDialog] = useState(false);
const [editProductData, setEditProductData] = useState(null);



  const [newCustomFields, setNewCustomFields] = useState([]);
  


  const [newProduct, setNewProduct] = useState({
    name: "",
    category: "",
    keyFeatures: "",
    targetCustomers: "",
    usageAreas: "",
    availableSizes: "",
    packagingDelivery: "",
    certifications: "",
    supportServices: "",
    catalogDemo: "",
    verified: false,
  });
  const [productImages, setProductImages] = useState([]);
  const [serviceImages, setServiceImages] = useState([]);


  const [serviceSearchQuery, setServiceSearchQuery] = useState("");
  const [expandedServiceId, setExpandedServiceId] = useState(null);
  const [showAddServiceForm, setShowAddServiceForm] = useState(false);
  const [newServiceCustomFields, setNewServiceCustomFields] = useState([]); // ADD THIS LINE
  const [newProductCustomFields, setNewProductCustomFields] = useState([]); // Add product custom fields



  const [newService, setNewService] = useState({
    name: "",
    serviceType: "",
    description: "",
    industries: "",
    budgetRange: "",
    deliveryMethod: "",
    materials: "",
    pricing: "",
    compliance: "",
    caseStudies: "",
    isFeatured: false,
  });

  const [editedProduct, setEditedProduct] = useState({
    name: '',
    type: '',
    features: '',
    customers: '',
    usageAreas: '',
    sizes: '',
    packaging: '',
    certifications: '',
    support: '',
    catalogLink: '',
    images: [],
  });

  const handleProductArrowClick = (productId) => {
    setExpandedProductId(expandedProductId === productId ? null : productId);
  };
  
  const handleEditClick = (product) => {
    const authToken = localStorage.getItem('authToken');
    const vendorId = currentUser?.vendorId;

    if (!config.SALES_URL) {
      alert('B2B Sales dashboard URL is not configured. Please contact support.');
      return;
    }

    if (!authToken || !vendorId || !product?.id) {
      alert('Missing authentication details or product id.');
      return;
    }

    const params = new URLSearchParams({
      authToken,
      vendorId,
    });

    window.location.href = `${config.SALES_URL}/products/${product.id}?${params.toString()}`;
  };
  
  const handleUpdateProduct = async () => {
    try {
      if (!currentUser?.email || !editProductData?.id) {
        alert("Missing required information");
        return;
      }
      
      console.log("Updating product with data:", editProductData);
      
      // Create form data for file upload
      const formData = new FormData();
      formData.append('email', currentUser?.email || vendorUser?.email || profileData.email);
      formData.append('productId', editProductData.id);
      
      // Process custom fields if any
      if (newProductCustomFields && newProductCustomFields.length > 0) {
        // Convert array of custom fields to object format for backend
        const customData = {};
        newProductCustomFields.forEach(field => {
          if (field.label && field.value) {
            customData[field.label] = field.value;
          }
        });
        
        // Add custom fields to the product data
        const productDataWithCustomFields = {
          ...editProductData,
          customFields: customData
        };
        
        formData.append('productData', JSON.stringify(productDataWithCustomFields));
      } else {
        // Add product data without custom fields
        formData.append('productData', JSON.stringify(editProductData));
      }
      
      // Add new product images if any
      const filesToUpload = newImages.filter(img => img !== null);
      filesToUpload.forEach(image => {
        formData.append('productImages', image);
      });
      
      // Send data to backend
      const response = await fetch(`${config.VENDOR_BACKEND_URL}/api/vendor/products`, {
        method: 'PUT',
        body: formData,
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`Server responded with status: ${response.status}`);
      }
      
      const result = await response.json();
      console.log("Product updated successfully:", result);
      
      // Update the product in the products array
      if (result.success && result.data) {
        setProducts(prevProducts => 
          prevProducts.map(p => p.id === result.data.id ? result.data : p)
        );
      } else {
        // If no result data returned but update was successful
        // Refresh the products list
        const updatedProducts = products.map(p => {
          if (p.id === editProductData.id) {
            return { ...p, ...editProductData };
          }
          return p;
        });
        setProducts(updatedProducts);
      }
      
      // Reset form
      setShowEditDialog(false);
      setEditProductData(null);
      setNewImages([null, null, null]);
      setNewProductCustomFields([]);
      
      // Show success message
      alert('Product updated successfully!');
    } catch (error) {
      console.error('Error updating product:', error);
      alert('Failed to update product. Please try again.');
    }
  };
  
  const handleDeleteProduct = async (productId) => {
    try {
      if (!productId) {
        alert("Missing required information");
        return;
      }
      
      if (!window.confirm("Are you sure you want to delete this product?")) {
        return;
      }
      
      const token = localStorage.getItem('authToken');

      // Send delete request to Vendor backend (which deletes from Products table)
      const response = await fetch(`${config.VENDOR_BACKEND_URL}/api/vendor/products`, {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ productId }),
      });
      
      if (!response.ok) {
        throw new Error(`Server responded with status: ${response.status}`);
      }
      
      const result = await response.json();
      console.log("Product deleted successfully:", result);
      
      // Remove the product from the products array
      if (result.success) {
        setProducts(prevProducts => prevProducts.filter(p => p.id !== productId));
      }
      
      // Show success message
      alert('Product deleted successfully!');
    } catch (error) {
      console.error('Error deleting product:', error);
      alert('Failed to delete product. Please try again.');
    }
  };
  const handleEditService = (serviceData) => {
     setEditServiceData(serviceData);
     setNewImages([null, null, null]); // Reset image uploads (optional)
     setShowEditServiceDialog(true);
    };
    
  
  
  const handleAddField = () => {
    setDynamicFields([...dynamicFields, { label: "", value: "" }]);
  };
  const handleAddCustomField = () => {
    setCustomFields([...customFields, { label: "", value: "" }]);
  };
  
  // const handleCustomFieldChange = (index, key, val) => {
  //   const updated = [...customFields];
  //   updated[index][key] = val;
  //   setCustomFields(updated);
  // };
  
  // const handleRemoveCustomField = (index) => {
  //   const updated = [...customFields];
  //   updated.splice(index, 1);
  //   setCustomFields(updated);
  // };
  
  const handleAddServiceCustomField = () => { // Define this function
    setNewServiceCustomFields([...newServiceCustomFields, { label: "", value: "" }]);
  };
  const handleServiceCustomFieldChange = (index, key, val) => { // Define this function
    const updated = [...newServiceCustomFields];
    updated[index][key] = val;
    setNewServiceCustomFields(updated);
  };
  const handleRemoveServiceCustomField = (index) => { // Define this function
    const updated = [...newServiceCustomFields];
    updated.splice(index, 1);
    setNewServiceCustomFields(updated);
  };
  
  // const handleDeleteService = async (serviceId) => {
  //   try {
  //     if (!currentUser?.email || !serviceId) {
  //       alert("Missing required information");
  //       return;
  //     }
      
  //     if (!window.confirm("Are you sure you want to delete this service?")) {
  //       return;
  //     }
      
  //     // Send delete request to backend
  //     const response = await fetch('${config.VENDOR_BACKEND_URL}/api/vendor/services', {
  //       method: 'DELETE',
  //       headers: {
  //         'Content-Type': 'application/json',
  //       },
  //       body: JSON.stringify({
  //         email: currentUser.email,
  //         serviceId: serviceId
  //       }),
  //       credentials: 'include'
  //     });
      
  //     if (!response.ok) {
  //       throw new Error(`Server responded with status: ${response.status}`);
  //     }
      
  //     const result = await response.json();
  //     console.log("Service deleted successfully:", result);
      
  //     // Remove the service from the services array
  //     if (result.success) {
  //       setServices(prevServices => prevServices.filter(s => s.id !== serviceId));
  //     }
      
  //     // Show success message
  //     alert('Service deleted successfully!');
  //   } catch (error) {
  //     console.error('Error deleting service:', error);
  //     alert('Failed to delete service. Please try again.');
  //   }
  // };
  
  // const handleUpdateService = async () => {
  //   try {
  //     if (!currentUser?.email || !editServiceData?.id) {
  //       alert("Missing required information");
  //       return;
  //     }
      
  //     // Create form data for file upload
  //     const formData = new FormData();
  //     formData.append('email', currentUser.email);
  //     formData.append('serviceId', editServiceData.id);
      
  //     // Add service data
  //     formData.append('serviceData', JSON.stringify(editServiceData));
      
  //     // Add new service images if any
  //     const filesToUpload = newImages.filter(img => img !== null);
  //     filesToUpload.forEach(image => {
  //       formData.append('serviceImages', image);
  //     });
      
  //     // Send data to backend
  //     const response = await fetch('${config.VENDOR_BACKEND_URL}/api/vendor/services', {
  //       method: 'PUT',
  //       body: formData,
  //       credentials: 'include'
  //     });
      
  //     if (!response.ok) {
  //       throw new Error(`Server responded with status: ${response.status}`);
  //     }
      
  //     const result = await response.json();
  //     console.log("Service updated successfully:", result);
      
  //     // Update the service in the services array
  //     if (result.success && result.data) {
  //       setServices(prevServices => 
  //         prevServices.map(s => s.id === result.data.id ? result.data : s)
  //       );
  //     }
      
  //     // Reset form
  //     setShowEditServiceDialog(false);
  //     setEditServiceData(null);
  //     setNewImages([null, null, null]);
      
  //     // Show success message
  //     alert('Service updated successfully!');
  //   } catch (error) {
  //     console.error('Error updating service:', error);
  //     alert('Failed to update service. Please try again.');
  //   }
  // };

  const handleServiceArrowClick = (serviceId) => {
    setExpandedServiceId(expandedServiceId === serviceId ? null : serviceId);
  };
  // This function is already defined elsewhere in the file
  // function handleServiceImageUpload(e) {
  //   const files = Array.from(e.target.files);
  //   setServiceImages(prev => [...prev, ...files]);
  // }
  
  function handleRemoveServiceImage(index) {
    setServiceImages(prev => prev.filter((_, i) => i !== index));
  }
  
  // Default static data for products and services (fallback data)
  const defaultProducts = [
    {
      id: 1,
      name: "EcoGrip - Anti-slip Industrial Flooring",
      category: "Safety Equipment / Building Material",
      verified: true,
    },
    {
      id: 2,
      name: "TuffStep - Anti-slip Industrial Coatings",
      category: "Safety Equipment / Building Material",
      verified: true,
    },
    {
      id: 3,
      name: "SecureStride - Industrial Anti-Skid Platforms",
      category: "Safety Equipment / Building Material",
      verified: true,
    },
    {
      id: 4,
      name: "EcoGrip - Anti-slip Industrial Flooring",
      category: "Safety Equipment / Building Material",
      verified: true,
    },
    {
      id: 5,
      name: "TuffStep - Anti-slip Industrial Coatings",
      category: "Safety Equipment / Building Material",
      verified: true,
    },
    {
      id: 6,
      name: "SecureStride - Industrial Anti-Skid Platforms",
      category: "Safety Equipment / Building Material",
      verified: true,
    },
  ];

  // State for products and services
  const [products, setProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [productsError, setProductsError] = useState(null);
  
  // const [services, setServices] = useState([]);
  // const [servicesLoading, setServicesLoading] = useState(false);
  // const [servicesError, setServicesError] = useState(null);

  // Fetch products from backend
  useEffect(() => {
    let isMounted = true;

    const fetchProducts = async () => {
      const token = localStorage.getItem('authToken');

      try {
        setProductsLoading(true);
        setProductsError(null);

        const response = await fetch(`${config.VENDOR_BACKEND_URL}/api/vendor/products`, {
          credentials: 'include',
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });

        if (!response.ok) {
          throw new Error(`Server responded with status: ${response.status}`);
        }

        const payload = await response.json();

        const items = Array.isArray(payload?.data) ? payload.data : (Array.isArray(payload) ? payload : []);

        const normalized = items.map((item) => ({
          ...item,
          id: item.productId || item.id,
          name: item.productName || item.name || 'Unnamed Product',
          category: item.productCategory || item.category || '',
          verified: (item.status || '').toUpperCase() === 'PUBLISHED',
          keyFeatures: Array.isArray(item.productFeatures) ? item.productFeatures.join(', ') : item.productFeatures,
          targetCustomers: Array.isArray(item.targetMarket) ? item.targetMarket.join(', ') : item.targetMarket,
          usageAreas: item.detailedDescription || item.shortDescription || '',
          availableSizes: Array.isArray(item.sizeOptions) ? item.sizeOptions.join(', ') : item.sizeOptions,
          packagingDelivery: item.packagingDetails || '',
          certifications: item.businessLicense || '',
          supportServices: item.afterSalesService || '',
          catalogDemo: item.catalogDemo || '',
          customFields: Array.isArray(item.displayAttributes)
            ? item.displayAttributes.map((a) => ({ label: a?.property, value: a?.value }))
            : [],
          images: Array.isArray(item.images) ? item.images : [],
        }));

        if (isMounted) {
          setProducts(normalized);
        }
      } catch (error) {
        console.error('Error fetching products:', error);
        if (isMounted) {
          setProductsError('Failed to load products.');
          setProducts([]);
        }
      } finally {
        if (isMounted) {
          setProductsLoading(false);
        }
      }
    };

    fetchProducts();

    // Refresh when user returns to tab (best UX after Add/Edit in Sales app)
    const onFocus = () => fetchProducts();
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') fetchProducts();
    };

    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      isMounted = false;
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [currentUser?.vendorId]);
  
  // Fetch services from backend
  useEffect(() => {
    const fetchServices = async () => {
      if (!currentUser) return;
      
      try {
        setServicesLoading(true);
        setServicesError(null);

        const token = localStorage.getItem('authToken');
        const response = await fetch(`${config.VENDOR_BACKEND_URL}/api/vendor/services`, {
          credentials: 'include',
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        
        if (!response.ok) {
          throw new Error(`Server responded with status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log("Services data response:", data);
        
        if (data.success && data.data) {
          setServices(data.data);
        } else {
          // If no services found, set empty array
          setServices([]);
        }
      } catch (error) {
        console.error('Error fetching services:', error);
        setServicesError('Failed to load services.');
        setServices([]);
      } finally {
        setServicesLoading(false);
      }
    };
    
    fetchServices();
  }, [currentUser?.email]);

  // Default services data
  const defaultServices = [
    {
      id: 101,
      name: "Custom Interior Design & Space Planning",
      serviceType: "Interior Design",
      designPlanning: "Comprehensive space analysis and planning.",
      residentialDesign: "Tailored design for homes.",
      commercialDesign: "Office and business space design.",
      furnitureStyling: "Selection and arrangement of furniture.",
      lightingDesign: "Custom lighting solutions.",
      colorConsultation: "Expert color palette advice.",
      visualization: "3D renderings of design concepts.",
      projectManagement: "Overseeing the entire project execution.",
      homeStaging: "Preparing homes for sale.",
      onlineConsultation: "Virtual design consultations.",
      sustainableDesign: "Eco-friendly design options.",
      renovation: "Kitchen and bathroom remodeling.",
      spaceOptimization: "Maximizing space efficiency.",
      materialSelection: "Guidance on textiles and materials.",
      images: ["https://via.placeholder.com/150", "https://via.placeholder.com/150"], // Example image URLs
      isFeatured: true,
    },
    {
      id: 102,
      name: "Residential Interior Design",
      serviceType: "Interior Design",
      designPlanning: "Detailed planning for residential spaces.",
      residentialDesign: "Creating beautiful and functional homes.",
      commercialDesign: null,
      furnitureStyling: "Selecting comfortable and stylish furniture.",
      lightingDesign: "Ambient and task lighting design.",
      colorConsultation: "Choosing the right color schemes.",
      visualization: "Realistic 3D models of rooms.",
      projectManagement: "Managing home design projects.",
      homeStaging: null,
      onlineConsultation: "Remote design advice.",
      sustainableDesign: "Environmentally conscious design.",
      renovation: "Home renovation and remodeling.",
      spaceOptimization: "Smart space-saving solutions.",
      materialSelection: "Sourcing quality materials.",
      images: ["https://via.placeholder.com/150"],
      isFeatured: false,
    },
    {
      id: 103,
      name: "Commercial Interior Design",
      serviceType: "Interior Design",
      designPlanning: "Strategic planning for business spaces.",
      residentialDesign: null,
      commercialDesign: "Designing functional and impressive commercial spaces.",
      furnitureStyling: "Selecting durable and professional furniture.",
      lightingDesign: "Effective lighting for workspaces.",
      colorConsultation: "Brand-aligned color schemes.",
      visualization: "3D visualizations of commercial spaces.",
      projectManagement: "Efficient management of commercial projects.",
      homeStaging: null,
      onlineConsultation: "Virtual consultations for businesses.",
      sustainableDesign: "Implementing eco-friendly practices.",
      renovation: "Office and retail space renovations.",
      spaceOptimization: "Creating efficient layouts.",
      materialSelection: "Choosing durable and commercial-grade materials.",
      images: ["https://via.placeholder.com/150"],
      isFeatured: true,
    },
    {
      id: 104,
      name: "Online Interior Consultation",
      serviceType: "Consultation",
      designPlanning: "Virtual space planning and advice.",
      residentialDesign: "Remote home design guidance.",
      commercialDesign: "Online business space consultation.",
      furnitureStyling: "Virtual furniture selection assistance.",
      lightingDesign: "Remote lighting design advice.",
      colorConsultation: "Online color scheme recommendations.",
      visualization: "Digital concept boards and mood boards.",
      projectManagement: "Remote project oversight and guidance.",
      homeStaging: "Virtual home staging advice for selling.",
      onlineConsultation: "Comprehensive online design consultations.",
      sustainableDesign: "Guidance on eco-friendly design choices.",
      renovation: "Virtual renovation planning support.",
      spaceOptimization: "Remote space-saving tips and strategies.",
      materialSelection: "Online material and textile recommendations.",
      images: [],
      isFeatured: false,
    },
    {
      id: 105,
      name: "Kitchen & Bathroom Renovation",
      serviceType: "Renovation",
      designPlanning: "Detailed planning for kitchen and bath remodels.",
      residentialDesign: "Custom kitchen and bathroom designs.",
      commercialDesign: null,
      furnitureStyling: "Selection of fixtures and fittings.",
      lightingDesign: "Task and ambient lighting for kitchens and baths.",
      colorConsultation: "Color schemes for wet areas.",
      visualization: "3D models of renovated spaces.",
      projectManagement: "Managing renovation projects from start to finish.",
      homeStaging: null,
      onlineConsultation: "Virtual consultation for renovation ideas.",
      sustainableDesign: "Eco-friendly material and fixture options.",
      renovation: "Full kitchen and bathroom renovation services.",
      spaceOptimization: "Maximizing storage and functionality.",
      materialSelection: "Sourcing durable and stylish materials.",
      images: ["https://via.placeholder.com/150"],
      isFeatured: true,
    },
    {
      id: 106,
      name: "Furniture Selection & Styling",
      serviceType: "Styling",
      designPlanning: "Planning furniture layouts and styles.",
      residentialDesign: "Choosing furniture for homes.",
      commercialDesign: "Selecting furniture for offices and businesses.",
      furnitureStyling: "Expert selection and arrangement of furniture.",
      lightingDesign: "Integrating lighting with furniture.",
      colorConsultation: "Coordinating furniture with color palettes.",
      visualization: "Furniture mood boards and 3D layouts.",
      projectManagement: null,
      homeStaging: "Staging homes with appropriate furniture.",
      onlineConsultation: "Virtual furniture selection advice.",
      sustainableDesign: "Sourcing sustainable furniture options.",
      renovation: null,
      spaceOptimization: "Furniture solutions for maximizing space.",
      materialSelection: "Guidance on fabric and material choices.",
      images: ["https://via.placeholder.com/150"],
      isFeatured: false,
    },
  ];
  
  // State for services
  const [services, setServices] = useState(defaultServices);
  const [servicesLoading, setServicesLoading] = useState(false);
  const [servicesError, setServicesError] = useState(null);
  
  // Fetch services from backend (with fallback to static data)
  useEffect(() => {
    const fetchServices = async () => {
      if (!currentUser) return;
      
      try {
        setServicesLoading(true);
        setServicesError(null);

        const token = localStorage.getItem('authToken');
        const response = await fetch(`${config.VENDOR_BACKEND_URL}/api/vendor/services`, {
          credentials: 'include',
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        
        if (!response.ok) {
          // If 404, use default data and don't show error
          if (response.status === 404) {
            console.log("Services API not implemented yet, using default data");
            return;
          }
          throw new Error(`Server responded with status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log("Services data response:", data);
        
        if (data.success && data.data && data.data.length > 0) {
          setServices(data.data);
        }
      } catch (error) {
        console.error('Error fetching services:', error);
        setServicesError('Failed to load services. Using default data.');
        // Keep using default data on error
      } finally {
        setServicesLoading(false);
      }
    };
    
    fetchServices();
  }, [currentUser?.email]);
  //   

  // Filter products based on search query
  const filteredProducts = products.filter(product => 
    product.name?.toLowerCase().includes(productSearchQuery.toLowerCase()) ||
    product.category?.toLowerCase().includes(productSearchQuery.toLowerCase())
  );
  
  // Filter services based on search query
  const filteredServices = services.filter(service => 
    service.name?.toLowerCase().includes(serviceSearchQuery.toLowerCase()) ||
    service.serviceType?.toLowerCase().includes(serviceSearchQuery.toLowerCase())
  );

  const toggleSection = (label) => {
  setExpandedSections((prev) => ({
    ...prev,
    [label]: !prev[label],
  }));
};
   
  const handleSaveService = () => {
     console.log("Updated Service Data:", editServiceData);
     console.log("New Images:", newImages);
     setShowEditServiceDialog(false); // close modal
     // Optional: upload data to Firestore or backend here
    };
    
    

  // const filteredProducts = products.filter((product) =>
  //   product.name.toLowerCase().includes(productSearchQuery.toLowerCase())
  // );

  // const filteredServices = services.filter((service) =>
  //   service.name.toLowerCase().includes(serviceSearchQuery.toLowerCase())
  // );

  const handleProductInputChange = (e) => {
    const { name, value } = e.target;
    setNewProduct((prevState) => ({
      ...prevState,
      [name]: value,
    }));
  };
  const handleCustomFieldChange = (index, key, val) => {
    const updated = [...customFields];
    updated[index][key] = val;
    setCustomFields(updated);
  };
  const handleSaveCustomField = (index) => {
    const updated = [...customFields];
    updated[index].isSaved = true;
    setCustomFields(updated);
  };
  
  const handleDynamicFieldChange = (index, key, val) => {
    const updated = [...dynamicFields];
    updated[index][key] = val;
    setDynamicFields(updated);
  };
  // For removing inputs from "keyFeatures" or any other array field
  const handleRemoveMultipleInput = (field, index) => {
    const updatedField = [...(newProduct[field] || [])];
    updatedField.splice(index, 1);
    setNewProduct((prev) => ({
      ...prev,
      [field]: updatedField,
    }));
  };
    // For removing custom field (label + value pair)
  const handleRemoveCustomField = (index) => {
    const updated = [...customFields];
    updated.splice(index, 1);
    setCustomFields(updated);
  };
  const customData = {};
  newCustomFields.forEach(field => { // Iterate through newCustomFields
    if (field.label && field.value) {
      customData[field.label] = field.value;
    }
  });
  const productToSave = {
    ...newProduct,
    customFields: customData, // Assign the custom data
  };
  console.log("Product to Save:", productToSave);
 


  const handleServiceInputChange = (e) => {
    const { name, value } = e.target;
    setNewService((prevState) => ({
      ...prevState,
      [name]: value,
    }));
  };
  // --- KEY FEATURES STATE HANDLING ---
  const handleMultipleInputChange = (field, index, event) => {
    const updatedList = [...newProduct[field]];
    updatedList[index] = event.target.value;
    setNewProduct({ ...newProduct, [field]: updatedList });
  };
  const handleAddMultipleInput = (field) => {
    const updatedList = [...(newProduct[field] || [])];
    updatedList.push("");
    setNewProduct({ ...newProduct, [field]: updatedList });
  };
  const handleRemoveField = (index) => {
    const updated = [...dynamicFields];
    updated.splice(index, 1);
    setDynamicFields(updated);
  };

  const handleProductImageUpload = (e) => {
    const files = Array.from(e.target.files);
    setProductImages((prevImages) => [...prevImages, ...files]);
  };
  
  // Handle service image upload
  const handleServiceImageUpload = (e) => {
    const files = Array.from(e.target.files);
    setServiceImages((prevImages) => [...prevImages, ...files]);
  };

  const handleAddProduct = async () => {
    // If already in progress, prevent multiple clicks
    if (isAddingProduct) return;
    
    setIsAddingProduct(true);
    try {
      if (!currentUser?.email) {
        alert("You must be logged in to add a product");
        return;
      }
      
      // Create form data for file upload
      const formData = new FormData();
      formData.append('email', currentUser.email);
      
      // Add product data
      formData.append('productData', JSON.stringify(newProduct));
      
      // Add product images
      productImages.forEach(image => {
        formData.append('productImages', image);
      });
      
      // Add custom fields if any
      if (customFields.length > 0) {
        formData.append('customFields', JSON.stringify(customFields));
      }
      
      // Send data to backend
      const response = await fetch(`${config.VENDOR_BACKEND_URL}/api/vendor/products`, {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`Server responded with status: ${response.status}`);
      }
      
      const result = await response.json();
      console.log("Product added successfully:", result);
      
      // Add the new product to the products array
      if (result.success && result.data) {
        setProducts(prevProducts => [...prevProducts, result.data]);
      }
      
      // Reset form
      setShowAddProductForm(false);
      setNewProduct({
        name: "",
        category: "",
        keyFeatures: "",
        targetCustomers: "",
        usageAreas: "",
        availableSizes: "",
        packagingDelivery: "",
        certifications: "",
        supportServices: "",
        catalogDemo: "",
        verified: false,
      });
      setProductImages([]);
      setCustomFields([]);
      
      // Show success message
      alert('Product added successfully!');
    } catch (error) {
      console.error('Error adding product:', error);
      alert('Failed to add product. Please try again.');
    } finally {
      setIsAddingProduct(false);
    }
  };

  const handleAddService = async () => {
    // If already in progress, prevent multiple clicks
    if (isAddingService) return;
    
    setIsAddingService(true);
    try {
      if (!currentUser?.email) {
        alert("You must be logged in to add a service");
        return;
      }
      
      console.log("Adding service with data:", newService);
      console.log("Service images:", serviceImages);
      console.log("Custom fields:", newServiceCustomFields);
      
      // Create form data for file upload
      const formData = new FormData();
      formData.append('email', currentUser.email);
      
      // Add service data
      formData.append('serviceData', JSON.stringify(newService));
      
      // Add service images
      serviceImages.forEach(image => {
        formData.append('serviceImages', image);
      });
      
      // Add custom fields if any
      if (newServiceCustomFields.length > 0) {
        formData.append('customFields', JSON.stringify(newServiceCustomFields));
      }
      
      // Send data to backend
      const response = await fetch(`${config.VENDOR_BACKEND_URL}/api/vendor/services`, {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`Server responded with status: ${response.status}`);
      }
      
      const result = await response.json();
      console.log("Service added successfully:", result);
      
      // Add the new service to the services array
      if (result.success && result.data) {
        setServices(prevServices => [...prevServices, result.data]);
      }
      
      // Reset form
      setShowAddServiceForm(false);
      setNewService({
        name: "",
        serviceType: "",
        designPlanning: "",
        residentialDesign: "",
        commercialDesign: "",
        furnitureStyling: "",
        lightingDesign: "",
        colorConsultation: "",
        visualization: "",
        projectManagement: "",
        homeStaging: "",
        onlineConsultation: "",
        sustainableDesign: "",
        renovation: "",
        spaceOptimization: "",
        materialSelection: "",
        isFeatured: false,
      });
      setServiceImages([]);
      setNewServiceCustomFields([]);
      
      // Show success message
      alert('Service added successfully!');
    } catch (error) {
      console.error('Error adding service:', error);
      alert('Failed to add service. Please try again.');
    } finally {
      setIsAddingService(false);
    }
  };
  
  const handleUpdateService = async () => {
    try {
      if (!currentUser?.email || !editServiceData?.id) {
        alert("Missing required information");
        return;
      }
      
      // Create form data for file upload
      const formData = new FormData();
      formData.append('email', currentUser.email);
      formData.append('serviceId', editServiceData.id);
      
      // Process custom fields if any
      if (newServiceCustomFields && newServiceCustomFields.length > 0) {
        // Convert array of custom fields to object format for backend
        const customData = {};
        newServiceCustomFields.forEach(field => {
          if (field.label && field.value) {
            customData[field.label] = field.value;
          }
        });
        
        // Add custom fields to the service data
        const serviceDataWithCustomFields = {
          ...editServiceData,
          customFields: customData
        };
        
        formData.append('serviceData', JSON.stringify(serviceDataWithCustomFields));
      } else {
        // Add service data without custom fields
        formData.append('serviceData', JSON.stringify(editServiceData));
      }
      
      // Add new service images if any
      const filesToUpload = newImages.filter(img => img !== null);
      filesToUpload.forEach(image => {
        formData.append('serviceImages', image);
      });
      
      // Add custom fields if any
      if (newServiceCustomFields.length > 0) {
        formData.append('customFields', JSON.stringify(newServiceCustomFields));
      }
      
      // Send data to backend
      const response = await fetch(`${config.VENDOR_BACKEND_URL}/api/vendor/services`, {
        method: 'PUT',
        body: formData,
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`Server responded with status: ${response.status}`);
      }
      
      const result = await response.json();
      console.log("Service updated successfully:", result);
      
      // Update the service in the services array
      if (result.success && result.data) {
        setServices(prevServices => 
          prevServices.map(s => s.id === result.data.id ? result.data : s)
        );
      }
      
      // Reset form
      setShowEditServiceDialog(false);
      setEditServiceData(null);
      setNewImages([null, null, null]);
      setNewServiceCustomFields([]);
      
      // Show success message
      alert('Service updated successfully!');
    } catch (error) {
      console.error('Error updating service:', error);
      alert('Failed to update service. Please try again.');
    }
  };
  
  const handleDeleteService = async (serviceId) => {
    try {
      if (!currentUser?.email || !serviceId) {
        alert("Missing required information");
        return;
      }
      
      if (!window.confirm("Are you sure you want to delete this service?")) {
        return;
      }
      
      // Send delete request to backend
      const response = await fetch(`${config.VENDOR_BACKEND_URL}/api/vendor/services`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: currentUser.email,
          serviceId: serviceId
        }),
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`Server responded with status: ${response.status}`);
      }
      
      const result = await response.json();
      console.log("Service deleted successfully:", result);
      
      // Remove the service from the services array
      if (result.success) {
        setServices(prevServices => prevServices.filter(s => s.id !== serviceId));
      }
      
      // Show success message
      alert('Service deleted successfully!');
    } catch (error) {
      console.error('Error deleting service:', error);
      alert('Failed to delete service. Please try again.');
    }
  };

  const handleCloseProductAddForm = () => {
    setShowAddProductForm(false);
    setNewProduct({
      name: "",
      category: "",
      keyFeatures: "",
      targetCustomers: "",
      usageAreas: "",
      availableSizes: "",
      packagingDelivery: "",
      certifications: "",
      supportServices: "",
      catalogDemo: "",
      verified: false,
    });
    setProductImages([]);
  };

  const handleCloseServiceAddForm = () => {
    setShowAddServiceForm(false);
    setNewService({
      name: "",
      serviceType: "",
      designPlanning: "",
      residentialDesign: "",
      commercialDesign: "",
      furnitureStyling: "",
      lightingDesign: "",
      colorConsultation: "",
      visualization: "",
      projectManagement: "",
      homeStaging: "",
      onlineConsultation: "",
      sustainableDesign: "",
      renovation: "",
      spaceOptimization: "",
      materialSelection: "",
      isFeatured: false,
    });
  };

  const handleAddProductCustomField = () => {
    setNewProductCustomFields([...newProductCustomFields, { label: "", value: "" }]);
  };
  
  const handleProductCustomFieldChange = (index, key, val) => {
    const updated = [...newProductCustomFields];
    updated[index][key] = val;
    setNewProductCustomFields(updated);
  };
  
  const handleRemoveProductCustomField = (index) => {
    const updated = [...newProductCustomFields];
    updated.splice(index, 1);
    setNewProductCustomFields(updated);
  };

  // Add debugging log for showEditDialog
  useEffect(() => {
    console.log("Edit dialog state changed:", { 
      showEditDialog, 
      hasProductData: !!editProductData,
      productId: editProductData?.id
    });
  }, [showEditDialog, editProductData]);

  // Add this with other state variables near the top of the component
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  // Add this with other state variables near the top of the component
  const [isAddingService, setIsAddingService] = useState(false);

  return (
    <div className="min-h-screen bg-white font-sans w-full pb-64 p-5">
      <AppHeader />
      
      <div className="absolute flex flex-col lg:flex-row gap-8 px-4 md:px-8 py-4 w-full max-w-[1400px] mx-auto left-0 right-0" style={{ top: '30%', marginLeft: 'auto', marginRight: 'auto', minHeight: '100vh' }}>
          
          {/* Profile Card */}
          <UserProfileCard
              profileData={profileData}
              loading={loading}
              error={error}
              onEditProfileClick={handleProfileEditClick}
          />
      
          {/* Right Column: Products & Services Tabs */}
          <section className="w-full lg:w-2/3 bg-white rounded-lg shadow-md p-6 flex-grow min-w-[500px]">
            <Tabs defaultValue="products" className="w-full">
              <TabsList className="w-full grid grid-cols-2 border-b rounded-none">
                <TabsTrigger
                  value="products"
                  className="data-[state=active]:border-b-2 data-[state=active]:border-emerald-500 rounded-none"
                >
                  Products
                </TabsTrigger>
                <TabsTrigger
                  value="services"
                  className="data-[state=active]:border-b-2 data-[state=active]:border-emerald-500 rounded-none"
                >
                  Services
                </TabsTrigger>
              </TabsList>

              {/* Products Tab Content */}
              <TabsContent value="products" className="p-0 m-0">
                <div className="p-4 flex justify-between">
                  <div className="relative w-full max-w-sm">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search here"
                      className="pl-10 pr-4 py-2 w-full"
                      value={productSearchQuery}
                      onChange={(e) => setProductSearchQuery(e.target.value)}
                    />
                  </div>
                  <Button
                    size="sm"
                    className="bg-gradient-to-l from-[#095B49] to-[#000000] hover:opacity-90"
                    onClick={() => {
                      const authToken = localStorage.getItem('authToken');
                      const vendorId = currentUser?.vendorId;

                      if (!config.SALES_URL) {
                        alert('B2B Sales dashboard URL is not configured. Please contact support.');
                        return;
                      }

                      if (!authToken || !vendorId) {
                        alert('You need to be logged in as a vendor to add products.');
                        navigate('/login');
                        return;
                      }

                      const params = new URLSearchParams({
                        authToken,
                        vendorId,
                      });

                      window.location.href = `${config.SALES_URL}/add-new-product?${params.toString()}`;
                    }}
                  >
                    <Plus className="h-4 w-4 mr-1" /> Add
                  </Button>
                </div>
                <div className="space-y-2 p-4">
                  {filteredProducts.map((product) => (
                    <div key={product.id}>
                      <div className="border rounded-md p-4 hover:bg-gray-50 transition-colors">
                        {/* Header Row */}
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="text-lg font-medium text-gray-900">{product.name}</h3>
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="16"
                                height="16"
                                fill="currentColor"
                                className="bi bi-pencil-square text-emerald-500 cursor-pointer"
                                viewBox="0 0 16 16"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEditClick(product);
                                }}
                              >
                                <path d="M15.502 1.94a.5.5 0 0 1 0 .706L14.459 3.69l-2-2L13.502.646a.5.5 0 0 1 .707 0l1.293 1.293z" />
                                <path d="M13.75 4.396l-2-2L4.939 9.21a.5.5 0 0 0-.121.196l-.805 2.414a.25.25 0 0 0 .316.316l2.414-.805a.5.5 0 0 0 .196-.12l6.813-6.814z" />
                                <path
                                  fillRule="evenodd"
                                  d="M1 13.5A1.5 1.5 0 0 0 2.5 15h11a1.5 1.5 0 0 0 1.5-1.5v-6a.5.5 0 0 0-1 0v6a.5.5 0 0 1-.5.5h-11a.5.5 0 0 1-.5-.5v-11a.5.5 0 0 1 .5-.5H9a.5.5 0 0 0 0-1H2.5A1.5 1.5 0 0 0 1 2.5v11z"
                                />
                              </svg>
                              {product.verified && (
                                <svg 
                                  xmlns="http://www.w3.org/2000/svg" 
                                  width="16" 
                                  height="16" 
                                  fill="currentColor" 
                                  className="text-blue-500" 
                                  viewBox="0 0 16 16"
                                >
                                  <path d="M10.97 4.97a.75.75 0 0 1 1.07 1.05l-3.99 4.99a.75.75 0 0 1-1.08.02L4.324 8.384a.75.75 0 1 1 1.06-1.06l2.094 2.093 3.473-4.425a.267.267 0 0 1 .02-.022z"/>
                                </svg>
                              )}
                            </div>
                            <p className="text-sm text-gray-500">{product.category}</p>
                          </div>

                          {/* Expand / Collapse Icon */}
                          <div
                            className="cursor-pointer mt-1"
                            onClick={() => handleProductArrowClick(product.id)}
                          >
                            {expandedProductId === product.id ? (
                              <ChevronUp className="h-5 w-5 text-gray-400" />
                            ) : (
                              <ChevronDown className="h-5 w-5 text-gray-400" />
                            )}
                          </div>
                        </div>

                        {/* Expanded Content */}
                        {expandedProductId === product.id && (
                          <div className="mt-6 transition-all duration-500 ease-in-out">
                            {/* Info Grid */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-8 text-sm text-gray-700">
                              <div>Product name</div>
                              <div className="font-semibold text-black">{product.name}</div>
                              <div>Product type</div>
                              <div className="font-semibold text-black">{product.category}</div>
                              <div>Key features</div>
                              <div className="font-semibold text-black">{product.keyFeatures}</div>
                              <div>Target Customers / Users</div>
                              <div className="font-semibold text-black">{product.targetCustomers}</div>
                              <div>Usage/Application Areas</div>
                              <div className="font-semibold text-black">{product.usageAreas}</div>
                              <div>Available Sizes / Variants</div>
                              <div className="font-semibold text-black">{product.availableSizes}</div>
                              <div>Packaging / Delivery</div>
                              <div className="font-semibold text-black">{product.packagingDelivery}</div>
                              <div>Certifications / Quality Standards</div>
                              <div className="font-semibold text-black">{product.certifications}</div>
                              <div>Support / Installation Services</div>
                              <div className="font-semibold text-black">{product.supportServices}</div>
                              <div>CatLog demo</div>
                              <div>
                                {product.catalogDemo ? (
                                  <a
                                    href={product.catalogDemo}
                                    className="text-blue-600 underline"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                  >
                                    {product.catalogDemo}
                                  </a>
                                ) : (
                                  <span className="text-gray-500">No catalog link provided</span>
                                )}
                              </div>
                              
                              {/* Custom fields if any */}
                              {product.customFields && product.customFields.map((field, index) => (
                                <React.Fragment key={index}>
                                  <div>{field.label}</div>
                                  <div className="font-semibold text-black">{field.value}</div>
                                </React.Fragment>
                              ))}
                            </div>

                            {/* Images */}
                            <div className="flex flex-wrap gap-6 mt-8 justify-center">
                              {product.images && product.images.length > 0 ? (
                                product.images.map((image, index) => (
                                  <img
                                    key={index}
                                    src={(typeof image === 'string' ? image : image?.url) || "https://via.placeholder.com/150"}
                                    alt={`Product ${index + 1}`}
                                    className={`w-44 h-36 object-cover border-2 ${index === 0 ? 'border-blue-500' : 'border-transparent'} rounded`}
                                  />
                                ))
                              ) : (
                                <div className="text-gray-500">No images available</div>
                              )}
                            </div>
                            
                            {/* Delete button */}
                            <div className="mt-6 flex justify-end">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteProduct(product.id);
                                }}
                                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded"
                              >
                                Delete Product
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>

              {/* Services Tab Content */}
              <TabsContent value="services" className="p-0 m-0">
                <div className="p-4 flex justify-between">
                  <div className="relative w-full max-w-sm">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search here"
                      className="pl-10 pr-4 py-2 w-full"
                      value={serviceSearchQuery}
                      onChange={(e) => setServiceSearchQuery(e.target.value)}
                    />
                  </div>
                  <Button
                    size="sm"
                    className="bg-gradient-to-l from-[#095B49] to-[#000000] hover:opacity-90"
                    onClick={() => setShowAddServiceForm(true)}
                  >
                    <Plus className="h-4 w-4 mr-1" /> Add
                  </Button>
                </div>
                <div className="space-y-2 p-4">
                  {filteredServices.map((service) => (
                    <div key={service.id}>
                      <div className="border rounded-md p-6 hover:bg-gray-50 transition-colors">
                        {/* Header: Name, Edit, Dropdown */}
                        <div className="flex justify-between items-center">
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-medium">{service.name}</h3>
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="16"
                                height="16"
                                fill="currentColor"
                                className="bi bi-pencil-square text-emerald-500 cursor-pointer"
                                viewBox="0 0 16 16"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  // Initialize service data for editing
                                  setEditServiceData(service);
                                  setNewImages([null, null, null]); // Reset image uploads
                                  
                                  // Initialize custom fields if the service has them
                                  if (service.customFields) {
                                    const customFieldsArray = [];
                                    for (const [key, value] of Object.entries(service.customFields)) {
                                      customFieldsArray.push({ label: key, value: value });
                                    }
                                    setNewServiceCustomFields(customFieldsArray);
                                  } else {
                                    setNewServiceCustomFields([]); // Reset custom fields if none exist
                                  }
                                  
                                  setShowEditServiceDialog(true);
                                }}
                              >
                                <path d="M15.502 1.94a.5.5 0 0 1 0 .706L14.459 3.69l-2-2L13.502.646a.5.5 0 0 1 .707 0l1.293 1.293z" />
                                <path d="M13.75 4.396l-2-2L4.939 9.21a.5.5 0 0 0-.121.196l-.805 2.414a.25.25 0 0 0 .316.316l2.414-.805a.5.5 0 0 0 .196-.12l6.813-6.814z" />
                                <path
                                  fillRule="evenodd"
                                  d="M1 13.5A1.5 1.5 0 0 0 2.5 15h11a1.5 1.5 0 0 0 1.5-1.5v-6a.5.5 0 0 0-1 0v6a.5.5 0 0 1-.5.5h-11a.5.5 0 0 1-.5-.5v-11a.5.5 0 0 1 .5-.5H9a.5.5 0 0 0 0-1H2.5A1.5 1.5 0 0 0 1 2.5v11z"
                                />
                              </svg>
                            </div>
                            <p className="text-sm text-gray-500">
                              {service.description ? service.description.substring(0, 50) + "..." : "No description"}
                            </p>
                          </div>

                          <div
                            className="cursor-pointer"
                            onClick={() =>
                              setExpandedServiceId(expandedServiceId === service.id ? null : service.id)
                            }
                          >
                            {expandedServiceId === service.id ? (
                              <ChevronUp className="h-5 w-5 text-gray-400" />
                            ) : (
                              <ChevronDown className="h-5 w-5 text-gray-400" />
                            )}
                          </div>
                        </div>

                        {/* Expanded Section */}
                        {expandedServiceId === service.id && (
                          <div className="mt-6 transition-all duration-500 ease-in-out">
                            <h2 className="text-lg font-semibold text-gray-800 mb-4">Service Details</h2>
                            <div className="grid grid-cols-2 gap-y-4 gap-x-8 text-sm text-gray-700">
                              <div>Service Type</div>
                              <div className="font-semibold text-black">{service.serviceType || "Not specified"}</div>
                              <div>Description / Scope of Work</div>
                              <div className="font-semibold text-black">{service.description || "Not specified"}</div>
                              <div>Industries / Clients Served</div>
                              <div className="font-semibold text-black">{service.industries || "Not specified"}</div>
                              <div>Project Size / Budget Range</div>
                              <div className="font-semibold text-black">{service.budgetRange || "Not specified"}</div>
                              <div>Delivery Method</div>
                              <div className="font-semibold text-black">{service.deliveryMethod || "Not specified"}</div>
                              <div>Tools / Materials Used</div>
                              <div className="font-semibold text-black">{service.materials || "Not specified"}</div>
                              <div>Packages / Pricing Models</div>
                              <div className="font-semibold text-black">{service.pricing || "Not specified"}</div>
                              <div>Compliance & Standards Followed</div>
                              <div className="font-semibold text-black">{service.compliance || "Not specified"}</div>
                              <div>Success Stories / Case Studies</div>
                              <div className="font-semibold text-black">{service.caseStudies || "Not specified"}</div>
                              
                              {/* Delete button */}
                              <div className="mt-6 col-span-2 flex justify-end">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteService(service.id);
                                  }}
                                  className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded"
                                >
                                  Delete Service
                                </button>
                              </div>
                            </div>

                            {service.images && service.images.length > 0 && (
                              <div className="flex gap-6 mt-8">
                                {service.images.map((image, index) => (
                                  <img
                                    key={index}
                                    src={image}
                                    alt={`Service ${service.name} - ${index + 1}`}
                                    className="w-44 h-36 object-cover border-2 border-transparent rounded"
                                  />
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          </section>
      </div>
      
      {/* Edit Profile Modal */}
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
                                        className="relative px-3 py-2 border border-gray-300 rounded-l-md focus:z-10 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm bg-white"
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
                                        className="relative -ml-px flex-1 px-3 py-2 border border-gray-300 rounded-r-md focus:z-10 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm bg-white"
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
                                        className="relative px-3 py-2 border border-gray-300 rounded-l-md focus:z-10 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm bg-white"
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
                                        className="relative -ml-px flex-1 px-3 py-2 border border-gray-300 rounded-r-md focus:z-10 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm bg-white"
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

      {/* Add product form modal */}
      {showAddProductForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-5xl overflow-y-auto max-h-[90vh] relative">
            <button
              onClick={handleCloseProductAddForm}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
            >
              <X size={20} />
            </button>

            <h2 className="text-2xl font-semibold mb-6 text-gray-800 border-b pb-2">
              Add New Product
            </h2>
            
            <div className="pb-1rem">
              {/* Add your form inputs and dynamic fields here */}
            </div>

            <div className="grid grid-cols-1 gap-4">
              {[
                { label: "Product name", name: "name" },
                { label: "Product type", name: "category" },
                { label: "Target Customers / Users", name: "targetCustomers" },
                { label: "Usage / Application Areas", name: "usageAreas" },
                { label: "Available Sizes / Variants", name: "availableSizes" },
                { label: "Packaging / Delivery", name: "packagingDelivery" },
                { label: "Certifications / Quality Standards", name: "certifications" },
                { label: "Support / Installation Services", name: "supportServices" },
                { label: "Catalog demo", name: "catalogDemo" },
              ].map(({ label, name }) => (
                <div key={name} className="flex items-start gap-4">
                  <label htmlFor={name} className="w-1/3 text-gray-600 pt-2">
                    {label}
                  </label>
                  <input
                    type="text"
                    id={name}
                    name={name}
                    value={newProduct[name] || ""}
                    onChange={handleProductInputChange}
                    className="flex-1 border border-gray-300 rounded-md px-3 py-2 bg-gray-50"
                  />
                </div>
              ))}

              {/* Render dynamic custom fields */}
              {customFields.map((field, index) => (
                <div key={index} className="flex items-start gap-4">
                  <input
                    type="text"
                    placeholder="Add details"
                    value={field.label}
                    onChange={(e) => handleCustomFieldChange(index, "label", e.target.value)}
                    className="w-1/3 border border-gray-300 rounded-md px-3 py-2 bg-gray-50"
                  />
                  <input
                    type="text"
                    placeholder=""
                    value={field.value}
                    onChange={(e) => handleCustomFieldChange(index, "value", e.target.value)}
                    className="flex-1 border border-gray-300 rounded-md px-3 py-2 bg-gray-50"
                  />
                  <button
                    onClick={() => handleRemoveCustomField(index)}
                    className="text-red-500 hover:text-red-700 text-lg pt-2"
                  >
                    −
                  </button>
                </div>
              ))}
            </div>
            <div className="sticky bottom-0 right-0 flex justify-end bg-white py-2 z-10">
              <button
                onClick={handleAddCustomField}
                className="mb-4 text-sm font-medium text-emerald-700 hover:underline"
              >
                + Add Field
              </button>
            </div>

            {/* Product Images Upload */}
            <div className="mt-8">
              <label className="block text-gray-600 mb-2">Product Images</label>
              <div className="flex flex-wrap gap-4">
                {productImages.map((image, index) => (
                  <img
                    key={index}
                    src={URL.createObjectURL(image)}
                    alt={`Product ${index + 1}`}
                    className="w-24 h-24 object-cover rounded-md border"
                  />
                ))}
                <label
                  htmlFor="productImageUpload"
                  className="w-24 h-24 flex items-center justify-center border-2 border-dashed text-gray-400 rounded-md cursor-pointer hover:border-emerald-500"
                >
                  +
                </label>
                <input
                  type="file"
                  id="productImageUpload"
                  multiple
                  className="hidden"
                  onChange={handleProductImageUpload}
                />
              </div>
            </div>

            {/* Form Actions */}
            <div className="mt-8 flex justify-end gap-4">
              <button
                onClick={handleCloseProductAddForm}
                className="border border-gray-300 px-4 py-2 rounded-md hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={handleAddProduct}
                disabled={isAddingProduct}
                className={`bg-emerald-700 hover:bg-emerald-800 text-white font-medium px-6 py-2 rounded-md transition ${
                  isAddingProduct ? 'opacity-70 cursor-not-allowed' : ''
                }`}
              >
                {isAddingProduct ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing...
                  </>
                ) : (
                  'Add Product'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add service modal */}
      {showAddServiceForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-5xl overflow-y-auto max-h-[90vh] relative">
            <button
              onClick={handleCloseServiceAddForm}
              className="absolute top-4 right-8 text-gray-500 hover:text-gray-700"
            >
              <X size={20} />
            </button>
            <h2 className="text-2xl font-semibold mb-6 text-gray-800 border-b pb-2">
              Add New Service
            </h2>
            <div className="pb-1rem">
              {/* Add your form inputs and dynamic fields here */}
            </div>

            <div className="grid grid-cols-1 gap-4">
              {[
                { label: "Service Name", name: "name", type: "text" },
                { label: "Service Type", name: "serviceType", type: "text" },
                { label: "Description / Scope of Work", name: "description", type: "textarea" },
                { label: "Industries / Clients Served", name: "industries", type: "textarea" },
                { label: "Project Size / Budget Range", name: "budgetRange", type: "textarea" },
                { label: "Delivery Method", name: "deliveryMethod", type: "text" },
                { label: "Tools / Materials Used", name: "materials", type: "text" },
                { label: "Packages / Pricing Models", name: "pricing", type: "text" },
                { label: "Compliance & Standards Followed", name: "compliance", type: "textarea" },
                { label: "Success Stories / Case Studies", name: "caseStudies", type: "text" },
              ].map(({ label, name, type }) => (
                <div key={name} className="flex items-start gap-4">
                  <label htmlFor={name} className="w-1/3 text-gray-600 pt-2">
                    {label}
                  </label>
                  {type === "textarea" ? (
                    <textarea
                      id={name}
                      name={name}
                      value={newService[name] || ""}
                      onChange={handleServiceInputChange}
                      className="flex-1 border border-gray-300 rounded-md px-3 py-2 bg-gray-50"
                    />
                  ) : (
                    <input
                      id={name}
                      name={name}
                      type="text"
                      value={newService[name] || ""}
                      onChange={handleServiceInputChange}
                      className="flex-1 border border-gray-300 rounded-md px-3 py-2 bg-gray-50"
                    />
                  )}
                </div>
              ))}
            </div>

            {/* Render dynamic custom fields for services */}
            {newServiceCustomFields.map((field, index) => (
              <div key={index} className="flex items-start gap-4 mt-3">
                <label className=" text-gray-600 pt-2 flex-shrink-0">
                  <Input
                    type="text"
                    placeholder="Add service"
                    value={field.label}
                    onChange={(e) => handleServiceCustomFieldChange(index, "label", e.target.value)}
                    className="w-1/3 border border-gray-300 rounded-md px-4 py-2 bg-gray-50 "
                  />
                </label>
                <Input
                  type="text"
                  value={field.value || ""}
                  onChange={(e) => handleServiceCustomFieldChange(index, "value", e.target.value)}
                  className="flex-1 border border-gray-300 rounded-md px-3 py-2 bg-gray-50"
                />
                <button
                  onClick={() => handleRemoveServiceCustomField(index)}
                  className="text-red-500 hover:text-red-700 text-lg pt-2"
                >
                  −
                </button>
              </div>
            ))}
            <div className="sticky bottom-0 right-0 flex bg-white py-2 z-10 mt-top justify-end">
              <button
                onClick={handleAddServiceCustomField}
                className="text-sm font-medium text-emerald-700 hover:underline"
              >
                + Add Field
              </button>
            </div>

            {/* Image Upload Section */}
            <div className="mt-8">
              <label className="block text-gray-600 mb-2">Service Images</label>
              <div className="flex flex-wrap gap-4">
                {serviceImages.map((image, index) => (
                  <img
                    key={index}
                    src={URL.createObjectURL(image)}
                    alt={`Service ${index + 1}`}
                    className="w-24 h-24 object-cover rounded-md border"
                  />
                ))}
                <label
                  htmlFor="serviceImageUpload"
                  className="w-24 h-24 flex items-center justify-center border-2 border-dashed text-gray-400 rounded-md cursor-pointer hover:border-emerald-500"
                >
                  +
                </label>
                <input
                  type="file"
                  id="serviceImageUpload"
                  multiple
                  className="hidden"
                  onChange={handleServiceImageUpload}
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-8 flex justify-end gap-4">
              <button
                onClick={handleCloseServiceAddForm}
                className="border border-gray-300 px-4 py-2 rounded-md hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={handleAddService}
                disabled={isAddingService}
                className={`bg-emerald-700 hover:bg-emerald-800 text-white font-medium px-6 py-2 rounded-md transition ${
                  isAddingService ? 'opacity-70 cursor-not-allowed' : ''
                }`}
              >
                {isAddingService ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing...
                  </>
                ) : (
                  'Add Service'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Edit dialogs - outside the main container but inside the return */}
      <ServiceEditDialog
        showEditServiceDialog={showEditServiceDialog}
        editServiceData={editServiceData}
        setEditServiceData={setEditServiceData}
        newImages={newImages}
        setNewImages={setNewImages}
        setShowEditServiceDialog={setShowEditServiceDialog}
        handleUpdateService={handleUpdateService}
        newServiceCustomFields={newServiceCustomFields}
        setNewServiceCustomFields={setNewServiceCustomFields}
        handleServiceCustomFieldChange={handleServiceCustomFieldChange}
        handleRemoveServiceCustomField={handleRemoveServiceCustomField}
        handleAddServiceCustomField={handleAddServiceCustomField}
      />

      <ProductEditDialog
        showEditProductDialog={showEditDialog}
        editProductData={editProductData}
        setEditProductData={setEditProductData}
        newImages={newImages}
        setNewImages={setNewImages}
        setShowEditProductDialog={setShowEditDialog}
        handleUpdateProduct={handleUpdateProduct}
        newProductCustomFields={newProductCustomFields}
        setNewProductCustomFields={setNewProductCustomFields}
        handleProductCustomFieldChange={handleProductCustomFieldChange}
        handleRemoveProductCustomField={handleRemoveProductCustomField}
        handleAddProductCustomField={handleAddProductCustomField}
      />
    </div>
  );
}
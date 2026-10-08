import React from "react";
import { useState, useEffect, useContext, useCallback, useRef } from "react";
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
import ServiceEditDialog from "../../UserProductPage/ServiceEditDialog";
import ProductEditDialog from "../../UserProductPage/ProductEditDialog";
import { Link } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import { Button } from "/src/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "/src/components/ui/tabs";
import { Input } from "/src/components/ui/input";
import profilePlaceholder from "../../../assets/profileplaceholder.jpg";
import { UserContext } from "../../../context/UserContext";
import { VendorContext } from "../../../context/VendorContext";
import config from "../../../config/env";
import { redirectToSalesWithHandoff } from "../../../utils/handoffToSales";
import VendorTabPanel from "../../../components/layout/VendorTabPanel";
export default function CatalogueView({ editProfileSignal = 0 }) {
  const { currentUser } = useContext(UserContext);
  const { currentUser: vendorUser, vendorData, setVendorData } = useContext(VendorContext);
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("products");
  const servicesFetchedRef = React.useRef(false);
  const productsFetchedRef = React.useRef(false);
  const lastTabRef = React.useRef("products");
  const [productSearchQuery, setProductSearchQuery] = useState("");
  const [expandedProductId, setExpandedProductId] = useState(null);
  const [showAddProductForm, setShowAddProductForm] = useState(false);
  const [showAddServiceForm, setShowAddServiceForm] = useState(false);
  const [dynamicFields, setDynamicFields] = useState([]);
  const [customFields, setCustomFields] = useState([]);
  const [showEditServiceDialog, setShowEditServiceDialog] = useState(false);
  const [editServiceData, setEditServiceData] = useState({});
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dataFetched, setDataFetched] = useState(false);
  const [profileData, setProfileData] = useState({
    name: currentUser?.name || vendorUser?.name || "Loading...",
    vendorId: "#Loading",
    image: profilePlaceholder,
    companyName: "Loading...",
    phone: "Loading...",
    location: "Loading...",
    email: currentUser?.email || vendorUser?.email || "Loading...",
    gstNumber: "",
    panNumber: ""
  });
  const [profileFormData, setProfileFormData] = useState({ ...profileData });
  const [imagePreview, setImagePreview] = useState(profileData.imageUrl);
  const [selectedCountry, setSelectedCountry] = useState("");
  const [states, setStates] = useState([]);
  const [selectedState, setSelectedState] = useState("");
  const [phoneCountryCode, setPhoneCountryCode] = useState("");
  const [phoneNumberWithoutCode, setPhoneNumberWithoutCode] = useState("");
  const countryCodes = [
    { code: "+1", country: "USA" },
    { code: "+44", country: "UK" },
    { code: "+91", country: "India" },
    { code: "+81", country: "Japan" }
    // Add more country codes as needed
  ];
  const countryStateData = {
    "USA": ["California", "New York", "Texas"],
    "UK": ["London", "Manchester", "Birmingham"],
    "India": ["Karnataka", "Maharashtra", "Delhi"],
    "Japan": ["Tokyo", "Osaka", "Kyoto"]
    // Add more countries and their states
  };
  useEffect(() => {
    console.log("UserProductPage - Current User Context:", currentUser);
    console.log("UserProductPage - Vendor User Context:", vendorUser);
  }, [currentUser, vendorUser]);
  useEffect(() => {
    if (dataFetched) {
      return;
    }
    const fetchVendorData = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem("authToken");
        const response = await fetch(`${config.VENDOR_BACKEND_URL}/api/vendor/me`, {
          credentials: "include",
          headers: token ? { Authorization: `Bearer ${token}` } : void 0
        });
        if (!response.ok) {
          throw new Error(`Server responded with status: ${response.status}`);
        }
        const data = await response.json();
        console.log("Vendor data response:", data);
        if (data.success && data.data) {
          const vendor = data.data;
          const rawVendorId = vendor.vendorId || vendor.id;
          const newProfileData = {
            name: vendor.vendorDetails?.primaryContactName || currentUser?.name || vendorUser?.name || "",
            vendorId: rawVendorId ? `#${String(rawVendorId).substring(0, 6)}` : "#CXV001",
            image: vendor.profileImage?.url || profilePlaceholder,
            companyName: vendor.companyDetails?.companyName || vendor.vendorDetails?.companyName || "",
            phone: vendor.vendorDetails?.primaryContactPhone || "",
            location: `${vendor.companyDetails?.state || ""}, ${vendor.companyDetails?.country || ""}`,
            email: vendor.vendorDetails?.primaryContactEmail || vendor.email || currentUser?.email || vendorUser?.email || "",
            gstNumber: vendor.companyDetails?.gstNumber || "",
            panNumber: vendor.companyDetails?.panNumber || ""
          };
          setProfileData(newProfileData);
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
      } catch (error2) {
        console.error("Error fetching vendor data:", error2);
        setError("Failed to fetch vendor data");
        setLoading(false);
      }
    };
    const timer = setTimeout(() => {
      console.log("UserProductPage - Executing delayed data fetch");
      fetchVendorData();
    }, 500);
    return () => clearTimeout(timer);
  }, []);
  useEffect(() => {
    if (isProfileModalOpen) {
      let currentState = "";
      let currentCountry = "";
      if (profileFormData.location && profileFormData.location !== "Location not specified") {
        const locationParts = profileFormData.location.split(", ");
        if (locationParts.length === 2) {
          currentState = locationParts[0];
          currentCountry = locationParts[1];
        } else if (locationParts.length === 1) {
          const singlePart = locationParts[0];
          if (Object.keys(countryStateData).includes(singlePart)) {
            currentCountry = singlePart;
          } else {
            currentState = singlePart;
          }
        }
      }
      setSelectedCountry(currentCountry || "");
      setSelectedState(currentState || "");
      setStates(countryStateData[currentCountry] || []);
      const phoneValue = profileFormData.phone || "";
      const phoneMatch = phoneValue.match(/^(\+\d+)?\s*(.*)$/);
      if (phoneMatch) {
        setPhoneCountryCode(phoneMatch[1] || "");
        setPhoneNumberWithoutCode(phoneMatch[2] || "");
      } else {
        setPhoneCountryCode("");
        setPhoneNumberWithoutCode(phoneValue);
      }
      setImagePreview(profileData.image);
    }
  }, [isProfileModalOpen]);
  useEffect(() => {
    const isObjectURL = typeof imagePreview === "string" && imagePreview.startsWith("blob:");
    return () => {
      if (isObjectURL) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);
  useEffect(() => {
    if (isProfileModalOpen || showAddProductForm || showAddServiceForm) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isProfileModalOpen, showAddProductForm, showAddServiceForm]);
  const profileDataRef = useRef(profileData);
  profileDataRef.current = profileData;
  const handleProfileEditClick = useCallback(() => {
    setProfileFormData({ ...profileDataRef.current });
    setIsProfileModalOpen(true);
  }, []);
  const lastEditSignalRef = useRef(editProfileSignal);
  useEffect(() => {
    if (editProfileSignal > lastEditSignalRef.current) {
      lastEditSignalRef.current = editProfileSignal;
      handleProfileEditClick();
    }
  }, [editProfileSignal]);
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
      if (typeof imagePreview === "string" && imagePreview.startsWith("blob:")) {
        URL.revokeObjectURL(imagePreview);
      }
      setImagePreview(previewUrl);
      setProfileFormData((prevData) => ({ ...prevData, imageFile: file, imageUrl: previewUrl }));
    }
  };
  const handleProfileSave = async () => {
    try {
      if (!selectedState || !selectedCountry) {
        alert("Please select both state and country");
        return;
      }
      const updatedLocation = `${selectedState}, ${selectedCountry}`;
      const updatedPhone = `${phoneCountryCode} ${phoneNumberWithoutCode}`;
      const dataToSave = {
        ...profileFormData,
        location: updatedLocation,
        phone: updatedPhone
      };
      if (dataToSave.imageFile) {
        delete dataToSave.imageFile;
      }
      setProfileData(dataToSave);
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
      const formData = new FormData();
      formData.append("vendorDetails", JSON.stringify(vendorUpdateData.vendorDetails));
      formData.append("companyDetails", JSON.stringify(vendorUpdateData.companyDetails));
      if (profileFormData.imageFile) {
        formData.append("profileImage", profileFormData.imageFile);
      }
      const response = await fetch(`${config.VENDOR_BACKEND_URL}/api/vendor/update-profile`, {
        method: "POST",
        body: formData
      });
      if (!response.ok) {
        throw new Error(`Server responded with status: ${response.status}`);
      }
      const result = await response.json();
      console.log("Profile update result:", result);
      setVendorData({
        ...vendorData,
        vendorDetails: vendorUpdateData.vendorDetails,
        companyDetails: vendorUpdateData.companyDetails
      });
      if (result.data && result.data.profileImage && result.data.profileImage.url) {
        setProfileData((prevData) => ({
          ...prevData,
          image: result.data.profileImage.url
        }));
      }
      setIsProfileModalOpen(false);
      alert("Profile updated successfully!");
    } catch (error2) {
      console.error("Error updating profile:", error2);
      alert(`Failed to update profile: ${error2.message}`);
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
    verified: false
  });
  const [productImages, setProductImages] = useState([]);
  const [serviceImages, setServiceImages] = useState([]);
  const [serviceSearchQuery, setServiceSearchQuery] = useState("");
  const [expandedServiceId, setExpandedServiceId] = useState(null);
  const [currentProductPage, setCurrentProductPage] = useState(1);
  const [currentServicePage, setCurrentServicePage] = useState(1);
  const [newServiceCustomFields, setNewServiceCustomFields] = useState([]);
  const [newProductCustomFields, setNewProductCustomFields] = useState([]);
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
    isFeatured: false
  });
  const handleProductArrowClick = (productId) => {
    setExpandedProductId(expandedProductId === productId ? null : productId);
  };
  const handleEditClick = (product) => {
    const authToken = localStorage.getItem("authToken");
    const vendorId = currentUser?.vendorId;
    if (!config.SALES_URL) {
      alert("B2B Sales dashboard URL is not configured. Please contact support.");
      return;
    }
    if (!authToken || !vendorId || !product?.id) {
      alert("Missing authentication details or product id.");
      return;
    }
    const params = new URLSearchParams({
      authToken,
      vendorId
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
      const formData = new FormData();
      formData.append("email", currentUser?.email || vendorUser?.email || profileData.email);
      formData.append("productId", editProductData.id);
      if (newProductCustomFields && newProductCustomFields.length > 0) {
        const customData2 = {};
        newProductCustomFields.forEach((field) => {
          if (field.label && field.value) {
            customData2[field.label] = field.value;
          }
        });
        const productDataWithCustomFields = {
          ...editProductData,
          customFields: customData2
        };
        formData.append("productData", JSON.stringify(productDataWithCustomFields));
      } else {
        formData.append("productData", JSON.stringify(editProductData));
      }
      const filesToUpload = newImages.filter((img) => img !== null);
      filesToUpload.forEach((image) => {
        formData.append("productImages", image);
      });
      const response = await fetch(`${config.VENDOR_BACKEND_URL}/api/vendor/products`, {
        method: "PUT",
        body: formData,
        credentials: "include"
      });
      if (!response.ok) {
        throw new Error(`Server responded with status: ${response.status}`);
      }
      const result = await response.json();
      console.log("Product updated successfully:", result);
      if (result.success && result.data) {
        setProducts(
          (prevProducts) => prevProducts.map((p) => p.id === result.data.id ? result.data : p)
        );
      } else {
        const updatedProducts = products.map((p) => {
          if (p.id === editProductData.id) {
            return { ...p, ...editProductData };
          }
          return p;
        });
        setProducts(updatedProducts);
      }
      setShowEditDialog(false);
      setEditProductData(null);
      setNewImages([null, null, null]);
      setNewProductCustomFields([]);
      alert("Product updated successfully!");
    } catch (error2) {
      console.error("Error updating product:", error2);
      alert("Failed to update product. Please try again.");
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
      const token = localStorage.getItem("authToken");
      const response = await fetch(`${config.VENDOR_BACKEND_URL}/api/vendor/products`, {
        method: "DELETE",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          ...token ? { Authorization: `Bearer ${token}` } : {}
        },
        body: JSON.stringify({ productId })
      });
      if (!response.ok) {
        throw new Error(`Server responded with status: ${response.status}`);
      }
      const result = await response.json();
      console.log("Product deleted successfully:", result);
      if (result.success) {
        setProducts((prevProducts) => prevProducts.filter((p) => p.id !== productId));
      }
      alert("Product deleted successfully!");
    } catch (error2) {
      console.error("Error deleting product:", error2);
      alert("Failed to delete product. Please try again.");
    }
  };
  const handleEditService = (serviceData) => {
    setEditServiceData(serviceData);
    setNewImages([null, null, null]);
    setShowEditServiceDialog(true);
  };
  const handleAddField = () => {
    setDynamicFields([...dynamicFields, { label: "", value: "" }]);
  };
  const handleAddCustomField = () => {
    setCustomFields([...customFields, { label: "", value: "" }]);
  };
  const handleAddServiceCustomField = () => {
    setNewServiceCustomFields([...newServiceCustomFields, { label: "", value: "" }]);
  };
  const handleServiceCustomFieldChange = (index, key, val) => {
    const updated = [...newServiceCustomFields];
    updated[index][key] = val;
    setNewServiceCustomFields(updated);
  };
  const handleRemoveServiceCustomField = (index) => {
    const updated = [...newServiceCustomFields];
    updated.splice(index, 1);
    setNewServiceCustomFields(updated);
  };
  const handleServiceArrowClick = (serviceId) => {
    setExpandedServiceId(expandedServiceId === serviceId ? null : serviceId);
  };
  function handleRemoveServiceImage(index) {
    setServiceImages((prev) => prev.filter((_, i) => i !== index));
  }
  const [products, setProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [productsError, setProductsError] = useState(null);
  useEffect(() => {
    lastTabRef.current = activeTab;
    if (activeTab !== "products")
      return;
    let isMounted = true;
    const fetchProducts = async () => {
      const token = localStorage.getItem("authToken");
      try {
        setProductsLoading(true);
        setProductsError(null);
        const response = await fetch(`${config.VENDOR_BACKEND_URL}/api/vendor/products`, {
          credentials: "include",
          headers: token ? { Authorization: `Bearer ${token}` } : void 0
        });
        if (!response.ok) {
          throw new Error(`Server responded with status: ${response.status}`);
        }
        const payload = await response.json();
        const items = Array.isArray(payload?.data) ? payload.data : Array.isArray(payload) ? payload : [];
        const normalized = items.map((item) => ({
          ...item,
          id: item.productId || item.id,
          name: item.productName || item.name || "Unnamed Product",
          category: item.productCategory || item.category || "",
          verified: (item.status || "").toUpperCase() === "PUBLISHED",
          keyFeatures: Array.isArray(item.productFeatures) ? item.productFeatures.join(", ") : item.productFeatures,
          targetCustomers: Array.isArray(item.targetMarket) ? item.targetMarket.join(", ") : item.targetMarket,
          usageAreas: item.detailedDescription || item.shortDescription || "",
          availableSizes: Array.isArray(item.sizeOptions) ? item.sizeOptions.join(", ") : item.sizeOptions,
          packagingDelivery: item.packagingDetails || "",
          certifications: item.businessLicense || "",
          supportServices: item.afterSalesService || "",
          catalogDemo: item.catalogDemo || "",
          customFields: Array.isArray(item.displayAttributes) ? item.displayAttributes.map((a) => ({ label: a?.property, value: a?.value })) : [],
          images: Array.isArray(item.images) ? item.images : []
        }));
        if (isMounted) {
          setProducts(normalized);
          productsFetchedRef.current = true;
        }
      } catch (error2) {
        console.error("Error fetching products:", error2);
        if (isMounted) {
          setProductsError("Failed to load products.");
          setProducts([]);
        }
      } finally {
        if (isMounted) {
          setProductsLoading(false);
        }
      }
    };
    if (!productsFetchedRef.current) {
      fetchProducts();
    }
    const onFocus = () => fetchProducts();
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible")
        fetchProducts();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      isMounted = false;
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [currentUser?.vendorId]);
  const [services, setServices] = useState([]);
  const [servicesLoading, setServicesLoading] = useState(false);
  const [servicesError, setServicesError] = useState(null);
  useEffect(() => {
    if (activeTab !== "services")
      return;
    if (servicesFetchedRef.current)
      return;
    const fetchServices = async () => {
      if (!currentUser)
        return;
      try {
        setServicesLoading(true);
        setServicesError(null);
        const token = localStorage.getItem("authToken");
        const response = await fetch(`${config.VENDOR_BACKEND_URL}/api/vendor/services`, {
          credentials: "include",
          headers: token ? { Authorization: `Bearer ${token}` } : void 0
        });
        if (!response.ok) {
          if (response.status === 404) {
            console.log("Services API not implemented yet; leaving services empty");
            return;
          }
          throw new Error(`Server responded with status: ${response.status}`);
        }
        const data = await response.json();
        console.log("Services data response:", data);
        if (data.success && data.data && data.data.length > 0) {
          setServices(data.data);
        }
        servicesFetchedRef.current = true;
      } catch (error2) {
        console.error("Error fetching services:", error2);
        setServicesError("Failed to load services.");
      } finally {
        setServicesLoading(false);
      }
    };
    fetchServices();
  }, [currentUser?.email, activeTab]);
  const filteredProducts = products.filter(
    (product) => product.name?.toLowerCase().includes(productSearchQuery.toLowerCase()) || product.category?.toLowerCase().includes(productSearchQuery.toLowerCase())
  );
  const filteredServices = services.filter(
    (service) => service.name?.toLowerCase().includes(serviceSearchQuery.toLowerCase()) || service.serviceType?.toLowerCase().includes(serviceSearchQuery.toLowerCase())
  );
  const itemsPerPage = 5;
  const totalProductPages = Math.max(1, Math.ceil(filteredProducts.length / itemsPerPage));
  const totalServicePages = Math.max(1, Math.ceil(filteredServices.length / itemsPerPage));
  const paginatedProducts = filteredProducts.slice(
    (currentProductPage - 1) * itemsPerPage,
    currentProductPage * itemsPerPage
  );
  const paginatedServices = filteredServices.slice(
    (currentServicePage - 1) * itemsPerPage,
    currentServicePage * itemsPerPage
  );
  useEffect(() => {
    setCurrentProductPage(1);
    setExpandedProductId(null);
  }, [productSearchQuery]);
  useEffect(() => {
    setCurrentServicePage(1);
    setExpandedServiceId(null);
  }, [serviceSearchQuery]);
  useEffect(() => {
    if (currentProductPage > totalProductPages) {
      setCurrentProductPage(totalProductPages);
    }
  }, [currentProductPage, totalProductPages]);
  useEffect(() => {
    if (currentServicePage > totalServicePages) {
      setCurrentServicePage(totalServicePages);
    }
  }, [currentServicePage, totalServicePages]);
  const renderPaginationControls = (currentPage, totalPages, onPageChange) => {
    if (totalPages <= 1) {
      return null;
    }
    return /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between border-t border-line px-6 py-4" }, /* @__PURE__ */ React.createElement("p", { className: "text-sm text-dim" }, "Page ", currentPage, " of ", totalPages), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2" }, /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        onClick: () => onPageChange(Math.max(1, currentPage - 1)),
        disabled: currentPage === 1,
        className: "rounded-md border border-line px-3 py-2 text-sm font-medium text-dim transition-colors hover:bg-canvas disabled:cursor-not-allowed disabled:opacity-50"
      },
      "Previous"
    ), /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        onClick: () => onPageChange(Math.min(totalPages, currentPage + 1)),
        disabled: currentPage === totalPages,
        className: "rounded-md border border-line px-3 py-2 text-sm font-medium text-dim transition-colors hover:bg-canvas disabled:cursor-not-allowed disabled:opacity-50"
      },
      "Next"
    )));
  };
  const handleSaveService = () => {
    console.log("Updated Service Data:", editServiceData);
    console.log("New Images:", newImages);
    setShowEditServiceDialog(false);
  };
  const handleProductInputChange = (e) => {
    const { name, value } = e.target;
    setNewProduct((prevState) => ({
      ...prevState,
      [name]: value
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
  const handleRemoveMultipleInput = (field, index) => {
    const updatedField = [...newProduct[field] || []];
    updatedField.splice(index, 1);
    setNewProduct((prev) => ({
      ...prev,
      [field]: updatedField
    }));
  };
  const handleRemoveCustomField = (index) => {
    const updated = [...customFields];
    updated.splice(index, 1);
    setCustomFields(updated);
  };
  const customData = {};
  newCustomFields.forEach((field) => {
    if (field.label && field.value) {
      customData[field.label] = field.value;
    }
  });
  const productToSave = {
    ...newProduct,
    customFields: customData
    // Assign the custom data
  };
  console.log("Product to Save:", productToSave);
  const handleServiceInputChange = (e) => {
    const { name, value } = e.target;
    setNewService((prevState) => ({
      ...prevState,
      [name]: value
    }));
  };
  const handleMultipleInputChange = (field, index, event) => {
    const updatedList = [...newProduct[field]];
    updatedList[index] = event.target.value;
    setNewProduct({ ...newProduct, [field]: updatedList });
  };
  const handleAddMultipleInput = (field) => {
    const updatedList = [...newProduct[field] || []];
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
  const handleServiceImageUpload = (e) => {
    const files = Array.from(e.target.files);
    setServiceImages((prevImages) => [...prevImages, ...files]);
  };
  const handleAddProduct = async () => {
    if (isAddingProduct)
      return;
    setIsAddingProduct(true);
    try {
      if (!currentUser?.email) {
        alert("You must be logged in to add a product");
        return;
      }
      const formData = new FormData();
      formData.append("email", currentUser.email);
      formData.append("productData", JSON.stringify(newProduct));
      productImages.forEach((image) => {
        formData.append("productImages", image);
      });
      if (customFields.length > 0) {
        formData.append("customFields", JSON.stringify(customFields));
      }
      const response = await fetch(`${config.VENDOR_BACKEND_URL}/api/vendor/products`, {
        method: "POST",
        body: formData,
        credentials: "include"
      });
      if (!response.ok) {
        throw new Error(`Server responded with status: ${response.status}`);
      }
      const result = await response.json();
      console.log("Product added successfully:", result);
      if (result.success && result.data) {
        setProducts((prevProducts) => [...prevProducts, result.data]);
      }
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
        verified: false
      });
      setProductImages([]);
      setCustomFields([]);
      alert("Product added successfully!");
    } catch (error2) {
      console.error("Error adding product:", error2);
      alert("Failed to add product. Please try again.");
    } finally {
      setIsAddingProduct(false);
    }
  };
  const handleAddService = async () => {
    if (isAddingService)
      return;
    setIsAddingService(true);
    try {
      if (!currentUser?.email && !vendorUser?.email && !profileData.email) {
        alert("You must be logged in to add a service");
        return;
      }
      console.log("Adding service with data:", newService);
      console.log("Service images:", serviceImages);
      console.log("Custom fields:", newServiceCustomFields);
      const formData = new FormData();
      formData.append("email", currentUser?.email || vendorUser?.email || profileData.email);
      formData.append("serviceData", JSON.stringify(newService));
      serviceImages.forEach((image) => {
        formData.append("serviceImages", image);
      });
      if (newServiceCustomFields.length > 0) {
        formData.append("customFields", JSON.stringify(newServiceCustomFields));
      }
      const token = localStorage.getItem("authToken");
      const response = await fetch(`${config.VENDOR_BACKEND_URL}/api/vendor/services`, {
        method: "POST",
        body: formData,
        credentials: "include",
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (!response.ok) {
        throw new Error(`Server responded with status: ${response.status}`);
      }
      const result = await response.json();
      console.log("Service added successfully:", result);
      if (result.success && result.data) {
        setServices((prevServices) => [...prevServices, result.data]);
      }
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
        isFeatured: false
      });
      setServiceImages([]);
      setNewServiceCustomFields([]);
      alert("Service added successfully!");
    } catch (error2) {
      console.error("Error adding service:", error2);
      alert("Failed to add service. Please try again.");
    } finally {
      setIsAddingService(false);
    }
  };
  const handleUpdateService = async () => {
    try {
      if (!editServiceData?.id || !currentUser?.email && !vendorUser?.email && !profileData.email) {
        alert("Missing required information");
        return;
      }
      const formData = new FormData();
      formData.append("email", currentUser?.email || vendorUser?.email || profileData.email);
      formData.append("serviceId", editServiceData.id);
      if (newServiceCustomFields && newServiceCustomFields.length > 0) {
        const customData2 = {};
        newServiceCustomFields.forEach((field) => {
          if (field.label && field.value) {
            customData2[field.label] = field.value;
          }
        });
        const serviceDataWithCustomFields = {
          ...editServiceData,
          customFields: customData2
        };
        formData.append("serviceData", JSON.stringify(serviceDataWithCustomFields));
      } else {
        formData.append("serviceData", JSON.stringify(editServiceData));
      }
      const filesToUpload = newImages.filter((img) => img !== null);
      filesToUpload.forEach((image) => {
        formData.append("serviceImages", image);
      });
      if (newServiceCustomFields.length > 0) {
        formData.append("customFields", JSON.stringify(newServiceCustomFields));
      }
      const token = localStorage.getItem("authToken");
      const response = await fetch(`${config.VENDOR_BACKEND_URL}/api/vendor/services`, {
        method: "PUT",
        body: formData,
        credentials: "include",
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (!response.ok) {
        throw new Error(`Server responded with status: ${response.status}`);
      }
      const result = await response.json();
      console.log("Service updated successfully:", result);
      if (result.success && result.data) {
        setServices(
          (prevServices) => prevServices.map((s) => s.id === result.data.id ? result.data : s)
        );
      }
      setShowEditServiceDialog(false);
      setEditServiceData(null);
      setNewImages([null, null, null]);
      setNewServiceCustomFields([]);
      alert("Service updated successfully!");
    } catch (error2) {
      console.error("Error updating service:", error2);
      alert("Failed to update service. Please try again.");
    }
  };
  const handleDeleteService = async (serviceId) => {
    try {
      if (!serviceId || !currentUser?.email && !vendorUser?.email && !profileData.email) {
        alert("Missing required information");
        return;
      }
      if (!window.confirm("Are you sure you want to delete this service?")) {
        return;
      }
      const token = localStorage.getItem("authToken");
      const response = await fetch(`${config.VENDOR_BACKEND_URL}/api/vendor/services`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          ...token ? { Authorization: `Bearer ${token}` } : {}
        },
        body: JSON.stringify({
          email: currentUser?.email || vendorUser?.email || profileData.email,
          serviceId
        }),
        credentials: "include"
      });
      if (!response.ok) {
        throw new Error(`Server responded with status: ${response.status}`);
      }
      const result = await response.json();
      console.log("Service deleted successfully:", result);
      if (result.success) {
        setServices((prevServices) => prevServices.filter((s) => s.id !== serviceId));
      }
      alert("Service deleted successfully!");
    } catch (error2) {
      console.error("Error deleting service:", error2);
      alert("Failed to delete service. Please try again.");
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
      verified: false
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
      isFeatured: false
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
  useEffect(() => {
    console.log("Edit dialog state changed:", {
      showEditDialog,
      hasProductData: !!editProductData,
      productId: editProductData?.id
    });
  }, [showEditDialog, editProductData]);
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [isAddingService, setIsAddingService] = useState(false);
  return /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { className: "flex w-full flex-col gap-5 sm:gap-6 lg:flex-row lg:items-start" }, /* @__PURE__ */ React.createElement(
    VendorTabPanel,
    {
      title: "Catalog",
      description: "Manage your products and services from one clean workspace.",
      bodyClassName: "p-0"
    },
    /* @__PURE__ */ React.createElement(Tabs, { defaultValue: "products", value: activeTab, onValueChange: setActiveTab, className: "w-full" }, /* @__PURE__ */ React.createElement("div", { className: "border-b border-line px-4 py-4 sm:px-6" }, /* @__PURE__ */ React.createElement(TabsList, { className: "grid h-auto w-full grid-cols-2 rounded-2xl bg-surface-hover p-1 sm:w-fit" }, /* @__PURE__ */ React.createElement(
      TabsTrigger,
      {
        value: "products",
        className: "rounded-xl px-4 py-2.5 text-sm font-medium text-dim transition-all data-[state=active]:bg-surface data-[state=active]:text-ink data-[state=active]: sm:px-6"
      },
      "Products"
    ), /* @__PURE__ */ React.createElement(
      TabsTrigger,
      {
        value: "services",
        className: "rounded-xl px-4 py-2.5 text-sm font-medium text-dim transition-all data-[state=active]:bg-surface data-[state=active]:text-ink data-[state=active]: sm:px-6"
      },
      "Services"
    ))), /* @__PURE__ */ React.createElement(TabsContent, { value: "products", className: "p-0 m-0" }, /* @__PURE__ */ React.createElement("div", { className: "flex flex-col gap-4 border-b border-line p-4 sm:p-6 md:flex-row" }, /* @__PURE__ */ React.createElement("div", { className: "relative flex-1" }, /* @__PURE__ */ React.createElement(Search, { className: "absolute left-3 top-3 h-4 w-4 text-dim" }), /* @__PURE__ */ React.createElement(
      Input,
      {
        placeholder: "Search products...",
        className: "pl-10 pr-4 py-2.5 w-full border border-line rounded-md focus:outline-none focus:ring-2 focus:ring-ink focus:border-transparent text-sm",
        value: productSearchQuery,
        onChange: (e) => setProductSearchQuery(e.target.value)
      }
    )), /* @__PURE__ */ React.createElement(
      Button,
      {
        variant: "primary",
        className: "bg-black hover:from-black hover:to-black text-white px-6 py-2.5 rounded-md font-medium text-sm transition-all md:w-auto",
        onClick: async () => {
          if (!config.SALES_URL) {
            console.error("SALES_URL is not configured");
            alert("B2B Sales dashboard URL is not configured. Please contact support.");
            return;
          }
          try {
            await redirectToSalesWithHandoff();
          } catch (e) {
            console.error("B2B handoff redirect failed:", e);
            alert("Unable to open B2B Sales dashboard right now. Please try again.");
            navigate("/login");
          }
        }
      },
      /* @__PURE__ */ React.createElement(Plus, { className: "mr-2 h-4 w-4" }),
      "Add Product"
    )), /* @__PURE__ */ React.createElement("div", { className: "space-y-3 p-6" }, paginatedProducts.map((product) => /* @__PURE__ */ React.createElement("div", { key: product.id }, /* @__PURE__ */ React.createElement("div", { className: "border border-line rounded-lg p-4  hover:border-line transition-all duration-200 bg-surface" }, /* @__PURE__ */ React.createElement("div", { className: "flex justify-between items-start" }, /* @__PURE__ */ React.createElement("div", { className: "flex-1" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2" }, /* @__PURE__ */ React.createElement("h3", { className: "text-base font-semibold text-ink" }, product.name), /* @__PURE__ */ React.createElement(
      "svg",
      {
        xmlns: "http://www.w3.org/2000/svg",
        width: "16",
        height: "16",
        fill: "currentColor",
        className: "text-ink cursor-pointer hover:text-ink transition-colors",
        viewBox: "0 0 16 16",
        onClick: (e) => {
          e.stopPropagation();
          handleEditClick(product);
        }
      },
      /* @__PURE__ */ React.createElement("path", { d: "M15.502 1.94a.5.5 0 0 1 0 .706L14.459 3.69l-2-2L13.502.646a.5.5 0 0 1 .707 0l1.293 1.293z" }),
      /* @__PURE__ */ React.createElement("path", { d: "M13.75 4.396l-2-2L4.939 9.21a.5.5 0 0 0-.121.196l-.805 2.414a.25.25 0 0 0 .316.316l2.414-.805a.5.5 0 0 0 .196-.12l6.813-6.814z" }),
      /* @__PURE__ */ React.createElement(
        "path",
        {
          fillRule: "evenodd",
          d: "M1 13.5A1.5 1.5 0 0 0 2.5 15h11a1.5 1.5 0 0 0 1.5-1.5v-6a.5.5 0 0 0-1 0v6a.5.5 0 0 1-.5.5h-11a.5.5 0 0 1-.5-.5v-11a.5.5 0 0 1 .5-.5H9a.5.5 0 0 0 0-1H2.5A1.5 1.5 0 0 0 1 2.5v11z"
        }
      )
    ), product.verified && /* @__PURE__ */ React.createElement(
      "svg",
      {
        xmlns: "http://www.w3.org/2000/svg",
        width: "16",
        height: "16",
        fill: "currentColor",
        className: "text-info",
        viewBox: "0 0 16 16"
      },
      /* @__PURE__ */ React.createElement("path", { d: "M10.97 4.97a.75.75 0 0 1 1.07 1.05l-3.99 4.99a.75.75 0 0 1-1.08.02L4.324 8.384a.75.75 0 1 1 1.06-1.06l2.094 2.093 3.473-4.425a.267.267 0 0 1 .02-.022z" })
    )), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-dim mt-1" }, product.category)), /* @__PURE__ */ React.createElement(
      "div",
      {
        className: "cursor-pointer ml-4",
        onClick: () => handleProductArrowClick(product.id)
      },
      expandedProductId === product.id ? /* @__PURE__ */ React.createElement(ChevronUp, { className: "h-5 w-5 text-dim hover:text-dim transition-colors" }) : /* @__PURE__ */ React.createElement(ChevronDown, { className: "h-5 w-5 text-dim hover:text-dim transition-colors" })
    )), expandedProductId === product.id && /* @__PURE__ */ React.createElement("div", { className: "mt-4 pt-4 border-t border-line transition-all duration-300 ease-in-out" }, /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm" }, /* @__PURE__ */ React.createElement("div", { className: "text-dim" }, "Product name"), /* @__PURE__ */ React.createElement("div", { className: "font-semibold text-ink" }, product.name), /* @__PURE__ */ React.createElement("div", { className: "text-dim" }, "Product type"), /* @__PURE__ */ React.createElement("div", { className: "font-semibold text-ink" }, product.category), /* @__PURE__ */ React.createElement("div", { className: "text-dim" }, "Key features"), /* @__PURE__ */ React.createElement("div", { className: "font-semibold text-ink" }, product.keyFeatures), /* @__PURE__ */ React.createElement("div", { className: "text-dim" }, "Target Customers / Users"), /* @__PURE__ */ React.createElement("div", { className: "font-semibold text-ink" }, product.targetCustomers), /* @__PURE__ */ React.createElement("div", { className: "text-dim" }, "Usage/Application Areas"), /* @__PURE__ */ React.createElement("div", { className: "font-semibold text-ink" }, product.usageAreas), /* @__PURE__ */ React.createElement("div", { className: "text-dim" }, "Available Sizes / Variants"), /* @__PURE__ */ React.createElement("div", { className: "font-semibold text-ink" }, product.availableSizes), /* @__PURE__ */ React.createElement("div", { className: "text-dim" }, "Packaging / Delivery"), /* @__PURE__ */ React.createElement("div", { className: "font-semibold text-ink" }, product.packagingDelivery), /* @__PURE__ */ React.createElement("div", { className: "text-dim" }, "Certifications / Quality Standards"), /* @__PURE__ */ React.createElement("div", { className: "font-semibold text-ink" }, product.certifications), /* @__PURE__ */ React.createElement("div", { className: "text-dim" }, "Support / Installation Services"), /* @__PURE__ */ React.createElement("div", { className: "font-semibold text-ink" }, product.supportServices), /* @__PURE__ */ React.createElement("div", { className: "text-dim" }, "Catalog Demo"), /* @__PURE__ */ React.createElement("div", null, product.catalogDemo ? /* @__PURE__ */ React.createElement(
      "a",
      {
        href: product.catalogDemo,
        className: "text-ink hover:text-ink underline",
        target: "_blank",
        rel: "noopener noreferrer"
      },
      "View"
    ) : /* @__PURE__ */ React.createElement("span", { className: "text-dim text-xs" }, "Not provided")), product.customFields && product.customFields.map((field, index) => /* @__PURE__ */ React.createElement(React.Fragment, { key: index }, /* @__PURE__ */ React.createElement("div", { className: "text-dim" }, field.label), /* @__PURE__ */ React.createElement("div", { className: "font-semibold text-ink" }, field.value)))), product.images && product.images.length > 0 && /* @__PURE__ */ React.createElement("div", { className: "mt-6 pt-6 border-t border-line" }, /* @__PURE__ */ React.createElement("p", { className: "text-xs font-semibold text-dim mb-3 uppercase tracking-wide" }, "Images"), /* @__PURE__ */ React.createElement("div", { className: "flex flex-wrap gap-3" }, product.images.map((image, index) => /* @__PURE__ */ React.createElement(
      "img",
      {
        key: index,
        src: (typeof image === "string" ? image : image?.url) || "https://via.placeholder.com/120",
        alt: `Product ${index + 1}`,
        className: "w-24 h-24 object-cover rounded-md border border-line hover:border-line transition-colors"
      }
    )))), /* @__PURE__ */ React.createElement("div", { className: "mt-6 pt-6 border-t border-line flex justify-end" }, /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: (e) => {
          e.stopPropagation();
          handleDeleteProduct(product.id);
        },
        className: "px-4 py-2 text-xs font-medium bg-danger/10 hover:bg-danger/10 text-danger rounded-md transition-colors"
      },
      "Delete Product"
    ))))))), renderPaginationControls(currentProductPage, totalProductPages, (page) => {
      setExpandedProductId(null);
      setCurrentProductPage(page);
    })), /* @__PURE__ */ React.createElement(TabsContent, { value: "services", className: "p-0 m-0" }, /* @__PURE__ */ React.createElement("div", { className: "p-6 flex flex-col md:flex-row gap-4 border-b border-line" }, /* @__PURE__ */ React.createElement("div", { className: "relative flex-1" }, /* @__PURE__ */ React.createElement(Search, { className: "absolute left-3 top-3 h-4 w-4 text-dim" }), /* @__PURE__ */ React.createElement(
      Input,
      {
        placeholder: "Search services...",
        className: "pl-10 pr-4 py-2.5 w-full border border-line rounded-md focus:outline-none focus:ring-2 focus:ring-ink focus:border-transparent text-sm",
        value: serviceSearchQuery,
        onChange: (e) => setServiceSearchQuery(e.target.value)
      }
    )), /* @__PURE__ */ React.createElement(
      Button,
      {
        size: "sm",
        className: "bg-black hover:from-black hover:to-black text-white px-6 py-2.5 rounded-md font-medium text-sm transition-all",
        onClick: () => setShowAddServiceForm(true)
      },
      /* @__PURE__ */ React.createElement(Plus, { className: "h-4 w-4 mr-2" }),
      " Add Service"
    )), /* @__PURE__ */ React.createElement("div", { className: "space-y-3 p-6" }, paginatedServices.map((service) => /* @__PURE__ */ React.createElement("div", { key: service.id }, /* @__PURE__ */ React.createElement("div", { className: "border border-line rounded-lg p-4  hover:border-line transition-all duration-200 bg-surface" }, /* @__PURE__ */ React.createElement("div", { className: "flex justify-between items-start" }, /* @__PURE__ */ React.createElement("div", { className: "flex-1" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2" }, /* @__PURE__ */ React.createElement("h3", { className: "text-base font-semibold text-ink" }, service.name), /* @__PURE__ */ React.createElement(
      "svg",
      {
        xmlns: "http://www.w3.org/2000/svg",
        width: "16",
        height: "16",
        fill: "currentColor",
        className: "text-ink cursor-pointer hover:text-ink transition-colors",
        viewBox: "0 0 16 16",
        onClick: (e) => {
          e.stopPropagation();
          setEditServiceData(service);
          setNewImages([null, null, null]);
          if (service.customFields) {
            const customFieldsArray = [];
            for (const [key, value] of Object.entries(service.customFields)) {
              customFieldsArray.push({ label: key, value });
            }
            setNewServiceCustomFields(customFieldsArray);
          } else {
            setNewServiceCustomFields([]);
          }
          setShowEditServiceDialog(true);
        }
      },
      /* @__PURE__ */ React.createElement("path", { d: "M15.502 1.94a.5.5 0 0 1 0 .706L14.459 3.69l-2-2L13.502.646a.5.5 0 0 1 .707 0l1.293 1.293z" }),
      /* @__PURE__ */ React.createElement("path", { d: "M13.75 4.396l-2-2L4.939 9.21a.5.5 0 0 0-.121.196l-.805 2.414a.25.25 0 0 0 .316.316l2.414-.805a.5.5 0 0 0 .196-.12l6.813-6.814z" }),
      /* @__PURE__ */ React.createElement(
        "path",
        {
          fillRule: "evenodd",
          d: "M1 13.5A1.5 1.5 0 0 0 2.5 15h11a1.5 1.5 0 0 0 1.5-1.5v-6a.5.5 0 0 0-1 0v6a.5.5 0 0 1-.5.5h-11a.5.5 0 0 1-.5-.5v-11a.5.5 0 0 1 .5-.5H9a.5.5 0 0 0 0-1H2.5A1.5 1.5 0 0 0 1 2.5v11z"
        }
      )
    )), /* @__PURE__ */ React.createElement("p", { className: "text-sm text-dim" }, service.description ? service.description.substring(0, 50) + "..." : "No description")), /* @__PURE__ */ React.createElement(
      "div",
      {
        className: "cursor-pointer",
        onClick: () => setExpandedServiceId(expandedServiceId === service.id ? null : service.id)
      },
      expandedServiceId === service.id ? /* @__PURE__ */ React.createElement(ChevronUp, { className: "h-5 w-5 text-dim" }) : /* @__PURE__ */ React.createElement(ChevronDown, { className: "h-5 w-5 text-dim" })
    )), expandedServiceId === service.id && /* @__PURE__ */ React.createElement("div", { className: "mt-6 transition-all duration-500 ease-in-out" }, /* @__PURE__ */ React.createElement("h2", { className: "text-lg font-semibold text-ink mb-4" }, "Service Details"), /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-2 gap-y-4 gap-x-8 text-sm text-ink" }, /* @__PURE__ */ React.createElement("div", null, "Service Type"), /* @__PURE__ */ React.createElement("div", { className: "font-semibold text-ink" }, service.serviceType || "Not specified"), /* @__PURE__ */ React.createElement("div", null, "Description / Scope of Work"), /* @__PURE__ */ React.createElement("div", { className: "font-semibold text-ink" }, service.description || "Not specified"), /* @__PURE__ */ React.createElement("div", null, "Industries / Clients Served"), /* @__PURE__ */ React.createElement("div", { className: "font-semibold text-ink" }, service.industries || "Not specified"), /* @__PURE__ */ React.createElement("div", null, "Project Size / Budget Range"), /* @__PURE__ */ React.createElement("div", { className: "font-semibold text-ink" }, service.budgetRange || "Not specified"), /* @__PURE__ */ React.createElement("div", null, "Delivery Method"), /* @__PURE__ */ React.createElement("div", { className: "font-semibold text-ink" }, service.deliveryMethod || "Not specified"), /* @__PURE__ */ React.createElement("div", null, "Tools / Materials Used"), /* @__PURE__ */ React.createElement("div", { className: "font-semibold text-ink" }, service.materials || "Not specified"), /* @__PURE__ */ React.createElement("div", null, "Packages / Pricing Models"), /* @__PURE__ */ React.createElement("div", { className: "font-semibold text-ink" }, service.pricing || "Not specified"), /* @__PURE__ */ React.createElement("div", null, "Compliance & Standards Followed"), /* @__PURE__ */ React.createElement("div", { className: "font-semibold text-ink" }, service.compliance || "Not specified"), /* @__PURE__ */ React.createElement("div", null, "Success Stories / Case Studies"), /* @__PURE__ */ React.createElement("div", { className: "font-semibold text-ink" }, service.caseStudies || "Not specified"), /* @__PURE__ */ React.createElement("div", { className: "mt-6 col-span-2 flex justify-end" }, /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: (e) => {
          e.stopPropagation();
          handleDeleteService(service.id);
        },
        className: "px-4 py-2 bg-danger hover:bg-danger text-white rounded"
      },
      "Delete Service"
    ))), service.images && service.images.length > 0 && /* @__PURE__ */ React.createElement("div", { className: "flex gap-6 mt-8" }, service.images.map((image, index) => /* @__PURE__ */ React.createElement(
      "img",
      {
        key: index,
        src: image,
        alt: `Service ${service.name} - ${index + 1}`,
        className: "w-44 h-36 object-cover border-2 border-transparent rounded"
      }
    )))))))), renderPaginationControls(currentServicePage, totalServicePages, (page) => {
      setExpandedServiceId(null);
      setCurrentServicePage(page);
    })))
  )), isProfileModalOpen && /* @__PURE__ */ React.createElement("div", { className: "fixed inset-0 bg-cta backdrop-blur-sm z-50 flex items-center justify-center p-4 sm:p-6" }, /* @__PURE__ */ React.createElement("div", { className: "bg-surface rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden" }, /* @__PURE__ */ React.createElement("div", { className: "flex justify-between items-center px-6 py-4 border-b border-line flex-shrink-0 bg-surface" }, /* @__PURE__ */ React.createElement("h2", { className: "text-xl font-semibold text-ink" }, "Edit Profile"), /* @__PURE__ */ React.createElement("button", { onClick: handleProfileCloseModal, className: "text-dim hover:text-dim transition-colors" }, /* @__PURE__ */ React.createElement(CloseIcon, { size: 20 }))), /* @__PURE__ */ React.createElement("div", { className: "overflow-y-auto p-6 flex-1 bg-surface" }, /* @__PURE__ */ React.createElement("form", { onSubmit: (e) => e.preventDefault(), className: "space-y-4" }, /* @__PURE__ */ React.createElement("div", { className: "flex flex-col items-center space-y-3" }, /* @__PURE__ */ React.createElement("img", { src: imagePreview, alt: "Profile Preview", className: "w-32 h-32 rounded-full object-cover border-2 border-line ", onError: (e) => {
    e.target.onerror = null;
    e.target.src = "https://via.placeholder.com/160";
  } }), /* @__PURE__ */ React.createElement("label", { htmlFor: "profileImage", className: "cursor-pointer bg-surface-hover hover:bg-surface-hover text-ink text-sm font-medium px-4 py-2 rounded-md transition-colors" }, "Change Image"), /* @__PURE__ */ React.createElement("input", { id: "profileImage", name: "profileImage", type: "file", accept: "image/png, image/jpeg, image/gif", onChange: handleProfileFileChange, className: "hidden" })), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { htmlFor: "companyName", className: "block text-sm font-medium text-ink mb-1" }, "Company Name"), /* @__PURE__ */ React.createElement("input", { type: "text", id: "companyName", name: "companyName", value: profileFormData.companyName, onChange: handleProfileInputChange, className: "w-full px-3 py-2 border border-line rounded-md  focus:outline-none focus:ring-2 focus:ring-ink focus:border-transparent" })), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { htmlFor: "phone", className: "block text-sm font-medium text-ink mb-1" }, "Phone"), /* @__PURE__ */ React.createElement("div", { className: "flex rounded-md " }, /* @__PURE__ */ React.createElement(
    "select",
    {
      value: phoneCountryCode,
      onChange: (e) => {
        setPhoneCountryCode(e.target.value);
        setProfileFormData((prev) => ({ ...prev, phone: `${e.target.value} ${phoneNumberWithoutCode}` }));
      },
      className: "relative px-3 py-2 border border-line rounded-l-md focus:z-10 focus:outline-none focus:ring-2 focus:ring-ink focus:border-transparent text-sm bg-surface"
    },
    /* @__PURE__ */ React.createElement("option", { value: "" }, "Code"),
    countryCodes.map((c) => /* @__PURE__ */ React.createElement("option", { key: c.code, value: c.code }, c.code, " (", c.country, ")"))
  ), /* @__PURE__ */ React.createElement(
    "input",
    {
      type: "tel",
      id: "phone",
      name: "phone",
      value: phoneNumberWithoutCode,
      onChange: (e) => {
        setPhoneNumberWithoutCode(e.target.value);
        setProfileFormData((prev) => ({ ...prev, phone: `${phoneCountryCode} ${e.target.value}` }));
      },
      className: "relative -ml-px flex-1 px-3 py-2 border border-line rounded-r-md focus:z-10 focus:outline-none focus:ring-2 focus:ring-ink focus:border-transparent text-sm bg-surface",
      placeholder: "Phone number"
    }
  ))), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { htmlFor: "location", className: "block text-sm font-medium text-ink mb-1" }, "Location"), /* @__PURE__ */ React.createElement("div", { className: "flex rounded-md " }, /* @__PURE__ */ React.createElement(
    "select",
    {
      value: selectedCountry,
      onChange: (e) => {
        const newCountry = e.target.value;
        setSelectedCountry(newCountry);
        setStates(countryStateData[newCountry] || []);
        setSelectedState("");
        setProfileFormData((prev) => ({ ...prev, location: `${selectedState || ""}, ${newCountry}` }));
      },
      className: "relative px-3 py-2 border border-line rounded-l-md focus:z-10 focus:outline-none focus:ring-2 focus:ring-ink focus:border-transparent text-sm bg-surface"
    },
    /* @__PURE__ */ React.createElement("option", { value: "" }, "Country"),
    Object.keys(countryStateData).map((country) => /* @__PURE__ */ React.createElement("option", { key: country, value: country }, country))
  ), /* @__PURE__ */ React.createElement(
    "select",
    {
      value: selectedState,
      onChange: (e) => {
        const newState = e.target.value;
        setSelectedState(newState);
        setProfileFormData((prev) => ({ ...prev, location: `${newState}, ${selectedCountry}` }));
      },
      className: "relative -ml-px flex-1 px-3 py-2 border border-line rounded-r-md focus:z-10 focus:outline-none focus:ring-2 focus:ring-ink focus:border-transparent text-sm bg-surface",
      disabled: states.length === 0
    },
    /* @__PURE__ */ React.createElement("option", { value: "" }, "State/Region"),
    states.map((state) => /* @__PURE__ */ React.createElement("option", { key: state, value: state }, state))
  ))), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { htmlFor: "email", className: "block text-sm font-medium text-ink mb-1" }, "Email"), /* @__PURE__ */ React.createElement("input", { type: "email", id: "email", name: "email", value: profileFormData.email, onChange: handleProfileInputChange, className: "w-full px-3 py-2 border border-line rounded-md  focus:outline-none focus:ring-2 focus:ring-ink focus:border-transparent", required: true })), /* @__PURE__ */ React.createElement("div", { className: "flex justify-end gap-3 pt-6 border-t mt-6 border-line" }, /* @__PURE__ */ React.createElement("button", { type: "button", onClick: handleProfileCloseModal, className: "px-4 py-2 bg-surface-hover text-ink rounded-md hover:bg-surface-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-line transition-colors" }, "Cancel"), /* @__PURE__ */ React.createElement("button", { type: "button", onClick: handleProfileSave, className: "px-4 py-2 bg-black text-white rounded-md hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ink transition-opacity" }, "Save Changes")))))), showAddProductForm && /* @__PURE__ */ React.createElement("div", { className: "fixed inset-0 bg-cta backdrop-blur-sm z-50 flex items-center justify-center p-4 sm:p-6" }, /* @__PURE__ */ React.createElement("div", { className: "bg-surface rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden" }, /* @__PURE__ */ React.createElement("div", { className: "flex justify-between items-center px-6 py-4 border-b border-line flex-shrink-0 bg-surface" }, /* @__PURE__ */ React.createElement("h2", { className: "text-xl font-semibold text-ink" }, "Add New Product"), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: handleCloseProductAddForm,
      className: "text-dim hover:text-dim transition-colors"
    },
    /* @__PURE__ */ React.createElement(X, { size: 20 })
  )), /* @__PURE__ */ React.createElement("div", { className: "overflow-y-auto flex-1 p-6 bg-surface" }, /* @__PURE__ */ React.createElement("div", { className: "pb-1rem" }), /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-1 gap-4" }, [
    { label: "Product name", name: "name" },
    { label: "Product type", name: "category" },
    { label: "Target Customers / Users", name: "targetCustomers" },
    { label: "Usage / Application Areas", name: "usageAreas" },
    { label: "Available Sizes / Variants", name: "availableSizes" },
    { label: "Packaging / Delivery", name: "packagingDelivery" },
    { label: "Certifications / Quality Standards", name: "certifications" },
    { label: "Support / Installation Services", name: "supportServices" },
    { label: "Catalog demo", name: "catalogDemo" }
  ].map(({ label, name }) => /* @__PURE__ */ React.createElement("div", { key: name, className: "flex items-start gap-4" }, /* @__PURE__ */ React.createElement("label", { htmlFor: name, className: "w-1/3 text-dim pt-2" }, label), /* @__PURE__ */ React.createElement(
    "input",
    {
      type: "text",
      id: name,
      name,
      value: newProduct[name] || "",
      onChange: handleProductInputChange,
      className: "flex-1 border border-line rounded-md px-3 py-2 bg-canvas"
    }
  ))), customFields.map((field, index) => /* @__PURE__ */ React.createElement("div", { key: index, className: "flex items-start gap-4" }, /* @__PURE__ */ React.createElement(
    "input",
    {
      type: "text",
      placeholder: "Add details",
      value: field.label,
      onChange: (e) => handleCustomFieldChange(index, "label", e.target.value),
      className: "w-1/3 border border-line rounded-md px-3 py-2 bg-canvas"
    }
  ), /* @__PURE__ */ React.createElement(
    "input",
    {
      type: "text",
      placeholder: "",
      value: field.value,
      onChange: (e) => handleCustomFieldChange(index, "value", e.target.value),
      className: "flex-1 border border-line rounded-md px-3 py-2 bg-canvas"
    }
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => handleRemoveCustomField(index),
      className: "text-danger hover:text-danger text-lg pt-2"
    },
    "\u2212"
  )))), /* @__PURE__ */ React.createElement("div", { className: "sticky bottom-0 right-0 flex justify-end bg-surface py-2 z-10" }, /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: handleAddCustomField,
      className: "mb-4 text-sm font-medium text-ink hover:underline"
    },
    "+ Add Field"
  )), /* @__PURE__ */ React.createElement("div", { className: "mt-8" }, /* @__PURE__ */ React.createElement("label", { className: "block text-dim mb-2" }, "Product Images"), /* @__PURE__ */ React.createElement("div", { className: "flex flex-wrap gap-4" }, productImages.map((image, index) => /* @__PURE__ */ React.createElement(
    "img",
    {
      key: index,
      src: URL.createObjectURL(image),
      alt: `Product ${index + 1}`,
      className: "w-24 h-24 object-cover rounded-md border"
    }
  )), /* @__PURE__ */ React.createElement(
    "label",
    {
      htmlFor: "productImageUpload",
      className: "w-24 h-24 flex items-center justify-center border-2 border-dashed text-dim rounded-md cursor-pointer hover:border-line"
    },
    "+"
  ), /* @__PURE__ */ React.createElement(
    "input",
    {
      type: "file",
      id: "productImageUpload",
      multiple: true,
      className: "hidden",
      onChange: handleProductImageUpload
    }
  ))), /* @__PURE__ */ React.createElement("div", { className: "flex justify-end gap-3 pt-6 border-t mt-6 border-line bg-surface" }, /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: handleCloseProductAddForm,
      className: "px-4 py-2 bg-surface-hover text-ink rounded-md hover:bg-surface-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-line transition-colors"
    },
    "Cancel"
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: handleAddProduct,
      disabled: isAddingProduct,
      className: `bg-gradient-to-l from-black to-black text-white font-medium px-4 py-2 rounded-md hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ink transition-opacity ${isAddingProduct ? "opacity-70 cursor-not-allowed" : ""}`
    },
    isAddingProduct ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("svg", { className: "animate-spin -ml-1 mr-2 h-4 w-4 text-white inline", xmlns: "http://www.w3.org/2000/svg", fill: "none", viewBox: "0 0 24 24" }, /* @__PURE__ */ React.createElement("circle", { className: "opacity-25", cx: "12", cy: "12", r: "10", stroke: "currentColor", strokeWidth: "4" }), /* @__PURE__ */ React.createElement("path", { className: "opacity-75", fill: "currentColor", d: "M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" })), "Processing...") : "Add Product"
  ))))), showAddServiceForm && /* @__PURE__ */ React.createElement("div", { className: "fixed inset-0 bg-cta backdrop-blur-sm z-50 flex items-center justify-center p-4 sm:p-6" }, /* @__PURE__ */ React.createElement("div", { className: "bg-surface rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden" }, /* @__PURE__ */ React.createElement("div", { className: "flex justify-between items-center px-6 py-4 border-b border-line flex-shrink-0 bg-surface" }, /* @__PURE__ */ React.createElement("h2", { className: "text-xl font-semibold text-ink" }, "Add New Service"), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: handleCloseServiceAddForm,
      className: "text-dim hover:text-dim transition-colors"
    },
    /* @__PURE__ */ React.createElement(X, { size: 20 })
  )), /* @__PURE__ */ React.createElement("div", { className: "overflow-y-auto flex-1 p-6 bg-surface" }, /* @__PURE__ */ React.createElement("div", { className: "pb-1rem" }), /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-1 gap-4" }, [
    { label: "Service Name", name: "name", type: "text" },
    { label: "Service Type", name: "serviceType", type: "text" },
    { label: "Description / Scope of Work", name: "description", type: "textarea" },
    { label: "Industries / Clients Served", name: "industries", type: "textarea" },
    { label: "Project Size / Budget Range", name: "budgetRange", type: "textarea" },
    { label: "Delivery Method", name: "deliveryMethod", type: "text" },
    { label: "Tools / Materials Used", name: "materials", type: "text" },
    { label: "Packages / Pricing Models", name: "pricing", type: "text" },
    { label: "Compliance & Standards Followed", name: "compliance", type: "textarea" },
    { label: "Success Stories / Case Studies", name: "caseStudies", type: "text" }
  ].map(({ label, name, type }) => /* @__PURE__ */ React.createElement("div", { key: name, className: "flex items-start gap-4" }, /* @__PURE__ */ React.createElement("label", { htmlFor: name, className: "w-1/3 text-dim pt-2" }, label), type === "textarea" ? /* @__PURE__ */ React.createElement(
    "textarea",
    {
      id: name,
      name,
      value: newService[name] || "",
      onChange: handleServiceInputChange,
      className: "flex-1 border border-line rounded-md px-3 py-2 bg-canvas"
    }
  ) : /* @__PURE__ */ React.createElement(
    "input",
    {
      id: name,
      name,
      type: "text",
      value: newService[name] || "",
      onChange: handleServiceInputChange,
      className: "flex-1 border border-line rounded-md px-3 py-2 bg-canvas"
    }
  )))), newServiceCustomFields.map((field, index) => /* @__PURE__ */ React.createElement("div", { key: index, className: "flex items-start gap-4 mt-3" }, /* @__PURE__ */ React.createElement("label", { className: " text-dim pt-2 flex-shrink-0" }, /* @__PURE__ */ React.createElement(
    Input,
    {
      type: "text",
      placeholder: "Add service",
      value: field.label,
      onChange: (e) => handleServiceCustomFieldChange(index, "label", e.target.value),
      className: "w-1/3 border border-line rounded-md px-4 py-2 bg-canvas "
    }
  )), /* @__PURE__ */ React.createElement(
    Input,
    {
      type: "text",
      value: field.value || "",
      onChange: (e) => handleServiceCustomFieldChange(index, "value", e.target.value),
      className: "flex-1 border border-line rounded-md px-3 py-2 bg-canvas"
    }
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => handleRemoveServiceCustomField(index),
      className: "text-danger hover:text-danger text-lg pt-2"
    },
    "\u2212"
  ))), /* @__PURE__ */ React.createElement("div", { className: "sticky bottom-0 right-0 flex bg-surface py-2 z-10 mt-top justify-end" }, /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: handleAddServiceCustomField,
      className: "text-sm font-medium text-ink hover:underline"
    },
    "+ Add Field"
  )), /* @__PURE__ */ React.createElement("div", { className: "mt-8" }, /* @__PURE__ */ React.createElement("label", { className: "block text-dim mb-2" }, "Service Images"), /* @__PURE__ */ React.createElement("div", { className: "flex flex-wrap gap-4" }, serviceImages.map((image, index) => /* @__PURE__ */ React.createElement(
    "img",
    {
      key: index,
      src: URL.createObjectURL(image),
      alt: `Service ${index + 1}`,
      className: "w-24 h-24 object-cover rounded-md border"
    }
  )), /* @__PURE__ */ React.createElement(
    "label",
    {
      htmlFor: "serviceImageUpload",
      className: "w-24 h-24 flex items-center justify-center border-2 border-dashed text-dim rounded-md cursor-pointer hover:border-line"
    },
    "+"
  ), /* @__PURE__ */ React.createElement(
    "input",
    {
      type: "file",
      id: "serviceImageUpload",
      multiple: true,
      className: "hidden",
      onChange: handleServiceImageUpload
    }
  ))), /* @__PURE__ */ React.createElement("div", { className: "flex justify-end gap-3 pt-6 border-t mt-6 border-line bg-surface" }, /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: handleCloseServiceAddForm,
      className: "px-4 py-2 bg-surface-hover text-ink rounded-md hover:bg-surface-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-line transition-colors"
    },
    "Cancel"
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: handleAddService,
      disabled: isAddingService,
      className: `bg-gradient-to-l from-black to-black text-white font-medium px-4 py-2 rounded-md hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ink transition-opacity ${isAddingService ? "opacity-70 cursor-not-allowed" : ""}`
    },
    isAddingService ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("svg", { className: "animate-spin -ml-1 mr-2 h-4 w-4 text-white inline", xmlns: "http://www.w3.org/2000/svg", fill: "none", viewBox: "0 0 24 24" }, /* @__PURE__ */ React.createElement("circle", { className: "opacity-25", cx: "12", cy: "12", r: "10", stroke: "currentColor", strokeWidth: "4" }), /* @__PURE__ */ React.createElement("path", { className: "opacity-75", fill: "currentColor", d: "M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" })), "Processing...") : "Add Service"
  ))))), /* @__PURE__ */ React.createElement(
    ServiceEditDialog,
    {
      showEditServiceDialog,
      editServiceData,
      setEditServiceData,
      newImages,
      setNewImages,
      setShowEditServiceDialog,
      handleUpdateService,
      newServiceCustomFields,
      setNewServiceCustomFields,
      handleServiceCustomFieldChange,
      handleRemoveServiceCustomField,
      handleAddServiceCustomField
    }
  ), /* @__PURE__ */ React.createElement(
    ProductEditDialog,
    {
      showEditProductDialog: showEditDialog,
      editProductData,
      setEditProductData,
      newImages,
      setNewImages,
      setShowEditProductDialog: setShowEditDialog,
      handleUpdateProduct,
      newProductCustomFields,
      setNewProductCustomFields,
      handleProductCustomFieldChange,
      handleRemoveProductCustomField,
      handleAddProductCustomField
    }
  ));
}

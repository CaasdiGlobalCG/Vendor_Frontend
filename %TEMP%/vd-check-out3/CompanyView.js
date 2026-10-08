import React from "react";
import { useState, useEffect, useContext, useRef } from "react";
import {
  Eye,
  Download,
  Upload,
  X as CloseIcon
} from "lucide-react";
import { VendorContext } from "../../../context/VendorContext";
import { UserContext } from "../../../context/UserContext";
import profileplaceholder from "../../../assets/profileplaceholder.jpg";
import config from "../../../config/env";
import VendorTabPanel from "../../../components/layout/VendorTabPanel";
import { getMissingCompanyFields, downloadCompanyDetailsPdf } from "../../../utils/companyDetails";
export default function CompanyView({ editProfileSignal = 0 }) {
  const { currentUser } = useContext(UserContext);
  const { currentUser: vendorUser, vendorData, setVendorData } = useContext(VendorContext);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dataFetched, setDataFetched] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [profileData, setProfileData] = useState({
    name: currentUser?.name || vendorUser?.name || "",
    vendorId: "",
    image: profileplaceholder,
    companyName: "",
    phone: "",
    location: "",
    email: currentUser?.email || vendorUser?.email || "",
    gstNumber: "",
    panNumber: ""
  });
  const [profileFormData, setProfileFormData] = useState({ ...profileData });
  const [imagePreview, setImagePreview] = useState(profileData.image);
  const [selectedCountry, setSelectedCountry] = useState("");
  const [states, setStates] = useState([]);
  const [selectedState, setSelectedState] = useState("");
  const [phoneCountryCode, setPhoneCountryCode] = useState("");
  const [phoneNumberWithoutCode, setPhoneNumberWithoutCode] = useState("");
  const [isCompanyModalOpen, setIsCompanyModalOpen] = useState(false);
  const [companyFormData, setCompanyFormData] = useState({
    industryType: "",
    segments: [],
    yearOfEstablishment: "",
    visionAndMission: "",
    companyOverview: "",
    industryOverview: "",
    coreValues: [],
    certifications: [],
    teamSize: "",
    uniqueSellingProposition: "",
    socialImpact: ""
  });
  const [newSegment, setNewSegment] = useState("");
  const [newCoreValue, setNewCoreValue] = useState("");
  const [certificationFiles, setCertificationFiles] = useState([]);
  const [saving, setSaving] = useState(false);
  const [companyError, setCompanyError] = useState(null);
  const [companySuccessMessage, setCompanySuccessMessage] = useState("");
  const [downloadMessage, setDownloadMessage] = useState("");
  useEffect(() => {
    console.log("Home Component - Current User Context:", currentUser);
    console.log("Home Component - Vendor User Context:", vendorUser);
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
            vendorId: rawVendorId ? `#${String(rawVendorId).substring(0, 6)}` : "",
            image: vendor.profileImage?.url || profileplaceholder,
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
          setCompanyFormData({
            industryType: vendor.companyDetails?.industryType || "",
            segments: vendor.companyDetails?.segments || [],
            yearOfEstablishment: vendor.companyDetails?.yearOfEstablishment || "",
            visionAndMission: vendor.companyDetails?.visionAndMission || "",
            companyOverview: vendor.companyDetails?.companyOverview || "",
            industryOverview: vendor.companyDetails?.industryOverview || "",
            coreValues: vendor.companyDetails?.coreValues || [],
            certifications: vendor.companyDetails?.certifications || [],
            teamSize: vendor.companyDetails?.teamSize || "",
            uniqueSellingProposition: vendor.companyDetails?.uniqueSellingProposition || "",
            socialImpact: vendor.companyDetails?.socialImpact || ""
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
      console.log("Home Component - Executing delayed data fetch");
      fetchVendorData();
    }, 500);
    return () => clearTimeout(timer);
  }, [currentUser, vendorUser, profileData.email, dataFetched]);
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
    if (isProfileModalOpen || isCompanyModalOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isProfileModalOpen, isCompanyModalOpen]);
  useEffect(() => {
    if (isProfileModalOpen) {
      setProfileFormData({ ...profileData });
      const locationParts = profileData.location.split(", ");
      if (locationParts.length === 2) {
        const state = locationParts[0];
        const country = locationParts[1];
        setSelectedCountry(country || "");
        setSelectedState(state || "");
        setStates(countryStateData[country] || []);
        console.log(`Parsed location: State=${state}, Country=${country}`);
      } else {
        setSelectedCountry("");
        setSelectedState("");
        console.log("Could not parse location properly:", profileData.location);
      }
      const phoneParts = profileData.phone.split(" ");
      if (phoneParts.length >= 1) {
        const [code, ...numberParts] = phoneParts;
        setPhoneCountryCode(code || "");
        setPhoneNumberWithoutCode(numberParts.join(" ") || "");
        console.log(`Parsed phone: Code=${code}, Number=${numberParts.join(" ")}`);
      } else {
        setPhoneCountryCode("");
        setPhoneNumberWithoutCode("");
        console.log("Could not parse phone properly:", profileData.phone);
      }
      setImagePreview(profileData.image);
    }
  }, [isProfileModalOpen, profileData]);
  useEffect(() => {
    const isObjectURL = typeof imagePreview === "string" && imagePreview.startsWith("blob:");
    return () => {
      if (isObjectURL) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);
  const handleProfileEditClick = () => {
    setIsProfileModalOpen(true);
  };
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
    setProfileFormData((prevData) => {
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
      console.log("Saving with location:", updatedLocation);
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
      const formData = new FormData();
      formData.append("vendorDetails", JSON.stringify(vendorUpdateData.vendorDetails));
      formData.append("companyDetails", JSON.stringify(vendorUpdateData.companyDetails));
      if (profileFormData.imageFile) {
        formData.append("profileImage", profileFormData.imageFile);
      }
      console.log("Sending to backend:", {
        vendorDetails: JSON.parse(formData.get("vendorDetails")),
        companyDetails: JSON.parse(formData.get("companyDetails"))
      });
      const response = await fetch(`${config.VENDOR_BACKEND_URL}/api/vendor/update-profile`, {
        method: "POST",
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
  const handleCompanyInputChange = (e) => {
    const { name, value } = e.target;
    setCompanyFormData((prev) => ({ ...prev, [name]: value }));
  };
  const handleAddSegment = () => {
    if (newSegment.trim() !== "") {
      setCompanyFormData((prev) => ({
        ...prev,
        segments: [...prev.segments, newSegment.trim()]
      }));
      setNewSegment("");
    }
  };
  const handleRemoveSegment = (index) => {
    setCompanyFormData((prev) => ({
      ...prev,
      segments: prev.segments.filter((_, i) => i !== index)
    }));
  };
  const handleAddCoreValue = () => {
    if (newCoreValue.trim() !== "") {
      setCompanyFormData((prev) => ({
        ...prev,
        coreValues: [...prev.coreValues, newCoreValue.trim()]
      }));
      setNewCoreValue("");
    }
  };
  const handleRemoveCoreValue = (index) => {
    setCompanyFormData((prev) => ({
      ...prev,
      coreValues: prev.coreValues.filter((_, i) => i !== index)
    }));
  };
  const handleCertificationUpload = (e) => {
    const files = Array.from(e.target.files);
    setCertificationFiles((prev) => [...prev, ...files]);
  };
  const handleRemoveCertificationFile = (index) => {
    setCertificationFiles((prev) => prev.filter((_, i) => i !== index));
  };
  const handleCompanyEditClick = () => {
    setCompanyFormData({
      industryType: vendorData.companyDetails?.industryType || "",
      segments: vendorData.companyDetails?.segments || [],
      yearOfEstablishment: vendorData.companyDetails?.yearOfEstablishment || "",
      visionAndMission: vendorData.companyDetails?.visionAndMission || "",
      companyOverview: vendorData.companyDetails?.companyOverview || "",
      industryOverview: vendorData.companyDetails?.industryOverview || "",
      coreValues: vendorData.companyDetails?.coreValues || [],
      certifications: vendorData.companyDetails?.certifications || [],
      teamSize: vendorData.companyDetails?.teamSize || "",
      uniqueSellingProposition: vendorData.companyDetails?.uniqueSellingProposition || "",
      socialImpact: vendorData.companyDetails?.socialImpact || ""
    });
    setCompanyError(null);
    setCompanySuccessMessage("");
    setIsCompanyModalOpen(true);
  };
  const handleCompanySave = async (e) => {
    if (e)
      e.preventDefault();
    try {
      setSaving(true);
      setCompanyError(null);
      const formDataToSend = new FormData();
      formDataToSend.append("companyDetails", JSON.stringify({
        ...companyFormData,
        // Ensure we keep the original industry type
        industryType: vendorData.companyDetails?.industryType || companyFormData.industryType
      }));
      certificationFiles.forEach((file) => {
        formDataToSend.append("certifications", file);
      });
      const vendorEmail = currentUser?.email || profileData?.email || vendorData?.vendorDetails?.primaryContactEmail || vendorUser?.email || "";
      const vendorId = vendorData?.vendorId || vendorUser?.vendorId || "";
      if (!vendorId && !vendorEmail) {
        setCompanyError("Unable to identify vendor account. Please refresh and try again.");
        setSaving(false);
        return;
      }
      formDataToSend.append("vendorDetails", JSON.stringify({
        vendorId,
        primaryContactEmail: vendorEmail
      }));
      const response = await fetch(`${config.VENDOR_BACKEND_URL}/api/vendor/update-company`, {
        method: "POST",
        body: formDataToSend
      });
      if (!response.ok) {
        throw new Error(`Server responded with status: ${response.status}`);
      }
      const result = await response.json();
      console.log("Company update result:", result);
      const updatedCompanyDetails = result?.data?.companyDetails || {
        ...vendorData.companyDetails,
        ...companyFormData,
        industryType: vendorData.companyDetails?.industryType || companyFormData.industryType
      };
      setVendorData({
        ...vendorData,
        companyDetails: updatedCompanyDetails
      });
      setCompanyFormData((prev) => ({
        ...prev,
        certifications: updatedCompanyDetails.certifications || []
      }));
      setCertificationFiles([]);
      setCompanySuccessMessage("Company details updated successfully!");
      setTimeout(() => {
        setIsCompanyModalOpen(false);
        setCompanySuccessMessage("");
      }, 2e3);
    } catch (error2) {
      console.error("Error updating company details:", error2);
      setCompanyError(`Failed to update company details: ${error2.message}`);
    } finally {
      setSaving(false);
    }
  };
  const handleDownloadCompanyDetails = () => {
    const missing = getMissingCompanyFields(vendorData.companyDetails);
    if (missing.length > 0) {
      setDownloadMessage(`Please fill the company details first \u2014 missing: ${missing.join(", ")}`);
      return;
    }
    try {
      downloadCompanyDetailsPdf(vendorData);
      setDownloadMessage("");
    } catch (err) {
      console.error("Error downloading company details:", err);
      setDownloadMessage("Failed to download company details. Please try again.");
    }
  };
  return /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { className: "flex w-full flex-col gap-5 sm:gap-6 lg:flex-row lg:items-start" }, /* @__PURE__ */ React.createElement(
    VendorTabPanel,
    {
      title: "Company details",
      description: "Manage the business information shown across your vendor portfolio.",
      actions: /* @__PURE__ */ React.createElement("div", { className: "flex w-full items-center justify-between gap-2 sm:w-auto sm:justify-end" }, /* @__PURE__ */ React.createElement(
        "button",
        {
          onClick: handleDownloadCompanyDetails,
          className: "rounded-full p-2 transition-colors hover:bg-surface-hover",
          title: "Download company details"
        },
        /* @__PURE__ */ React.createElement(Download, { className: "w-5 h-5 text-dim" })
      ), /* @__PURE__ */ React.createElement(
        "button",
        {
          onClick: handleCompanyEditClick,
          className: "rounded-full border border-line px-4 py-2 text-sm font-medium text-ink transition-colors hover:bg-surface-hover"
        },
        "Edit"
      )),
      bodyClassName: "p-4 sm:p-6"
    },
    downloadMessage && /* @__PURE__ */ React.createElement("div", { className: "mb-4 rounded border border-danger bg-danger/10 px-4 py-3 text-sm text-danger" }, downloadMessage),
    /* @__PURE__ */ React.createElement("div", { className: "space-y-4 text-sm" }, /* @__PURE__ */ React.createElement(
      DetailRow,
      {
        title: "Industry Type",
        value: vendorData.companyDetails?.industryType || "Not specified"
      }
    ), /* @__PURE__ */ React.createElement(
      DetailRow,
      {
        title: "Segments",
        value: /* @__PURE__ */ React.createElement("div", { className: "flex flex-wrap gap-2" }, vendorData.companyDetails?.segments && vendorData.companyDetails.segments.length > 0 ? vendorData.companyDetails.segments.map((segment) => /* @__PURE__ */ React.createElement(
          "span",
          {
            key: segment,
            className: "bg-surface-hover px-3 py-1 rounded-full text-xs font-medium"
          },
          segment
        )) : /* @__PURE__ */ React.createElement("span", { className: "text-dim" }, "No segments specified"))
      }
    ), /* @__PURE__ */ React.createElement(
      DetailRow,
      {
        title: "Year of establishment",
        value: vendorData.companyDetails?.yearOfEstablishment || "Not specified"
      }
    ), /* @__PURE__ */ React.createElement(
      DetailRow,
      {
        title: "Vision and Mission",
        value: vendorData.companyDetails?.visionAndMission || "Not specified"
      }
    ), /* @__PURE__ */ React.createElement(
      DetailRow,
      {
        title: "Company Overview",
        value: vendorData.companyDetails?.companyOverview || "Not specified"
      }
    ), /* @__PURE__ */ React.createElement(
      DetailRow,
      {
        title: "Industry Overview",
        value: vendorData.companyDetails?.industryOverview || "Not specified"
      }
    ), /* @__PURE__ */ React.createElement(
      DetailRow,
      {
        title: "Core values",
        value: /* @__PURE__ */ React.createElement("div", { className: "flex flex-wrap gap-2" }, vendorData.companyDetails?.coreValues && vendorData.companyDetails.coreValues.length > 0 ? vendorData.companyDetails.coreValues.map((value) => /* @__PURE__ */ React.createElement(
          "span",
          {
            key: value,
            className: "bg-surface-hover px-3 py-1 rounded-full text-xs font-medium"
          },
          value
        )) : /* @__PURE__ */ React.createElement("span", { className: "text-dim" }, "No core values specified"))
      }
    ), /* @__PURE__ */ React.createElement(
      DetailRow,
      {
        title: "Certifications",
        value: /* @__PURE__ */ React.createElement("div", { className: "flex flex-wrap gap-4" }, vendorData.companyDetails?.certifications && vendorData.companyDetails.certifications.length > 0 ? vendorData.companyDetails.certifications.map((cert, index) => {
          const certUrl = typeof cert === "string" ? null : cert.url || cert.signedUrl || cert.s3Url;
          return /* @__PURE__ */ React.createElement("span", { key: index, className: "bg-surface-hover px-3 py-1 rounded text-xs font-medium inline-flex items-center gap-2" }, typeof cert === "string" ? cert : cert.name || cert.originalName || `Certification ${index + 1}`, certUrl && /* @__PURE__ */ React.createElement(
            "a",
            {
              href: certUrl,
              target: "_blank",
              rel: "noopener noreferrer",
              className: "text-info hover:text-info",
              title: "View certification"
            },
            /* @__PURE__ */ React.createElement(Eye, { className: "w-3.5 h-3.5" })
          ));
        }) : /* @__PURE__ */ React.createElement("span", { className: "text-dim" }, "No certifications uploaded"))
      }
    ), /* @__PURE__ */ React.createElement(
      DetailRow,
      {
        title: "Team size",
        value: vendorData.companyDetails?.teamSize || "Not specified"
      }
    ), /* @__PURE__ */ React.createElement(
      DetailRow,
      {
        title: "Unique selling Proposition",
        value: vendorData.companyDetails?.uniqueSellingProposition || "Not specified"
      }
    ), /* @__PURE__ */ React.createElement(
      DetailRow,
      {
        title: "Social Impact/ECG focus",
        value: vendorData.companyDetails?.socialImpact || "Not specified"
      }
    ))
  )), isProfileModalOpen && /* @__PURE__ */ React.createElement("div", { className: "fixed inset-0 bg-cta backdrop-blur-sm z-50 flex items-center justify-center p-4 sm:p-6" }, /* @__PURE__ */ React.createElement("div", { className: "bg-surface rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden" }, /* @__PURE__ */ React.createElement("div", { className: "flex justify-between items-center px-6 py-4 border-b border-line flex-shrink-0 bg-surface" }, /* @__PURE__ */ React.createElement("h2", { className: "text-xl font-semibold text-ink" }, "Edit Profile"), /* @__PURE__ */ React.createElement("button", { onClick: handleProfileCloseModal, className: "text-dim hover:text-dim transition-colors" }, /* @__PURE__ */ React.createElement(CloseIcon, { size: 20 }))), /* @__PURE__ */ React.createElement("div", { className: "overflow-y-auto p-6 flex-1 bg-surface" }, /* @__PURE__ */ React.createElement("form", { onSubmit: (e) => e.preventDefault(), className: "space-y-4" }, /* @__PURE__ */ React.createElement("div", { className: "flex flex-col items-center space-y-3" }, /* @__PURE__ */ React.createElement("img", { src: imagePreview, alt: "Profile Preview", className: "w-32 h-32 rounded-full object-cover border-2 border-line ", onError: (e) => {
    e.target.onerror = null;
    e.target.src = "https://via.placeholder.com/160";
  } }), /* @__PURE__ */ React.createElement("label", { htmlFor: "profileImage", className: "cursor-pointer bg-surface-hover hover:bg-surface-hover text-ink text-sm font-medium px-4 py-2 rounded-md transition-colors" }, "Change Image"), /* @__PURE__ */ React.createElement("input", { id: "profileImage", name: "profileImage", type: "file", accept: "image/png, image/jpeg, image/gif", onChange: handleProfileFileChange, className: "hidden" })), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { htmlFor: "companyName", className: "block text-sm font-medium text-ink mb-1" }, "Company Name"), /* @__PURE__ */ React.createElement("input", { type: "text", id: "companyName", name: "companyName", value: profileFormData.companyName, onChange: handleProfileInputChange, className: "w-full px-3 py-2 border border-line rounded-md  focus:outline-none focus:ring-2 focus:ring-ink focus:border-transparent" })), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { htmlFor: "phone", className: "block text-sm font-medium text-ink mb-1" }, "Phone"), /* @__PURE__ */ React.createElement("div", { className: "flex rounded-md " }, /* @__PURE__ */ React.createElement(
    "select",
    {
      value: phoneCountryCode,
      onChange: (e) => {
        setPhoneCountryCode(e.target.value);
      },
      className: "px-3 py-2 border border-line rounded-l-md focus:outline-none focus:ring-2 focus:ring-ink focus:border-transparent text-sm"
    },
    /* @__PURE__ */ React.createElement("option", { value: "" }, "Code"),
    countryCodes.map((c) => /* @__PURE__ */ React.createElement("option", { key: c.code, value: c.code }, c.code, " (", c.country, ")"))
  ), /* @__PURE__ */ React.createElement(
    "input",
    {
      type: "tel",
      id: "phone",
      name: "phoneNumber",
      value: phoneNumberWithoutCode,
      onChange: (e) => {
        setPhoneNumberWithoutCode(e.target.value);
      },
      className: "flex-1 px-3 py-2 border-t border-b border-r border-line rounded-r-md  focus:outline-none focus:ring-2 focus:ring-ink focus:border-transparent text-sm",
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
      },
      className: "px-3 py-2 border border-line rounded-l-md focus:outline-none focus:ring-2 focus:ring-ink focus:border-transparent text-sm"
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
      },
      className: "flex-1 px-3 py-2 border-t border-b border-r border-line focus:outline-none focus:ring-2 focus:ring-ink focus:border-transparent text-sm",
      disabled: states.length === 0
    },
    /* @__PURE__ */ React.createElement("option", { value: "" }, "State/Region"),
    states.map((state) => /* @__PURE__ */ React.createElement("option", { key: state, value: state }, state))
  ))), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { htmlFor: "email", className: "block text-sm font-medium text-ink mb-1" }, "Email"), /* @__PURE__ */ React.createElement("input", { type: "email", id: "email", name: "email", value: profileFormData.email, onChange: handleProfileInputChange, className: "w-full px-3 py-2 border border-line rounded-md  focus:outline-none focus:ring-2 focus:ring-ink focus:border-transparent", required: true })), /* @__PURE__ */ React.createElement("div", { className: "flex justify-end gap-3 pt-6 border-t mt-6 border-line" }, /* @__PURE__ */ React.createElement("button", { type: "button", onClick: handleProfileCloseModal, className: "px-4 py-2 bg-surface-hover text-ink rounded-md hover:bg-surface-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-line transition-colors" }, "Cancel"), /* @__PURE__ */ React.createElement("button", { type: "button", onClick: handleProfileSave, className: "px-4 py-2 bg-black text-white rounded-md hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ink transition-opacity" }, "Save Changes")))))), isCompanyModalOpen && /* @__PURE__ */ React.createElement("div", { className: "fixed inset-0 bg-cta backdrop-blur-sm z-50 flex items-center justify-center p-4 sm:p-6" }, /* @__PURE__ */ React.createElement("div", { className: "bg-surface rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden" }, /* @__PURE__ */ React.createElement("div", { className: "flex justify-between items-center px-6 py-4 border-b border-line flex-shrink-0 bg-surface" }, /* @__PURE__ */ React.createElement("h2", { className: "text-xl font-semibold text-ink" }, "Edit Company Details"), /* @__PURE__ */ React.createElement("button", { onClick: () => setIsCompanyModalOpen(false), className: "text-dim hover:text-dim transition-colors" }, /* @__PURE__ */ React.createElement(CloseIcon, { size: 20 }))), /* @__PURE__ */ React.createElement("div", { className: "overflow-y-auto flex-1 p-6 bg-surface" }, companyError && /* @__PURE__ */ React.createElement("div", { className: "mb-6 bg-danger/10 border border-danger text-danger px-4 py-3 rounded" }, /* @__PURE__ */ React.createElement("p", null, companyError)), companySuccessMessage && /* @__PURE__ */ React.createElement("div", { className: "mb-6 bg-success/10 border border-success text-success px-4 py-3 rounded" }, /* @__PURE__ */ React.createElement("p", null, companySuccessMessage)), /* @__PURE__ */ React.createElement("form", { onSubmit: handleCompanySave, className: "space-y-6" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { htmlFor: "industryType", className: "block text-sm font-medium text-ink mb-1" }, "Industry Type"), /* @__PURE__ */ React.createElement(
    "input",
    {
      type: "text",
      id: "industryType",
      name: "industryType",
      value: companyFormData.industryType || "Not specified",
      readOnly: true,
      disabled: true,
      className: "w-full px-3 py-2 border border-line rounded-md  bg-surface-hover text-ink cursor-not-allowed"
    }
  ), /* @__PURE__ */ React.createElement("p", { className: "mt-1 text-xs text-dim" }, "Industry type cannot be changed")), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-sm font-medium text-ink mb-1" }, "Segments"), /* @__PURE__ */ React.createElement("div", { className: "flex flex-wrap gap-2 mb-2" }, companyFormData.segments.map((segment, index) => /* @__PURE__ */ React.createElement("div", { key: index, className: "bg-surface-hover px-3 py-1 rounded-full text-sm font-medium flex items-center" }, /* @__PURE__ */ React.createElement("span", null, segment), /* @__PURE__ */ React.createElement(
    "button",
    {
      type: "button",
      onClick: () => handleRemoveSegment(index),
      className: "ml-2 text-dim hover:text-danger"
    },
    /* @__PURE__ */ React.createElement(CloseIcon, { size: 14 })
  )))), /* @__PURE__ */ React.createElement("div", { className: "flex" }, /* @__PURE__ */ React.createElement(
    "input",
    {
      type: "text",
      value: newSegment,
      onChange: (e) => setNewSegment(e.target.value),
      placeholder: "Add a segment",
      className: "flex-1 px-3 py-2 border border-line rounded-l-md  focus:outline-none focus:ring-2 focus:ring-ink focus:border-transparent"
    }
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      type: "button",
      onClick: handleAddSegment,
      className: "bg-cta text-cta-foreground px-4 py-2 rounded-r-md hover:bg-cta focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ink"
    },
    "Add"
  ))), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { htmlFor: "yearOfEstablishment", className: "block text-sm font-medium text-ink mb-1" }, "Year of Establishment"), /* @__PURE__ */ React.createElement(
    "input",
    {
      type: "text",
      id: "yearOfEstablishment",
      name: "yearOfEstablishment",
      value: companyFormData.yearOfEstablishment,
      onChange: handleCompanyInputChange,
      placeholder: "e.g., 25th March, 1990",
      className: "w-full px-3 py-2 border border-line rounded-md  focus:outline-none focus:ring-2 focus:ring-ink focus:border-transparent"
    }
  )), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { htmlFor: "visionAndMission", className: "block text-sm font-medium text-ink mb-1" }, "Vision and Mission"), /* @__PURE__ */ React.createElement(
    "textarea",
    {
      id: "visionAndMission",
      name: "visionAndMission",
      value: companyFormData.visionAndMission,
      onChange: handleCompanyInputChange,
      rows: 4,
      className: "w-full px-3 py-2 border border-line rounded-md  focus:outline-none focus:ring-2 focus:ring-ink focus:border-transparent",
      placeholder: "Describe your company's vision and mission"
    }
  )), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { htmlFor: "companyOverview", className: "block text-sm font-medium text-ink mb-1" }, "Company Overview"), /* @__PURE__ */ React.createElement(
    "textarea",
    {
      id: "companyOverview",
      name: "companyOverview",
      value: companyFormData.companyOverview,
      onChange: handleCompanyInputChange,
      rows: 4,
      className: "w-full px-3 py-2 border border-line rounded-md  focus:outline-none focus:ring-2 focus:ring-ink focus:border-transparent",
      placeholder: "Provide an overview of your company"
    }
  )), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { htmlFor: "industryOverview", className: "block text-sm font-medium text-ink mb-1" }, "Industry Overview"), /* @__PURE__ */ React.createElement(
    "textarea",
    {
      id: "industryOverview",
      name: "industryOverview",
      value: companyFormData.industryOverview,
      onChange: handleCompanyInputChange,
      rows: 4,
      className: "w-full px-3 py-2 border border-line rounded-md  focus:outline-none focus:ring-2 focus:ring-ink focus:border-transparent",
      placeholder: "Provide an overview of your industry"
    }
  )), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-sm font-medium text-ink mb-1" }, "Core Values"), /* @__PURE__ */ React.createElement("div", { className: "flex flex-wrap gap-2 mb-2" }, companyFormData.coreValues.map((value, index) => /* @__PURE__ */ React.createElement("div", { key: index, className: "bg-surface-hover px-3 py-1 rounded-full text-sm font-medium flex items-center" }, /* @__PURE__ */ React.createElement("span", null, value), /* @__PURE__ */ React.createElement(
    "button",
    {
      type: "button",
      onClick: () => handleRemoveCoreValue(index),
      className: "ml-2 text-dim hover:text-danger"
    },
    /* @__PURE__ */ React.createElement(CloseIcon, { size: 14 })
  )))), /* @__PURE__ */ React.createElement("div", { className: "flex" }, /* @__PURE__ */ React.createElement(
    "input",
    {
      type: "text",
      value: newCoreValue,
      onChange: (e) => setNewCoreValue(e.target.value),
      placeholder: "Add a core value",
      className: "flex-1 px-3 py-2 border border-line rounded-l-md  focus:outline-none focus:ring-2 focus:ring-ink focus:border-transparent"
    }
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      type: "button",
      onClick: handleAddCoreValue,
      className: "bg-cta text-cta-foreground px-4 py-2 rounded-r-md hover:bg-cta focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ink"
    },
    "Add"
  ))), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-sm font-medium text-ink mb-1" }, "Certifications"), /* @__PURE__ */ React.createElement("div", { className: "flex flex-wrap gap-2 mb-2" }, companyFormData.certifications && companyFormData.certifications.map((cert, index) => {
    const certUrl = typeof cert === "string" ? null : cert.url || cert.signedUrl || cert.s3Url;
    return /* @__PURE__ */ React.createElement("div", { key: index, className: "bg-surface-hover px-3 py-1 rounded-full text-sm font-medium flex items-center gap-2" }, cert.name || cert.originalName || "Certificate", certUrl && /* @__PURE__ */ React.createElement(
      "a",
      {
        href: certUrl,
        target: "_blank",
        rel: "noopener noreferrer",
        className: "text-info hover:text-info",
        title: "View certification"
      },
      /* @__PURE__ */ React.createElement(Eye, { className: "w-4 h-4" })
    ));
  }), certificationFiles && certificationFiles.map((file, index) => /* @__PURE__ */ React.createElement("div", { key: `new-${index}`, className: "bg-surface-hover px-3 py-1 rounded-full text-sm font-medium flex items-center" }, /* @__PURE__ */ React.createElement("span", null, file.name), /* @__PURE__ */ React.createElement(
    "button",
    {
      type: "button",
      onClick: () => handleRemoveCertificationFile(index),
      className: "ml-2 text-dim hover:text-danger"
    },
    /* @__PURE__ */ React.createElement(CloseIcon, { size: 14 })
  )))), /* @__PURE__ */ React.createElement("div", { className: "mt-2" }, /* @__PURE__ */ React.createElement("label", { htmlFor: "certifications", className: "cursor-pointer bg-surface-hover hover:bg-surface-hover text-ink text-sm font-medium px-4 py-2 rounded-md transition-colors flex items-center w-fit" }, /* @__PURE__ */ React.createElement(Upload, { className: "w-4 h-4 mr-2" }), "Upload Certifications", /* @__PURE__ */ React.createElement(
    "input",
    {
      id: "certifications",
      type: "file",
      multiple: true,
      onChange: handleCertificationUpload,
      className: "hidden",
      accept: ".pdf,.jpg,.jpeg,.png"
    }
  )), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-dim mt-1" }, "Upload certification documents (PDF, JPG, PNG)"))), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { htmlFor: "teamSize", className: "block text-sm font-medium text-ink mb-1" }, "Team Size"), /* @__PURE__ */ React.createElement(
    "textarea",
    {
      id: "teamSize",
      name: "teamSize",
      value: companyFormData.teamSize,
      onChange: handleCompanyInputChange,
      rows: 2,
      className: "w-full px-3 py-2 border border-line rounded-md  focus:outline-none focus:ring-2 focus:ring-ink focus:border-transparent",
      placeholder: "Describe your team size and global presence"
    }
  )), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { htmlFor: "uniqueSellingProposition", className: "block text-sm font-medium text-ink mb-1" }, "Unique Selling Proposition"), /* @__PURE__ */ React.createElement(
    "textarea",
    {
      id: "uniqueSellingProposition",
      name: "uniqueSellingProposition",
      value: companyFormData.uniqueSellingProposition,
      onChange: handleCompanyInputChange,
      rows: 3,
      className: "w-full px-3 py-2 border border-line rounded-md  focus:outline-none focus:ring-2 focus:ring-ink focus:border-transparent",
      placeholder: "What makes your company unique?"
    }
  )), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { htmlFor: "socialImpact", className: "block text-sm font-medium text-ink mb-1" }, "Social Impact/ECG Focus"), /* @__PURE__ */ React.createElement(
    "textarea",
    {
      id: "socialImpact",
      name: "socialImpact",
      value: companyFormData.socialImpact,
      onChange: handleCompanyInputChange,
      rows: 3,
      className: "w-full px-3 py-2 border border-line rounded-md  focus:outline-none focus:ring-2 focus:ring-ink focus:border-transparent",
      placeholder: "Describe your company's social impact initiatives"
    }
  )), /* @__PURE__ */ React.createElement("div", { className: "flex justify-end gap-3 pt-6 border-t mt-6 border-line" }, /* @__PURE__ */ React.createElement(
    "button",
    {
      type: "button",
      onClick: () => setIsCompanyModalOpen(false),
      className: "px-4 py-2 bg-surface-hover text-ink rounded-md hover:bg-surface-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-line transition-colors",
      disabled: saving
    },
    "Cancel"
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      type: "submit",
      className: "px-4 py-2 bg-black text-white rounded-md hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ink transition-opacity flex items-center",
      disabled: saving
    },
    saving ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { className: "animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2" }), "Saving...") : "Save Changes"
  )))))));
}
const DetailRow = ({ title, value }) => /* @__PURE__ */ React.createElement("div", { className: "border-t pt-4" }, /* @__PURE__ */ React.createElement("p", { className: "text-dim font-semibold mb-1 text-base" }, title), /* @__PURE__ */ React.createElement("div", { className: "text-ink whitespace-pre-line text-base" }, value));

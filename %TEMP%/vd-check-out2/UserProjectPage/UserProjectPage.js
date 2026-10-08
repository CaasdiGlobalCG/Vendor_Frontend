import React, { useState, useEffect, useContext } from "react";
import config from "../../config/env";
import {
  ChevronDown,
  Eye,
  Download,
  Edit,
  Plus,
  Building2,
  Clock,
  Tag,
  Users,
  X as CloseIcon
} from "lucide-react";
import { TrashIcon } from "@heroicons/react/24/outline";
import { UserContext } from "../../context/UserContext";
import { VendorContext } from "../../context/VendorContext";
import profilePlaceholder from "../../assets/profileplaceholder.jpg";
import { VendorHeader } from "../../components/vendor-header";
import UserProfileCard from "../../components/UserProfileCard/UserProfileCard";
import VendorTabPanel from "../../components/layout/VendorTabPanel";
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
const MetaItem = ({ icon, label, value }) => /* @__PURE__ */ React.createElement("div", { className: "rounded-lg border border-line bg-canvas px-3 py-2" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wide text-dim" }, icon, label), /* @__PURE__ */ React.createElement("div", { className: "mt-1 truncate text-xs font-semibold text-ink", title: value }, value));
const DetailBlock = ({ title, text }) => /* @__PURE__ */ React.createElement("div", { className: "rounded-lg border border-line bg-canvas p-3" }, /* @__PURE__ */ React.createElement("h4", { className: "mb-1 text-[10px] font-medium uppercase tracking-wide text-dim" }, title), /* @__PURE__ */ React.createElement("p", { className: "whitespace-pre-line text-sm leading-relaxed text-ink" }, text));
export default function UserProjectPage() {
  const { currentUser } = useContext(UserContext);
  const { currentUser: vendorUser, vendorData, setVendorData } = useContext(VendorContext);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dataFetched, setDataFetched] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [profileData, setProfileData] = useState(() => ({
    name: vendorData?.vendorDetails?.primaryContactName || currentUser?.name || vendorUser?.name || "",
    vendorId: vendorData?.vendorDetails ? `#${vendorUser?.vendorId?.substring(0, 6) || "CXV001"}` : "#Loading",
    image: vendorData?.profileImage?.url || profilePlaceholder,
    companyName: vendorData?.companyDetails?.companyName || vendorData?.vendorDetails?.companyName || "",
    phone: vendorData?.vendorDetails?.primaryContactPhone || "",
    location: `${vendorData?.companyDetails?.state || ""}, ${vendorData?.companyDetails?.country || ""}`.replace(/^, |, $/, "") || "",
    email: vendorData?.vendorDetails?.primaryContactEmail || currentUser?.email || vendorUser?.email || ""
  }));
  const [profileFormData, setProfileFormData] = useState({ ...profileData });
  const [imagePreview, setImagePreview] = useState(profileData.image);
  const [projects, setProjects] = useState([]);
  const [sortOrder, setSortOrder] = useState("recent");
  const [expandedProjects, setExpandedProjects] = useState({});
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [projectFormData, setProjectFormData] = useState({});
  const [selectedCountry, setSelectedCountry] = useState("");
  const [states, setStates] = useState([]);
  const [selectedState, setSelectedState] = useState("");
  const [phoneCountryCode, setPhoneCountryCode] = useState("");
  const [phoneNumberWithoutCode, setPhoneNumberWithoutCode] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  useEffect(() => {
    console.log("UserProjectPage - Current User Context:", currentUser);
    console.log("UserProjectPage - Vendor User Context:", vendorUser);
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
            location: `${vendor.companyDetails?.state || ""}, ${vendor.companyDetails?.country || ""}`.replace(/^, |, $/, "") || "",
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
      console.log("UserProjectPage - Executing delayed data fetch");
      fetchVendorData();
    }, 500);
    return () => clearTimeout(timer);
  }, []);
  useEffect(() => {
    if (isProfileModalOpen) {
      setProfileFormData({ ...profileData });
      setImagePreview(profileData.image);
      const [state, country] = (profileData.location || ",").split(", ");
      setSelectedCountry(country || "");
      setSelectedState(state || "");
      setStates(countryStateData[country] || []);
      const [code, ...numberParts] = (profileData.phone || "").split(" ");
      setPhoneCountryCode(code || "");
      setPhoneNumberWithoutCode(numberParts.join(" ") || "");
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
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        setProjectsLoading(true);
        const token = localStorage.getItem("authToken");
        const response = await fetch(`${config.VENDOR_BACKEND_URL}/api/vendor/projects`, {
          credentials: "include",
          headers: token ? { Authorization: `Bearer ${token}` } : void 0
        });
        if (!response.ok) {
          throw new Error(`Server responded with status: ${response.status}`);
        }
        const data = await response.json();
        console.log("Projects data response:", data);
        if (data.success && data.data && data.data.length > 0) {
          const initialExpandedState = {};
          data.data.forEach((project) => {
            initialExpandedState[project.id] = project.initiallyExpanded || false;
          });
          setExpandedProjects(initialExpandedState);
          setProjects(data.data);
        } else {
          setProjects([]);
          setExpandedProjects({});
        }
        setProjectsLoading(false);
      } catch (error2) {
        console.error("Error fetching projects:", error2);
        setProjects([]);
        setExpandedProjects({});
        setProjectsLoading(false);
      }
    };
    const timer = setTimeout(() => {
      console.log("UserProjectPage - Executing delayed projects fetch");
      fetchProjects();
    }, 600);
    return () => clearTimeout(timer);
  }, []);
  useEffect(() => {
    if (isProfileModalOpen || isProjectModalOpen || showAddModal) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isProfileModalOpen, isProjectModalOpen, showAddModal]);
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
      if (typeof imagePreview === "string" && imagePreview.startsWith("blob:")) {
        URL.revokeObjectURL(imagePreview);
      }
      setImagePreview(previewUrl);
      setProfileFormData((prevData) => ({ ...prevData, imageFile: file, image: previewUrl }));
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
  const toggleProjectExpansion = (projectId) => {
    setExpandedProjects((prev) => ({
      ...prev,
      [projectId]: !prev[projectId]
    }));
  };
  const handleDeleteProject = async (projectId) => {
    if (!window.confirm("Are you sure you want to delete this project?")) {
      return;
    }
    try {
      const response = await fetch(`${config.VENDOR_BACKEND_URL}/api/vendor/projects/${projectId}`, {
        method: "DELETE"
      });
      if (!response.ok) {
        throw new Error(`Server responded with status: ${response.status}`);
      }
      const result = await response.json();
      console.log("Project delete result:", result);
      if (result.success) {
        setProjects((prev) => prev.filter((proj) => proj._id !== projectId));
        setExpandedProjects((prev) => {
          const newState = { ...prev };
          delete newState[projectId];
          return newState;
        });
        alert("Project deleted successfully!");
      } else {
        throw new Error("Failed to delete project");
      }
    } catch (error2) {
      console.error("Error deleting project:", error2);
      alert(`Failed to delete project: ${error2.message}`);
    }
  };
  const handleSortChange = (event) => {
    setSortOrder(event.target.value);
  };
  const handleProjectEditClick = (project) => {
    const projectCopy = JSON.parse(JSON.stringify(project));
    if (projectCopy.date && typeof projectCopy.date === "string") {
      projectCopy.date = new Date(projectCopy.date);
    }
    setEditingProject(projectCopy);
    setProjectFormData(projectCopy);
    setIsProjectModalOpen(true);
  };
  const handleProjectCloseModal = () => {
    setIsProjectModalOpen(false);
    setEditingProject(null);
    setProjectFormData({});
  };
  const handleProjectInputChange = (e) => {
    const { name, value } = e.target;
    setProjectFormData((prevData) => ({ ...prevData, [name]: value }));
  };
  const handleProjectSave = async () => {
    try {
      if (!projectFormData.title || !projectFormData.description) {
        alert("Please fill in at least the title and description fields");
        return;
      }
      const formData = new FormData();
      const projectData = {
        ...projectFormData,
        vendorEmail: currentUser?.email
      };
      const projectDataForJson = { ...projectData };
      const hasNewDocuments = projectFormData.documents && projectFormData.documents.some((doc) => typeof doc !== "string" && !doc.id);
      const hasNewPhotos = projectFormData.photos && projectFormData.photos.some((photo) => typeof photo !== "string" && !photo.url);
      if (hasNewDocuments || hasNewPhotos) {
        delete projectDataForJson.documents;
        delete projectDataForJson.photos;
      }
      formData.append("projectData", JSON.stringify(projectDataForJson));
      if (hasNewDocuments && projectFormData.documents) {
        projectFormData.documents.forEach((doc) => {
          if (typeof doc !== "string" && !doc.id) {
            formData.append("documents", doc);
          }
        });
      }
      if (hasNewPhotos && projectFormData.photos) {
        projectFormData.photos.forEach((photo) => {
          if (typeof photo !== "string" && !photo.url) {
            formData.append("photos", photo);
          }
        });
      }
      const projectId = editingProject._id;
      const response = await fetch(`${config.VENDOR_BACKEND_URL}/api/vendor/projects/${projectId}`, {
        method: "PUT",
        body: formData
      });
      if (!response.ok) {
        throw new Error(`Server responded with status: ${response.status}`);
      }
      const result = await response.json();
      console.log("Project update result:", result);
      if (result.success && result.data) {
        const updatedProject = {
          ...result.data,
          date: new Date(result.data.date)
        };
        setProjects(
          (prev) => prev.map((proj) => proj._id === projectId ? updatedProject : proj)
        );
        handleProjectCloseModal();
        alert("Project updated successfully!");
      } else {
        throw new Error("Failed to update project");
      }
    } catch (error2) {
      console.error("Error updating project:", error2);
      alert(`Failed to update project: ${error2.message}`);
    }
  };
  const handleDocumentUpload = (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0)
      return;
    setProjectFormData((prev) => ({
      ...prev,
      documents: [...prev.documents || [], ...files]
    }));
    e.target.value = "";
  };
  const handleRemoveDocument = (index) => {
    setProjectFormData((prev) => {
      const newDocuments = [...prev.documents];
      newDocuments.splice(index, 1);
      return {
        ...prev,
        documents: newDocuments
      };
    });
  };
  const handlePhotoUpload = (e) => {
    const files = Array.from(e.target.files).slice(0, 5);
    setProjectFormData((prev) => ({
      ...prev,
      photos: [...prev.photos || [], ...files].slice(0, 5)
    }));
  };
  const handleRemovePhoto = (index) => {
    setProjectFormData((prev) => ({
      ...prev,
      photos: prev.photos.filter((_, i) => i !== index)
    }));
  };
  const [newProject, setNewProject] = useState({
    id: "",
    title: "",
    description: "",
    client: "",
    duration: "",
    category: "",
    team: "",
    objective: "",
    features: "",
    impact: "",
    deliverables: "",
    compliance: "",
    documents: [],
    photos: [],
    isNew: true
  });
  const [isAddingProject, setIsAddingProject] = useState(false);
  const handleAddProject = async () => {
    if (isAddingProject)
      return;
    setIsAddingProject(true);
    try {
      if (!newProject.title || !newProject.description) {
        alert("Please fill in at least the title and description fields");
        setIsAddingProject(false);
        return;
      }
      const formData = new FormData();
      const projectData = {
        ...newProject,
        date: /* @__PURE__ */ new Date(),
        vendorId: vendorUser?.vendorId || vendorUser?.id,
        vendorEmail: currentUser?.email || vendorUser?.email
      };
      console.log("Sending project data:", { title: projectData.title, vendorId: projectData.vendorId, vendorEmail: projectData.vendorEmail });
      const projectDataForJson = { ...projectData };
      delete projectDataForJson.documents;
      delete projectDataForJson.photos;
      formData.append("projectData", JSON.stringify(projectDataForJson));
      if (newProject.documents && newProject.documents.length > 0) {
        newProject.documents.forEach((doc, index) => {
          formData.append(`documents`, doc);
        });
      }
      if (newProject.photos && newProject.photos.length > 0) {
        newProject.photos.forEach((photo, index) => {
          formData.append(`photos`, photo);
        });
      }
      const response = await fetch(`${config.VENDOR_BACKEND_URL}/api/vendor/projects`, {
        method: "POST",
        body: formData
      });
      const result = await response.json();
      console.log("Project add response:", result);
      if (!response.ok) {
        throw new Error(result.message || result.error || `Server responded with status: ${response.status}`);
      }
      if (result.success && result.data) {
        const savedProject = {
          ...result.data,
          date: new Date(result.data.date),
          isNew: true
        };
        setProjects((prev) => [savedProject, ...prev]);
        setExpandedProjects((prev) => ({
          ...prev,
          [savedProject._id]: false
        }));
        setNewProject({
          title: "",
          description: "",
          client: "",
          duration: "",
          category: "",
          team: "",
          objective: "",
          features: "",
          impact: "",
          deliverables: "",
          compliance: "",
          documents: [],
          photos: [],
          isNew: true
        });
        setShowAddModal(false);
        alert("Project added successfully!");
      } else {
        throw new Error(result.message || "Failed to add project");
      }
    } catch (error2) {
      console.error("Error adding project:", error2);
      alert(`Failed to add project: ${error2.message}`);
    } finally {
      setIsAddingProject(false);
    }
  };
  const getPhotoUrl = (photo) => {
    if (!photo)
      return "";
    if (typeof photo === "string") {
      return photo;
    }
    if (photo instanceof File || photo instanceof Blob) {
      try {
        return URL.createObjectURL(photo);
      } catch (error2) {
        console.error("Error creating object URL:", error2);
        return "";
      }
    }
    if (photo.url || photo.signedUrl || photo.s3Url) {
      return photo.url || photo.signedUrl || photo.s3Url;
    }
    console.warn("Unknown photo type:", photo);
    return "";
  };
  return /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { className: "min-h-screen bg-canvas font-sans" }, /* @__PURE__ */ React.createElement("div", { className: "pt-5 px-5 pb-0" }, /* @__PURE__ */ React.createElement(VendorHeader, null)), /* @__PURE__ */ React.createElement("div", { className: "mx-auto mt-3 flex w-full max-w-[1400px] flex-col gap-5 px-3 py-5 sm:mt-4 sm:gap-6 sm:px-4 sm:py-8 md:px-6 lg:flex-row lg:items-start lg:px-8" }, /* @__PURE__ */ React.createElement(
    UserProfileCard,
    {
      profileData,
      loading: !dataFetched && loading,
      error,
      onEditProfileClick: handleProfileEditClick
    }
  ), /* @__PURE__ */ React.createElement(
    VendorTabPanel,
    {
      title: "Projects",
      description: "Recent works, case studies, and active collaborations.",
      bodyClassName: "p-4 sm:p-6",
      actions: /* @__PURE__ */ React.createElement("div", { className: "flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:flex-wrap sm:justify-end" }, /* @__PURE__ */ React.createElement(
        "button",
        {
          onClick: () => setShowAddModal(true),
          className: "bg-cta text-cta-foreground px-6 py-2.5 rounded-md text-sm font-medium hover:opacity-90 transition-opacity whitespace-nowrap"
        },
        "+ Add Project"
      ), /* @__PURE__ */ React.createElement("div", { className: "relative w-full sm:w-auto" }, /* @__PURE__ */ React.createElement("label", { htmlFor: "sortOrder", className: "sr-only" }, "Sort projects"), /* @__PURE__ */ React.createElement(
        "select",
        {
          id: "sortOrder",
          value: sortOrder,
          onChange: handleSortChange,
          className: "w-full appearance-none bg-surface border border-line px-4 py-2.5 pr-10 rounded-md text-sm font-medium text-ink focus:outline-none focus:ring-2 focus:ring-ink focus:border-transparent cursor-pointer hover:bg-canvas transition-colors sm:min-w-[170px]"
        },
        /* @__PURE__ */ React.createElement("option", { value: "recent" }, "Recent First"),
        /* @__PURE__ */ React.createElement("option", { value: "oldest" }, "Oldest First")
      ), /* @__PURE__ */ React.createElement("div", { className: "absolute right-3 top-1/2 -translate-y-1/2  pointer-events-none text-dim" }, /* @__PURE__ */ React.createElement(ChevronDown, { size: 18 }))))
    },
    showAddModal && /* @__PURE__ */ React.createElement("div", { className: "fixed inset-0 bg-cta backdrop-blur-sm z-50 flex items-center justify-center p-4 sm:p-6" }, /* @__PURE__ */ React.createElement("div", { className: "bg-surface rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden" }, /* @__PURE__ */ React.createElement("div", { className: "flex justify-between items-center px-6 py-4 border-b border-line flex-shrink-0 bg-surface" }, /* @__PURE__ */ React.createElement("h3", { className: "text-xl font-bold text-ink" }, "Add New Project"), /* @__PURE__ */ React.createElement("button", { onClick: () => setShowAddModal(false), className: "text-dim hover:text-dim transition-colors" }, /* @__PURE__ */ React.createElement(CloseIcon, { size: 20 }))), /* @__PURE__ */ React.createElement("div", { className: "overflow-y-auto p-6 flex-1 bg-surface" }, /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4" }, /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "text",
        placeholder: "Title",
        className: "border rounded px-3 py-2 text-sm w-full",
        value: newProject.title,
        onChange: (e) => setNewProject({ ...newProject, title: e.target.value })
      }
    ), /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "text",
        placeholder: "Client",
        className: "border rounded px-3 py-2 text-sm w-full",
        value: newProject.client,
        onChange: (e) => setNewProject({ ...newProject, client: e.target.value })
      }
    ), /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "text",
        placeholder: "Duration",
        className: "border rounded px-3 py-2 text-sm w-full",
        value: newProject.duration,
        onChange: (e) => setNewProject({ ...newProject, duration: e.target.value })
      }
    ), /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "text",
        placeholder: "Category",
        className: "border rounded px-3 py-2 text-sm w-full",
        value: newProject.category,
        onChange: (e) => setNewProject({ ...newProject, category: e.target.value })
      }
    ), /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "text",
        placeholder: "Team",
        className: "border rounded px-3 py-2 text-sm w-full",
        value: newProject.team,
        onChange: (e) => setNewProject({ ...newProject, team: e.target.value })
      }
    ), /* @__PURE__ */ React.createElement(
      "textarea",
      {
        placeholder: "Description",
        className: "border rounded px-3 py-2 text-sm w-full md:col-span-2",
        rows: "3",
        value: newProject.description,
        onChange: (e) => setNewProject({ ...newProject, description: e.target.value })
      }
    ), /* @__PURE__ */ React.createElement(
      "textarea",
      {
        placeholder: "Objective",
        className: "border rounded px-3 py-2 text-sm w-full md:col-span-2",
        rows: "3",
        value: newProject.objective,
        onChange: (e) => setNewProject({ ...newProject, objective: e.target.value })
      }
    ), /* @__PURE__ */ React.createElement(
      "textarea",
      {
        placeholder: "Key Features",
        className: "border rounded px-3 py-2 text-sm w-full md:col-span-2",
        rows: "3",
        value: newProject.features,
        onChange: (e) => setNewProject({ ...newProject, features: e.target.value })
      }
    ), /* @__PURE__ */ React.createElement(
      "textarea",
      {
        placeholder: "Impact",
        className: "border rounded px-3 py-2 text-sm w-full md:col-span-2",
        rows: "3",
        value: newProject.impact,
        onChange: (e) => setNewProject({ ...newProject, impact: e.target.value })
      }
    ), /* @__PURE__ */ React.createElement(
      "textarea",
      {
        placeholder: "Delivarables",
        className: "border rounded px-3 py-2 text-sm w-full md:col-span-2",
        rows: "3",
        value: newProject.deliverables,
        onChange: (e) => setNewProject({ ...newProject, deliverables: e.target.value })
      }
    ), /* @__PURE__ */ React.createElement(
      "textarea",
      {
        placeholder: "Compliance",
        className: "border rounded px-3 py-2 text-sm w-full md:col-span-2",
        rows: "3",
        value: newProject.compliance,
        onChange: (e) => setNewProject({ ...newProject, compliance: e.target.value })
      }
    ), /* @__PURE__ */ React.createElement("div", { className: "w-full md:col-span-2 mt-4" }, /* @__PURE__ */ React.createElement("label", { className: "block text-ink font-semibold mb-2" }, "Upload Project Documents"), /* @__PURE__ */ React.createElement("div", { className: "flex flex-col gap-2" }, newProject.documents?.map((doc, index) => /* @__PURE__ */ React.createElement("div", { key: index, className: "flex items-center gap-2 text-sm text-ink" }, "\u{1F4C4} ", doc.name)), newProject.documents?.length < 5 && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(
      "label",
      {
        htmlFor: "projectDocsUpload",
        className: "px-4 py-2 border border-dashed border-line text-dim rounded-md text-sm cursor-pointer hover:border-line hover:text-ink w-fit"
      },
      "+ Upload Documents (PDF, DOCX, etc.)"
    ), /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "file",
        id: "projectDocsUpload",
        accept: ".pdf,.doc,.docx,.txt",
        multiple: true,
        className: "hidden",
        onChange: (e) => {
          const files = Array.from(e.target.files);
          const updatedDocs = [...newProject.documents || [], ...files];
          if (updatedDocs.length > 5) {
            alert("You can upload a maximum of 5 documents.");
            return;
          }
          setNewProject({ ...newProject, documents: updatedDocs });
        }
      }
    )))), /* @__PURE__ */ React.createElement("div", { className: "w-full md:col-span-2 mt-4" }, /* @__PURE__ */ React.createElement("label", { className: "block text-ink font-semibold mb-2" }, "Project Images"), /* @__PURE__ */ React.createElement("div", { className: "flex flex-wrap gap-4" }, newProject.photos?.map((image, index) => /* @__PURE__ */ React.createElement("div", { key: `new-photo-${index}`, className: "relative" }, /* @__PURE__ */ React.createElement(
      "img",
      {
        src: getPhotoUrl(image),
        alt: `Project ${index + 1}`,
        className: "w-24 h-24 object-cover rounded-md border"
      }
    ), /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        onClick: () => {
          const updatedPhotos = [...newProject.photos];
          updatedPhotos.splice(index, 1);
          setNewProject({ ...newProject, photos: updatedPhotos });
        },
        className: "absolute top-1 right-1 bg-surface text-danger hover:text-danger rounded-full p-1 shadow",
        title: "Remove"
      },
      /* @__PURE__ */ React.createElement(TrashIcon, { className: "h-3 w-3" })
    ))), newProject.photos?.length < 5 && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(
      "label",
      {
        htmlFor: "projectImageUpload",
        className: "w-24 h-24 flex items-center justify-center border-2 border-dashed text-dim rounded-md cursor-pointer hover:border-line"
      },
      "+"
    ), /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "file",
        id: "projectImageUpload",
        accept: "image/*",
        multiple: true,
        className: "hidden",
        onChange: (e) => {
          const files = Array.from(e.target.files);
          const updatedFiles = [...newProject.photos || [], ...files];
          if (updatedFiles.length > 5) {
            alert("You can upload a maximum of 5 images.");
            return;
          }
          setNewProject({ ...newProject, photos: updatedFiles });
        }
      }
    )))))), /* @__PURE__ */ React.createElement("div", { className: "flex justify-end gap-3 pt-6 border-t mt-6 border-line bg-surface" }, /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => setShowAddModal(false),
        className: "px-4 py-2 text-sm rounded-md bg-surface-hover text-ink hover:bg-surface-hover focus:outline-none transition-colors"
      },
      "Cancel"
    ), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: handleAddProject,
        disabled: isAddingProject,
        className: `px-4 py-2 text-sm rounded-md bg-cta text-cta-foreground hover:opacity-90 ${isAddingProject ? "opacity-70 cursor-not-allowed" : ""}`
      },
      isAddingProject ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("svg", { className: "animate-spin -ml-1 mr-2 h-4 w-4 text-cta-foreground inline", xmlns: "http://www.w3.org/2000/svg", fill: "none", viewBox: "0 0 24 24" }, /* @__PURE__ */ React.createElement("circle", { className: "opacity-25", cx: "12", cy: "12", r: "10", stroke: "currentColor", strokeWidth: "4" }), /* @__PURE__ */ React.createElement("path", { className: "opacity-75", fill: "currentColor", d: "M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" })), "Processing...") : "Add Project"
    )))),
    /* @__PURE__ */ React.createElement("div", { className: "space-y-3 mt-6" }, projectsLoading ? /* @__PURE__ */ React.createElement("div", { className: "flex justify-center items-center py-10" }, /* @__PURE__ */ React.createElement("svg", { className: "animate-spin h-8 w-8 text-ink", xmlns: "http://www.w3.org/2000/svg", fill: "none", viewBox: "0 0 24 24" }, /* @__PURE__ */ React.createElement("circle", { className: "opacity-25", cx: "12", cy: "12", r: "10", stroke: "currentColor", strokeWidth: "4" }), /* @__PURE__ */ React.createElement("path", { className: "opacity-75", fill: "currentColor", d: "M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" }))) : projects.length > 0 ? projects.map((project) => {
      const photoUrls = (project.photos || []).map(getPhotoUrl).filter(Boolean);
      const coverPhoto = photoUrls[0];
      return /* @__PURE__ */ React.createElement("div", { key: project.id || project._id, className: "bg-surface border border-line rounded-xl hover:shadow-md transition-all duration-200 overflow-hidden" }, coverPhoto && /* @__PURE__ */ React.createElement("div", { className: "relative h-44 bg-surface-hover" }, /* @__PURE__ */ React.createElement(
        "img",
        {
          src: coverPhoto,
          alt: project.title || "Project cover",
          className: "w-full h-full object-cover"
        }
      ), /* @__PURE__ */ React.createElement("div", { className: "absolute inset-0 bg-gradient-to-t from-black/45 via-black/0 to-black/0" }), project.isNew && /* @__PURE__ */ React.createElement("span", { className: "absolute left-3 top-3 rounded-full bg-surface px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-ink" }, "New"), photoUrls.length > 1 && /* @__PURE__ */ React.createElement("span", { className: "absolute bottom-3 right-3 rounded-full bg-black/60 px-2.5 py-1 text-xs font-medium text-white" }, "+", photoUrls.length - 1, " photo", photoUrls.length - 1 > 1 ? "s" : "")), /* @__PURE__ */ React.createElement("div", { className: "p-4 sm:p-5 border-b border-line" }, /* @__PURE__ */ React.createElement("div", { className: "flex justify-between items-start gap-3" }, /* @__PURE__ */ React.createElement("div", { className: "flex-1 min-w-0" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2 flex-wrap" }, /* @__PURE__ */ React.createElement("h3", { className: "font-semibold text-ink text-base" }, project.title), project.isNew && !coverPhoto && /* @__PURE__ */ React.createElement("span", { className: "bg-surface-hover text-ink text-[10px] px-2.5 py-1 rounded-full font-semibold uppercase tracking-wide" }, "New")), /* @__PURE__ */ React.createElement("p", { className: "mt-1 text-sm text-dim line-clamp-2" }, project.description)), /* @__PURE__ */ React.createElement("div", { className: "flex gap-1 flex-shrink-0" }, /* @__PURE__ */ React.createElement(
        "button",
        {
          onClick: () => handleProjectEditClick(project),
          className: "text-dim hover:text-ink p-1.5 hover:bg-surface-hover rounded transition-colors",
          title: "Edit Project"
        },
        /* @__PURE__ */ React.createElement(Edit, { size: 16 })
      ), /* @__PURE__ */ React.createElement(
        "button",
        {
          onClick: () => handleDeleteProject(project._id || project.id),
          className: "text-dim hover:text-danger p-1.5 hover:bg-surface-hover rounded transition-colors",
          title: "Delete Project"
        },
        /* @__PURE__ */ React.createElement(TrashIcon, { className: "h-4 w-4" })
      )))), /* @__PURE__ */ React.createElement("div", { className: "p-4 sm:p-5" }, (project.client || project.duration || project.category || project.team) && /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-2 gap-2 sm:grid-cols-4" }, project.client && /* @__PURE__ */ React.createElement(MetaItem, { icon: /* @__PURE__ */ React.createElement(Building2, { size: 13 }), label: "Client", value: project.client }), project.duration && /* @__PURE__ */ React.createElement(MetaItem, { icon: /* @__PURE__ */ React.createElement(Clock, { size: 13 }), label: "Duration", value: project.duration }), project.category && /* @__PURE__ */ React.createElement(MetaItem, { icon: /* @__PURE__ */ React.createElement(Tag, { size: 13 }), label: "Category", value: project.category }), project.team && /* @__PURE__ */ React.createElement(MetaItem, { icon: /* @__PURE__ */ React.createElement(Users, { size: 13 }), label: "Team", value: project.team })), /* @__PURE__ */ React.createElement(
        "button",
        {
          onClick: () => toggleProjectExpansion(project.id || project._id),
          className: "w-full mt-4 pt-4 border-t border-line text-ink hover:text-dim text-sm font-medium flex items-center justify-center gap-2 transition-colors"
        },
        expandedProjects[project.id || project._id] ? "Show Less" : "Show More Details",
        /* @__PURE__ */ React.createElement(
          ChevronDown,
          {
            size: 16,
            className: `transform transition-transform ${expandedProjects[project.id || project._id] ? "rotate-180" : ""}`
          }
        )
      ), expandedProjects[project.id || project._id] && /* @__PURE__ */ React.createElement("div", { className: "pt-4 space-y-4" }, (project.objective || project.features || project.impact || project.deliverables || project.compliance) && /* @__PURE__ */ React.createElement("div", { className: "grid gap-3 sm:grid-cols-2" }, project.objective && /* @__PURE__ */ React.createElement(DetailBlock, { title: "Objective", text: project.objective }), project.features && /* @__PURE__ */ React.createElement(DetailBlock, { title: "Key Features", text: project.features }), project.impact && /* @__PURE__ */ React.createElement(DetailBlock, { title: "Impact", text: project.impact }), project.deliverables && /* @__PURE__ */ React.createElement(DetailBlock, { title: "Deliverables", text: project.deliverables }), project.compliance && /* @__PURE__ */ React.createElement(DetailBlock, { title: "Compliance", text: project.compliance })), project.documents && project.documents.length > 0 && /* @__PURE__ */ React.createElement("div", { className: "pt-2" }, /* @__PURE__ */ React.createElement("h4", { className: "text-xs font-medium text-dim uppercase tracking-wide mb-2" }, "Documents"), /* @__PURE__ */ React.createElement("div", { className: "space-y-2" }, project.documents.map((doc) => /* @__PURE__ */ React.createElement("div", { key: doc.id, className: "flex items-center justify-between p-2 bg-canvas rounded border border-line" }, /* @__PURE__ */ React.createElement("span", { className: "text-xs text-ink font-medium truncate pr-2" }, doc.name), /* @__PURE__ */ React.createElement("div", { className: "flex gap-2 flex-shrink-0" }, /* @__PURE__ */ React.createElement("a", { href: doc.url || "#", target: "_blank", rel: "noopener noreferrer", className: "text-dim hover:text-ink", title: "View" }, /* @__PURE__ */ React.createElement(Eye, { size: 16 })), /* @__PURE__ */ React.createElement("a", { href: doc.url || "#", download: doc.name, className: "text-dim hover:text-ink", title: "Download" }, /* @__PURE__ */ React.createElement(Download, { size: 16 }))))))), photoUrls.length > 0 && /* @__PURE__ */ React.createElement("div", { className: "pt-2" }, /* @__PURE__ */ React.createElement("h4", { className: "text-xs font-medium text-dim uppercase tracking-wide mb-2" }, "Photos"), /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-3 sm:grid-cols-4 gap-2" }, photoUrls.slice(0, 4).map((url, index) => /* @__PURE__ */ React.createElement(
        "a",
        {
          key: `photo-${index}`,
          href: url,
          target: "_blank",
          rel: "noopener noreferrer",
          className: "relative group block",
          title: "View photo"
        },
        /* @__PURE__ */ React.createElement(
          "img",
          {
            src: url,
            alt: `Project Photo ${index + 1}`,
            className: "w-full h-20 object-cover rounded border border-line group-hover:opacity-90 transition-opacity"
          }
        ),
        photoUrls.length > 4 && index === 3 && /* @__PURE__ */ React.createElement("div", { className: "absolute inset-0 bg-black bg-opacity-50 rounded flex items-center justify-center" }, /* @__PURE__ */ React.createElement("span", { className: "text-white text-sm font-medium" }, "+", photoUrls.length - 4))
      )))))));
    }) : /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { className: "text-center py-12 bg-canvas rounded-lg border border-line" }, /* @__PURE__ */ React.createElement("p", { className: "text-dim text-sm mb-4" }, "No projects yet. Start by creating your first project!"), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => setShowAddModal(true),
        className: "inline-flex items-center gap-2 bg-cta hover:bg-cta text-cta-foreground px-4 py-2 rounded-md text-sm font-medium transition-colors"
      },
      /* @__PURE__ */ React.createElement(Plus, { size: 16 }),
      "Create Project"
    ))))
  ))), isProfileModalOpen && /* @__PURE__ */ React.createElement("div", { className: "fixed inset-0 bg-cta backdrop-blur-sm z-50 flex items-center justify-center p-4 sm:p-6" }, /* @__PURE__ */ React.createElement("div", { className: "bg-surface rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden" }, /* @__PURE__ */ React.createElement("div", { className: "flex justify-between items-center px-6 py-4 border-b border-line flex-shrink-0 bg-surface" }, /* @__PURE__ */ React.createElement("h2", { className: "text-xl font-semibold text-ink" }, "Edit Profile"), /* @__PURE__ */ React.createElement("button", { onClick: handleProfileCloseModal, className: "text-dim hover:text-dim transition-colors" }, /* @__PURE__ */ React.createElement(CloseIcon, { size: 20 }))), /* @__PURE__ */ React.createElement("div", { className: "overflow-y-auto p-6 flex-1 bg-surface" }, /* @__PURE__ */ React.createElement("form", { onSubmit: (e) => e.preventDefault(), className: "space-y-4" }, /* @__PURE__ */ React.createElement("div", { className: "flex flex-col items-center space-y-3" }, /* @__PURE__ */ React.createElement("img", { src: imagePreview, alt: "Profile Preview", className: "w-32 h-32 rounded-full object-cover border-2 border-line ", onError: (e) => {
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
      disabled: states.length === 0,
      className: "relative -ml-px flex-1 px-3 py-2 border border-line rounded-r-md focus:z-10 focus:outline-none focus:ring-2 focus:ring-ink focus:border-transparent text-sm bg-surface"
    },
    /* @__PURE__ */ React.createElement("option", { value: "" }, "State/Region"),
    states.map((state) => /* @__PURE__ */ React.createElement("option", { key: state, value: state }, state))
  ))), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { htmlFor: "email", className: "block text-sm font-medium text-ink mb-1" }, "Email"), /* @__PURE__ */ React.createElement("input", { type: "email", id: "email", name: "email", value: profileFormData.email, onChange: handleProfileInputChange, className: "w-full px-3 py-2 border border-line rounded-md  focus:outline-none focus:ring-2 focus:ring-ink focus:border-transparent", required: true })), /* @__PURE__ */ React.createElement("div", { className: "flex justify-end gap-3 pt-6 border-t mt-6 border-line" }, /* @__PURE__ */ React.createElement("button", { type: "button", onClick: handleProfileCloseModal, className: "px-4 py-2 bg-surface-hover text-ink rounded-md hover:bg-surface-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-line transition-colors" }, "Cancel"), /* @__PURE__ */ React.createElement("button", { type: "button", onClick: handleProfileSave, className: "px-4 py-2 bg-cta text-cta-foreground rounded-md hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ink transition-opacity" }, "Save Changes")))))), isProjectModalOpen && editingProject && /* @__PURE__ */ React.createElement("div", { className: "fixed inset-0 bg-cta backdrop-blur-sm z-50 flex items-center justify-center p-4 sm:p-6" }, /* @__PURE__ */ React.createElement("div", { className: "bg-surface rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden" }, /* @__PURE__ */ React.createElement("div", { className: "flex justify-between items-center px-6 py-4 border-b border-line flex-shrink-0 bg-surface" }, /* @__PURE__ */ React.createElement("h2", { className: "text-xl font-semibold text-ink" }, "Edit Project"), /* @__PURE__ */ React.createElement("button", { onClick: handleProjectCloseModal, className: "text-dim hover:text-dim transition-colors" }, /* @__PURE__ */ React.createElement(CloseIcon, { size: 20 }))), /* @__PURE__ */ React.createElement("div", { className: "overflow-y-auto p-6 flex-1 bg-surface" }, /* @__PURE__ */ React.createElement("form", { onSubmit: (e) => e.preventDefault(), className: "space-y-4" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { htmlFor: "editTitle", className: "block text-sm font-medium text-ink mb-1" }, "Title"), /* @__PURE__ */ React.createElement("input", { type: "text", id: "editTitle", name: "title", value: projectFormData.title || "", onChange: handleProjectInputChange, className: "w-full px-3 py-2 border border-line rounded-md  focus:outline-none focus:ring-2 focus:ring-ink focus:border-transparent", required: true })), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { htmlFor: "editDescription", className: "block text-sm font-medium text-ink mb-1" }, "Description"), /* @__PURE__ */ React.createElement("textarea", { id: "editDescription", name: "description", value: projectFormData.description || "", onChange: handleProjectInputChange, className: "w-full px-3 py-2 border border-line rounded-md  focus:outline-none focus:ring-2 focus:ring-ink focus:border-transparent" })), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { htmlFor: "editClient", className: "block text-sm font-medium text-ink mb-1" }, "Client"), /* @__PURE__ */ React.createElement("input", { type: "text", id: "editClient", name: "client", value: projectFormData.client || "", onChange: handleProjectInputChange, className: "w-full px-3 py-2 border border-line rounded-md  focus:outline-none focus:ring-2 focus:ring-ink focus:border-transparent" })), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { htmlFor: "editDuration", className: "block text-sm font-medium text-ink mb-1" }, "Duration"), /* @__PURE__ */ React.createElement("input", { type: "text", id: "editDuration", name: "duration", value: projectFormData.duration || "", onChange: handleProjectInputChange, className: "w-full px-3 py-2 border border-line rounded-md  focus:outline-none focus:ring-2 focus:ring-ink focus:border-transparent" })), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { htmlFor: "editCategory", className: "block text-sm font-medium text-ink mb-1" }, "Category"), /* @__PURE__ */ React.createElement("input", { type: "text", id: "editCategory", name: "category", value: projectFormData.category || "", onChange: handleProjectInputChange, className: "w-full px-3 py-2 border border-line rounded-md  focus:outline-none focus:ring-2 focus:ring-ink focus:border-transparent" })), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { htmlFor: "editTeam", className: "block text-sm font-medium text-ink mb-1" }, "Team Involved"), /* @__PURE__ */ React.createElement("input", { type: "text", id: "editTeam", name: "team", value: projectFormData.team || "", onChange: handleProjectInputChange, className: "w-full px-3 py-2 border border-line rounded-md  focus:outline-none focus:ring-2 focus:ring-ink focus:border-transparent" })), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { htmlFor: "editObjective", className: "block text-sm font-medium text-ink mb-1" }, "Objective"), /* @__PURE__ */ React.createElement("textarea", { id: "editObjective", name: "objective", value: projectFormData.objective || "", onChange: handleProjectInputChange, className: "w-full px-3 py-2 border border-line rounded-md  focus:outline-none focus:ring-2 focus:ring-ink focus:border-transparent" })), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { htmlFor: "editFeatures", className: "block text-sm font-medium text-ink mb-1" }, "Key Features"), /* @__PURE__ */ React.createElement("textarea", { id: "editFeatures", name: "features", value: projectFormData.features || "", onChange: handleProjectInputChange, className: "w-full px-3 py-2 border border-line rounded-md  focus:outline-none focus:ring-2 focus:ring-ink focus:border-transparent" })), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { htmlFor: "editImpact", className: "block text-sm font-medium text-ink mb-1" }, "Business Impact"), /* @__PURE__ */ React.createElement("textarea", { id: "editImpact", name: "impact", value: projectFormData.impact || "", onChange: handleProjectInputChange, className: "w-full px-3 py-2 border border-line rounded-md  focus:outline-none focus:ring-2 focus:ring-ink focus:border-transparent" })), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { htmlFor: "editDeliverables", className: "block text-sm font-medium text-ink mb-1" }, "Deliverables"), /* @__PURE__ */ React.createElement("textarea", { id: "editDeliverables", name: "deliverables", value: projectFormData.deliverables || "", onChange: handleProjectInputChange, className: "w-full px-3 py-2 border border-line rounded-md  focus:outline-none focus:ring-2 focus:ring-ink focus:border-transparent" })), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { htmlFor: "editCompliance", className: "block text-sm font-medium text-ink mb-1" }, "Compliance"), /* @__PURE__ */ React.createElement("input", { type: "text", id: "editCompliance", name: "compliance", value: projectFormData.compliance || "", onChange: handleProjectInputChange, className: "w-full px-3 py-2 border border-line rounded-md  focus:outline-none focus:ring-2 focus:ring-ink focus:border-transparent" })), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { htmlFor: "editDocument", className: "block text-sm font-medium text-ink mb-1" }, "Documents"), projectFormData.documents?.length > 0 && /* @__PURE__ */ React.createElement("div", { className: "mb-3 space-y-2" }, projectFormData.documents.map((doc, index) => /* @__PURE__ */ React.createElement("div", { key: index, className: "flex items-center justify-between p-2 bg-canvas rounded" }, /* @__PURE__ */ React.createElement("span", { className: "text-sm truncate" }, doc.name), /* @__PURE__ */ React.createElement(
    "button",
    {
      type: "button",
      onClick: () => handleRemoveDocument(index),
      className: "text-danger hover:text-danger"
    },
    /* @__PURE__ */ React.createElement(TrashIcon, { className: "h-4 w-4" })
  )))), /* @__PURE__ */ React.createElement(
    "input",
    {
      type: "file",
      id: "editDocument",
      name: "documents",
      onChange: handleDocumentUpload,
      multiple: true,
      className: "block w-full text-sm text-dim\r\n                                        file:mr-4 file:py-2 file:px-4\r\n                                        file:rounded-md file:border-0\r\n                                        file:text-sm file:font-semibold\r\n                                        file:bg-surface-hover file:text-ink\r\n                                        hover:file:bg-surface-hover"
    }
  ), /* @__PURE__ */ React.createElement("p", { className: "mt-1 text-xs text-dim" }, "Upload multiple project documents (PDF, DOC, PPT, etc.)")), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { htmlFor: "editPhotos", className: "block text-sm font-medium text-ink mb-1" }, "Photos"), projectFormData.photos?.length > 0 && /* @__PURE__ */ React.createElement("div", { className: "mb-3 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2" }, projectFormData.photos.slice(0, 5).map((photo, index) => /* @__PURE__ */ React.createElement("div", { key: `photo-${index}`, className: "relative group" }, /* @__PURE__ */ React.createElement(
    "img",
    {
      src: getPhotoUrl(photo),
      alt: `Photo ${index + 1}`,
      className: "w-full h-24 object-cover rounded"
    }
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      type: "button",
      onClick: () => handleRemovePhoto(index),
      className: "absolute top-1 right-1 bg-surface text-danger hover:text-danger rounded-full p-1 shadow group-hover:opacity-100 opacity-75",
      title: "Remove"
    },
    /* @__PURE__ */ React.createElement(TrashIcon, { className: "h-4 w-4" })
  )))), /* @__PURE__ */ React.createElement(
    "input",
    {
      type: "file",
      id: "editPhotos",
      name: "photos",
      onChange: handlePhotoUpload,
      multiple: true,
      className: "block w-full text-sm text-dim\r\n                                        file:mr-4 file:py-2 file:px-4\r\n                                        file:rounded-md file:border-0\r\n                                        file:text-sm file:font-semibold\r\n                                        file:bg-surface-hover file:text-ink\r\n                                        hover:file:bg-surface-hover"
    }
  ), /* @__PURE__ */ React.createElement("p", { className: "mt-1 text-xs text-dim" }, "Upload multiple project photos")), /* @__PURE__ */ React.createElement("div", { className: "flex justify-end gap-3 pt-6 border-t mt-6 border-line" }, /* @__PURE__ */ React.createElement("button", { type: "button", onClick: handleProjectCloseModal, className: "px-4 py-2 bg-surface-hover text-ink rounded-md hover:bg-surface-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-line transition-colors" }, "Cancel"), /* @__PURE__ */ React.createElement("button", { type: "button", onClick: handleProjectSave, className: "px-4 py-2 bg-cta text-cta-foreground rounded-md hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ink transition-opacity" }, "Save Changes")))))));
}

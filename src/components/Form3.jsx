import React, { useState, useEffect, useContext } from "react";
import { VendorContext } from "../context/VendorContext";
import { UserContext } from "../context/UserContext";
import { useNavigate } from "react-router-dom";
import { uploadFileToS3, deleteFileFromS3 } from "../utils/fileUpload";
import StepIndicator from "./StepIndicator";
import SidebarContent from "./SidebarContent";

const VENDOR_TYPES = [
  { id: "service_provider", label: "Service Provider", icon: "🛠️", desc: "Consulting, IT, logistics, HR, legal, and other service-based businesses" },
  { id: "manufacturer", label: "Manufacturer", icon: "🏭", desc: "Raw material, semi-finished, or finished goods manufacturing & supply" },
  { id: "both", label: "Both", icon: "🔄", desc: "Provides services and also manufactures or supplies products" },
];

const MFG_SUBTYPES = [
  { id: "raw", label: "Raw Material" },
  { id: "semi_finished", label: "Semi-Finished Goods" },
  { id: "finished", label: "Finished Goods" },
  { id: "all", label: "All / Multiple Types" },
];

const DEFAULT_MACHINE = { machineName: "", serialNumber: "", modelNumber: "", manufacturerName: "", contact: "", purchaseDate: "", warrantyStart: "", warrantyEnd: "", maintenanceDetails: "" };

const DEFAULT_SP = { credentialDeck: null, officeAddress: "", officePhotos: null, teamSize: "", orgChart: null, keyPersonnelCVs: null, professionalLicences: [], techStackDeclaration: "", dataSecurityPolicy: "", dataSecurityPolicyDoc: null, subcontractorDisclosure: "" };

const DEFAULT_MFG = { manufacturerSubType: "", factoryAddress: "", factoryPhotos: null, productionCapacity: "", rawMaterialStorage: "", wipStorage: "", finishedGoodsWarehouse: "", workforceHeadcount: "", utilityInfrastructure: "", machineryDetails: [{ ...DEFAULT_MACHINE }], iso9001Certificate: null, productCertifications: [], testReports: null, inHouseQCLab: "", msdsDocument: null, rejectionReturnRate: "", logisticsInfrastructure: "", moqLeadTime: "", packagingStandards: "", batchTrackingSystem: "" };

/** Reusable file upload widget. Defined at module scope to keep a stable component identity across renders. */
function FileUploadField({ label, hint, fieldName, value, onUpload, onDelete, accept = "*" }) {
  return (
    <div className="flex flex-col md:flex-row items-start gap-6">
      <div className="w-full md:w-1/3">
        <label className="text-sm font-semibold text-gray-900 block mb-1">{label}</label>
        {hint && <p className="text-xs text-gray-500">{hint}</p>}
      </div>
      <div className="w-full md:w-2/3">
        {value ? (
          <div className="border border-gray-200 rounded px-3 py-2 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-800">{value.name}</p>
              <p className="text-xs text-green-600">{value.uploading ? "Uploading..." : "✓ Uploaded"}</p>
            </div>
            <button type="button" onClick={() => onDelete(fieldName)} className="text-red-500 text-xs hover:text-red-700 ml-3">Remove</button>
          </div>
        ) : (
          <label className="cursor-pointer border border-dashed border-gray-300 rounded px-3 py-2 text-sm text-gray-500 hover:border-emerald-500 transition-colors block">
            Click to upload {label.toLowerCase()}
            <input type="file" accept={accept} className="hidden" onChange={(e) => { if (e.target.files?.[0]) onUpload(fieldName, e.target.files[0]); }} />
          </label>
        )}
      </div>
    </div>
  );
}

/** Reusable textarea field row. Defined at module scope to keep a stable component identity across renders. */
function TextAreaField({ label, hint, name, value, onChange, placeholder, rows = 3 }) {
  return (
    <div className="flex flex-col md:flex-row items-start gap-6">
      <div className="w-full md:w-1/3">
        <label className="text-sm font-semibold text-gray-900 block mb-1">{label}</label>
        {hint && <p className="text-xs text-gray-500">{hint}</p>}
      </div>
      <div className="w-full md:w-2/3">
        <textarea name={name} value={value} onChange={onChange} placeholder={placeholder || label} rows={rows} className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none" />
      </div>
    </div>
  );
}

/** Reusable text input field row. Defined at module scope to keep a stable component identity across renders. */
function TextField({ label, hint, name, value, onChange, placeholder, type = "text" }) {
  return (
    <div className="flex flex-col md:flex-row items-start gap-6">
      <div className="w-full md:w-1/3">
        <label className="text-sm font-semibold text-gray-900 block mb-1">{label}</label>
        {hint && <p className="text-xs text-gray-500">{hint}</p>}
      </div>
      <div className="w-full md:w-2/3">
        <input type={type} name={name} value={value} onChange={onChange} placeholder={placeholder || label} className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent" />
      </div>
    </div>
  );
}

export default function Form3() {
  const navigate = useNavigate();
  const { vendorData, setVendorData, currentUser: vendorContextUser } = useContext(VendorContext);
  const { currentUser } = useContext(UserContext) || {};
  const [userEmail, setUserEmail] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSaveIndicator, setShowSaveIndicator] = useState(false);
  const [activeTab, setActiveTab] = useState("service_provider");

  const spd = vendorData.serviceProductDetails;

  const [formData, setFormData] = useState({
    vendorType: spd.vendorType || "",
    productDescription: spd.productDescription || "",
    paymentTerms: spd.paymentTerms || "",
    paymentMode: spd.paymentMode || "",
    serviceProviderDetails: { ...DEFAULT_SP, ...(spd.serviceProviderDetails || {}), professionalLicences: spd.serviceProviderDetails?.professionalLicences || [] },
    manufacturerDetails: { ...DEFAULT_MFG, ...(spd.manufacturerDetails || {}), machineryDetails: spd.manufacturerDetails?.machineryDetails?.length ? spd.manufacturerDetails.machineryDetails : [{ ...DEFAULT_MACHINE }], productCertifications: spd.manufacturerDetails?.productCertifications || [] },
  });

  useEffect(() => {
    const fetchUserEmail = async () => {
      if (vendorContextUser?.email) { setUserEmail(vendorContextUser.email); return; }
      const token = localStorage.getItem("authToken");
      if (!token) return;
      try {
        const res = await fetch(`${window.location.origin}/api/vendor/me`, {
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          credentials: "include",
        });
        if (res.ok) {
          const data = await res.json();
          const email = data?.data?.email || data?.data?.vendorDetails?.primaryContactEmail;
          if (email) setUserEmail(email);
        }
      } catch {}
    };
    fetchUserEmail();
    if (currentUser) {
      const saved = localStorage.getItem(`form3Data_${currentUser.id}`);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setFormData(parsed);
          setVendorData(prev => ({ ...prev, serviceProductDetails: parsed }));
        } catch {}
      }
    }
  }, [vendorContextUser, currentUser]);

  // Auto-save on every change
  useEffect(() => {
    if (currentUser) {
      const serializable = stripFileObjects(formData);
      localStorage.setItem(`form3Data_${currentUser.id}`, JSON.stringify(serializable));
    }
  }, [formData, currentUser]);

  const showSaved = () => {
    setShowSaveIndicator(true);
    setTimeout(() => setShowSaveIndicator(false), 3000);
  };

  const handleVendorTypeSelect = (type) => {
    setFormData(prev => ({ ...prev, vendorType: type }));
    if (type === "both") setActiveTab("service_provider");
  };

  const handleCommonChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSPChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, serviceProviderDetails: { ...prev.serviceProviderDetails, [name]: value } }));
  };

  // Generic upload/delete/array handlers — shared by SP and MFG to avoid duplication
  const uploadFileForSection = async (sectionKey, fieldName, file) => {
    if (!userEmail) { alert("User email not available. Please refresh and try again."); return; }
    setFormData(prev => ({ ...prev, [sectionKey]: { ...prev[sectionKey], [fieldName]: { file, name: file.name, uploading: true } } }));
    try {
      const res = await uploadFileToS3(file, userEmail, fieldName, "serviceProductDetails");
      const url = res?.data?.url;
      if (!url) throw new Error("No URL returned from server");
      setFormData(prev => ({ ...prev, [sectionKey]: { ...prev[sectionKey], [fieldName]: { file, name: file.name, url, uploading: false } } }));
      showSaved();
    } catch (err) {
      alert(`Upload failed: ${err.message}`);
      setFormData(prev => ({ ...prev, [sectionKey]: { ...prev[sectionKey], [fieldName]: null } }));
    }
  };

  const deleteFileForSection = async (sectionKey, fieldName) => {
    try {
      if (formData[sectionKey]?.[fieldName]?.url && userEmail) {
        await deleteFileFromS3(userEmail, fieldName, "serviceProductDetails");
      }
    } catch {}
    setFormData(prev => ({ ...prev, [sectionKey]: { ...prev[sectionKey], [fieldName]: null } }));
    showSaved();
  };

  const addFileToArray = async (sectionKey, arrayKey, file, uploadKeyPrefix) => {
    if (!userEmail) { alert("User email not available"); return; }
    const placeholder = { file, name: file.name, uploading: true };
    setFormData(prev => ({ ...prev, [sectionKey]: { ...prev[sectionKey], [arrayKey]: [...prev[sectionKey][arrayKey], placeholder] } }));
    try {
      const res = await uploadFileToS3(file, userEmail, `${uploadKeyPrefix}_${Date.now()}`, "serviceProductDetails");
      const url = res?.data?.url;
      if (!url) throw new Error("No URL returned");
      setFormData(prev => {
        const items = [...prev[sectionKey][arrayKey]];
        const foundIndex = items.findIndex(item => item.name === file.name && item.uploading);
        if (foundIndex !== -1) items[foundIndex] = { file, name: file.name, url, uploading: false };
        return { ...prev, [sectionKey]: { ...prev[sectionKey], [arrayKey]: items } };
      });
      showSaved();
    } catch (err) {
      alert(`Upload failed: ${err.message}`);
      setFormData(prev => ({ ...prev, [sectionKey]: { ...prev[sectionKey], [arrayKey]: prev[sectionKey][arrayKey].filter(item => !(item.name === file.name && item.uploading)) } }));
    }
  };

  const removeFileFromArray = (sectionKey, arrayKey, index) => {
    setFormData(prev => ({
      ...prev,
      [sectionKey]: { ...prev[sectionKey], [arrayKey]: prev[sectionKey][arrayKey].filter((_, i) => i !== index) },
    }));
  };

  const uploadSPFile = (fieldName, file) => uploadFileForSection("serviceProviderDetails", fieldName, file);
  const deleteSPFile = (fieldName) => deleteFileForSection("serviceProviderDetails", fieldName);
  const addSPLicence = (file) => addFileToArray("serviceProviderDetails", "professionalLicences", file, "spLicence");
  const removeSPLicence = (index) => removeFileFromArray("serviceProviderDetails", "professionalLicences", index);

  const handleMFGChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, manufacturerDetails: { ...prev.manufacturerDetails, [name]: value } }));
  };

  const uploadMFGFile = (fieldName, file) => uploadFileForSection("manufacturerDetails", fieldName, file);
  const deleteMFGFile = (fieldName) => deleteFileForSection("manufacturerDetails", fieldName);
  const addMFGCert = (file) => addFileToArray("manufacturerDetails", "productCertifications", file, "mfgCert");
  const removeMFGCert = (index) => removeFileFromArray("manufacturerDetails", "productCertifications", index);

  const handleMachineChange = (index, e) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const list = [...prev.manufacturerDetails.machineryDetails];
      list[index] = { ...list[index], [name]: value };
      return { ...prev, manufacturerDetails: { ...prev.manufacturerDetails, machineryDetails: list } };
    });
  };

  const addMachine = () => {
    setFormData(prev => ({ ...prev, manufacturerDetails: { ...prev.manufacturerDetails, machineryDetails: [...prev.manufacturerDetails.machineryDetails, { ...DEFAULT_MACHINE }] } }));
  };

  const removeMachine = (index) => {
    setFormData(prev => {
      const list = prev.manufacturerDetails.machineryDetails.filter((_, i) => i !== index);
      return { ...prev, manufacturerDetails: { ...prev.manufacturerDetails, machineryDetails: list } };
    });
  };

  const stripFileObjects = (obj) => {
    if (!obj || typeof obj !== "object") return obj;
    if (Array.isArray(obj)) return obj.map(stripFileObjects);
    const result = {};
    for (const [key, val] of Object.entries(obj)) {
      if (key === "file") continue;
      result[key] = stripFileObjects(val);
    }
    return result;
  };

  const handlePrevious = () => navigate("/Form2");

  const handleNext = () => {
    const serializable = stripFileObjects(formData);
    if (currentUser) {
      localStorage.setItem(`form3Data_${currentUser.id}`, JSON.stringify(serializable));
    }
    setVendorData(prev => ({ ...prev, serviceProductDetails: { ...serializable } }));
    navigate("/Form4");
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    if (!formData.vendorType) { alert("Please select your vendor type"); return; }
    if (!formData.productDescription?.trim()) { alert("Please provide a product / service description"); return; }
    if (!formData.paymentTerms || !formData.paymentMode) { alert("Please select payment terms and mode"); return; }
    setIsSubmitting(true);
    handleNext();
  };

  const spDetails = formData.serviceProviderDetails;
  const mfgDetails = formData.manufacturerDetails;
  const showRaw = ["raw", "all"].includes(mfgDetails.manufacturerSubType);
  const showSemi = ["semi_finished", "finished", "all"].includes(mfgDetails.manufacturerSubType);
  const showFinished = ["finished", "all"].includes(mfgDetails.manufacturerSubType);

  const renderServiceProviderSection = () => (
    <div className="space-y-6 pt-4">
      <h2 className="text-base font-semibold text-gray-800 border-b border-gray-200 pb-2">D. Service Capability & Infrastructure</h2>

      <FileUploadField label="Company Profile / Credential Deck" hint="Services overview, client list, experience (PDF/DOC/PPT)" fieldName="credentialDeck" value={spDetails.credentialDeck} onUpload={uploadSPFile} onDelete={deleteSPFile} accept=".pdf,.doc,.docx,.ppt,.pptx" />

      <TextField label="Office / Delivery Centre Address" hint="Registered operational premises address" name="officeAddress" value={spDetails.officeAddress} onChange={handleSPChange} placeholder="Full office address" />

      <FileUploadField label="Office / Premises Photos" hint="Photos of operational premises (JPG/PNG/ZIP)" fieldName="officePhotos" value={spDetails.officePhotos} onUpload={uploadSPFile} onDelete={deleteSPFile} accept="image/*,.zip" />

      <TextField label="Team Size" hint="Total number of employees / contractors" name="teamSize" value={spDetails.teamSize} onChange={handleSPChange} placeholder="e.g. 50" type="number" />

      <FileUploadField label="Org Chart" hint="Organisational chart showing team structure (PDF/PNG)" fieldName="orgChart" value={spDetails.orgChart} onUpload={uploadSPFile} onDelete={deleteSPFile} accept=".pdf,.png,.jpg,.pptx" />

      <FileUploadField label="Key Personnel CVs" hint="CVs of project leads / key personnel (PDF/ZIP)" fieldName="keyPersonnelCVs" value={spDetails.keyPersonnelCVs} onUpload={uploadSPFile} onDelete={deleteSPFile} accept=".pdf,.zip" />

      <div className="flex flex-col md:flex-row items-start gap-6">
        <div className="w-full md:w-1/3">
          <label className="text-sm font-semibold text-gray-900 block mb-1">Professional Licences / Certifications</label>
          <p className="text-xs text-gray-500">ISO 9001, ISO 27001, CA/CS/Legal bar, IT security certs, etc.</p>
        </div>
        <div className="w-full md:w-2/3 space-y-2">
          {spDetails.professionalLicences.map((lic, i) => (
            <div key={i} className="flex items-center justify-between border border-gray-200 rounded px-3 py-2">
              <div>
                <p className="text-sm">{lic.name}</p>
                <p className="text-xs text-green-600">{lic.uploading ? "Uploading..." : "✓ Uploaded"}</p>
              </div>
              <button type="button" onClick={() => removeSPLicence(i)} className="text-red-500 text-xs hover:text-red-700">Remove</button>
            </div>
          ))}
          <label className="cursor-pointer border border-dashed border-gray-300 rounded px-3 py-2 text-sm text-gray-500 hover:border-emerald-500 transition-colors block">
            + Add Licence / Certificate
            <input type="file" className="hidden" accept=".pdf,.jpg,.png,.doc,.docx" onChange={(e) => { if (e.target.files?.[0]) addSPLicence(e.target.files[0]); }} />
          </label>
        </div>
      </div>

      <TextAreaField label="Technology / Tool Stack" hint="Software, platforms, CRM/ERP tools used for service delivery" name="techStackDeclaration" value={spDetails.techStackDeclaration} onChange={handleSPChange} placeholder="List the software, platforms, and tools used in service delivery..." />

      <TextAreaField label="Data Security Policy" hint="Firewall, access controls, data handling, encryption practices" name="dataSecurityPolicy" value={spDetails.dataSecurityPolicy} onChange={handleSPChange} placeholder="Describe your data security and IT infrastructure measures..." />

      <FileUploadField label="Data Security Policy Document" hint="Upload policy document (PDF)" fieldName="dataSecurityPolicyDoc" value={spDetails.dataSecurityPolicyDoc} onUpload={uploadSPFile} onDelete={deleteSPFile} accept=".pdf,.doc,.docx" />

      <TextAreaField label="Sub-contractor / 3rd Party Disclosure" hint="Identify if critical services are outsourced to third parties" name="subcontractorDisclosure" value={spDetails.subcontractorDisclosure} onChange={handleSPChange} placeholder="List any sub-contractors or critical third-party service dependencies..." />
    </div>
  );

  const renderManufacturerSection = () => (
    <div className="space-y-6 pt-4">
      <div>
        <h2 className="text-base font-semibold text-gray-800 border-b border-gray-200 pb-2 mb-4">Manufacturer Type</h2>
        <div className="flex flex-col md:flex-row items-start gap-6">
          <div className="w-full md:w-1/3">
            <label className="text-sm font-semibold text-gray-900 block mb-1">Product Category</label>
            <p className="text-xs text-gray-500">Select the type of goods manufactured</p>
          </div>
          <div className="w-full md:w-2/3">
            <div className="grid grid-cols-2 gap-3">
              {MFG_SUBTYPES.map((sub) => (
                <button key={sub.id} type="button"
                  onClick={() => setFormData(prev => ({ ...prev, manufacturerDetails: { ...prev.manufacturerDetails, manufacturerSubType: sub.id } }))}
                  className={`p-3 border-2 rounded-lg text-sm font-medium text-center transition-all ${mfgDetails.manufacturerSubType === sub.id ? "border-emerald-500 bg-emerald-50 text-emerald-800" : "border-gray-200 hover:border-emerald-300 text-gray-600"}`}>
                  {sub.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <h2 className="text-base font-semibold text-gray-800 border-b border-gray-200 pb-2">D. Manufacturing Facility</h2>

      <TextField label="Factory / Plant Address" hint="Full address of manufacturing facility" name="factoryAddress" value={mfgDetails.factoryAddress} onChange={handleMFGChange} placeholder="Factory/plant address" />

      <FileUploadField label="Factory / Plant Photos" hint="GPS-stamped photos or video walkthrough (JPG/ZIP/MP4)" fieldName="factoryPhotos" value={mfgDetails.factoryPhotos} onUpload={uploadMFGFile} onDelete={deleteMFGFile} accept="image/*,.zip,.mp4" />

      <TextAreaField label="Production Capacity" hint="Rated capacity vs. actual output; MOQ capability" name="productionCapacity" value={mfgDetails.productionCapacity} onChange={handleMFGChange} placeholder="e.g. Rated 10,000 units/month, currently operating at 7,000 units/month" />

      {showRaw && <TextAreaField label="Raw Material Storage & Sourcing" hint="RM stockyard, supplier base, import dependency" name="rawMaterialStorage" value={mfgDetails.rawMaterialStorage} onChange={handleMFGChange} placeholder="Describe raw material storage, sourcing infrastructure, and key suppliers..." />}

      {showSemi && <TextAreaField label="In-Process / WIP Storage & Handling" hint="WIP zones, handling practices, contamination control" name="wipStorage" value={mfgDetails.wipStorage} onChange={handleMFGChange} placeholder="Describe WIP storage areas and handling procedures..." />}

      {showFinished && <TextAreaField label="Finished Goods Warehouse & Dispatch" hint="FG storage conditions, dispatch setup, packaging area" name="finishedGoodsWarehouse" value={mfgDetails.finishedGoodsWarehouse} onChange={handleMFGChange} placeholder="Describe finished goods warehouse and dispatch infrastructure..." />}

      <TextField label="Workforce Headcount" hint="Total production workforce" name="workforceHeadcount" value={mfgDetails.workforceHeadcount} onChange={handleMFGChange} placeholder="e.g. 120" type="number" />

      <TextAreaField label="Utility Infrastructure" hint="Power supply, backup DG, water source, process gas" name="utilityInfrastructure" value={mfgDetails.utilityInfrastructure} onChange={handleMFGChange} placeholder="Describe power, water, gas, and backup infrastructure..." />

      <h2 className="text-base font-semibold text-gray-800 border-b border-gray-200 pb-2 pt-2">Machinery & Equipment</h2>
      <div className="flex flex-col md:flex-row items-start gap-6">
        <div className="w-full md:w-1/3">
          <label className="text-sm font-semibold text-gray-900 block mb-1">Machine List</label>
          <p className="text-xs text-gray-500">Details of all production machinery</p>
        </div>
        <div className="w-full md:w-2/3 space-y-4">
          {mfgDetails.machineryDetails.map((machine, index) => (
            <div key={index} className="p-4 border rounded-lg space-y-4 relative">
              <h4 className="font-semibold text-gray-800 text-sm">Machine {index + 1}</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input type="text" name="machineName" value={machine.machineName} onChange={(e) => handleMachineChange(index, e)} placeholder="Brand / Machine Name" className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                <input type="text" name="serialNumber" value={machine.serialNumber} onChange={(e) => handleMachineChange(index, e)} placeholder="Serial Number" className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                <input type="text" name="modelNumber" value={machine.modelNumber} onChange={(e) => handleMachineChange(index, e)} placeholder="Model Number" className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                <input type="text" name="manufacturerName" value={machine.manufacturerName} onChange={(e) => handleMachineChange(index, e)} placeholder="Manufacturer Name" className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                <input type="text" name="contact" value={machine.contact} onChange={(e) => handleMachineChange(index, e)} placeholder="Brand Contact" className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                <div><label className="text-xs text-gray-500">Date of Purchase</label><input type="date" name="purchaseDate" value={machine.purchaseDate} onChange={(e) => handleMachineChange(index, e)} className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" /></div>
                <div><label className="text-xs text-gray-500">Warranty Start</label><input type="date" name="warrantyStart" value={machine.warrantyStart} onChange={(e) => handleMachineChange(index, e)} className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" /></div>
                <div><label className="text-xs text-gray-500">Warranty End</label><input type="date" name="warrantyEnd" value={machine.warrantyEnd} onChange={(e) => handleMachineChange(index, e)} className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" /></div>
              </div>
              <textarea name="maintenanceDetails" value={machine.maintenanceDetails} onChange={(e) => handleMachineChange(index, e)} placeholder="Maintenance Details" rows={2} className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              {mfgDetails.machineryDetails.length > 1 && <button type="button" onClick={() => removeMachine(index)} className="absolute top-2 right-2 text-red-500 hover:text-red-700 font-bold text-lg leading-none">×</button>}
            </div>
          ))}
          <button type="button" onClick={addMachine} className="w-full text-sm text-emerald-600 hover:text-emerald-800 py-2 border border-dashed border-emerald-500 rounded-lg">+ Add Another Machine</button>
        </div>
      </div>

      <h2 className="text-base font-semibold text-gray-800 border-b border-gray-200 pb-2 pt-2">E. Product Quality & Certifications</h2>

      <FileUploadField label="ISO 9001 Quality Certificate" hint="Validity date, scope, certifying body accreditation" fieldName="iso9001Certificate" value={mfgDetails.iso9001Certificate} onUpload={uploadMFGFile} onDelete={deleteMFGFile} accept=".pdf,.jpg,.png" />

      <div className="flex flex-col md:flex-row items-start gap-6">
        <div className="w-full md:w-1/3">
          <label className="text-sm font-semibold text-gray-900 block mb-1">Product-Specific Certifications</label>
          <p className="text-xs text-gray-500">BIS/ISI, CE, RoHS, REACH, FSSAI, Ayush, NABL, IATF, etc.</p>
        </div>
        <div className="w-full md:w-2/3 space-y-2">
          {mfgDetails.productCertifications.map((cert, i) => (
            <div key={i} className="flex items-center justify-between border border-gray-200 rounded px-3 py-2">
              <div><p className="text-sm">{cert.name}</p><p className="text-xs text-green-600">{cert.uploading ? "Uploading..." : "✓ Uploaded"}</p></div>
              <button type="button" onClick={() => removeMFGCert(i)} className="text-red-500 text-xs hover:text-red-700">Remove</button>
            </div>
          ))}
          <label className="cursor-pointer border border-dashed border-gray-300 rounded px-3 py-2 text-sm text-gray-500 hover:border-emerald-500 transition-colors block">
            + Add Product Certification
            <input type="file" className="hidden" accept=".pdf,.jpg,.png" onChange={(e) => { if (e.target.files?.[0]) addMFGCert(e.target.files[0]); }} />
          </label>
        </div>
      </div>

      <FileUploadField label="Test Reports / COA" hint="Recent batch test reports from accredited lab (NABL/BIS)" fieldName="testReports" value={mfgDetails.testReports} onUpload={uploadMFGFile} onDelete={deleteMFGFile} accept=".pdf,.zip" />

      <TextAreaField label="In-house QC/QA Lab" hint="Lab equipment, calibration certificates, QC SOPs" name="inHouseQCLab" value={mfgDetails.inHouseQCLab} onChange={handleMFGChange} placeholder="Describe in-house QC/QA lab setup and capabilities..." />

      <FileUploadField label="MSDS / Material Safety Data Sheet" hint="Required for chemical or hazardous materials (PDF)" fieldName="msdsDocument" value={mfgDetails.msdsDocument} onUpload={uploadMFGFile} onDelete={deleteMFGFile} accept=".pdf" />

      <TextAreaField label="Rejection & Return Rate" hint="Last 12 months rejection statistics and corrective actions" name="rejectionReturnRate" value={mfgDetails.rejectionReturnRate} onChange={handleMFGChange} placeholder="e.g. <0.5% rejection rate; RCA documented, corrective actions implemented..." />

      <h2 className="text-base font-semibold text-gray-800 border-b border-gray-200 pb-2 pt-2">H. Supply Chain & Logistics</h2>

      <TextAreaField label="Logistics Infrastructure" hint="Owned fleet or 3PL tie-up; cold chain if perishable goods" name="logisticsInfrastructure" value={mfgDetails.logisticsInfrastructure} onChange={handleMFGChange} placeholder="Describe logistics setup, fleet, and third-party logistics partners..." />

      <TextAreaField label="MOQ & Lead Time" hint="Minimum order quantity, standard and emergency lead times" name="moqLeadTime" value={mfgDetails.moqLeadTime} onChange={handleMFGChange} placeholder="e.g. MOQ: 500 units, Standard lead time: 15 days, Emergency: 7 days" />

      <TextAreaField label="Packaging Standards" hint="Packaging specs, BIS/legal metrology marking, tamper-proof seals" name="packagingStandards" value={mfgDetails.packagingStandards} onChange={handleMFGChange} placeholder="Describe packaging standards and compliance marks..." />

      <TextAreaField label="Traceability & Batch Tracking" hint="Batch numbering, lot tracking, expiry management system" name="batchTrackingSystem" value={mfgDetails.batchTrackingSystem} onChange={handleMFGChange} placeholder="Describe batch tracking and traceability system..." />
    </div>
  );

  return (
    <div className="flex min-h-screen bg-white">
      {showSaveIndicator && (
        <div className="fixed top-5 right-5 bg-green-600 text-white py-2 px-4 rounded shadow z-50">Changes saved successfully!</div>
      )}

      <SidebarContent />

      <div className="flex-1 flex flex-col">
        <StepIndicator currentStep={3} />

        <div className="w-full max-w-4xl mx-auto px-4 pb-10 bg-white md:px-0">
          <h1 className="text-2xl font-bold text-gray-900 mb-8">Product & Service</h1>

          <form onSubmit={handleSubmit} className="max-w-none space-y-8">

            {/* Vendor Type Selection */}
            <div className="space-y-4">
              <div>
                <h2 className="text-base font-semibold text-gray-900">Vendor Type</h2>
                <p className="text-xs text-gray-500 mt-1">Select the type that best describes your business</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {VENDOR_TYPES.map((type) => (
                  <button key={type.id} type="button" onClick={() => handleVendorTypeSelect(type.id)}
                    className={`p-5 border-2 rounded-xl text-left transition-all ${formData.vendorType === type.id ? "border-emerald-500 bg-emerald-50 shadow-md" : "border-gray-200 hover:border-emerald-300 hover:bg-gray-50"}`}>
                    <div className="text-2xl mb-2">{type.icon}</div>
                    <div className="font-semibold text-gray-900 text-sm mb-1">{type.label}</div>
                    <div className="text-xs text-gray-500 leading-relaxed">{type.desc}</div>
                    {formData.vendorType === type.id && (
                      <div className="mt-3 text-emerald-600 text-xs font-semibold flex items-center gap-1">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                        Selected
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Common Fields — shown after type is selected */}
            {formData.vendorType && (
              <div className="space-y-6 pt-2 border-t border-gray-100">
                <h2 className="text-base font-semibold text-gray-900 pt-4">Business & Service Info</h2>
                <div className="flex flex-col md:flex-row items-start gap-6">
                  <div className="w-full md:w-1/3">
                    <label className="text-sm font-semibold text-gray-900 block mb-1">Description</label>
                    <p className="text-xs text-gray-500">Describe your key products / services offered</p>
                  </div>
                  <div className="w-full md:w-2/3">
                    <textarea required name="productDescription" value={formData.productDescription} onChange={handleCommonChange} placeholder="Product & service description" rows={4} className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none" />
                  </div>
                </div>
                <div className="flex flex-col md:flex-row items-start gap-6">
                  <div className="w-full md:w-1/3">
                    <label className="text-sm font-semibold text-gray-900 block mb-1">Payment Terms</label>
                  </div>
                  <div className="w-full md:w-2/3">
                    <select required name="paymentTerms" value={formData.paymentTerms} onChange={handleCommonChange} className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 appearance-none bg-white">
                      <option value="">Select payment terms</option>
                      <option value="Net 30">Net 30</option>
                      <option value="Net 60">Net 60</option>
                      <option value="Due on Receipt">Due on Receipt</option>
                    </select>
                  </div>
                </div>
                <div className="flex flex-col md:flex-row items-start gap-6">
                  <div className="w-full md:w-1/3">
                    <label className="text-sm font-semibold text-gray-900 block mb-1">Mode of Payment</label>
                  </div>
                  <div className="w-full md:w-2/3">
                    <select required name="paymentMode" value={formData.paymentMode} onChange={handleCommonChange} className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 appearance-none bg-white">
                      <option value="">Select mode of payment</option>
                      <option value="Bank Transfer">Bank Transfer</option>
                      <option value="Credit Card">Credit Card</option>
                      <option value="Cash">Cash</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Service Provider section */}
            {formData.vendorType === "service_provider" && renderServiceProviderSection()}

            {/* Manufacturer section */}
            {formData.vendorType === "manufacturer" && renderManufacturerSection()}

            {/* Both — Tabbed */}
            {formData.vendorType === "both" && (
              <div className="space-y-4 border-t border-gray-100 pt-6">
                <div className="flex border-b border-gray-200">
                  {[{ id: "service_provider", label: "🛠️ Service Provider" }, { id: "manufacturer", label: "🏭 Manufacturer" }].map((tab) => (
                    <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id)}
                      className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === tab.id ? "border-emerald-500 text-emerald-700" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
                      {tab.label}
                    </button>
                  ))}
                </div>
                {activeTab === "service_provider" && renderServiceProviderSection()}
                {activeTab === "manufacturer" && renderManufacturerSection()}
              </div>
            )}

            {/* Navigation */}
            <div className="flex justify-end space-x-4 pt-6 border-t border-gray-100">
              <button type="button" onClick={handlePrevious} className="px-8 py-3 text-gray-600 hover:text-gray-800 transition-colors">Back</button>
              <button type="submit" disabled={isSubmitting} className="text-white px-8 py-3 rounded-lg font-medium shadow-md bg-gradient-to-r from-[#0F5848] to-[#21BE9C] hover:from-[#0F5848]/90 hover:to-[#21BE9C]/90 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-60 disabled:cursor-not-allowed">
                {isSubmitting ? "Please wait..." : "Next"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

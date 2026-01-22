import React, { useState, useEffect, useContext } from "react";
import { VendorContext } from "../context/VendorContext";
import { UserContext } from "../context/UserContext";
import { useNavigate } from "react-router-dom";
import { uploadFileToS3, deleteFileFromS3 } from "../utils/fileUpload";
import { searchIFSCCode } from "../utils/ifscData";
import { processChequeOCR } from "../utils/textractOCR";
import StepIndicator from "./StepIndicator";
import SidebarContent from "./SidebarContent";
import OCRPreviewModal from "./OCRPreviewModal";

export default function Form4() {
  const navigate = useNavigate();
  const { vendorData, setVendorData } = useContext(VendorContext);
  const { currentUser } = useContext(UserContext) || {};

  const [formData, setFormData] = useState({
    bankName: vendorData.bankDetails.bankName || "",
    accountName: vendorData.bankDetails.accountName || "",
    accountNumber: vendorData.bankDetails.accountNumber || "",
    ifscCode: vendorData.bankDetails.ifscCode || "",
    branchAddress: vendorData.bankDetails.branchAddress || "",
    blankCheque: vendorData.bankDetails.blankCheque || null,
  });

  const [error, setError] = useState(null);
  const [showWarning, setShowWarning] = useState(false);
  const [showSaveIndicator, setShowSaveIndicator] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationMessage, setVerificationMessage] = useState("");
  const [verificationStatus, setVerificationStatus] = useState(null); // 'success' or 'error'
  
  // OCR states
  const [ocrProcessing, setOcrProcessing] = useState(false);
  const [ocrModalOpen, setOcrModalOpen] = useState(false);
  const [ocrData, setOcrData] = useState(null);
  const [pendingChequeFile, setPendingChequeFile] = useState(null);

  useEffect(() => {
    if (currentUser) {
      const savedData = localStorage.getItem(`form4Data_${currentUser.id}`);
      if (savedData) {
        const parsedData = JSON.parse(savedData);
        setFormData(parsedData);
        setVendorData(prev => ({
          ...prev,
          bankDetails: parsedData
        }));
      }
    }
  }, [currentUser, setVendorData]);

  const handleFileChange = async (e) => {
    const { name, files } = e.target;
    if (files && files.length > 0) {
      const file = files[0];

      // If this is a blank cheque, trigger OCR processing
      if (name === "blankCheque") {
        setPendingChequeFile(file);
        await processBlankChequeOCR(file);
        return;
      }

      // For other files, proceed with normal upload
      setFormData((prev) => ({
        ...prev,
        [name]: { file, name: file.name, uploading: true },
      }));

      try {
        if (currentUser?.email) {
          const section = "bankDetails";
          const response = await uploadFileToS3(
            file,
            currentUser.email,
            name,
            section
          );
          setFormData((prev) => ({
            ...prev,
            [name]: {
              file,
              name: file.name,
              url: response.data.url,
              uploading: false,
            },
          }));
          setShowSaveIndicator(true);
          setTimeout(() => setShowSaveIndicator(false), 3000);
        }
      } catch (error) {
        console.error("Error uploading file:", error);
        setFormData((prev) => ({ ...prev, [name]: null }));
        alert(`Failed to upload file: ${error.message}. Please try again.`);
      }
    }
  };

  const processBlankChequeOCR = async (file) => {
    setOcrProcessing(true);
    
    try {
      const result = await processChequeOCR(file, currentUser?.email || "unknown");

      if (result.success && result.data.success) {
        setOcrData(result.data);
        setOcrModalOpen(true);
      } else {
        // Show error but still allow manual entry
        alert(
          `OCR Processing: ${result.error || "Failed to extract data"}\n\nYou can still enter the details manually.`
        );
        
        // Store the file for upload anyway
        setFormData((prev) => ({
          ...prev,
          blankCheque: { 
            file, 
            name: file.name, 
            uploading: true,
            ocrAttempted: true 
          },
        }));
        
        // Upload the file
        uploadChequeFile(file);
      }
    } catch (error) {
      console.error("OCR Error:", error);
      alert(`Error: ${error.message}\n\nYou can enter details manually.`);
      
      // Still allow file upload
      setFormData((prev) => ({
        ...prev,
        blankCheque: { 
          file, 
          name: file.name, 
          uploading: true 
        },
      }));
      uploadChequeFile(file);
    } finally {
      setOcrProcessing(false);
    }
  };

  const uploadChequeFile = async (file) => {
    try {
      if (currentUser?.email) {
        const response = await uploadFileToS3(
          file,
          currentUser.email,
          "blankCheque",
          "bankDetails"
        );
        setFormData((prev) => ({
          ...prev,
          blankCheque: {
            file,
            name: file.name,
            url: response.data.url,
            uploading: false,
          },
        }));
        setShowSaveIndicator(true);
        setTimeout(() => setShowSaveIndicator(false), 3000);
      }
    } catch (error) {
      console.error("Error uploading cheque file:", error);
      setFormData((prev) => ({ ...prev, blankCheque: null }));
      alert(`Failed to upload cheque: ${error.message}`);
    }
  };

  const handleOCRConfirm = async (extractedData) => {
    // Check if IFSC code in cheque matches the entered IFSC code
    if (extractedData.ifscCode && formData.ifscCode) {
      const chequeIFSC = extractedData.ifscCode.toUpperCase().trim();
      const enteredIFSC = formData.ifscCode.toUpperCase().trim();
      
      if (chequeIFSC !== enteredIFSC) {
        const mismatchWarning = `IFSC Code Mismatch!\n\n` +
          `IFSC in cheque: ${chequeIFSC}\n` +
          `IFSC you entered: ${enteredIFSC}\n\n` +
          `Please verify that you've entered the correct IFSC code. ` +
          `Sometimes banks have multiple branches with different IFSC codes.\n\n` +
          `Do you want to continue with your entered IFSC code?`;
        
        const shouldContinue = window.confirm(mismatchWarning);
        if (!shouldContinue) {
          setOcrModalOpen(false);
          setOcrData(null);
          return;
        }
      }
    }

    // Auto-fill the form fields
    setFormData((prev) => ({
      ...prev,
      accountNumber: extractedData.accountNumber || prev.accountNumber,
      accountName: extractedData.accountName || prev.accountName,
    }));

    setOcrModalOpen(false);
    setOcrData(null);

    // Upload the cheque file
    if (pendingChequeFile) {
      await uploadChequeFile(pendingChequeFile);
      setPendingChequeFile(null);
    }

    setShowSaveIndicator(true);
    setTimeout(() => setShowSaveIndicator(false), 3000);
  };

  const handleOCRRetry = () => {
    setOcrModalOpen(false);
    setOcrData(null);
    setPendingChequeFile(null);
    
    // Reset the file input
    const fileInput = document.getElementById("blankCheque");
    if (fileInput) fileInput.value = "";
  };

  const handleDeleteFile = async (fieldName) => {
    try {
      if (formData[fieldName]?.url && currentUser?.email) {
        await deleteFileFromS3(
          currentUser.email,
          fieldName,
          "bankDetails"
        );
      }
      setFormData((prev) => ({ ...prev, [fieldName]: null }));
      setShowSaveIndicator(true);
      setTimeout(() => setShowSaveIndicator(false), 3000);
    } catch (error) {
      console.error("Error deleting file:", error);
      alert("Failed to delete file. Please try again.");
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    if (name === "accountNumber") {
      // Check if value contains non-numeric characters or exceeds 16 digits
      if (!/^\d{0,16}$/.test(value)) {
        // Show warning popup
        setShowWarning(true);
        
        // Hide warning after 3 seconds
        setTimeout(() => setShowWarning(false), 3000);
        
        return; // Exit if the value is not valid
      }
    }
  
    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

  const handleVerifyIFSC = () => {
    if (!formData.ifscCode || formData.ifscCode.trim() === "") {
      setVerificationStatus("error");
      setVerificationMessage("Please enter an IFSC code first");
      setTimeout(() => setVerificationStatus(null), 3000);
      return;
    }

    setIsVerifying(true);
    
    // Simulate a small delay for verification
    setTimeout(() => {
      const result = searchIFSCCode(formData.ifscCode);
      
      if (result.found) {
        setFormData((prevData) => ({
          ...prevData,
          bankName: result.bankName,
          branchAddress: result.branchAddress,
        }));
        setVerificationStatus("success");
        setVerificationMessage(`✓ IFSC verified! Bank: ${result.bankName}`);
        setShowSaveIndicator(true);
        setTimeout(() => setShowSaveIndicator(false), 3000);
      } else {
        setVerificationStatus("error");
        setVerificationMessage("IFSC code not found in database");
      }
      
      setIsVerifying(false);
      setTimeout(() => setVerificationStatus(null), 3000);
    }, 500);
  };

  const handlePrevious = () => {
    navigate("/Form3");
  };

  const handleNext = () => {
    if (currentUser) {
      localStorage.setItem(`form4Data_${currentUser.id}`, JSON.stringify(formData));
    }
    setVendorData(prev => ({
      ...prev,
      bankDetails: { ...formData }
    }));
    navigate("/Form5");
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    const requiredFields = ["bankName", "accountName", "accountNumber", "ifscCode", "branchAddress"];
    for (const field of requiredFields) {
      if (!formData[field] || formData[field].trim() === "") {
        alert("Please fill the field: " + field);
        setIsSubmitting(false);
        return;
      }
    }
    setIsSubmitting(true);
    handleNext();
  };

  const renderField = (label, name, showFieldWarning = false) => (
    <div className="flex flex-col md:flex-row items-start gap-6">
      <div className="w-full md:w-1/3">
        <label className="text-sm font-semibold text-gray-900 block mb-1">{label}</label>
        <p className="text-xs text-gray-500">provide {label.toLowerCase()}</p>
      </div>
      <div className="relative w-full md:w-2/3">
        <input
          required
          type="text"
          name={name}
          value={formData[name]}
          onChange={handleInputChange}
          placeholder={label}
          className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
        />
        
        {showFieldWarning && (
          <div className="absolute -top-12 left-0 right-0 z-50 flex justify-start">
            <div className="bg-red-500 text-white px-3 py-2 rounded-lg text-sm whitespace-nowrap shadow-lg animate-pulse">
              Please enter numbers only
              {/* Arrow pointing down */}
              <div className="absolute top-full left-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-red-500"></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-white">
      {/* Left Sidebar */}
      <SidebarContent />

      {/* Right Content */}
      <div className="flex-1 flex flex-col">
        {/* Step Indicator */}
        <StepIndicator currentStep={4} />

        {/* Form Content */}
        <div className="w-full max-w-4xl mx-auto px-4 pb-10 bg-white md:px-0">
          <h1 className="text-2xl font-bold text-gray-900 mb-8">
            Bank Details
          </h1>

          <form onSubmit={handleSubmit} className="max-w-none space-y-8">
            {/* Bank Information Section */}
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row items-start gap-6">
                <div className="w-full md:w-1/3">
                  <h3 className="text-sm font-semibold text-gray-900 block mb-1">Bank Information</h3>
                  <p className="text-xs text-gray-500">Provide your bank details for verification and onboarding.</p>
                </div>
                <div className="w-full md:w-2/3"></div>
              </div>

              {/* IFSC Code with Verify Button */}
              <div className="flex flex-col md:flex-row items-start gap-6">
                <div className="w-full md:w-1/3">
                  <label className="text-sm font-semibold text-gray-900 block mb-1">IFSC Code</label>
                  <p className="text-xs text-gray-500">Enter and verify IFSC code</p>
                </div>
                <div className="w-full md:w-2/3">
                  <div className="flex gap-2">
                    <input
                      required
                      type="text"
                      name="ifscCode"
                      value={formData.ifscCode}
                      onChange={handleInputChange}
                      placeholder="e.g., HDFC0000001"
                      className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent uppercase"
                    />
                    <button
                      type="button"
                      onClick={handleVerifyIFSC}
                      disabled={isVerifying || !formData.ifscCode}
                      className="px-4 py-2 text-sm font-medium border border-emerald-500 bg-emerald-50 text-emerald-600 rounded hover:bg-emerald-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                    >
                      {isVerifying ? "Verifying..." : "Verify"}
                    </button>
                  </div>
                  {verificationStatus && (
                    <div className={`mt-2 p-2 rounded text-sm ${
                      verificationStatus === "success" 
                        ? "bg-green-100 text-green-700 border border-green-300" 
                        : "bg-red-100 text-red-700 border border-red-300"
                    }`}>
                      {verificationMessage}
                    </div>
                  )}
                </div>
              </div>

              {/* Bank Name - Auto-filled from IFSC */}
              <div className="flex flex-col md:flex-row items-start gap-6">
                <div className="w-full md:w-1/3">
                  <label className="text-sm font-semibold text-gray-900 block mb-1">Bank Name</label>
                  <p className="text-xs text-gray-500">Auto-filled from IFSC</p>
                </div>
                <div className="w-full md:w-2/3">
                  <input
                    type="text"
                    name="bankName"
                    value={formData.bankName}
                    onChange={handleInputChange}
                    placeholder="Bank name (auto-filled)"
                    disabled
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm bg-gray-100 text-gray-600 cursor-not-allowed"
                  />
                </div>
              </div>

              {/* Branch Address - Auto-filled from IFSC */}
              <div className="flex flex-col md:flex-row items-start gap-6">
                <div className="w-full md:w-1/3">
                  <label className="text-sm font-semibold text-gray-900 block mb-1">Branch Address</label>
                  <p className="text-xs text-gray-500">Auto-filled from IFSC</p>
                </div>
                <div className="w-full md:w-2/3">
                  <input
                    type="text"
                    name="branchAddress"
                    value={formData.branchAddress}
                    onChange={handleInputChange}
                    placeholder="Branch address (auto-filled)"
                    disabled
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm bg-gray-100 text-gray-600 cursor-not-allowed"
                  />
                </div>
              </div>

              {/* Account Number */}
              <div className="flex flex-col md:flex-row items-start gap-6">
                <div className="w-full md:w-1/3">
                  <label className="text-sm font-semibold text-gray-900 block mb-1">Account Number</label>
                  <p className="text-xs text-gray-500">Provide account number</p>
                </div>
                <div className="w-full md:w-2/3">
                  <input
                    required
                    type="text"
                    name="accountNumber"
                    value={formData.accountNumber}
                    onChange={handleInputChange}
                    placeholder="Account number (max 16 digits)"
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Account Name */}
              <div className="flex flex-col md:flex-row items-start gap-6">
                <div className="w-full md:w-1/3">
                  <label className="text-sm font-semibold text-gray-900 block mb-1">Account Name</label>
                  <p className="text-xs text-gray-500">Provide account name</p>
                </div>
                <div className="w-full md:w-2/3">
                  <input
                    required
                    type="text"
                    name="accountName"
                    value={formData.accountName}
                    onChange={handleInputChange}
                    placeholder="Account name"
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>


            {/* Blank Cheque Upload with OCR */}
            <div className="flex flex-col md:flex-row items-start gap-6">
                <div className="w-full md:w-1/3">
                  <h3 className="text-sm font-semibold text-gray-900 block mb-1">Blank Cheque</h3>
                  <p className="text-xs text-gray-500">Upload a scanned copy of a blank cheque (we'll extract account details with OCR).</p>
                </div>
                <div className="w-full md:w-2/3">
                  {/* File Upload Area */}
                  <label className={`cursor-pointer border-2 border-dashed rounded px-4 py-3 text-sm transition-colors block ${
                    ocrProcessing ? 'border-blue-300 bg-blue-50' : 'border-gray-300 hover:border-emerald-500'
                  }`}>
                    {ocrProcessing ? (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 text-blue-600">
                          <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                          <span className="font-semibold">Processing cheque with OCR...</span>
                        </div>
                        {pendingChequeFile && (
                          <div className="flex items-center gap-2 text-blue-600 ml-7">
                            <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            <span className="text-sm text-gray-700">{pendingChequeFile.name}</span>
                          </div>
                        )}
                        <p className="text-xs text-blue-500 ml-7">This may take up to 30 seconds...</p>
                      </div>
                    ) : formData.blankCheque ? (
                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          <div className="flex-1">
                            <p className="text-sm font-semibold text-gray-900">{formData.blankCheque.name}</p>
                            {formData.blankCheque.uploading ? (
                              <p className="text-xs text-blue-600 flex items-center gap-1">
                                <svg className="w-3 h-3 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                </svg>
                                Uploading to server...
                              </p>
                            ) : (
                              <p className="text-xs text-green-600">✓ Successfully uploaded and processed</p>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault(); 
                              handleDeleteFile("blankCheque")
                            }}
                            className="text-red-500 text-xs hover:text-red-700 font-medium"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-gray-600">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        <span>Click to upload blank cheque (JPG, PNG, TIFF)</span>
                      </div>
                    )}
                    <input
                      type="file"
                      id="blankCheque"
                      name="blankCheque"
                      onChange={handleFileChange}
                      disabled={ocrProcessing}
                      accept="image/jpeg,image/png,image/webp,image/tiff"
                      className="hidden"
                    />
                  </label>
                  <p className="text-xs text-gray-500 mt-2">Max 5MB • OCR will extract account number and name automatically</p>
                </div>
              </div>
              
            {/* Navigation Buttons */}
            <div className="flex justify-end space-x-4 pt-6">
              <button
                type="button"
                onClick={handlePrevious}
                className="px-8 py-3 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="text-white px-8 py-3 rounded-lg font-medium shadow-md bg-gradient-to-r from-[#0F5848] to-[#21BE9C] hover:from-[#0F5848]/90 hover:to-[#21BE9C]/90 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isSubmitting ? "Please wait..." : "Next"}
              </button>
            </div>
          </form>

          {/* OCR Preview Modal */}
          <OCRPreviewModal
            isOpen={ocrModalOpen}
            data={ocrData}
            onConfirm={handleOCRConfirm}
            onEdit={() => {}} // Edit is handled in modal
            onRetry={handleOCRRetry}
            onClose={() => setOcrModalOpen(false)}
            isLoading={false}
          />
        </div>
      </div>
    </div>
  );
}
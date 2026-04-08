import React, { useState, useEffect, useContext } from 'react';
import { useParams, Link, useLocation, useNavigate } from 'react-router-dom';
import {
    ArrowLeftIcon, ClockIcon, CurrencyRupeeIcon,
    ArrowUpTrayIcon as UploadIcon,
    DocumentArrowDownIcon as DownloadIcon,
    PaperClipIcon, CheckIcon, XMarkIcon, ArrowPathIcon,
    RectangleGroupIcon
} from '@heroicons/react/24/solid';
import { VendorContext } from '../../context/VendorContext';
import config from '../../config/env';
import { uploadFileToS3 } from '../../utils/fileUpload';

// Placeholder Button component - replace with your actual Button if you have one
// Or style a regular button with Tailwind
const Button = ({ children, variant, className = '', ...props }) => {
    const baseStyle = "px-4 py-2 rounded-md font-medium text-sm focus:outline-none focus:ring-2 focus:ring-offset-2 transition ease-in-out duration-150";
    let variantStyle = "";
    if (variant === "outline") {
        variantStyle = "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 focus:ring-indigo-500";
        if (props.id === 'reject-button') { variantStyle = "border-red-300 bg-white text-red-600 hover:bg-red-50 focus:ring-red-500"; }
    } else if (props.id === 'upload-button') {
         variantStyle = `bg-gray-600 text-white hover:bg-gray-700 ${props.disabled ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : ''}`;
    } else {
        variantStyle = "bg-emerald-600 text-white hover:bg-emerald-700 focus:ring-emerald-500";
        if (props.disabled) { variantStyle += " opacity-50 cursor-not-allowed"; }
    }
    return ( <button className={`${baseStyle} ${variantStyle} ${className}`} {...props}> {children} </button> );
};


const LeadDetailPage = () => {
    const { leadId } = useParams();
    const location = useLocation();
    const navigate = useNavigate();
    const { currentUser } = useContext(VendorContext);
    let leadDetails = location.state?.projectData;

    // Quotation upload state
    const [quotationFile, setQuotationFile] = useState(null);
    const [isUploadingQuotation, setIsUploadingQuotation] = useState(false);
    const [uploadedQuotation, setUploadedQuotation] = useState(null);
    const [quotationError, setQuotationError] = useState(null);
    const [freshLeadData, setFreshLeadData] = useState(null);
    
    // Vendor BOQ upload state (when PM doesn't provide BOQ)
    const [vendorBoqFile, setVendorBoqFile] = useState(null);
    const [isUploadingVendorBoq, setIsUploadingVendorBoq] = useState(false);
    const [uploadedVendorBoq, setUploadedVendorBoq] = useState(null);
    const [vendorBoqError, setVendorBoqError] = useState(null);
    
    // Vendor quotation for vendor's BOQ
    const [vendorQuotationFile, setVendorQuotationFile] = useState(null);
    const [isUploadingVendorQuotation, setIsUploadingVendorQuotation] = useState(false);
    const [uploadedVendorQuotation, setUploadedVendorQuotation] = useState(null);
    const [vendorQuotationError, setVendorQuotationError] = useState(null);

    // Use fresh data from API if available, otherwise use stale data from location.state
    if (freshLeadData) {
        leadDetails = { ...leadDetails, ...freshLeadData };
    }

    // Fetch fresh lead data from API on component mount
    useEffect(() => {
        const fetchFreshLeadData = async () => {
            try {
                const vendorId = currentUser?.vendorId || currentUser?.id;
                if (!vendorId || !leadId) return;

                const response = await fetch(`/api/vendor-leads/${leadId}`, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });

                if (response.ok) {
                    const data = await response.json();
                    if (data?.lead) {
                        setFreshLeadData({
                            rejectionReason: data.lead.rejectionReason,
                            negotiationHistory: data.lead.negotiationHistory,
                            leadVersion: data.lead.leadVersion,
                            status: data.lead.status
                        });
                    }
                }
            } catch (error) {
                console.error('Error fetching fresh lead data:', error);
                // Silently fail - use stale data from location.state
            }
        };

        fetchFreshLeadData();
    }, [leadId, currentUser]);

    // Quotation upload state

    // Helper: download BOQ via backend-signed URL
    const handleDownloadBoq = async () => {
        try {
            if (!leadDetails?.boqAttachment && !leadDetails?.boqFileUrl) {
                alert('No BOQ document available for this lead.');
                return;
            }

            // If frontend already has a direct URL (e.g. from a public bucket), just use it.
            if (leadDetails.boqFileUrl && !leadDetails.boqAttachment) {
                const a = document.createElement('a');
                a.href = leadDetails.boqFileUrl;
                a.target = '_blank';
                a.rel = 'noopener noreferrer';
                document.body.appendChild(a);
                a.click();
                a.remove();
                return;
            }

            const vendorId = currentUser?.vendorId || currentUser?.id;

            const response = await fetch(`/api/vendor-leads/${leadId}/boq-download`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ vendorId })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `Failed to generate BOQ download link (status ${response.status})`);
            }

            const data = await response.json();
            if (!data?.downloadUrl) {
                throw new Error('Download URL missing in server response');
            }

            // Trigger download/view without opening a blocked popup
            const a = document.createElement('a');
            a.href = data.downloadUrl;
            a.target = '_blank';
            a.rel = 'noopener noreferrer';
            if (data.fileName) {
                a.download = data.fileName;
            }
            document.body.appendChild(a);
            a.click();
            a.remove();
        } catch (error) {
            console.error('Error downloading BOQ:', error);
            alert(error.message || 'Failed to download BOQ. Please try again.');
        }
    };

    // Function to open workspace for this lead
    const openWorkspace = async () => {
        try {
            if (!currentUser || (!currentUser.vendorId && !currentUser.id)) {
                alert('You must be logged in to access the workspace.');
                return;
            }

            const vendorId = currentUser.vendorId || currentUser.id;
            
            // Create or get workspace for this lead
            const response = await fetch(`${config.VENDOR_BACKEND_URL}/api/workspaces/lead/${leadId}/create-or-get`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    vendorId: vendorId,
                    projectId: leadDetails?.projectId || null
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }

            const workspace = await response.json();
            
            // Navigate to workspace page with the workspace ID and lead details
            navigate(`/VendorDashboard/workspace/${workspace.workspaceId}`, {
                state: {
                    leadId: leadId,
                    leadDetails: leadDetails,
                    workspaceId: workspace.workspaceId
                }
            });
        } catch (error) {
            console.error('Error opening workspace:', error);
            alert('Failed to open workspace. Please try again.');
        }
    };

    const handleQuotationFileChange = (event) => {
        const file = event.target.files?.[0];
        if (file) {
            setQuotationFile(file);
            setQuotationError(null);
        }
    };

    const handleVendorBoqFileChange = (event) => {
        const file = event.target.files?.[0];
        if (file) {
            setVendorBoqFile(file);
            setVendorBoqError(null);
        }
    };

    const handleVendorQuotationFileChange = (event) => {
        const file = event.target.files?.[0];
        if (file) {
            setVendorQuotationFile(file);
            setVendorQuotationError(null);
        }
    };

    const handleUploadVendorBoq = async () => {
        try {
            if (!vendorBoqFile) {
                alert('Please select a BOQ PDF to upload.');
                return;
            }

            const vendorId = currentUser.vendorId || currentUser.id;
            if (!vendorId) {
                alert('Vendor ID is missing. Please re-login and try again.');
                return;
            }

            setIsUploadingVendorBoq(true);
            setVendorBoqError(null);

            console.log('=== VENDOR BOQ UPLOAD STARTED ===');
            console.log('Lead ID:', leadId);
            console.log('Vendor ID:', vendorId);
            console.log('File name:', vendorBoqFile.name);

            // 1) Upload BOQ file to S3
            const uploadResponse = await uploadFileToS3(
                vendorBoqFile,
                currentUser.email,
                'vendorBoq',
                'vendorBoqs'
            );

            console.log('S3 Upload Response:', uploadResponse);

            const boqFileUrl = uploadResponse?.data?.url;
            if (!boqFileUrl) {
                throw new Error('File upload succeeded but URL is missing in response.');
            }

            console.log('BOQ File URL from S3:', boqFileUrl);

            // 2) Send to backend to store vendor BOQ
            console.log('Calling backend endpoint: /api/vendor-leads/' + leadId + '/vendor-boq');
            const response = await fetch(`/api/vendor-leads/${leadId}/vendor-boq`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    vendorId,
                    pmId: leadDetails?.pmId,
                    vendorBoqUrl: boqFileUrl,
                    vendorBoqFileName: vendorBoqFile.name
                })
            });

            const data = await response.json().catch(() => ({}));
            console.log('Backend response:', data);

            if (!response.ok || !data?.success) {
                throw new Error(
                    data.error ||
                    data.message ||
                    `Failed to save vendor BOQ (status ${response.status})`
                );
            }

            setUploadedVendorBoq({
                boqFileUrl,
                fileName: vendorBoqFile.name,
                uploadedAt: new Date().toISOString()
            });
            setVendorBoqFile(null);
            
            alert('Your BOQ has been uploaded successfully! Now you can upload a quotation based on this BOQ.');
        } catch (error) {
            console.error('Error uploading vendor BOQ:', error);
            setVendorBoqError(error.message || 'Failed to upload BOQ. Please try again.');
            alert(error.message || 'Failed to upload BOQ. Please try again.');
        } finally {
            setIsUploadingVendorBoq(false);
        }
    };

    const handleUploadVendorQuotation = async () => {
        try {
            if (!vendorQuotationFile) {
                alert('Please select a quotation PDF to upload.');
                return;
            }

            if (!uploadedVendorBoq) {
                alert('Please upload your BOQ first before uploading a quotation.');
                return;
            }

            const vendorId = currentUser.vendorId || currentUser.id;
            if (!vendorId) {
                alert('Vendor ID is missing. Please re-login and try again.');
                return;
            }

            setIsUploadingVendorQuotation(true);
            setVendorQuotationError(null);

            // 1) Upload quotation file to S3
            const uploadResponse = await uploadFileToS3(
                vendorQuotationFile,
                currentUser.email,
                'vendorQuotation',
                'vendorQuotations'
            );

            const quotationFileUrl = uploadResponse?.data?.url;
            if (!quotationFileUrl) {
                throw new Error('File upload succeeded but URL is missing in response.');
            }

            // 2) Send to backend to store vendor quotation
            const response = await fetch(`/api/vendor-leads/${leadId}/vendor-quotation`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    vendorId,
                    pmId: leadDetails?.pmId,
                    vendorBoqUrl: uploadedVendorBoq.boqFileUrl,
                    vendorQuotationUrl: quotationFileUrl,
                    vendorQuotationFileName: vendorQuotationFile.name
                })
            });

            const data = await response.json().catch(() => ({}));

            if (!response.ok || !data?.success) {
                throw new Error(
                    data.error ||
                    data.message ||
                    `Failed to save vendor quotation (status ${response.status})`
                );
            }

            setUploadedVendorQuotation({
                quotationFileUrl,
                fileName: vendorQuotationFile.name,
                uploadedAt: new Date().toISOString()
            });
            setVendorQuotationFile(null);
            
            alert('Your quotation has been uploaded and sent to PM for review!');
        } catch (error) {
            console.error('Error uploading vendor quotation:', error);
            setVendorQuotationError(error.message || 'Failed to upload quotation. Please try again.');
            alert(error.message || 'Failed to upload quotation. Please try again.');
        } finally {
            setIsUploadingVendorQuotation(false);
        }
    };

    const handleUploadQuotation = async () => {
        try {
            if (!quotationFile) {
                alert('Please select a quotation PDF to upload.');
                return;
            }

            const vendorId = currentUser.vendorId || currentUser.id;
            if (!vendorId) {
                alert('Vendor ID is missing. Please re-login and try again.');
                return;
            }

            setIsUploadingQuotation(true);
            setQuotationError(null);

            // 1) Upload file to S3 via existing file upload API
            const uploadResponse = await uploadFileToS3(
                quotationFile,
                currentUser.email,
                'leadQuotation',
                'leadQuotations'
            );

            const pdfUrl = uploadResponse?.data?.url;
            if (!pdfUrl) {
                throw new Error('File upload succeeded but URL is missing in response.');
            }

            // 2) Update lead_invitations table with quotation pdfUrl and approve lead (vendor_accepted)
            const response = await fetch(`/api/vendor-leads/${leadId}/quotation`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    vendorId,
                    pmId: leadDetails?.pmId,
                    pdfUrl
                })
            });

            const data = await response.json().catch(() => ({}));

            if (!response.ok || !data?.success) {
                throw new Error(
                    data.error ||
                    data.message ||
                    `Failed to save quotation (status ${response.status})`
                );
            }

            // Update local state with the new lead data
            setUploadedQuotation(data.quotation || null);
            
            // Update leadDetails in location state to persist the new status
            if (location.state) {
                location.state.projectData = {
                    ...location.state.projectData,
                    status: 'vendor_accepted',
                    pdfUrl,
                    vendorResponse: {
                        accepted: true,
                        quotationPdfUrl: pdfUrl,
                        submittedAt: new Date().toISOString()
                    }
                };
            }
            
            alert('Quotation uploaded successfully! Lead status has been approved.');
        } catch (error) {
            console.error('Error uploading quotation:', error);
            setQuotationError(error.message || 'Failed to upload quotation. Please try again.');
            alert(error.message || 'Failed to upload quotation. Please try again.');
        } finally {
            setIsUploadingQuotation(false);
        }
    };

    if (!leadDetails) {
        return (
            <div className="max-w-4xl mx-auto px-4 py-6 text-center">
                <h2 className="text-xl font-semibold text-red-600 mb-4">Error: Lead Data Not Found</h2>
                <p className="text-gray-600 mb-4">Could not load lead details. Please go back to the leads list and try again.</p>
                <Link to="/leads" className="text-emerald-600 hover:underline">
                    Go back to Leads
                </Link>
            </div>
        );
    }

    const isPending = leadDetails.status === null;

    const getStatusStyles = (status) => {
        switch (status) {
            case 'approved': return 'bg-green-100 text-green-800';
            case 'rejected': return 'bg-red-100 text-red-800';
            case null: return 'bg-yellow-100 text-yellow-800'; // Pending
            default: return 'bg-gray-100 text-gray-800';
        }
    };
    const formatStatus = (status) => {
        if (status === null) return 'Pending Review';
        return status ? status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'Unknown';
    };

    return (
        <div className="max-w-4xl mx-auto px-4 py-6 bg-white rounded-lg shadow mb-10">
            {/* Back Navigation */}
            <div className="mb-6">
                <Link to="/VendorDashboard/leads" className="flex items-center text-sm font-medium text-gray-700 hover:text-gray-900">
                    <ArrowLeftIcon className="mr-2 h-4 w-4" />
                    Back to Leads
                </Link>
            </div>

            {/* Project Header */}
            <div className="flex flex-wrap justify-between items-start mb-8 gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-gray-900">{leadDetails?.name || 'Unnamed Lead'}</h1>
                    <div className="mt-1">
                        <span className="inline-block bg-gray-200 rounded-full px-3 py-1 text-xs font-medium text-gray-700">
                            Client ID: {leadDetails?.clientId || 'N/A'}
                        </span>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={() => navigate(`/VendorDashboard/support?module=quotation&ref=${encodeURIComponent(leadId)}`)}
                        className="inline-flex items-center px-4 py-2 border border-emerald-200 bg-emerald-50 text-emerald-700 text-sm font-medium rounded-md hover:bg-emerald-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition-colors duration-200"
                    >
                        Raise Support
                    </button>
                    <button
                        onClick={openWorkspace}
                        className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
                    >
                        <RectangleGroupIcon className="h-4 w-4 mr-2" />
                        Open Workspace
                    </button>
                    <span className={`inline-block rounded-full px-4 py-1 text-sm font-medium ${getStatusStyles(leadDetails?.status)}`}>
                        {formatStatus(leadDetails?.status)}
                    </span>
                </div>
            </div>

            {/* Project Overview */}
            <div className="mb-10">
                <h2 className="text-xl font-semibold text-gray-900 mb-3">Project Overview</h2>
                <p className="text-sm text-gray-700 mb-6 leading-relaxed">
                    {leadDetails?.description || 'No description provided.'}
                </p>

                {/* Project Metrics */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-8 mt-6">
                    {leadDetails?.duration && (
                        <div className="flex items-start">
                            <ClockIcon className="h-5 w-5 text-gray-500 mr-2 mt-0.5 flex-shrink-0" />
                            <div><p className="text-xs sm:text-sm text-gray-500">Duration</p><p className="text-sm sm:text-base font-semibold">{leadDetails.duration}</p></div>
                        </div>
                    )}
                    {leadDetails?.budget && (
                        <div className="flex items-start">
                            <CurrencyRupeeIcon className="h-5 w-5 text-gray-500 mr-2 mt-0.5 flex-shrink-0" />
                            <div><p className="text-xs sm:text-sm text-gray-500">Budget</p><p className="text-sm sm:text-base font-semibold">{leadDetails.budget}</p></div>
                        </div>
                    )}
                    {/* Placeholders */}
                    {/* ... Team Size, Start Date placeholders if needed ... */}
                </div>
            </div>

            {/* Project Documentation (BOQ Link) */}
            <div className="mb-10">
                 <div className="flex flex-wrap justify-between items-center mb-4 gap-2">
                    <h2 className="text-xl font-semibold text-gray-900">Project Documentation</h2>
                    {leadDetails?.boqAttachment || leadDetails?.boqFileUrl ? (
                        <button
                            type="button"
                            onClick={handleDownloadBoq}
                            className="flex items-center text-emerald-600 hover:text-emerald-800 text-sm font-medium"
                        >
                            <DownloadIcon className="mr-1 h-4 w-4" />
                            Download BOQ PDF
                        </button>
                    ) : (
                        <span className="text-sm text-gray-500 italic">No BOQ document</span>
                    )}
                </div>
                <div className="border rounded-md p-4 bg-gray-50 text-sm text-gray-600">
                    Detailed Bill of Quantities (BOQ) is available in the downloadable PDF document linked above (if provided).
                </div>
            </div>

            {/* Vendor BOQ Upload Section (always available - mandatory if PM hasn't provided BOQ, optional if PM has) */}
            {true && (
                <div className="mb-10 p-4 rounded-lg border-l-4 border-blue-500 bg-blue-50">
                    <div className="flex items-start gap-3">
                        <div className="flex-shrink-0">
                            <UploadIcon className="h-5 w-5 text-blue-600 mt-0.5" />
                        </div>
                        <div className="flex-1">
                            <h3 className="text-sm font-semibold text-blue-900 mb-2">
                                {!leadDetails?.boqAttachment && !leadDetails?.boqFileUrl 
                                    ? 'Create Your Own Bill of Quantities (BOQ) - Required'
                                    : 'Upload Your Own Bill of Quantities (BOQ) - Optional'
                                }
                            </h3>
                            <p className="text-sm text-blue-800 mb-4">
                                {!leadDetails?.boqAttachment && !leadDetails?.boqFileUrl 
                                    ? 'No BOQ has been provided by the PM. You must upload your own BOQ and submit a quotation based on it.'
                                    : 'A BOQ has been provided by the PM. You can optionally upload your own BOQ as an alternative and submit a quotation based on it instead.'
                                }
                            </p>

                            {/* Vendor BOQ Upload */}
                            {!uploadedVendorBoq ? (
                                <div>
                                    <p className="text-sm font-medium text-gray-700 mb-3">Step 1: Upload Your BOQ</p>
                                    <div className="border-2 border-dashed border-blue-300 rounded-md p-4 flex flex-col items-center justify-center text-center bg-white mb-4">
                                        <UploadIcon className="h-8 w-8 text-blue-400 mb-2" />
                                        <p className="text-sm text-gray-700 mb-1">
                                            Upload your own Bill of Quantities (BOQ)
                                        </p>
                                        <p className="text-xs text-gray-500 mb-3">
                                            Supported format: PDF
                                        </p>
                                        <label className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md cursor-pointer hover:bg-blue-700">
                                            Choose File
                                            <input
                                                type="file"
                                                accept="application/pdf"
                                                className="hidden"
                                                onChange={handleVendorBoqFileChange}
                                            />
                                        </label>
                                        {vendorBoqFile && (
                                            <p className="mt-2 text-xs text-gray-600">
                                                Selected: <span className="font-medium">{vendorBoqFile.name}</span>
                                            </p>
                                        )}
                                    </div>
                                    <div className="flex justify-end">
                                        <button
                                            type="button"
                                            onClick={handleUploadVendorBoq}
                                            disabled={!vendorBoqFile || isUploadingVendorBoq}
                                            className={`inline-flex items-center px-4 py-2 rounded-md text-sm font-medium text-white ${
                                                !vendorBoqFile || isUploadingVendorBoq
                                                    ? 'bg-gray-400 cursor-not-allowed'
                                                    : 'bg-blue-600 hover:bg-blue-700'
                                            }`}
                                        >
                                            {isUploadingVendorBoq ? (
                                                <>
                                                    <ArrowPathIcon className="h-4 w-4 mr-2 animate-spin" />
                                                    Uploading...
                                                </>
                                            ) : (
                                                'Upload BOQ'
                                            )}
                                        </button>
                                    </div>
                                    {vendorBoqError && (
                                        <p className="mt-2 text-sm text-red-600">{vendorBoqError}</p>
                                    )}
                                </div>
                            ) : (
                                <div className="bg-green-50 border border-green-200 rounded-md p-3 mb-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <CheckIcon className="h-5 w-5 text-green-600 flex-shrink-0" />
                                        <p className="text-sm font-medium text-green-800">
                                            BOQ Uploaded
                                        </p>
                                    </div>
                                    <p className="text-xs text-green-700">
                                        <span className="font-medium">{uploadedVendorBoq.fileName}</span> - Uploaded at {new Date(uploadedVendorBoq.uploadedAt).toLocaleString()}
                                    </p>
                                </div>
                            )}

                            {/* Vendor Quotation Upload (shown after BOQ upload) */}
                            {uploadedVendorBoq && (
                                <div className="mt-6">
                                    <p className="text-sm font-medium text-gray-700 mb-3">Step 2: Upload Your Quotation</p>
                                    
                                    {uploadedVendorQuotation ? (
                                        <div className="bg-green-50 border border-green-200 rounded-md p-3">
                                            <div className="flex items-center gap-2">
                                                <CheckIcon className="h-5 w-5 text-green-600 flex-shrink-0" />
                                                <div>
                                                    <p className="text-sm font-medium text-green-800">
                                                        Quotation Sent to PM
                                                    </p>
                                                    <p className="text-xs text-green-700 mt-1">
                                                        <span className="font-medium">{uploadedVendorQuotation.fileName}</span> - Uploaded at {new Date(uploadedVendorQuotation.uploadedAt).toLocaleString()}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div>
                                            <div className="border-2 border-dashed border-blue-300 rounded-md p-4 flex flex-col items-center justify-center text-center bg-white mb-4">
                                                <UploadIcon className="h-8 w-8 text-blue-400 mb-2" />
                                                <p className="text-sm text-gray-700 mb-1">
                                                    Upload your quotation based on the BOQ above
                                                </p>
                                                <p className="text-xs text-gray-500 mb-3">
                                                    Supported format: PDF
                                                </p>
                                                <label className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md cursor-pointer hover:bg-blue-700">
                                                    Choose File
                                                    <input
                                                        type="file"
                                                        accept="application/pdf"
                                                        className="hidden"
                                                        onChange={handleVendorQuotationFileChange}
                                                    />
                                                </label>
                                                {vendorQuotationFile && (
                                                    <p className="mt-2 text-xs text-gray-600">
                                                        Selected: <span className="font-medium">{vendorQuotationFile.name}</span>
                                                    </p>
                                                )}
                                            </div>
                                            <div className="flex justify-end">
                                                <button
                                                    type="button"
                                                    onClick={handleUploadVendorQuotation}
                                                    disabled={!vendorQuotationFile || isUploadingVendorQuotation}
                                                    className={`inline-flex items-center px-4 py-2 rounded-md text-sm font-medium text-white ${
                                                        !vendorQuotationFile || isUploadingVendorQuotation
                                                            ? 'bg-gray-400 cursor-not-allowed'
                                                            : 'bg-blue-600 hover:bg-blue-700'
                                                    }`}
                                                >
                                                    {isUploadingVendorQuotation ? (
                                                        <>
                                                            <ArrowPathIcon className="h-4 w-4 mr-2 animate-spin" />
                                                            Uploading...
                                                        </>
                                                    ) : (
                                                        'Upload Quotation & Send to PM'
                                                    )}
                                                </button>
                                            </div>
                                            {vendorQuotationError && (
                                                <p className="mt-2 text-sm text-red-600">{vendorQuotationError}</p>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* PM Rejection Feedback (if rejected for revision or has negotiation history) */}
            {(leadDetails?.status === 'sent' || leadDetails?.rejectionReason || leadDetails?.negotiationHistory?.length > 0) && leadDetails?.rejectionReason && (
                <div className="mb-10 p-4 rounded-lg border-l-4 border-rose-500 bg-rose-50">
                    <div className="flex items-start gap-3">
                        <div className="flex-shrink-0">
                            {leadDetails?.status === 'sent' && leadDetails?.negotiationHistory?.length > 0 ? (
                                <ArrowPathIcon className="h-5 w-5 text-orange-600 mt-0.5" />
                            ) : (
                                <XMarkIcon className="h-5 w-5 text-rose-600 mt-0.5" />
                            )}
                        </div>
                        <div className="flex-1">
                            <h3 className="text-sm font-semibold text-rose-800 mb-2">
                                {leadDetails?.status === 'sent' && leadDetails?.negotiationHistory?.length > 0 
                                    ? `Lead Updated & Resent for Revision (v${leadDetails?.leadVersion || 1})`
                                    : `Lead Returned for Revision (v${leadDetails?.leadVersion || 1})`
                                }
                            </h3>
                            {leadDetails?.status === 'sent' && leadDetails?.negotiationHistory?.length > 0 && (
                                <div className="text-xs text-orange-700 bg-orange-100 rounded px-2 py-1 mb-3 inline-block">
                                    ✓ PM has updated this lead and resent it for your review
                                </div>
                            )}
                            <div className="text-sm text-rose-700 mb-3">
                                <p className="font-medium mb-1">Reason for Rejection:</p>
                                <p className="bg-white rounded px-3 py-2 border border-rose-200 mb-2">
                                    {leadDetails.rejectionReason}
                                </p>
                            </div>
                            {leadDetails?.pmDecision?.feedback && (
                                <div className="text-sm text-rose-700">
                                    <p className="font-medium mb-1">PM Feedback:</p>
                                    <p className="bg-white rounded px-3 py-2 border border-rose-200">
                                        {leadDetails.pmDecision.feedback}
                                    </p>
                                </div>
                            )}
                            {leadDetails?.negotiationHistory && leadDetails.negotiationHistory.length > 0 && (
                                <div className="mt-3 pt-3 border-t border-rose-200">
                                    <p className="text-xs font-medium text-rose-700 mb-2">Negotiation History:</p>
                                    <div className="space-y-1">
                                        {leadDetails.negotiationHistory.map((entry, idx) => (
                                            <div key={idx} className="text-xs text-rose-600 bg-white rounded px-2 py-1 border border-rose-100">
                                                <span className="font-medium">v{entry.version}:</span> {entry.action === 'pm_rejected' ? 'PM Rejected' : 'PM Resent'} {entry.rejectionReason && `- ${entry.rejectionReason}`}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                            <p className="text-xs text-rose-600 mt-3 italic">
                                Please update your quotation and resubmit below to address the feedback.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Upload/View Quotation - Show when PM has provided BOQ */}
            {(leadDetails?.boqAttachment || leadDetails?.boqFileUrl) && (
            <div className="mb-10">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Your Quotation</h2>
                
                <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                    <p className="text-sm text-blue-800">
                        <span className="font-medium">BOQ Source:</span> You can upload your quotation based on the PM's provided BOQ above, or you can optionally upload your own BOQ (see section above) and use that instead.
                    </p>
                </div>

                {uploadedQuotation ? (
                    <div className="flex items-center justify-between gap-3 p-3 border rounded-md bg-green-50 mb-4">
                        <div className="flex items-center gap-2">
                            <PaperClipIcon className="h-5 w-5 text-green-600 flex-shrink-0" />
                            <div>
                                <p className="text-sm font-medium text-green-800">
                                    Quotation sent to PM for review
                                </p>
                                {uploadedQuotation.pdfUrl && (
                                    <a
                                        href={uploadedQuotation.pdfUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-xs text-green-700 underline"
                                    >
                                        View uploaded PDF
                                    </a>
                                )}
                            </div>
                        </div>
                        <span className="text-xs text-green-700">
                            Status: {uploadedQuotation.status || 'sent to pm for review'}
                        </span>
                    </div>
                ) : (
                    <>
                        <div className="border-2 border-dashed border-gray-300 rounded-md p-6 flex flex-col items-center justify-center text-center bg-gray-50">
                            <UploadIcon className="h-10 w-10 text-gray-400 mb-2" />
                            <p className="text-sm text-gray-700 mb-1">
                                Upload your quotation (PDF) to send it to the PM for review.
                            </p>
                            <p className="text-xs text-gray-400 mb-3">
                                Supported format: PDF. One quotation per lead.
                            </p>
                            <label className="inline-flex items-center px-4 py-2 bg-gray-800 text-white text-sm font-medium rounded-md cursor-pointer hover:bg-gray-900">
                                Choose File
                                <input
                                    type="file"
                                    accept="application/pdf"
                                    className="hidden"
                                    onChange={handleQuotationFileChange}
                                />
                            </label>
                            {quotationFile && (
                                <p className="mt-2 text-xs text-gray-600">
                                    Selected: <span className="font-medium">{quotationFile.name}</span>
                                </p>
                            )}
                        </div>
                        <div className="flex justify-end mt-4">
                            <button
                                type="button"
                                onClick={handleUploadQuotation}
                                disabled={!quotationFile || isUploadingQuotation}
                                className={`inline-flex items-center px-4 py-2 rounded-md text-sm font-medium text-white ${
                                    !quotationFile || isUploadingQuotation
                                        ? 'bg-gray-400 cursor-not-allowed'
                                        : 'bg-emerald-600 hover:bg-emerald-700'
                                }`}
                            >
                                {isUploadingQuotation ? (
                                    <>
                                        <ArrowPathIcon className="h-4 w-4 mr-2 animate-spin" />
                                        Uploading...
                                    </>
                                ) : (
                                    'Upload & Send to PM'
                                )}
                            </button>
                        </div>
                        {quotationError && (
                            <p className="mt-2 text-sm text-red-600">{quotationError}</p>
                        )}
                    </>
                )}
            </div>
            )}

            {/* Action Buttons (Removed/Disabled for frontend-only view) */}
             <div className="flex flex-wrap justify-end gap-3 sm:gap-4 mt-8">
                <button
                    type="button"
                    onClick={() => navigate(`/VendorDashboard/support?module=quotation&ref=${encodeURIComponent(leadId)}`)}
                    className="inline-flex items-center px-4 py-2 rounded-md text-sm font-medium border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                >
                    Need help with this lead?
                </button>
                <p className="text-sm text-gray-500 italic">Approve/Reject actions require backend connection.</p>
                {/*
                <Button id="reject-button" variant="outline" disabled> Reject </Button>
                <Button disabled> Approve </Button>
                */}
            </div>

        </div>
    );
};

export default LeadDetailPage;
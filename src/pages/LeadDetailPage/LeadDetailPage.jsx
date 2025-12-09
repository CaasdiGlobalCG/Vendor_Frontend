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
    const leadDetails = location.state?.projectData;

    // Quotation upload state
    const [quotationFile, setQuotationFile] = useState(null);
    const [isUploadingQuotation, setIsUploadingQuotation] = useState(false);
    const [uploadedQuotation, setUploadedQuotation] = useState(null);
    const [quotationError, setQuotationError] = useState(null);

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

    const handleUploadQuotation = async () => {
        try {
            if (!quotationFile) {
                alert('Please select a quotation PDF to upload.');
                return;
            }

            if (!currentUser?.email) {
                alert('User email is required to upload quotation.');
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

            // 2) Store quotation snapshot in vendor_quotes_to_pm table
            const response = await fetch(`/api/vendor-leads/${leadId}/quotation`, {
                method: 'POST',
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

            setUploadedQuotation(data.quotation || null);
            alert('Quotation uploaded and sent to PM successfully.');
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

            {/* Upload/View Quotation */}
            <div className="mb-10">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Your Quotation</h2>

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

            {/* Action Buttons (Removed/Disabled for frontend-only view) */}
             <div className="flex flex-wrap justify-end gap-3 sm:gap-4 mt-8">
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
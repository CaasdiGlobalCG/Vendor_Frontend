import React, { useState, useEffect, useContext } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { UserContext } from '../../context/UserContext';
import config from '../../config/env';
// Define API Base URL (consider moving to a .env file or a config file)
// In Vite, environment variables are accessed using import.meta.env instead of process.env

const ProjectLeadForm = () => {
    // Get current user from context
    const { currentUser } = useContext(UserContext);
    
    // --- State for Form Data (based on schema fields PM sets) ---
    const [name, setName] = useState('');
    const [clientId, setClientId] = useState('');
    const [description, setDescription] = useState('');
    const [duration, setDuration] = useState('');
    const [budget, setBudget] = useState('');
    const [assignedVendorId, setAssignedVendorId] = useState('');
    const [sentByPmId, setSentByPmId] = useState(currentUser?.id || ''); // Default to current user's ID if available
    const [boqFile, setBoqFile] = useState(null);
    const [boqFileUrl, setBoqFileUrl] = useState('');
    const [boqFileName, setBoqFileName] = useState('');
    const [leadId, setLeadId] = useState(''); // State to store the generated lead ID

    // --- State for dropdown options ---
    const [clients, setClients] = useState([]);
    const [vendors, setVendors] = useState([]);
    const [filteredVendors, setFilteredVendors] = useState([]);
    const [vendorSearch, setVendorSearch] = useState('');
    const [pms, setPms] = useState([]); // State to store fetched PMs

    // --- State for UI feedback ---
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [submitMessage, setSubmitMessage] = useState('');
    const [errorMessage, setErrorMessage] = useState('');

    // --- Fetch Clients, Vendors, and PMs for Dropdowns ---
    // Initialize filteredVendors when vendors change
    useEffect(() => {
        setFilteredVendors(vendors);
    }, [vendors]);

    useEffect(() => {
        // Fetch Clients
        const fetchClients = async () => {
            try {
                // For now, use a mock list of clients
                const mockClients = [
                    { _id: 'client1', name: 'Client 1' },
                    { _id: 'client2', name: 'Client 2' },
                    { _id: 'client3', name: 'Client 3' }
                ];
                setClients(mockClients);
                console.log("Using mock clients:", mockClients);
            } catch (error) {
                console.error("Error fetching clients:", error);
                setErrorMessage('Could not load clients.');
            }
        };

        // Fetch Vendors from DynamoDB vendors collection
        const fetchVendors = async () => {
            try {
                // Fetch real vendors from the backend
                const response = await fetch(`${config.VENDOR_BACKEND_URL}/api/vendor/all`);
                
                if (!response.ok) {
                    throw new Error('Failed to fetch vendors');
                }
                
                const data = await response.json();
                console.log("Fetched vendors data:", data);
                
                // The data is already formatted by the backend, but ensure consistency
                const formattedVendors = data.map(vendor => ({
                    // Ensure we prioritize the vendor's ID fields, not email
                    id: vendor.id || vendor.vendorId || vendor._id,
                    _id: vendor._id,
                    name: vendor.name || 'Unknown Vendor',
                    email: vendor.email || '',
                    status: vendor.status
                }));
                
                // Only show approved vendors in the dropdown
                const approvedVendors = formattedVendors.filter(vendor => 
                    vendor.status === 'approved' || !vendor.status // Include vendors without status for backward compatibility
                );
                
                setVendors(approvedVendors);
                setFilteredVendors(approvedVendors);
                console.log("Approved vendors:", approvedVendors);
                
                // Fallback to mock data if no vendors are returned
                if (approvedVendors.length === 0) {
                    console.warn("No approved vendors found in database, using mock data for testing");
                    const mockVendors = [
                        { id: 'vendor1', name: 'Vendor 1 (Mock)', email: 'vendor1@example.com', status: 'approved' },
                        { id: 'vendor2', name: 'Vendor 2 (Mock)', email: 'vendor2@example.com', status: 'approved' }
                    ];
                    setVendors(mockVendors);
                    setFilteredVendors(mockVendors);
                }
            } catch (error) {
                console.error("Error in vendor setup:", error);
                setErrorMessage(prev => prev ? `${prev} Could not load vendors.` : 'Could not load vendors.');
            }
        };

        // Fetch PMs (Users with 'PM' role)
        const fetchPms = async () => {
            try {
                // Using mock data for now until DynamoDB is properly set up
                const mockPMs = [
                    { id: 'pm1', name: 'John Smith', email: 'john.smith@example.com' },
                    { id: 'pm2', name: 'Sarah Johnson', email: 'sarah.j@example.com' },
                    { id: 'pm3', name: 'Michael Brown', email: 'michael.b@example.com' },
                    { id: 'pm4', name: 'Emily Davis', email: 'emily.d@example.com' },
                    { id: 'pm5', name: 'Robert Wilson', email: 'robert.w@example.com' }
                ];
                setPms(mockPMs);
                console.log("Using mock PMs:", mockPMs);
                
                // If current user is a PM, select them by default
                if (currentUser && currentUser.role === 'pm') {
                    const currentPM = mockPMs.find(pm => 
                        pm.id === currentUser.id || 
                        pm.email === currentUser.email
                    );
                    if (currentPM) {
                        setSentByPmId(currentPM.id);
                    }
                }
            } catch (error) {
                console.error("Error in PM setup:", error);
                setErrorMessage(prev => prev ? `${prev} Could not load Project Managers.` : 'Could not load Project Managers.');
            }
        };

        fetchClients();
        fetchVendors();
        fetchPms(); // Fetch PMs as well
    }, []); // Run only on component mount

    // --- Handle Vendor Search ---
    const handleVendorSearch = (e) => {
        const searchTerm = e.target.value.toLowerCase();
        setVendorSearch(e.target.value);
        
        if (!searchTerm) {
            setFilteredVendors(vendors);
            return;
        }
        
        const filtered = vendors.filter(vendor => {
            // Check all possible name fields
            const nameMatch = vendor.name?.toLowerCase().includes(searchTerm) || 
                              vendor.displayName?.toLowerCase().includes(searchTerm) ||
                              vendor.username?.toLowerCase().includes(searchTerm);
            
            // Check email
            const emailMatch = vendor.email?.toLowerCase().includes(searchTerm);
            
            // Check company name if available
            const companyMatch = vendor.companyName?.toLowerCase().includes(searchTerm) ||
                                vendor.company?.toLowerCase().includes(searchTerm);
            
            return nameMatch || emailMatch || companyMatch;
        });
        
        setFilteredVendors(filtered);
    };

    // --- Handle File Selection ---
    const handleFileChange = (event) => {
        const file = event.target.files[0];
        if (file) {
            setBoqFile(file);
            setBoqFileName(file.name);
            setBoqFileUrl(''); // Reset URL if new file selected
            setErrorMessage('');
            console.log("File selected:", file.name);
        }
    };

    // --- Handle File Upload ---
    const uploadBoqFile = async (file) => {
        if (!file) return null;
        setIsUploading(true);
        setErrorMessage('');
        
        try {
            // For now, simulate a file upload with a delay
            console.log(`Simulating upload for: ${file.name}`);
            await new Promise(resolve => setTimeout(resolve, 1500));
            
            // Create a fake URL for the uploaded file
            const fakeUrl = `https://fake-storage.com/uploads/${Date.now()}-${file.name}`;
            console.log(`Simulated upload successful. URL: ${fakeUrl}`);
            
            setIsUploading(false);
            return fakeUrl;
        } catch (error) {
            console.error('Error uploading file:', error);
            setErrorMessage(`File upload failed: ${error.message}`);
            setIsUploading(false);
            return null;
        }
    };

    // --- Handle Form Submission ---
    const handleSubmit = async (event) => {
        event.preventDefault();
        setIsSubmitting(true);
        setSubmitMessage('');
        setErrorMessage('');

        // --- 1. Upload File if needed ---
        let finalBoqFileUrl = boqFileUrl;
        if (boqFile && !finalBoqFileUrl) {
            const uploadedUrl = await uploadBoqFile(boqFile);
            if (!uploadedUrl) {
                setIsSubmitting(false);
                return;
            }
            finalBoqFileUrl = uploadedUrl;
            setBoqFileUrl(finalBoqFileUrl);
        }

        // --- 2. Validate required fields ---
        if (!name || !clientId || !description || !assignedVendorId || !sentByPmId || !finalBoqFileUrl) {
             setErrorMessage('Please fill in all required fields (*), including selecting the sending PM and ensuring the BOQ file is uploaded.');
             setIsSubmitting(false);
             return;
        }
        
        // Check if assignedVendorId looks like an email (contains @)
        if (assignedVendorId.includes('@')) {
            setErrorMessage('ERROR: The vendor ID appears to be an email address. Please select a vendor from the dropdown or enter their ID (not email) in the manual entry field.');
            setIsSubmitting(false);
            return;
        }

        // Generate a UUID for the lead if not already set
        const currentLeadId = leadId || uuidv4();
        if (!leadId) {
            setLeadId(currentLeadId);
        }

        // --- 3. Prepare Data Payload ---
        // Log the vendor ID being used
        console.log("Using vendor ID for submission:", assignedVendorId);
        
        const leadData = {
            leadId: currentLeadId, // Use the generated UUID
            name,
            clientId,
            description,
            duration: duration || undefined,
            budget: budget || undefined,
            sentByPmId, // Use the selected PM ID from state
            assignedVendorId, // Use the selected Vendor ID from state (not email)
            boqFileName: boqFileName || undefined,
            boqFileUrl: finalBoqFileUrl,
            status: 'new', // Default status for new leads
            createdAt: new Date().toISOString()
        };

        // --- 4. Send Data to API ---
        try {
            const response = await fetch(`${config.VENDOR_BACKEND_URL}/api/project-leads`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(leadData),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || `HTTP error! status: ${response.status}`);
            }

            // --- Success ---
            setSubmitMessage('Project Lead submitted successfully!');
            console.log('Success:', result);
            
            // Get vendor name if available
            const assignedVendor = vendors.find(v => v.id === assignedVendorId || v._id === assignedVendorId);
            if (assignedVendor) {
                const vendorName = assignedVendor.name || assignedVendor.displayName || assignedVendor.username || assignedVendor.email || assignedVendorId;
                setSubmitMessage(`Project Lead submitted successfully! Assigned to vendor: ${vendorName}`);
            }
            
            // Reset form
            setName('');
            setClientId('');
            setDescription('');
            setDuration('');
            setBudget('');
            setAssignedVendorId('');
            setSentByPmId(currentUser?.id || ''); // Reset to current user's ID if available
            setBoqFile(null);
            setBoqFileName('');
            setBoqFileUrl('');
            setLeadId(''); // Reset the lead ID for the next submission

        } catch (error) {
            console.error('Submission failed:', error);
            setErrorMessage(error.message || 'Failed to submit project lead. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="p-6 max-w-2xl mx-auto bg-white rounded-lg shadow-md">
            <h2 className="text-2xl font-semibold text-gray-800 mb-6">Create New Project Lead</h2>

            {submitMessage && <div className="mb-4 p-3 bg-green-100 text-green-700 rounded">{submitMessage}</div>}
            {errorMessage && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">{errorMessage}</div>}
            
            {/* Debug Info */}
            <div className="mb-4 p-3 bg-gray-100 text-gray-700 rounded text-sm">
                <p className="font-medium">Debug Information:</p>
                <p>This form creates project leads that will be assigned to vendors.</p>
                <p>Make sure to select a vendor from the dropdown or enter a vendor ID directly in the "Assign to Vendor" field.</p>
                <p>After creating a lead, the vendor will be able to see it in their leads page.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
                {/* Name (Required) */}
                <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700">Project Name <span className="text-red-500">*</span></label>
                    <input
                        type="text"
                        id="name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm"
                    />
                </div>

                {/* Client ID (Required Dropdown) */}
                <div>
                    <label htmlFor="clientId" className="block text-sm font-medium text-gray-700">Client <span className="text-red-500">*</span></label>
                    <select
                        id="clientId"
                        value={clientId}
                        onChange={(e) => setClientId(e.target.value)}
                        required
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm"
                    >
                        <option value="" disabled>Select a Client</option>
                        {clients.length > 0 ? (
                            clients.map((client) => (
                                <option key={client._id} value={client._id}>
                                    {client.name || client.companyName || client._id}
                                </option>
                            ))
                        ) : (
                            <option disabled>Loading clients...</option>
                        )}
                    </select>
                </div>

                 {/* Description (Required Textarea) */}
                 <div>
                     <label htmlFor="description" className="block text-sm font-medium text-gray-700">Description <span className="text-red-500">*</span></label>
                     <textarea
                         id="description"
                         rows="3"
                         value={description}
                         onChange={(e) => setDescription(e.target.value)}
                         required
                         className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm"
                     ></textarea>
                 </div>

                 {/* Duration (Optional) */}
                <div>
                    <label htmlFor="duration" className="block text-sm font-medium text-gray-700">Estimated Duration</label>
                    <input
                        type="text"
                        id="duration"
                        placeholder='e.g., "Approx 3 Months"'
                        value={duration}
                        onChange={(e) => setDuration(e.target.value)}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm"
                    />
                </div>

                {/* Budget (Optional) */}
                <div>
                    <label htmlFor="budget" className="block text-sm font-medium text-gray-700">Estimated Budget</label>
                    <input
                        type="text"
                        id="budget"
                        placeholder='e.g., "2.1 cr" or "$50,000"'
                        value={budget}
                        onChange={(e) => setBudget(e.target.value)}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm"
                    />
                </div>

                 {/* Sent By PM ID (Required Dropdown) */}
                <div>
                    <label htmlFor="sentByPmId" className="block text-sm font-medium text-gray-700">Sending Project Manager <span className="text-red-500">*</span></label>
                    <select
                        id="sentByPmId"
                        value={sentByPmId}
                        onChange={(e) => setSentByPmId(e.target.value)}
                        required
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm"
                    >
                         <option value="" disabled>Select the PM</option>
                         {pms.length > 0 ? (
                             pms.map((pm) => (
                                 <option key={pm._id || pm.id} value={pm._id || pm.id}>
                                     {pm.name || pm.username || pm._id || pm.id}
                                 </option>
                             ))
                         ) : (
                             <option disabled>Loading PMs...</option>
                         )}
                    </select>
                </div>

                {/* Assigned Vendor ID (Searchable Dropdown) */}
                <div>
                    <label htmlFor="vendorSearch" className="block text-sm font-medium text-gray-700">Assign to Vendor <span className="text-red-500">*</span></label>
                    <input
                        type="text"
                        id="vendorSearch"
                        placeholder="Search for a vendor..."
                        value={vendorSearch}
                        onChange={handleVendorSearch}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm"
                    />
                    
                    {/* Vendor dropdown list */}
                    {vendorSearch && (
                        <div className="mt-1 max-h-60 overflow-auto border border-gray-300 rounded-md bg-white">
                            {filteredVendors.length > 0 ? (
                                filteredVendors.map((vendor) => (
                                    <div 
                                        key={vendor.id || vendor._id} 
                                        className="px-3 py-2 cursor-pointer hover:bg-gray-100"
                                        onClick={() => {
                                            // Always use vendor ID, not email
                                            setAssignedVendorId(vendor.id || vendor._id);
                                            setVendorSearch(vendor.name || vendor.displayName || vendor.email);
                                            console.log("Selected vendor ID:", vendor.id || vendor._id);
                                        }}
                                    >
                                        <div className="font-medium">{vendor.name || vendor.displayName || vendor.email || 'Unknown Vendor'}</div>
                                        {vendor.email && <div className="text-xs text-gray-500">{vendor.email}</div>}
                                    </div>
                                ))
                            ) : (
                                <div className="px-3 py-2 text-gray-500">
                                    No vendors match your search
                                </div>
                            )}
                        </div>
                    )}
                    
                    {/* Show selected vendor */}
                    {assignedVendorId && (
                        <p className="mt-1 text-sm text-emerald-600">
                            Selected: {vendors.find(v => v.id === assignedVendorId || v._id === assignedVendorId)?.name || assignedVendorId}
                            <span className="ml-2 text-xs text-gray-500">(Vendor ID: {assignedVendorId})</span>
                        </p>
                    )}
                    
                    {/* Hidden input for form validation */}
                    <input 
                        type="hidden" 
                        name="assignedVendorId" 
                        value={assignedVendorId} 
                        required 
                    />
                    
                    {/* Direct input for vendor ID (for testing) */}
                    <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-md">
                        <p className="text-sm font-medium text-blue-800 mb-2">Manual Vendor ID Entry (for testing)</p>
                        <p className="text-xs text-red-600 mb-2">IMPORTANT: Enter the vendor's ID, not their email address!</p>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                placeholder="Enter vendor ID (not email)"
                                value={assignedVendorId || ''}
                                onChange={(e) => {
                                    const value = e.target.value;
                                    // Warn if it looks like an email
                                    if (value.includes('@')) {
                                        console.warn("Warning: This looks like an email address, not a vendor ID");
                                    }
                                    setAssignedVendorId(value);
                                }}
                                className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 text-sm"
                            />
                            <button 
                                type="button"
                                onClick={() => {
                                    if (assignedVendorId) {
                                        setVendorSearch(`Vendor ID: ${assignedVendorId}`);
                                    }
                                }}
                                className="px-3 py-2 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 text-sm"
                            >
                                Use This ID
                            </button>
                        </div>
                        <p className="text-xs text-blue-600 mt-1">
                            You can paste a vendor ID here directly if you know it.
                        </p>
                    </div>
                </div>

                 {/* BOQ File (Required File Input) */}
                <div>
                    <label htmlFor="boqFile" className="block text-sm font-medium text-gray-700">BOQ File <span className="text-red-500">*</span></label>
                    <input
                        type="file"
                        id="boqFile"
                        onChange={handleFileChange}
                        required={!boqFileUrl}
                        className="mt-1 block w-full text-sm text-gray-500
                                   file:mr-4 file:py-2 file:px-4
                                   file:rounded-md file:border-0
                                   file:text-sm file:font-semibold
                                   file:bg-emerald-50 file:text-emerald-700
                                   hover:file:bg-emerald-100"
                    />
                    {boqFileName && !boqFileUrl && <p className="text-sm text-gray-600 mt-1">Selected: {boqFileName}</p>}
                    {isUploading && <p className="text-sm text-blue-600 mt-1">Uploading file...</p>}
                     {boqFileUrl && <p className="text-sm text-green-600 mt-1">File uploaded: <a href={boqFileUrl} target="_blank" rel="noopener noreferrer" className="underline">{boqFileName || 'View File'}</a></p>}
                 </div>

                {/* Submit Button */}
                <div>
                    <button
                        type="submit"
                        disabled={isSubmitting || isUploading}
                        className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white transition-colors ${
                            (isSubmitting || isUploading)
                                ? 'bg-gray-400 cursor-not-allowed'
                                : 'bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500'
                        }`}
                    >
                        {isSubmitting ? 'Submitting Lead...' : (isUploading ? 'Waiting for Upload...' : 'Submit Project Lead')}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default ProjectLeadForm;
import React, { useContext, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronLeftIcon } from '@heroicons/react/24/solid';
import { VendorContext } from '../../context/VendorContext';
import config from '../../config/env';

const API_PATH = '/api/referral-leads';

const NewLeadsPage = () => {
    const navigate = useNavigate();
    const { currentUser } = useContext(VendorContext);

    const referrerVendorId = useMemo(() => {
        if (!currentUser) return null;
        return currentUser.vendorId || currentUser.id || null;
    }, [currentUser]);

    const [leadType, setLeadType] = useState('project');

    const [contactName, setContactName] = useState('');
    const [contactEmail, setContactEmail] = useState('');
    const [contactPhone, setContactPhone] = useState('');

    const [companyName, setCompanyName] = useState('');
    const [location, setLocation] = useState('');

    const [projectName, setProjectName] = useState('');
    const [projectDescription, setProjectDescription] = useState('');
    const [estimatedBudget, setEstimatedBudget] = useState('');
    const [timeline, setTimeline] = useState('');

    const [notes, setNotes] = useState('');

    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);

    const validate = () => {
        if (!referrerVendorId) return 'You must be logged in as a vendor to send leads.';
        if (!leadType) return 'Please select a lead type.';
        if (!contactName.trim()) return 'Please enter a contact name.';
        if (!contactEmail.trim() && !contactPhone.trim()) return 'Please enter at least an email or phone number.';
        if (leadType === 'project' && !projectName.trim()) return 'Please enter a project name.';
        return null;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);

        const validationError = validate();
        if (validationError) {
            setError(validationError);
            return;
        }

        const payload = {
            leadType,
            referrerVendorId,
            contact: {
                name: contactName.trim(),
                email: contactEmail.trim() || null,
                phone: contactPhone.trim() || null,
            },
            companyName: companyName.trim() || null,
            location: location.trim() || null,
            project: leadType === 'project'
                ? {
                      name: projectName.trim(),
                      description: projectDescription.trim() || null,
                      estimatedBudget: estimatedBudget.trim() || null,
                      timeline: timeline.trim() || null,
                  }
                : null,
            notes: notes.trim() || null,
            createdAt: new Date().toISOString(),
        };

        try {
            setSubmitting(true);
            const response = await fetch(`${config.VENDOR_BACKEND_URL}${API_PATH}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(payload),
            });

            const data = await response.json().catch(() => null);

            if (!response.ok) {
                const message = data?.error || data?.message || `HTTP error! Status: ${response.status}`;
                throw new Error(message);
            }

            if (data && data.success === false) {
                throw new Error(data.error || 'Failed to submit lead');
            }

            navigate('/VendorDashboard/leads/sent', {
                replace: true,
                state: {
                    successMessage: 'Lead sent successfully.',
                },
            });
        } catch (err) {
            console.error('❌ Failed to submit referral lead:', err);
            setError(err?.message || 'Failed to submit lead. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="p-4 sm:p-5 space-y-6">
            <div className="mb-2 flex items-center justify-between gap-3">
                <Link to="/VendorDashboard/leads" className="flex items-center text-lg font-medium text-gray-700 hover:text-black">
                    <ChevronLeftIcon className="mr-2 h-5 w-5" />
                    Back to Leads
                </Link>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6">
                <div className="mb-6">
                    <h1 className="text-xl font-semibold text-gray-900">Send Leads</h1>
                    <p className="text-sm text-gray-600 mt-1">
                        Submit a new lead for the team. This will be stored in a separate table (referral leads), not the PM leads list.
                    </p>
                </div>

                {error && (
                    <div className="mb-4 p-3 rounded-lg border border-red-200 bg-red-50 text-sm text-red-700">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Lead Type</label>
                        <select
                            value={leadType}
                            onChange={(e) => setLeadType(e.target.value)}
                            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        >
                            <option value="vendor">Vendor Lead</option>
                            <option value="client">Client Lead</option>
                            <option value="project">Project Lead</option>
                            <option value="other">Other</option>
                        </select>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Contact Name</label>
                            <input
                                value={contactName}
                                onChange={(e) => setContactName(e.target.value)}
                                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                placeholder="e.g. John Doe"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Company / Organization</label>
                            <input
                                value={companyName}
                                onChange={(e) => setCompanyName(e.target.value)}
                                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                placeholder="e.g. ABC Constructions"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                            <input
                                value={contactEmail}
                                onChange={(e) => setContactEmail(e.target.value)}
                                type="email"
                                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                placeholder="e.g. john@company.com"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                            <input
                                value={contactPhone}
                                onChange={(e) => setContactPhone(e.target.value)}
                                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                placeholder="e.g. +91 9xxxx xxxxx"
                            />
                        </div>
                        <div className="sm:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                            <input
                                value={location}
                                onChange={(e) => setLocation(e.target.value)}
                                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                placeholder="e.g. Hyderabad, Telangana"
                            />
                        </div>
                    </div>

                    {leadType === 'project' && (
                        <div className="border border-gray-200 rounded-lg p-4 space-y-4">
                            <h2 className="text-sm font-semibold text-gray-900">Project Details</h2>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Project Name</label>
                                <input
                                    value={projectName}
                                    onChange={(e) => setProjectName(e.target.value)}
                                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                    placeholder="e.g. Road Construction"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Project Description</label>
                                <textarea
                                    value={projectDescription}
                                    onChange={(e) => setProjectDescription(e.target.value)}
                                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                    rows={4}
                                    placeholder="Brief scope / requirements"
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Estimated Budget</label>
                                    <input
                                        value={estimatedBudget}
                                        onChange={(e) => setEstimatedBudget(e.target.value)}
                                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                        placeholder="e.g. ₹10 Cr"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Timeline</label>
                                    <input
                                        value={timeline}
                                        onChange={(e) => setTimeline(e.target.value)}
                                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                        placeholder="e.g. 6 months"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            rows={3}
                            placeholder="Any additional context"
                        />
                    </div>

                    <div className="flex items-center justify-end gap-3">
                        <Link
                            to="/VendorDashboard/leads"
                            className="px-4 py-2 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50 text-sm"
                        >
                            Cancel
                        </Link>
                        <button
                            type="submit"
                            disabled={submitting}
                            className="px-4 py-2 rounded-md bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60 text-sm"
                        >
                            {submitting ? 'Submitting...' : 'Submit Lead'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default NewLeadsPage;

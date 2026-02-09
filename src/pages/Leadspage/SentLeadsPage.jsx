import React, { useContext, useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronLeftIcon } from '@heroicons/react/24/solid';
import { VendorContext } from '../../context/VendorContext';
import config from '../../config/env';

const API_PATH = '/api/referral-leads';

const formatDateTime = (iso) => {
    if (!iso) return '';
    try {
        return new Date(iso).toLocaleString();
    } catch {
        return String(iso);
    }
};

const SentLeadsPage = () => {
    const { currentUser } = useContext(VendorContext);
    const location = useLocation();

    const referrerVendorId = useMemo(() => {
        if (!currentUser) return null;
        return currentUser.vendorId || currentUser.id || null;
    }, [currentUser]);

    const [leads, setLeads] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [nextToken, setNextToken] = useState(null);
    const [hasMore, setHasMore] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);

    const successMessage = location?.state?.successMessage || null;

    const fetchPage = async (token, append) => {
        if (!referrerVendorId) {
            setError('You must be logged in to view sent leads.');
            setLoading(false);
            return;
        }

        const params = new URLSearchParams();
        params.set('referrerVendorId', referrerVendorId);
        params.set('limit', '20');
        if (token) params.set('nextToken', token);

        const response = await fetch(`${config.VENDOR_BACKEND_URL}${API_PATH}?${params.toString()}`, {
            method: 'GET',
            credentials: 'include',
        });

        const data = await response.json().catch(() => null);

        if (!response.ok) {
            const message = data?.error || data?.message || `HTTP error! Status: ${response.status}`;
            throw new Error(message);
        }

        if (data && data.success === false) {
            throw new Error(data.error || 'Failed to load sent leads');
        }

        const newLeads = Array.isArray(data?.leads) ? data.leads : [];

        setLeads(prev => (append ? [...prev, ...newLeads] : newLeads));
        setNextToken(data?.nextToken || null);
        setHasMore(Boolean(data?.hasMore));
    };

    useEffect(() => {
        let cancelled = false;

        (async () => {
            try {
                setLoading(true);
                setError(null);
                if (!cancelled) {
                    await fetchPage(null, false);
                }
            } catch (err) {
                console.error('❌ Failed to fetch sent leads:', err);
                if (!cancelled) setError(err?.message || 'Failed to load sent leads.');
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [referrerVendorId]);

    const handleLoadMore = async () => {
        if (!nextToken || loadingMore) return;
        try {
            setLoadingMore(true);
            await fetchPage(nextToken, true);
        } catch (err) {
            console.error('❌ Failed to load more sent leads:', err);
            setError(err?.message || 'Failed to load more leads.');
        } finally {
            setLoadingMore(false);
        }
    };

    return (
        <div className="p-4 sm:p-5 space-y-6">
            <div className="mb-2 flex items-center justify-between gap-3">
                <Link to="/VendorDashboard/leads" className="flex items-center text-lg font-medium text-gray-700 hover:text-black">
                    <ChevronLeftIcon className="mr-2 h-5 w-5" />
                    Back to Leads
                </Link>

                <div className="flex items-center gap-2">
                    <Link
                        to="/VendorDashboard/leads/newleads"
                        className="px-4 py-2 rounded-md bg-emerald-600 text-white hover:bg-emerald-700 text-sm font-medium"
                    >
                        Send Leads
                    </Link>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6">
                <div className="mb-6">
                    <h1 className="text-xl font-semibold text-gray-900">Sent Leads</h1>
                    <p className="text-sm text-gray-600 mt-1">All leads you have submitted.</p>
                </div>

                {successMessage && (
                    <div className="mb-4 p-3 rounded-lg border border-emerald-200 bg-emerald-50 text-sm text-emerald-700">
                        {successMessage}
                    </div>
                )}

                {loading ? (
                    <div className="flex justify-center items-center py-12">
                        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
                    </div>
                ) : error ? (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-8 rounded-lg text-center">
                        <p>{error}</p>
                    </div>
                ) : leads.length === 0 ? (
                    <div className="bg-gray-50 border border-gray-200 text-gray-700 px-4 py-10 rounded-lg text-center">
                        <p>No sent leads found.</p>
                        <p className="mt-2 text-sm text-gray-500">Use “Send Leads” to submit your first lead.</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {leads.map((lead) => (
                            <div key={`${lead.referrerVendorId}-${lead.createdAt}`} className="border border-gray-200 rounded-lg p-4">
                                <div className="flex flex-wrap items-start justify-between gap-2">
                                    <div>
                                        <div className="text-sm font-semibold text-gray-900">
                                            {lead?.project?.name ? lead.project.name : (lead?.companyName || 'Lead')}
                                        </div>
                                        <div className="text-xs text-gray-600 mt-1">
                                            <span className="font-medium">Type:</span> {lead.leadType || '-'}
                                            <span className="mx-2">•</span>
                                            <span className="font-medium">Status:</span> {lead.status || 'new'}
                                        </div>
                                    </div>
                                    <div className="text-xs text-gray-500">{formatDateTime(lead.createdAt)}</div>
                                </div>

                                <div className="mt-3 text-sm text-gray-700">
                                    <div>
                                        <span className="font-medium">Contact:</span> {lead?.contact?.name || '-'}
                                        {lead?.contact?.email ? <span className="text-gray-600"> • {lead.contact.email}</span> : null}
                                        {lead?.contact?.phone ? <span className="text-gray-600"> • {lead.contact.phone}</span> : null}
                                    </div>
                                    {lead.location ? (
                                        <div className="mt-1">
                                            <span className="font-medium">Location:</span> {lead.location}
                                        </div>
                                    ) : null}
                                    {lead?.project?.description ? (
                                        <div className="mt-2 text-sm text-gray-600">{lead.project.description}</div>
                                    ) : null}
                                </div>
                            </div>
                        ))}

                        {hasMore && (
                            <div className="pt-2 flex justify-center">
                                <button
                                    onClick={handleLoadMore}
                                    disabled={loadingMore}
                                    className="px-4 py-2 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50 text-sm disabled:opacity-60"
                                >
                                    {loadingMore ? 'Loading...' : 'Load more'}
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default SentLeadsPage;

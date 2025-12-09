import React, { useState, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import Highlighter from "react-highlight-words";
import { ArrowPathIcon as LoadingIcon, MagnifyingGlassIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'; // Adjusted icons
import config from '../../config/env';


const SearchResultsPage = () => {
    const [results, setResults] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const location = useLocation(); // Get location object
    const searchQuery = new URLSearchParams(location.search).get('q') || ''; // Extract 'q' parameter and ensure it's always a string

    // Split the search query into words for better highlighting
    // This handles searches like "alpha tower" by highlighting both words.
    const searchWords = searchQuery.split(' ').filter(word => word.length > 0);

    useEffect(() => {
        const fetchSearchResults = async () => {
            if (!searchQuery || searchQuery.trim() === '') {
                setResults([]); // Clear results if query is empty
                return;
            }

            setIsLoading(true);
            setError(null);
            setResults([]); // Clear previous results

            try {
                const response = await fetch(`${config.VENDOR_BACKEND_URL}/api/search?q=${encodeURIComponent(searchQuery)}`);
                if (!response.ok) {
                    let errorMsg = `Search failed! status: ${response.status}`;
                    try { const errData = await response.json(); errorMsg = errData.message || errData.error || errorMsg; } catch (_) { }
                    throw new Error(errorMsg);
                }
                const data = await response.json();
                setResults(data);
            } catch (e) {
                console.error("Failed to fetch search results:", e);
                setError(e.message || 'Failed to load search results.');
            } finally {
                setIsLoading(false);
            }
        };

        fetchSearchResults();
    }, [searchQuery]); // Re-run effect when searchQuery changes

    return (
        <div className="p-4 sm:p-6 space-y-6 max-w-4xl mx-auto">
            <h1 className="text-2xl font-semibold text-gray-800 flex items-center gap-2">
                <MagnifyingGlassIcon className="h-6 w-6 text-gray-500" />
                Search Results
            </h1>

            {searchQuery && (
                <p className="text-gray-600">
                    Showing results for: <strong className="text-emerald-700">"{searchQuery}"</strong>
                </p>
            )}

            {isLoading && (
                <div className="text-center py-10 text-gray-500 flex items-center justify-center gap-2">
                    <LoadingIcon className="h-5 w-5 animate-spin" /> Searching...
                </div>
            )}

            {error && (
                <div className="text-center py-10 text-red-600 bg-red-50 p-4 rounded-lg flex items-center justify-center gap-2">
                    <ExclamationTriangleIcon className="h-5 w-5" /> Error: {error}
                </div>
            )}

            {!isLoading && !error && results.length === 0 && searchQuery && (
                <div className="text-center py-10 text-gray-500">
                    No results found for "{searchQuery}". Try different keywords.
                </div>
            )}

            {!isLoading && !error && results.length > 0 && (
                <div className="space-y-4">
                    {results.map((item) => (
                        <div key={`${item.resultType}-${item.CGP001 || item.leadId}`} className="bg-white p-4 rounded-lg shadow border border-gray-200/80 break-words">
                            {item.resultType === 'project' && (
                                <div>
                                    <div className="flex justify-between items-start gap-2 mb-1">
                                        <h3 className="text-lg font-semibold text-gray-800">
                                            <Highlighter
                                                highlightClassName="bg-yellow-200 font-semibold px-0.5"
                                                searchWords={searchWords}
                                                autoEscape={true}
                                                textToHighlight={item.name || 'Unnamed Project'}
                                            />
                                        </h3>
                                        <span className="text-xs font-medium bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full flex-shrink-0">Project</span>
                                    </div>
                                    <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                                        <Highlighter
                                            highlightClassName="bg-yellow-200 font-semibold px-0.5"
                                            searchWords={searchWords}
                                            autoEscape={true}
                                            textToHighlight={item.description || 'No description.'}
                                        />
                                    </p>
                                    <div className="text-xs text-gray-500 mt-2 flex flex-wrap gap-x-3 gap-y-1">
                                        <span>ID: <Highlighter highlightClassName="bg-yellow-200 font-semibold px-0.5" searchWords={searchWords} autoEscape={true} textToHighlight={item.CGP001 || ''} /></span>
                                        <span>Client: <Highlighter highlightClassName="bg-yellow-200 font-semibold px-0.5" searchWords={searchWords} autoEscape={true} textToHighlight={item.clientId || ''} /></span>
                                        <span>Status: {item.status || 'N/A'}</span>
                                    </div>
                                    {/* Link to project detail page if available, otherwise just display info */}
                                    {/* <Link to={`/projects/${item.CGP001}`} className="text-sm text-emerald-600 hover:underline mt-2 inline-block">View Project</Link> */}
                                </div>
                            )}
                            {item.resultType === 'lead' && (
                                <div>
                                    <div className="flex justify-between items-start gap-2 mb-1">
                                        <h3 className="text-lg font-semibold text-gray-800">
                                            <Highlighter
                                                highlightClassName="bg-yellow-200 font-semibold px-0.5"
                                                searchWords={searchWords}
                                                autoEscape={true}
                                                textToHighlight={item.name || 'Unnamed Lead'}
                                            />
                                        </h3>
                                        <span className="text-xs font-medium bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full flex-shrink-0">Lead</span>
                                    </div>
                                    <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                                        <Highlighter
                                            highlightClassName="bg-yellow-200 font-semibold px-0.5"
                                            searchWords={searchWords}
                                            autoEscape={true}
                                            textToHighlight={item.description || 'No description.'}
                                        />
                                    </p>
                                     <div className="text-xs text-gray-500 mt-2 flex flex-wrap gap-x-3 gap-y-1">
                                        <span>ID: <Highlighter highlightClassName="bg-yellow-200 font-semibold px-0.5" searchWords={searchWords} autoEscape={true} textToHighlight={item.leadId || ''} /></span>
                                        <span>Client: <Highlighter highlightClassName="bg-yellow-200 font-semibold px-0.5" searchWords={searchWords} autoEscape={true} textToHighlight={item.clientId || ''} /></span>
                                        <span>Status: {item.status ?? 'Pending'}</span> {/* Handle null status */}
                                    </div>
                                    <Link to={`/leads/${item.leadId}`} className="text-sm text-emerald-600 hover:underline mt-2 inline-block">View Lead</Link>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default SearchResultsPage; // Ensure default export

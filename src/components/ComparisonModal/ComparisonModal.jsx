import React from 'react';
import { Link } from 'react-router-dom';
import { XMarkIcon } from '@heroicons/react/24/solid';

// Simple placeholder for parsing strengths/weaknesses (can be expanded)
const getStrengths = (lead, allLeads) => {
    const strengths = [];
    
    // Compare budget with others
    const budgetValue = parseFloat(lead.budget?.replace(/[^0-9.-]+/g, '') || 0);
    const avgBudget = allLeads.reduce((sum, l) => sum + parseFloat(l.budget?.replace(/[^0-9.-]+/g, '') || 0), 0) / allLeads.length;
    
    if (budgetValue < avgBudget) {
        strengths.push('Lower than average budget');
    }
    
    // Compare duration with others
    const durationValue = parseFloat(lead.duration?.replace(/[^0-9.-]+/g, '') || 0);
    const avgDuration = allLeads.reduce((sum, l) => sum + parseFloat(l.duration?.replace(/[^0-9.-]+/g, '') || 0), 0) / allLeads.length;
    
    if (durationValue < avgDuration) {
        strengths.push('Shorter timeline');
    }
    
    // Add some default strengths if we don't have any
    if (strengths.length === 0) {
        strengths.push('Experienced team', 'Previous similar projects');
    }
    
    return strengths;
};

const getWeaknesses = (lead, allLeads) => {
    const weaknesses = [];
    
    // Compare budget with others
    const budgetValue = parseFloat(lead.budget?.replace(/[^0-9.-]+/g, '') || 0);
    const avgBudget = allLeads.reduce((sum, l) => sum + parseFloat(l.budget?.replace(/[^0-9.-]+/g, '') || 0), 0) / allLeads.length;
    
    if (budgetValue > avgBudget) {
        weaknesses.push('Higher than average budget');
    }
    
    // Compare duration with others
    const durationValue = parseFloat(lead.duration?.replace(/[^0-9.-]+/g, '') || 0);
    const avgDuration = allLeads.reduce((sum, l) => sum + parseFloat(l.duration?.replace(/[^0-9.-]+/g, '') || 0), 0) / allLeads.length;
    
    if (durationValue > avgDuration) {
        weaknesses.push('Longer timeline');
    }
    
    // Add some default weaknesses if we don't have any
    if (weaknesses.length === 0) {
        weaknesses.push('Limited resources', 'No previous similar projects');
    }
    
    return weaknesses;
};


const ComparisonModal = ({ isOpen, onClose, selectedLeadsData = [], recommendedLead = null }) => {
    if (!isOpen || !selectedLeadsData || selectedLeadsData.length < 2) {
        return null; // Don't render if not open or not enough data
    }

    return (
        // Modal Overlay
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4"
            onClick={onClose} // Close modal on overlay click
        >
            {/* Modal Content */}
            <div
                className="bg-surface rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto"
                onClick={e => e.stopPropagation()} // Prevent closing when clicking inside modal content
            >
                {/* Modal Header */}
                <div className="flex justify-between items-center p-4 sm:p-6 border-b border-line">
                    <div>
                        <h2 className="text-xl font-semibold text-ink">Project Comparison</h2>
                        <p className="text-sm text-dim mt-1">Comparing {selectedLeadsData.length} project leads</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-dim hover:text-dim p-1 rounded-full hover:bg-surface-hover"
                        aria-label="Close comparison modal"
                    >
                        <XMarkIcon className="h-6 w-6" />
                    </button>
                </div>

                {/* Comparison Table Container */}
                <div className="p-4 sm:p-6">
                    <div className="overflow-x-auto"> {/* Make table scrollable on small screens */}
                        <table className="min-w-full divide-y divide-line">
                            {/* Table Header */}
                            <thead>
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-bold text-dim uppercase tracking-wider w-1/4">Project</th>
                                    <th className="px-4 py-3 text-left text-xs font-bold text-dim uppercase tracking-wider w-1/6">Budget</th>
                                    <th className="px-4 py-3 text-left text-xs font-bold text-dim uppercase tracking-wider w-1/6">Timeline</th>
                                    <th className="px-4 py-3 text-left text-xs font-bold text-dim uppercase tracking-wider w-1/4">Strengths</th>
                                    <th className="px-4 py-3 text-left text-xs font-bold text-dim uppercase tracking-wider w-1/4">Weaknesses</th>
                                </tr>
                            </thead>
                            {/* Table Body */}
                            <tbody className="bg-surface divide-y divide-line">
                                {selectedLeadsData.map((lead) => {
                                    const isRecommended = recommendedLead && recommendedLead._id === lead._id;
                                    const strengths = getStrengths(lead, selectedLeadsData);
                                    const weaknesses = getWeaknesses(lead, selectedLeadsData);

                                    return (
                                        <tr key={lead._id} className={`${isRecommended ? 'bg-cta' : ''}`}>
                                            {/* Project Name */}
                                            <td className="px-4 py-4 whitespace-nowrap align-top">
                                                <div className="text-sm font-medium text-ink">{lead.name || 'N/A'}</div>
                                                {isRecommended && (
                                                    <span className="mt-1 inline-block bg-surface-hover text-ink text-xs font-semibold px-2 py-0.5 rounded-full">
                                                        Recommended
                                                    </span>
                                                )}
                                            </td>
                                            {/* Budget */}
                                            <td className="px-4 py-4 whitespace-nowrap text-sm text-ink align-top">{lead.budget || 'N/A'}</td>
                                            {/* Timeline */}
                                            <td className="px-4 py-4 whitespace-nowrap text-sm text-ink align-top">{lead.duration || 'N/A'}</td>
                                            {/* Strengths */}
                                            <td className="px-4 py-4 text-sm text-ink align-top">
                                                <ul className="space-y-1">
                                                    {strengths.map((strength, index) => (
                                                        <li key={index} className="flex items-start">
                                                            <span className="text-success mr-1.5 mt-0.5">✓</span>
                                                            <span>{strength}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </td>
                                            {/* Weaknesses */}
                                            <td className="px-4 py-4 text-sm text-ink align-top">
                                                <ul className="space-y-1">
                                                    {weaknesses.map((weakness, index) => (
                                                        <li key={index} className="flex items-start">
                                                            <span className="text-danger mr-1.5 mt-0.5">×</span>
                                                            <span>{weakness}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Recommendation Box */}
                {recommendedLead && (
                    <div className="m-4 sm:m-6 p-4 border border-line bg-cta rounded-lg">
                        <h3 className="text-lg font-semibold text-ink mb-2">Recommendation</h3>
                        <p className="text-sm text-dim mb-3">
                            Based on budget efficiency and timeline, <strong>{recommendedLead.name}</strong> is recommended for this project.
                        </p>
                        <div className="text-sm font-medium text-ink flex gap-2">
                            <Link 
                                to={`/VendorDashboard/leads/${recommendedLead._id}`} 
                                className="px-3 py-1.5 bg-cta hover:bg-cta text-cta-foreground text-sm font-medium rounded-md"
                                onClick={onClose}
                            >
                                View Lead Details
                            </Link>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ComparisonModal;
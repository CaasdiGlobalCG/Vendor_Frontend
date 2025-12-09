import React from 'react';
import { useNavigate } from 'react-router-dom';
// Using ArchiveBoxXMarkIcon for "no leads" and ExclamationTriangleIcon for errors
import { ArchiveBoxXMarkIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

const EmptyStateDisplay = ({
    message,
    type = 'empty', // 'empty' or 'error'
    showGoBackButton = true,
    showRequestButton = true, // Decide if you need this button
    goBackPath = "/", // Default path for "Go back"
    onRequestClick = () => alert('Request Action Placeholder'), // Placeholder action
}) => {
    const navigate = useNavigate();

    const IconComponent = type === 'error' ? ExclamationTriangleIcon : ArchiveBoxXMarkIcon;
    const iconColor = type === 'error' ? 'text-red-500' : 'text-emerald-600'; // Adjust colors as needed

    const handleGoBack = () => {
        navigate(goBackPath);
    };

    return (
        <div className="flex flex-col items-center justify-center text-center py-16 sm:py-24 px-4">
            {/* Icon */}
            <IconComponent
                className={`h-16 w-16 sm:h-20 sm:w-20 mb-6 ${iconColor}`}
                aria-hidden="true"
            />

            {/* Message */}
            <p className="text-base sm:text-lg font-medium text-gray-700 mb-8">
                {message || 'Oops..! Something went wrong.'}
            </p>

            {/* Buttons */}
            <div className="flex flex-col sm:flex-row items-center gap-4">
                {showGoBackButton && (
                    <button
                        onClick={handleGoBack}
                        className="w-full sm:w-auto px-6 py-2.5 border border-emerald-600 text-emerald-700 bg-white rounded-md text-sm font-medium hover:bg-emerald-50 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
                    >
                        Go back
                    </button>
                )}
                {showRequestButton && (
                    <button
                        onClick={onRequestClick}
                        className="w-full sm:w-auto px-6 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-md text-sm font-medium shadow-sm hover:from-emerald-600 hover:to-teal-700 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
                    >
                        Request {/* Or change text based on context */}
                    </button>
                )}
            </div>
        </div>
    );
};

export default EmptyStateDisplay;

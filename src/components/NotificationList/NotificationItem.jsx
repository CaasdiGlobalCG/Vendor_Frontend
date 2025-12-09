import React, { useState, useRef, useEffect } from "react";
import { Link } from 'react-router-dom';

export default function NotificationItem({ notification, onDelete, onMarkImportant, onSave, onMarkRead }) {
  // Destructure notification props with fallbacks
  const { 
    id, 
    title = 'Notification', 
    message = 'No details available', 
    time = 'Recently', 
    sender = 'System', 
    avatar = 'https://via.placeholder.com/40/CBD5E0/4A5568?text=N', 
    icon = '', 
    badge, 
    isImportant = false, 
    isSaved = false, 
    isRead = false, 
    link, 
    isPending = false 
  } = notification || {};
  
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);
  
  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    }
    
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [dropdownRef]);
  
  // Handle option clicks
  const handleOptionClick = (action) => {
    switch(action) {
      case 'mark-important':
        onMarkImportant(id);
        break;
      case 'save':
        onSave(id);
        break;
      case 'delete':
        onDelete(id);
        break;
      default:
        console.log(`Unknown action: ${action}`);
    }
    setShowDropdown(false);
  };
  
  // Handler for the dropdown toggle button
  const handleToggleDropdown = (event) => {
    // Prevent the click from bubbling up to the Link element
    event.stopPropagation();
    // Prevent the default link navigation behavior just in case
    event.preventDefault();
    setShowDropdown(!showDropdown);
  };
  
  // Handle notification click (for marking as read)
  const handleNotificationClick = () => {
    if (!isRead && onMarkRead) {
      onMarkRead(id);
    }
  };
  
  // Debug log
  console.log("NotificationItem:", { id, title, isRead, isPending });
  
  // Create the core content of the notification item
  const itemContent = (
    <div className="flex items-start">
      <div className="relative mr-4">
        <div className="w-10 h-10 rounded-full overflow-hidden">
          <img src={avatar} alt={sender} className="w-full h-full object-cover" />
        </div>
        {icon && (
          <div className="absolute bottom-0 left-0 w-6 h-6 bg-cover bg-no-repeat" style={{ backgroundImage: `url(${icon})` }}></div>
        )}
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex flex-col md:flex-row md:items-center">
          <div className="flex items-center">
            {isImportant && (
              <span className="mr-2 text-yellow-500">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                  <path fillRule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z" clipRule="evenodd" />
                </svg>
              </span>
            )}
            {isSaved && (
              <span className="mr-2 text-blue-500">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                  <path fillRule="evenodd" d="M6.32 2.577a49.255 49.255 0 0111.36 0c1.497.174 2.57 1.46 2.57 2.93V21a.75.75 0 01-1.085.67L12 18.089l-7.165 3.583A.75.75 0 013.75 21V5.507c0-1.47 1.073-2.756 2.57-2.93z" clipRule="evenodd" />
                </svg>
              </span>
            )}
            <h3 className={`font-['Poppins'] text-base md:text-lg ${isRead ? 'font-normal text-gray-700' : 'font-semibold text-black'}`}>
              {title}
            </h3>
            {!isRead && (
              <span className="ml-2 w-2 h-2 bg-blue-600 rounded-full flex-shrink-0"></span>
            )}
          </div>
          
          <div className="flex mt-1 md:mt-0 md:ml-auto items-center gap-1">
            {badge && (
              <span 
                className="inline-block px-2 py-0.5 text-xs rounded mr-2"
                style={{ backgroundColor: badge.color || '#fefcbf', color: badge.textColor || '#744210' }}
              >
                {badge.text}
              </span>
            )}
            <span className="font-['Poppins'] text-xs text-gray-500">{time}</span>
            <div className="relative ml-2" ref={dropdownRef}>
              <button 
                className="p-1.5 hover:bg-gray-100 rounded-full focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-gray-400"
                onClick={handleToggleDropdown}
                title="Actions"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-4 h-4 text-gray-500">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                </svg>
              </button>
              
              {showDropdown && (
                <div className="absolute right-0 top-full z-30 mt-1 w-56 bg-white rounded-md shadow-lg border border-gray-100 focus:outline-none">
                  <ul className="py-1">
                    <li>
                      <button 
                        className="w-full text-left px-3 py-1.5 hover:bg-gray-100 font-['Poppins'] text-sm flex items-center text-gray-700"
                        onClick={(e) => {e.stopPropagation(); handleOptionClick('mark-important');}}
                      >
                        {isImportant ? (
                          <>
                            <span className="text-yellow-500 mr-2">
                              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                                <path fillRule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z" clipRule="evenodd" />
                              </svg>
                            </span>
                            Remove from important
                          </>
                        ) : "Mark as important"}
                      </button>
                    </li>
                    <li className="border-t border-gray-100">
                      <button 
                        className="w-full text-left px-3 py-1.5 hover:bg-gray-100 font-['Poppins'] text-sm flex items-center text-gray-700"
                        onClick={(e) => {e.stopPropagation(); handleOptionClick('save');}}
                      >
                        {isSaved ? (
                          <>
                            <span className="text-blue-500 mr-2">
                              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                                <path fillRule="evenodd" d="M6.32 2.577a49.255 49.255 0 0111.36 0c1.497.174 2.57 1.46 2.57 2.93V21a.75.75 0 01-1.085.67L12 18.089l-7.165 3.583A.75.75 0 013.75 21V5.507c0-1.47 1.073-2.756 2.57-2.93z" clipRule="evenodd" />
                              </svg>
                            </span>
                            Unsave notification
                          </>
                        ) : "Save notification"}
                      </button>
                    </li>
                    <li className="border-t border-gray-100">
                      <button 
                        className="w-full text-left px-3 py-1.5 hover:bg-gray-100 font-['Poppins'] text-sm text-red-600 flex items-center"
                        onClick={(e) => {e.stopPropagation(); handleOptionClick('delete');}}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 mr-2 text-red-500">
                          <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.58.22-2.326.419C2.675 4.793 2 5.51 2 6.317v8.836A2.848 2.848 0 0 0 4.848 18h10.304A2.848 2.848 0 0 0 18 15.153V6.317c0-.808-.675-1.524-1.674-1.707-.746-.199-1.531-.342-2.326-.42v-.443A2.75 2.75 0 0 0 11.25 1h-2.5ZM7.5 3.75c0-.69.56-1.25 1.25-1.25h2.5c.69 0 1.25.56 1.25 1.25V4h-5v-.25Zm-1.39 9.012a.75.75 0 0 1 .2-1.04l4-3.25a.75.75 0 0 1 1.04.2l4 3.25a.75.75 0 0 1-.84 1.208L11.5 11.183v4.067a.75.75 0 0 1-1.5 0v-4.067L6.93 12.98a.75.75 0 0 1-1.04-.2Z" clipRule="evenodd" />
                        </svg>
                        Delete notification
                      </button>
                    </li>
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
        
        <p className={`mt-1 font-['Poppins'] text-sm ${isRead ? 'text-gray-600' : 'text-gray-900'}`}>
          {message}
        </p>
        
        {/* Action Buttons for Pending Leads */}
        {isPending && (
          <div className="mt-3 flex gap-2">
            <Link 
              to={link} 
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-emerald-500"
              onClick={(e) => {
                e.stopPropagation();
                if (!isRead && onMarkRead) {
                  onMarkRead(id);
                }
              }}
            >
              Review Lead
            </Link>
          </div>
        )}
      </div>
    </div>
  );

  // Conditionally wrap content in Link or just render in li
  return (
    <li 
      className={`py-4 px-3 sm:px-4 list-none ${isPending ? 'bg-red-50' : isImportant ? 'bg-yellow-50' : isRead ? '' : 'bg-blue-50/30'} ${link ? 'hover:bg-gray-50 transition-colors duration-150 cursor-pointer rounded-md' : ''}`}
      onClick={handleNotificationClick}
    >
      {link ? (
        <Link to={link} className="block w-full h-full">
          {itemContent}
        </Link>
      ) : (
        itemContent
      )}
    </li>
  );
}

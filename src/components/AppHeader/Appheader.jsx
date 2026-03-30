// ... existing code ...

import React, { useContext, useEffect, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Award, Share2, Settings } from 'lucide-react';
import ResponsiveNavigationTabs from './tabNavigation';
import { VendorContext } from '../../context/VendorContext';
import { Home } from 'lucide-react';

export default function AppHeader() {
  const navigate = useNavigate();
  const location = useLocation();
  const { vendorData, currentUser } = useContext(VendorContext);
  const [isCompact, setIsCompact] = useState(false);
  const gstNumber = vendorData?.companyDetails?.gstNumber
    || vendorData?.vendorDetails?.gstin
    || vendorData?.companyDetails?.taxIdentificationNumber
    || currentUser?.gstin
    || 'Not Available';

  useEffect(() => {
    const handleScroll = () => {
      setIsCompact(window.scrollY > 48);
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navigateTo = (path) => {
    navigate(path);
  };

  const handleShare = () => {
    navigate('/share');
  };

  return (
    <section
      className={`sticky top-0 z-50 mx-4 mt-4 overflow-hidden bg-gradient-to-r from-[#095B49] to-[#000000] text-white shadow-lg transition-all duration-300 ease-out ${
        isCompact ? 'rounded-b-lg px-4 py-3' : 'rounded-b-xl p-4'
      }`}
      style={{ height: isCompact ? '116px' : '200px' }}
    >
      <div className={`absolute left-4 text-white/80 transition-all duration-300 ${isCompact ? 'top-3 text-[11px]' : 'top-2 text-xs'}`}>
        GSTIN:{gstNumber}
      </div>

      {/* Top right icons */}
      
      <div className={`absolute right-4 flex items-center transition-all duration-300 ${isCompact ? 'top-3 gap-3' : 'top-4 gap-4'}`}>
        <Award className={`${isCompact ? 'h-4 w-4' : 'h-5 w-5'} text-yellow-400 transition-all duration-300`} />
        
        <button onClick={handleShare} title="Share profile">
          <Share2 className={`${isCompact ? 'h-4 w-4' : 'h-5 w-5'} text-white hover:text-gray-300 transition-all duration-300`} />
        </button>
        <button onClick={() => navigateTo("/settings")} aria-label="Settings">
          <Settings className={`${isCompact ? 'h-4 w-4' : 'h-5 w-5'} text-white hover:text-gray-300 transition-all duration-300`} />
        </button>
        
        <button onClick={() => navigateTo("/VendorDashboard")} aria-label="Go to home">
          <Home className={`${isCompact ? 'h-4 w-4' : 'h-5 w-5'} text-white hover:text-gray-300 transition-all duration-300`} />
        </button>
      
      </div>

      {/* Tabs */}
      <ResponsiveNavigationTabs compact={isCompact} />
    </section>
  );
}
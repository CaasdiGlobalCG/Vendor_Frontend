// ... existing code ...

import React, { useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Award, Share2, Settings } from 'lucide-react';
import ResponsiveNavigationTabs from './tabNavigation';
import { VendorContext } from '../../context/VendorContext';
import { Home } from 'lucide-react';

export default function AppHeader() {
  const navigate = useNavigate();
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
      className={`sticky top-0 z-50 mx-3 mt-3 overflow-hidden bg-gradient-to-r from-[#095B49] to-[#000000] text-white shadow-lg transition-all duration-300 ease-out sm:mx-4 sm:mt-4 ${
        isCompact ? 'rounded-b-lg px-3 py-3 sm:px-4' : 'rounded-b-xl px-3 py-3.5 sm:px-4 sm:py-4'
      }`}
    >
      <div className={`flex flex-col gap-3 transition-all duration-300 sm:flex-row sm:items-start sm:justify-between ${isCompact ? 'mb-3' : 'mb-4'}`}>
        <div className={`min-w-0 text-white/80 transition-all duration-300 ${isCompact ? 'text-[11px]' : 'text-xs'} break-all sm:break-normal`}>
          GSTIN:{gstNumber}
        </div>

        <div className={`flex items-center justify-end gap-2 self-stretch rounded-full bg-white/8 px-2.5 py-1.5 transition-all duration-300 sm:self-auto sm:bg-transparent sm:px-0 sm:py-0 ${isCompact ? '' : 'sm:gap-4'}`}>
          <Award className={`${isCompact ? 'h-4 w-4' : 'h-5 w-5'} text-yellow-400 transition-all duration-300`} />

          <button onClick={handleShare} title="Share profile" className="rounded-full p-1.5 transition-colors hover:bg-white/10 sm:p-0">
            <Share2 className={`${isCompact ? 'h-4 w-4' : 'h-5 w-5'} text-white hover:text-gray-300 transition-all duration-300`} />
          </button>
          <button onClick={() => navigateTo("/settings")} aria-label="Settings" className="rounded-full p-1.5 transition-colors hover:bg-white/10 sm:p-0">
            <Settings className={`${isCompact ? 'h-4 w-4' : 'h-5 w-5'} text-white hover:text-gray-300 transition-all duration-300`} />
          </button>

          <button onClick={() => navigateTo("/VendorDashboard")} aria-label="Go to home" className="rounded-full p-1.5 transition-colors hover:bg-white/10 sm:p-0">
            <Home className={`${isCompact ? 'h-4 w-4' : 'h-5 w-5'} text-white hover:text-gray-300 transition-all duration-300`} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <ResponsiveNavigationTabs compact={isCompact} />
    </section>
  );
}
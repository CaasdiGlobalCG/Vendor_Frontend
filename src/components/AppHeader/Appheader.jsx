// ... existing code ...

import React, { useContext } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Award, Share2, Settings } from 'lucide-react';
import ResponsiveNavigationTabs from './tabNavigation';
import { VendorContext } from '../../context/VendorContext';
import { Home } from 'lucide-react';

export default function AppHeader() {
  const navigate = useNavigate();
  const location = useLocation();
  const { vendorData } = useContext(VendorContext);

  const navigateTo = (path) => {
    navigate(path);
  };

  return (
    <section className="bg-gradient-to-r from-[#095B49] to-[#000000] text-white rounded-xl p-4 relative rounded-b-lg" style={{ height: "200px" }}>
      <div className="absolute top-2 left-4 text-xs text-white/80">
        GSTIN:{vendorData?.vendorDetails?.gstin || 'Not Available'}
      </div>

      {/* Top right icons */}
      
      <div className="absolute top-4 right-4 flex items-center gap-4">
        <Award className="w-5 h-5 text-yellow-400" />
        
        <button onClick={() => navigateTo("/share")}> {/* Adjusted to use navigateTo or direct path if /share is a defined route */}
          <Share2 className="w-5 h-5 text-white" />
        </button>
        <button onClick={() => navigateTo("/settings")}> {/* Adjusted to use navigateTo or direct path if /settings is a defined route */}
          <Settings className="w-5 h-5 text-white" />
        </button>
        
        <button onClick={() => navigateTo("/VendorDashboard")} aria-label="Go to home">
          <Home className="w-5 h-5 text-white" />
        </button>
      
      </div>

      {/* Tabs */}
      <ResponsiveNavigationTabs />
    </section>
  );
}
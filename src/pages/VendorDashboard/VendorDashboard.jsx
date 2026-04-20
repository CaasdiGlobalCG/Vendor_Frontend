import React, { useContext, useEffect, useState, useCallback } from "react";
import {
  AlertCircle,
  ArrowRight,
  Briefcase,
  Building2,
  CheckCircle2,
  Clock3,
  FolderKanban,
  LifeBuoy,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import { RevenueChart } from "../../components/RevenueChart/RevenueChart";
import { ProjectList } from "../../components/ProjectList/ProjectList";
import TenderCarousel from "../../components/TenderCard/TenderCarousel";
import PasskeyRegistrationBanner from "../../components/PasskeyRegistrationBanner";
import { VendorContext } from "../../context/VendorContext";
import { useLocation, useNavigate } from "react-router-dom";
import config from '../../config/env';


const mockTenders = [
  {
    title: "Public work mail department",
    description: "04 Pghj | Road to rawadisa",
    closingDate: "25th April, 2025",
    amount: "2.9 cr",
  },
  {
    title: "National Highway Authority",
    description: "NH-27 | Highway expansion project",
    closingDate: "12th May, 2025",
    amount: "15.3 cr",
  },
  {
    title: "Ministry of Railways",
    description: "Track electrification | Eastern Corridor",
    closingDate: "3rd June, 2025",
    amount: "8.7 cr",
  },
  {
    title: "Municipal Corporation of Delhi",
    description: "Waste management system | South Delhi",
    closingDate: "17th April, 2025",
    amount: "4.2 cr",
  },
  {
    title: "Airport Authority of India",
    description: "Terminal renovation | Domestic wing",
    closingDate: "30th May, 2025",
    amount: "12.5 cr",
  },
  {
    title: "Ministry of Urban Development",
    description: "Smart city project | Water conservation",
    closingDate: "22nd July, 2025",
    amount: "6.8 cr",
  }
];

// --- Generate More Realistic Revenue Data ---
const generateRealisticRevenueData = (years) => {
  const data = [];
  const endDate = new Date(); // Today
  // Ensure start date is the beginning of the month 'years' ago
  const startDate = new Date(endDate.getFullYear() - years, endDate.getMonth(), 1);

  let currentDate = new Date(startDate);

  while (currentDate <= endDate) {
    // Simulate some seasonality and randomness
    const month = currentDate.getMonth();
    const baseRevenue = 50000 + Math.sin(month / 6 * Math.PI) * 20000; // Simple sine wave for seasonality
    const randomFactor = 0.8 + Math.random() * 0.4; // Randomness factor (0.8 to 1.2)
    const monthRevenue = baseRevenue * randomFactor * (1 + (currentDate.getFullYear() - startDate.getFullYear()) * 0.05); // Slight yearly growth

    data.push({
      // Format as YYYY-MM-DD for easier sorting/filtering
      date: currentDate.toISOString().split('T')[0],
      revenue: Math.max(0, Math.round(monthRevenue)) // Ensure non-negative
    });
    // Move to the first day of the next month
    currentDate.setMonth(currentDate.getMonth() + 1, 1);
  }
  // Sort just in case date manipulation caused issues (though it shouldn't here)
  return data.sort((a, b) => new Date(a.date) - new Date(b.date));
};

// Generate 5 years of monthly data ending today
const realisticRevenueData = generateRealisticRevenueData(5);

const PROJECTS_CACHE_KEY = 'vd_projects_cache';
const WORKSPACE_STATUSES_CACHE_KEY = 'vd_workspace_statuses_cache';

const readCache = (key) => {
  try { return JSON.parse(sessionStorage.getItem(key)); } catch { return null; }
};
const writeCache = (key, value) => {
  try { sessionStorage.setItem(key, JSON.stringify(value)); } catch {}
};

export const VendorDashboard = () => {
  const { currentUser, vendorData, setVendorData, setUser } = useContext(VendorContext);
  const [vendorName, setVendorName] = useState("");
  const [projects, setProjects] = useState(() => readCache(PROJECTS_CACHE_KEY) || []);
  // Show loading only when there is no cached data to display
  const [isLoading, setIsLoading] = useState(() => !(readCache(PROJECTS_CACHE_KEY)?.length > 0));
  const [error, setError] = useState(null);
  const [workspaceStatuses, setWorkspaceStatuses] = useState(() => readCache(WORKSPACE_STATUSES_CACHE_KEY) || {});
  const [userHasPasskey, setUserHasPasskey] = useState(false);
  const [checkingPasskey, setCheckingPasskey] = useState(true);
  const [tenders, setTenders] = useState([]);
  
  // State to track API call status
  const [vendorInfoFetched, setVendorInfoFetched] = useState(false);
  const [projectsFetched, setProjectsFetched] = useState(false);
  
  const location = useLocation();
  const navigate = useNavigate();
  
  // Extract email/role from URL parameters (legacy). Do not trust these for identity.
  const urlParams = new URLSearchParams(location.search);
  const emailFromUrl = urlParams.get('email');
  const roleFromUrl = urlParams.get('role');
  
  // Check if user has passkey registered
  useEffect(() => {
    const checkPasskeyStatus = async () => {
      try {
        if (!currentUser?.email) {
          setCheckingPasskey(false);
          return;
        }

        const response = await fetch(
          `${config.VENDOR_BACKEND_URL}/api/auth/passkey/user-status?email=${encodeURIComponent(currentUser.email)}`,
          {
            credentials: 'include'
          }
        );

        if (response.ok) {
          const data = await response.json();
          setUserHasPasskey(data.data?.hasPasskey || false);
        } else {
          setUserHasPasskey(false);
        }
      } catch (error) {
        console.error('Error checking passkey status:', error);
        setUserHasPasskey(false);
      } finally {
        setCheckingPasskey(false);
      }
    };

    checkPasskeyStatus();
  }, [currentUser?.email]);
  
  // Legacy cleanup: strip query params but never set identity from them.
  useEffect(() => {
    if (emailFromUrl || roleFromUrl) {
      navigate('/VendorDashboard', { replace: true });
    }
  }, [emailFromUrl, roleFromUrl, navigate]);
  
  // Effect to fetch vendor data when currentUser changes
  useEffect(() => {
    const fetchVendorInfo = async () => {
      // Skip if we've already fetched vendor info or don't have email
      if (vendorInfoFetched || (vendorData && vendorData.vendorId)) {
        return;
      }
      
      try {
        // Get the email from the current user
        const userEmail = currentUser?.email;
        
        if (!userEmail) {
          console.log("VendorDashboard: No user email available to fetch vendor data");
          return;
        }
        
        console.log("VendorDashboard: Fetching vendor data (secure /me) for:", userEmail);

        const token = localStorage.getItem('authToken');
        const headers = {
          'Content-Type': 'application/json',
        };
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }
        const meResponse = await fetch(`${config.VENDOR_BACKEND_URL}/api/vendor/me`, {
          credentials: 'include',
          headers,
        });

        if (!meResponse.ok) {
          throw new Error(`Server responded with status: ${meResponse.status}`);
        }

        const meData = await meResponse.json();
        console.log("VendorDashboard: /me response:", meData);

        if (meData.success && meData.data) {
          const vendorDetail = meData.data;
          const vendorId = vendorDetail.vendorId || vendorDetail.id;

          if (vendorDetail) {
            // Update the vendor data in context with all fields
            setVendorData({
              vendorId: vendorDetail.vendorId || vendorDetail.id || vendorId,
              vendorDetails: vendorDetail.vendorDetails || {},
              companyDetails: vendorDetail.companyDetails || {},
              serviceProductDetails: vendorDetail.serviceProductDetails || {},
              bankDetails: vendorDetail.bankDetails || {},
              complianceCertifications: vendorDetail.complianceCertifications || {},
              additionalDetails: vendorDetail.additionalDetails || {},
              status: vendorDetail.status,
              profileImage: vendorDetail.profileImage
            });
            
            // If we have a currentUser but no name, update with the vendor name
            if (currentUser && !currentUser.name && vendorDetail.vendorDetails?.primaryContactName) {
              setUser({
                ...currentUser,
                vendorId: vendorId, // Make sure to set the correct vendorId
                name: vendorDetail.vendorDetails.primaryContactName
              });
            }
            
            setVendorInfoFetched(true);
          } else {
            console.log("VendorDashboard: No vendor details found in response");
          }
        } else {
          console.log("VendorDashboard: No vendor found for current user");
        }
      } catch (error) {
        console.error('VendorDashboard: Error fetching vendor info:', error);
        setError("Failed to fetch vendor information");
      }
    };
    
    // Only fetch if we have a currentUser with an email and haven't fetched yet
    if (currentUser && currentUser.email && !vendorInfoFetched) {
      fetchVendorInfo();
    }
  }, [currentUser, setVendorData, setUser, vendorData, vendorInfoFetched]);
  
  // Function to fetch projects and their real workspace statuses
  const fetchProjects = useCallback(async () => {
    if (projectsFetched) return;
    try {
      // Only show loading spinner when there's nothing cached to display
      if (projects.length === 0) setIsLoading(true);
      const vendorId = currentUser?.vendorId || vendorData?.vendorId || currentUser?.id;
      if (!vendorId) {
        setIsLoading(false);
        return;
      }
      // Fetch vendor leads and derive only PM-approved leads with workspace access
      const leadsRes = await fetch(`${config.VENDOR_BACKEND_URL}/api/vendor-leads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vendorId })
      });
      if (!leadsRes.ok) throw new Error(`Server responded with status: ${leadsRes.status}`);
      const leadsPayload = await leadsRes.json();
      let workspaceProjects = [];
      if (leadsPayload.success && Array.isArray(leadsPayload.leads)) {
        const approvedLeads = leadsPayload.leads
          .filter(lead => lead.pmId)
          .filter(lead => lead.pmDecision?.approved && lead.pmDecision?.workspaceAccess)
          .filter(lead => String(lead.vendorId) === String(vendorId));
        workspaceProjects = approvedLeads.map((lead) => ({
          id: lead.projectId || lead.leadId,
          clientId: lead.projectId,
          name: lead.projectName || lead.leadTitle || 'Approved Lead',
          description: lead.leadDescription || '',
          manager: lead.pmName || 'Project Manager',
          createdAt: lead.createdAt ? new Date(lead.createdAt) : new Date(),
          completedAt: null,
          lastUpdate: lead.updatedAt
            ? new Date(lead.updatedAt).toLocaleDateString('en-IN', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              })
            : '',
          status: 'InProgress', // will be replaced by real status
          fromLead: true,
          leadId: lead.leadId,
          pmId: lead.pmId,
          hasWorkspaceAccess: true,
        }));
      }
      setProjects(workspaceProjects);
      writeCache(PROJECTS_CACHE_KEY, workspaceProjects);
      // Fetch real workspace status for each project
      const statusMap = {};
      await Promise.all(
        workspaceProjects.map(async (proj) => {
          try {
            const res = await fetch(`/api/workspaces/project/${proj.id}`);
            if (res.ok) {
              const data = await res.json();
              if (data && data.status) statusMap[proj.id] = data.status;
            }
          } catch {}
        })
      );
      setWorkspaceStatuses(statusMap);
      writeCache(WORKSPACE_STATUSES_CACHE_KEY, statusMap);
      setProjectsFetched(true);
      setIsLoading(false);
    } catch (error) {
      setError("Failed to fetch projects");
      setIsLoading(false);
    }
  }, [currentUser, vendorData, projectsFetched]);
  
  // Effect to fetch projects when we have the necessary data
  useEffect(() => {
    const hasVendorId = currentUser?.vendorId || vendorData?.vendorId || currentUser?.id;
    
    if (hasVendorId && !projectsFetched) {
      fetchProjects();
    }
  }, [currentUser, vendorData, fetchProjects, projectsFetched]);
  
  // Reset fetch states when user changes
  useEffect(() => {
    return () => {
      setVendorInfoFetched(false);
      setProjectsFetched(false);
    };
  }, [currentUser?.email]);
  
  // Effect to set vendor name for display
  useEffect(() => {
    if (vendorData?.vendorDetails?.primaryContactName) {
      setVendorName(vendorData.vendorDetails.primaryContactName);
    } else if (currentUser?.name) {
      setVendorName(currentUser.name);
    }
  }, [vendorData, currentUser]);
  
  // Map different status values to standard categories
  const getStandardStatus = (status) => {
    if (!status) return "Pending";
    
    // Convert to lowercase for case-insensitive comparison
    const lowercaseStatus = status.toLowerCase();
    
    if (lowercaseStatus.includes('complete') || lowercaseStatus === 'done' || lowercaseStatus === 'finished') {
      return "Completed";
    } else if (lowercaseStatus.includes('progress') || lowercaseStatus === 'ongoing' || lowercaseStatus === 'inprogress') {
      return "InProgress";
    } else if (lowercaseStatus.includes('pend') || lowercaseStatus === 'new' || lowercaseStatus === 'waiting') {
      return "Pending";
    }
    
    // Default case
    return status;
  };
  
  // Calculate project counts using real workspace statuses if available
  const totalProjects = projects.length;
  const completedProjects = projects.filter(project => getStandardStatus(workspaceStatuses[project.id] || project.status) === "Completed").length;
  const pendingProjects = projects.filter(project => getStandardStatus(workspaceStatuses[project.id] || project.status) === "Pending").length;
  const inProgressProjects = projects.filter(project => getStandardStatus(workspaceStatuses[project.id] || project.status) === "InProgress").length;
  const completionPercentage = totalProjects > 0 
    ? Math.round((completedProjects / totalProjects) * 100) 
    : 0;
  const tenderCount = tenders.length > 0 ? tenders.length : mockTenders.length;
  const vendorDisplayName = vendorName || vendorData?.vendorDetails?.primaryContactName || currentUser?.name || 'Vendor';
  const vendorCompanyName = vendorData?.companyDetails?.companyName || 'Your company profile';
  const statCards = [
    {
      title: 'Total Projects',
      value: totalProjects,
      subtitle: 'Approved workspaces currently tracked',
      metric: totalProjects > 0 ? '100%' : '0%',
      icon: FolderKanban,
      iconClasses: 'bg-emerald-50 text-emerald-700',
      accentClasses: 'border-emerald-100 bg-white',
      progressClass: 'bg-emerald-500',
      toneClass: 'text-emerald-700 bg-emerald-50 border-emerald-100',
    },
    {
      title: 'Project Completed',
      value: completedProjects,
      subtitle: 'Projects delivered successfully',
      metric: `${completionPercentage}%`,
      icon: CheckCircle2,
      iconClasses: 'bg-lime-50 text-lime-700',
      accentClasses: 'border-lime-100 bg-white',
      progressClass: 'bg-lime-500',
      toneClass: 'text-lime-700 bg-lime-50 border-lime-100',
    },
    {
      title: 'Project Pending',
      value: pendingProjects,
      subtitle: 'Projects waiting for next action',
      metric: `${totalProjects > 0 ? Math.round((pendingProjects / totalProjects) * 100) : 0}%`,
      icon: Clock3,
      iconClasses: 'bg-amber-50 text-amber-700',
      accentClasses: 'border-amber-100 bg-white',
      progressClass: 'bg-amber-500',
      toneClass: 'text-amber-700 bg-amber-50 border-amber-100',
    },
    {
      title: 'Project Completion',
      value: `${completionPercentage}%`,
      subtitle: 'Overall completion across tracked delivery',
      metric: `${completedProjects}/${totalProjects || 0}`,
      icon: TrendingUp,
      iconClasses: 'bg-sky-50 text-sky-700',
      accentClasses: 'border-sky-100 bg-white',
      progressClass: 'bg-sky-500',
      toneClass: 'text-sky-700 bg-sky-50 border-sky-100',
    },
  ];
  const quickActions = [
    {
      label: 'Open Projects',
      description: 'Review all active workspaces and delivery progress.',
      onClick: () => navigate('/VendorDashboard/projects'),
    },
    {
      label: 'Review Leads',
      description: 'Check new opportunities and approval-ready items.',
      onClick: () => navigate('/VendorDashboard/leads'),
    },
    {
      label: 'Manage Team',
      description: 'Update permissions and member access from one place.',
      onClick: () => navigate('/VendorDashboard/team'),
    },
  ];
  const insightRows = [
    {
      label: 'Delivery completion',
      value: `${completionPercentage}%`,
      helper: completedProjects > 0 ? `${completedProjects} projects closed` : 'No completed projects yet',
    },
    {
      label: 'Current workload',
      value: `${inProgressProjects}`,
      helper: inProgressProjects === 1 ? '1 project moving right now' : `${inProgressProjects} projects moving right now`,
    },
    {
      label: 'Tender watchlist',
      value: `${tenderCount}`,
      helper: tenderCount === 1 ? '1 tender currently visible' : `${tenderCount} tenders currently visible`,
    },
  ];
    
  // Fetch real tenders for this vendor from the proxy route
  useEffect(() => {
    const vendorId = vendorData?.vendorId || currentUser?.vendorId || currentUser?.id;
    if (!vendorId) return;

    const fetchTenders = async () => {
      try {
        const res = await fetch(`/api/vendor/tenders?vendorId=${encodeURIComponent(vendorId)}`, {
          credentials: 'include',
        });
        const json = await res.json();
        if (json.success && Array.isArray(json.data) && json.data.length > 0) {
          setTenders(
            json.data.map((t) => ({
              title: t.title || t.tenderTitle || 'Untitled Tender',
              description: t.description || t.tenderDescription || '',
              closingDate: t.closingDate
                ? new Date(t.closingDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
                : t.deadline || '',
              amount: t.amount || t.budget || t.estimatedValue || '',
            }))
          );
        }
      } catch (err) {
        console.warn('[VendorDashboard] Could not load tenders:', err.message);
      }
    };

    fetchTenders();
  }, [vendorData?.vendorId, currentUser?.vendorId, currentUser?.id]);

  // Log vendor data for debugging - only once on mount
  useEffect(() => {
    console.log("VendorDashboard - Current User:", currentUser);
    console.log("VendorDashboard - Vendor Data:", vendorData);
  }, []);

  return (
    <div className="space-y-5 px-4 pb-10 pt-4 sm:p-5 sm:pb-24">
      {/* Passkey Registration Banner - Show if user doesn't have a passkey */}
      {!checkingPasskey && !userHasPasskey && currentUser?.email && (
        <PasskeyRegistrationBanner
          userId={currentUser?.vendorId || currentUser?.id}
          email={currentUser.email}
          onPasskeyRegistered={() => {
            // Refresh passkey status after successful registration
            setUserHasPasskey(true);
          }}
        />
      )}

      <section className="overflow-hidden rounded-[30px] border border-emerald-100 bg-[linear-gradient(135deg,#f8fffc_0%,#effbf5_45%,#f7faf9_100%)] p-5 sm:p-7 text-slate-900 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
        <div className="grid gap-6 xl:grid-cols-[1.7fr_1fr] xl:items-stretch">
          <div className="space-y-5">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-white px-3 py-1 text-[11px] font-medium text-emerald-700 shadow-sm">
              <Sparkles size={14} />
              Operations overview
            </div>

            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="bg-gradient-to-r from-[#1e3a8a] via-[#0f766e] to-[#065f46] bg-clip-text text-[2rem] font-semibold tracking-tight text-transparent sm:text-[2.4rem]">Dashboard built for faster decisions</h1>
              </div>
              <p className="max-w-3xl text-[14px] leading-6 text-slate-600 sm:text-[15px]">
                Welcome back, {vendorDisplayName}. Track delivery health, keep an eye on active tenders, and jump into the areas that need attention without scanning multiple pages.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-white px-4 py-2 text-[13px] text-slate-700 shadow-sm">
                <Building2 size={16} />
                {vendorCompanyName}
              </div>
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-white px-4 py-2 text-[13px] text-slate-700 shadow-sm">
                <Briefcase size={16} />
                {totalProjects} live projects
              </div>
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-white px-4 py-2 text-[13px] text-slate-700 shadow-sm">
                <TrendingUp size={16} />
                {tenderCount} tenders in focus
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {quickActions.map((action) => (
                <button
                  key={action.label}
                  type="button"
                  onClick={action.onClick}
                  className="group rounded-[24px] border border-emerald-100 bg-white p-4 text-left shadow-sm transition duration-200 hover:border-emerald-200 hover:bg-emerald-50/40"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[15px] font-semibold text-slate-900">{action.label}</p>
                      <p className="mt-2 text-[13px] leading-5 text-slate-500">{action.description}</p>
                    </div>
                    <div className="rounded-full bg-emerald-50 p-2 text-emerald-700 transition group-hover:bg-emerald-100">
                      <ArrowRight size={16} />
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-[28px] border border-emerald-100 bg-[linear-gradient(180deg,#ffffff_0%,#f4fbf7_100%)] p-5 shadow-[0_18px_40px_rgba(15,23,42,0.05)]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-emerald-700">Performance snapshot</p>
                <p className="mt-1 text-3xl font-semibold text-slate-900">{completionPercentage}%</p>
              </div>
              <div className="rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                Delivery health
              </div>
            </div>

            <div className="mt-5 h-3 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-300 via-emerald-400 to-lime-300"
                style={{ width: `${Math.max(completionPercentage, totalProjects > 0 ? 10 : 0)}%` }}
              />
            </div>

            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-emerald-100 bg-white p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Completed</p>
                <p className="mt-2 text-2xl font-semibold text-slate-900">{completedProjects}</p>
              </div>
              <div className="rounded-2xl border border-emerald-100 bg-white p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Pending</p>
                <p className="mt-2 text-2xl font-semibold text-slate-900">{pendingProjects}</p>
              </div>
            </div>

            <div className="mt-5 space-y-3">
              {insightRows.map((item, index) => (
                <div key={item.label} className={`rounded-2xl border px-4 py-3 ${index === 0 ? 'border-emerald-100 bg-emerald-50/60' : 'border-slate-200 bg-white'}`}>
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm text-slate-700">{item.label}</p>
                    <p className="text-base font-semibold text-slate-900">{item.value}</p>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">{item.helper}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[2fr_1fr]">
        {/* Left Column */}
        <div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {statCards.map((card) => {
              const Icon = card.icon;
              const numericValue = typeof card.value === 'number' ? card.value : Number.parseInt(card.value, 10);
              const progressValue = Number.isFinite(numericValue)
                ? Math.max(8, Math.min(100, totalProjects > 0 ? Math.round((numericValue / totalProjects) * 100) : completionPercentage || 0))
                : Math.max(8, completionPercentage || 0);

              return (
                <div
                  key={card.title}
                  className={`overflow-hidden rounded-[24px] border p-5 shadow-[0_12px_32px_rgba(15,23,42,0.06)] transition hover:shadow-[0_16px_38px_rgba(15,23,42,0.08)] ${card.accentClasses}`}
                >
                  <div className="mb-4 flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="inline-flex rounded-full border border-slate-200 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                        {card.title}
                      </div>
                      <p className="mt-4 text-4xl font-semibold tracking-tight text-slate-900">{card.value}</p>
                    </div>
                    <div className="flex flex-col items-end gap-3">
                      <div className={`rounded-2xl p-3 ${card.iconClasses}`}>
                        <Icon size={18} />
                      </div>
                    </div>
                  </div>

                  <p className="max-w-[16rem] text-xs leading-5 text-slate-500">{card.subtitle}</p>

                  <div className="mt-5 flex items-center justify-between gap-3">
                    <div className={`inline-flex rounded-full border px-3 py-1.5 text-[11px] font-semibold ${card.toneClass}`}>
                      {card.metric}
                    </div>
                    <div className="text-right">
                      <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-slate-400">Status</p>
                      <p className="mt-1 text-sm font-semibold text-slate-700">Healthy</p>
                    </div>
                  </div>

                  <div className="mt-4">
                    <div className="mb-2 flex items-center justify-between gap-3 text-[11px] font-medium text-slate-500">
                      <span>Overview</span>
                      <span>{progressValue}%</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                      <div className={`h-full rounded-full ${card.progressClass}`} style={{ width: `${progressValue}%` }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-5 rounded-[30px] border border-slate-200/80 bg-white p-4 shadow-[0_20px_60px_rgba(15,23,42,0.06)] sm:p-5">
            <div className="mb-5 flex flex-col gap-4 border-b border-slate-200 pb-5 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <p className="text-xs font-medium text-emerald-700">Project tracker</p>
                <h2 className="mt-1 text-xl font-semibold tracking-tight text-slate-900">Active delivery pipeline</h2>
                <p className="mt-2 max-w-2xl text-[13px] leading-6 text-slate-500">
                  Review your approved projects, filter by timeline or status, and jump directly into the workspace that needs your attention.
                </p>
              </div>

              <div className="grid w-full grid-cols-2 gap-1.5 sm:grid-cols-4 xl:w-[420px]">
                <div className="min-w-0 rounded-full bg-emerald-50 px-2 py-1 text-center text-[10px] font-medium text-emerald-700">
                  {totalProjects} total
                </div>
                <div className="min-w-0 rounded-full bg-sky-50 px-2 py-1 text-center text-[10px] font-medium text-sky-700">
                  {inProgressProjects} in progress
                </div>
                <div className="min-w-0 rounded-full bg-lime-50 px-2 py-1 text-center text-[10px] font-medium text-lime-700">
                  {completedProjects} completed
                </div>
                <div className="min-w-0 rounded-full bg-amber-50 px-2 py-1 text-center text-[10px] font-medium text-amber-700">
                  {pendingProjects} pending
                </div>
              </div>
            </div>

            {isLoading ? (
              <div className="flex h-64 items-center justify-center rounded-[24px] border border-dashed border-slate-200 bg-slate-50">
                <p className="text-sm text-slate-500">Loading projects...</p>
              </div>
            ) : error ? (
              <div className="flex h-64 items-center justify-center rounded-[24px] border border-rose-100 bg-rose-50/70 px-5 text-center">
                <div>
                  <AlertCircle className="mx-auto mb-3 text-rose-500" size={20} />
                  <p className="text-sm font-medium text-rose-700">{error}</p>
                </div>
              </div>
            ) : (
              <ProjectList 
                projects={projects.map(project => ({
                  ...project,
                  status: getStandardStatus(workspaceStatuses[project.id] || project.status)
                }))} 
              />
            )}
          </div>
        </div>

        {/* Right Column */}
        <div className="min-w-0 space-y-5">
          <div className="rounded-[30px] border border-slate-200/80 bg-white p-5 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-sm font-medium text-emerald-700">Daily pulse</p>
                <h3 className="mt-1 text-xl font-semibold text-slate-900">Where to focus today</h3>
              </div>
              <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                Live summary
              </div>
            </div>

            <div className="mt-5 space-y-4">
              <div className="rounded-[24px] bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-slate-700">Projects needing follow-up</p>
                  <p className="text-2xl font-semibold text-slate-900">{pendingProjects + inProgressProjects}</p>
                </div>
                <p className="mt-2 text-xs leading-5 text-slate-500">
                  Pending and in-progress work usually needs coordination first. Use the project table to narrow this down quickly.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Completion</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-900">{completionPercentage}%</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Tenders</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-900">{tenderCount}</p>
                </div>
              </div>
            </div>
          </div>

          <TenderCarousel tenders={tenders.length > 0 ? tenders : mockTenders} />
          <RevenueChart data={realisticRevenueData} />
        </div>
      </div>

      {/* Floating Support Button */}
      <div className="pb-4 sm:pb-0">
        <button
          onClick={() => navigate('/VendorDashboard/support')}
          className="flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold text-white shadow-lg transition-all hover:shadow-xl sm:fixed sm:bottom-6 sm:left-auto sm:right-6 sm:z-30 sm:w-auto"
          style={{background:'linear-gradient(135deg,rgba(9,91,73,1) 0%,rgba(4,50,40,1) 100%)'}}
          title="Open Support Centre"
        >
          <LifeBuoy size={18} />
          <span>Support</span>
        </button>
      </div>
    </div>
  );
};
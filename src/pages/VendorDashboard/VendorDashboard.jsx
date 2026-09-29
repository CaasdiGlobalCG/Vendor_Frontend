import React, { useContext, useEffect, useState, useCallback } from "react";
import {
  ArrowRight,
  Building2,
  LifeBuoy,
  TrendingUp,
} from 'lucide-react';
// Adopted design (variant 1, "Ops cockpit") now lives in a permanent component set.
import {
  FinancePanel,
  MetricTile,
  Panel,
  ProgressBar,
  ProjectTable,
  StatusBar,
  TenderPanel,
  STATUS,
  formatCurrencyShort,
} from '../../components/dashboard';
import PasskeyRegistrationBanner from "../../components/PasskeyRegistrationBanner";

import { Reveal } from "../../components/ui";
import { AdditionalDocsPanel } from "../../components/AuditorWaiting";

import { VendorContext } from "../../context/VendorContext";
import { useLocation, useNavigate } from "react-router-dom";
import config from '../../config/env';


// REMOVED: the hardcoded `mockTenders` array and the synthetic 5-year revenue
// series (`generateRealisticRevenueData`). Both were fabricated data that could
// reach a live KPI surface whenever a request failed — `mockTenders` was in fact
// already unreferenced. Missing data now renders an empty/error state instead.

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
  const [financeData, setFinanceData] = useState([]);
  const [loadingFinance, setLoadingFinance] = useState(true);
  const [financeSummary, setFinanceSummary] = useState({ totalRevenue: 0, totalExpenses: 0, netProfit: 0 });
  
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
  const tenderCount = tenders.length;
  const vendorDisplayName = vendorName || vendorData?.vendorDetails?.primaryContactName || currentUser?.name || 'Vendor';
  const vendorCompanyName = vendorData?.companyDetails?.companyName || 'Your company profile';
  // KPI tiles — each real figure appears exactly once. `status` is semantic only:
  // it tints the value, nothing else. No tile shows an invented number.
  const revenueTrend = financeData.map((point) => point.revenue);
  const tiles = [
    { label: 'Total projects', value: totalProjects, hint: 'Approved with workspace access' },
    { label: 'In progress', value: inProgressProjects, status: STATUS.IN_PROGRESS, hint: 'Work underway' },
    { label: 'Completed', value: completedProjects, status: STATUS.COMPLETED, hint: 'Delivered' },
    { label: 'Pending', value: pendingProjects, status: STATUS.PENDING, hint: 'Awaiting first move' },
    { label: 'Open tenders', value: tenderCount, hint: 'Matched to your profile' },
    { label: 'Net profit', value: formatCurrencyShort(financeSummary.netProfit), hint: 'From finance records', trend: revenueTrend },
  ];

  // Portfolio distribution — the same three counts the tiles show, as one bar.
  const statusCounts = {
    [STATUS.PENDING]: pendingProjects,
    [STATUS.IN_PROGRESS]: inProgressProjects,
    [STATUS.COMPLETED]: completedProjects,
  };

  // Presentation adapter only: reshapes the existing finance state into the shape
  // FinancePanel expects. The fetch effect above is untouched.
  const financeForPanel = {
    series: financeData.map((point) => ({ label: point.date, date: point.date, revenue: point.revenue })),
    totalRevenue: financeSummary.totalRevenue,
    totalExpenses: financeSummary.totalExpenses,
    netProfit: financeSummary.netProfit,
  };

  const quickActions = [
    { label: 'Open Projects', onClick: () => navigate('/VendorDashboard/projects') },
    { label: 'Review Leads', onClick: () => navigate('/VendorDashboard/leads') },
    { label: 'Manage Team', onClick: () => navigate('/VendorDashboard/team') },
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

  // Fetch finance data from API
  useEffect(() => {
    const fetchFinanceData = async () => {
      try {
        setLoadingFinance(true);
        const token = localStorage.getItem('authToken');
        const headers = {
          'Content-Type': 'application/json',
        };
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(`${config.VENDOR_BACKEND_URL}/api/finance/overview`, {
          credentials: 'include',
          headers,
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data?.monthlyData) {
            // Transform monthlyData into the format expected by RevenueChart
            const chartData = data.data.monthlyData.map((month) => ({
              date: month.month + ', 2024', // Convert 'MMM YYYY' to date format
              revenue: month.totalRevenue || 0,
            }));
            setFinanceData(chartData);

            // Set finance summary from API
            if (data.data?.summary) {
              setFinanceSummary({
                totalRevenue: data.data.summary.totalRevenue || 0,
                totalExpenses: data.data.summary.totalExpenses || 0,
                netProfit: data.data.summary.netProfit || 0,
              });
            }
          }
        }
      } catch (error) {
        console.error('Error fetching finance data:', error);
      } finally {
        setLoadingFinance(false);
      }
    };

    fetchFinanceData();
  }, []);

  // Log vendor data for debugging - only once on mount
  useEffect(() => {
    console.log("VendorDashboard - Current User:", currentUser);
    console.log("VendorDashboard - Vendor Data:", vendorData);
  }, []);

  return (
    <div className="mx-auto max-w-[1440px] space-y-6 px-4 pb-16 pt-6 sm:px-6 sm:pt-8 sm:pb-24 lg:px-8">
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

      {/* Page header — plain, sits on the canvas (no card chrome, generous type) */}
      <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-dim">Dashboard</p>
          <h1 className="mt-1.5 truncate text-[26px] font-semibold tracking-tight text-ink sm:text-[28px]">
            Good day, {vendorDisplayName}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-dim">
            <span className="inline-flex items-center gap-1.5"><Building2 size={14} />{vendorCompanyName}</span>
            <span className="inline-flex items-center gap-1.5"><TrendingUp size={14} />{tenderCount} tenders</span>
          </div>
        </div>

        <nav className="flex flex-wrap items-center gap-x-5 gap-y-2" aria-label="Quick actions">
          {quickActions.map((action) => (
            <button
              key={action.label}
              type="button"
              onClick={action.onClick}
              className="group inline-flex items-center gap-1 text-sm font-medium text-ink transition-colors hover:text-dim focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink"
            >
              {action.label}
              <ArrowRight size={14} className="vd-row-arrow" />
            </button>
          ))}
        </nav>
      </header>

      {/* KPI strip — six real figures, each appearing once */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {tiles.map((tile) => (
          <MetricTile key={tile.label} {...tile} loading={isLoading} />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[2fr_1fr]">
        <section className="rounded-lg border border-line bg-surface p-5">
          <div className="flex items-baseline justify-between gap-4">
            <h2 className="text-[15px] font-semibold tracking-tight text-ink">Portfolio split</h2>
            <p className="tnum text-xs text-dim">{totalProjects} projects</p>
          </div>
          <div className="mt-4">
            <StatusBar total={totalProjects} counts={statusCounts} />
          </div>
        </section>

        <section className="rounded-lg border border-line bg-surface p-5">
          <div className="flex items-baseline justify-between gap-4">
            <h2 className="text-[15px] font-semibold tracking-tight text-ink">Pipeline completion</h2>
            <p className="text-xs text-dim">
              {pendingProjects + inProgressProjects > 0
                ? `${pendingProjects + inProgressProjects} need follow-up`
                : 'up to date'}
            </p>
          </div>
          <div className="mt-4">
            <ProgressBar percent={completionPercentage} label="Completed of total" />
          </div>
        </section>
      </div>

      {/* Auditor-requested additional documents */}
      <AdditionalDocsPanel />

      <FinancePanel
        finance={financeForPanel}
        state={loadingFinance ? 'loading' : financeData.length > 0 ? 'ready' : 'empty'}
      />

      <Panel
        title="Delivery pipeline"
        meta={`${completedProjects}/${totalProjects} complete`}
        state={isLoading ? 'loading' : error ? 'error' : 'ready'}
        errorHint={error}
        bodyPadded={false}
      >
        <ProjectTable
          projects={projects.map(project => ({
            ...project,
            status: getStandardStatus(workspaceStatuses[project.id] || project.status)
          }))}
        />
      </Panel>

      <TenderPanel
        tenders={tenders}
        state={isLoading ? 'loading' : tenders.length > 0 ? 'ready' : 'empty'}
      />

      {/* Floating Support Button */}
      <div className="pb-4 sm:pb-0">
        <button
          onClick={() => navigate('/VendorDashboard/support')}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-cta px-4 py-3 text-sm font-semibold text-cta-foreground shadow-lg transition-all hover:opacity-90 sm:fixed sm:bottom-6 sm:left-auto sm:right-6 sm:z-30 sm:w-auto"
          title="Open Support Centre"
        >
          <LifeBuoy size={18} />
          <span>Support</span>
        </button>
      </div>
    </div>
  );
};
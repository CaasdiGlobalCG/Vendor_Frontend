import React, { useContext, useEffect, useState, useCallback } from "react";
import { RevenueChart } from "../../components/RevenueChart/RevenueChart";
import { StatCard } from "../../components/StatCard/StatCard";
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
    // Add p-5 here to pad the content area of this specific page
    <div className="p-5">
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
      
      <div className="mt-4 grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-4">
        {/* Left Column */}
        <div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard title="Total Projects" value={totalProjects.toString()} subtitle="" />
            <StatCard title="Project Completed" value={completedProjects.toString()} subtitle="" />
            <StatCard title="Project Pending" value={pendingProjects.toString()} subtitle="" />
            <StatCard 
              title="Project Completion" 
              value={`${completionPercentage}%`} 
              subtitle="" 
            />
          </div>
          <div className="mt-4">
            {isLoading ? (
              <div className="flex justify-center items-center h-64">
                <p className="text-gray-500">Loading projects...</p>
              </div>
            ) : error ? (
              <div className="flex justify-center items-center h-64">
                <p className="text-red-500">{error}</p>
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
        <div className="space-y-4 mt-4 lg:mt-0 min-w-0">
          <TenderCarousel tenders={tenders.length > 0 ? tenders : mockTenders} />
          <RevenueChart data={realisticRevenueData} />
        </div>
      </div>
    </div>
  );
};
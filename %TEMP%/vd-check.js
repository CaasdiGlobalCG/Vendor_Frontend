import React, { useContext, useEffect, useState, useCallback, useRef } from "react";
import {
  ArrowRight,
  Building2,
  LifeBuoy,
  TrendingUp,
  X
} from "lucide-react";
import {
  FinancePanel,
  MetricTile,
  Panel,
  ProgressBar,
  ProjectTable,
  StatusBar,
  TenderPanel,
  STATUS,
  formatCurrencyShort
} from "../../components/dashboard";
import PasskeyRegistrationBanner from "../../components/PasskeyRegistrationBanner";
import { Reveal } from "../../components/ui";
import { AdditionalDocsPanel } from "../../components/AuditorWaiting";
import { VendorContext } from "../../context/VendorContext";
import { useLocation, useNavigate } from "react-router-dom";
import config from "../../config/env";
const PROJECTS_CACHE_KEY = "vd_projects_cache";
const WORKSPACE_STATUSES_CACHE_KEY = "vd_workspace_statuses_cache";
const readCache = (key) => {
  try {
    return JSON.parse(sessionStorage.getItem(key));
  } catch {
    return null;
  }
};
const writeCache = (key, value) => {
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
  }
};
const COMPANY_DETAILS_CHECKLIST = [
  { key: "companyName", label: "Company name" },
  { key: "industryType", label: "Industry type" },
  { key: "segments", label: "Segments", isList: true },
  { key: "yearOfEstablishment", label: "Year of establishment" },
  { key: "visionAndMission", label: "Vision and mission" },
  { key: "companyOverview", label: "Company overview" },
  { key: "industryOverview", label: "Industry overview" },
  { key: "coreValues", label: "Core values", isList: true },
  { key: "certifications", label: "Certifications", isList: true },
  { key: "teamSize", label: "Team size" },
  { key: "uniqueSellingProposition", label: "Unique selling proposition" },
  { key: "socialImpact", label: "Social impact / ESG focus" }
];
const COMPANY_PROMPT_SNOOZE_MS = 3 * 60 * 60 * 1e3;
const companyPromptSnoozeKey = (vendorId) => `vd_company_prompt_snooze_until_${vendorId || "unknown"}`;
const getMissingCompanyFields = (companyDetails) => COMPANY_DETAILS_CHECKLIST.filter(({ key, isList }) => {
  const value = companyDetails?.[key];
  return isList ? !Array.isArray(value) || value.length === 0 : !value || typeof value === "string" && value.trim() === "";
}).map(({ label }) => label);
export const VendorDashboard = () => {
  const { currentUser, vendorData, setVendorData, setUser } = useContext(VendorContext);
  const [vendorName, setVendorName] = useState("");
  const [projects, setProjects] = useState(() => readCache(PROJECTS_CACHE_KEY) || []);
  const [isLoading, setIsLoading] = useState(() => !(readCache(PROJECTS_CACHE_KEY)?.length > 0));
  const [error, setError] = useState(null);
  const [workspaceStatuses, setWorkspaceStatuses] = useState(() => readCache(WORKSPACE_STATUSES_CACHE_KEY) || {});
  const [userHasPasskey, setUserHasPasskey] = useState(false);
  const [checkingPasskey, setCheckingPasskey] = useState(true);
  const [tenders, setTenders] = useState([]);
  const [financeData, setFinanceData] = useState([]);
  const [loadingFinance, setLoadingFinance] = useState(true);
  const [financeSummary, setFinanceSummary] = useState({ totalRevenue: 0, totalExpenses: 0, netProfit: 0 });
  const [vendorInfoFetched, setVendorInfoFetched] = useState(false);
  const [projectsFetched, setProjectsFetched] = useState(false);
  const [missingCompanyFields, setMissingCompanyFields] = useState([]);
  const [showCompanyDetailsPrompt, setShowCompanyDetailsPrompt] = useState(false);
  const companyDetailsChecked = useRef(false);
  const companyPromptTimer = useRef(null);
  const vendorDataRef = useRef(vendorData);
  const location = useLocation();
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(location.search);
  const emailFromUrl = urlParams.get("email");
  const roleFromUrl = urlParams.get("role");
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
            credentials: "include"
          }
        );
        if (response.ok) {
          const data = await response.json();
          setUserHasPasskey(data.data?.hasPasskey || false);
        } else {
          setUserHasPasskey(false);
        }
      } catch (error2) {
        console.error("Error checking passkey status:", error2);
        setUserHasPasskey(false);
      } finally {
        setCheckingPasskey(false);
      }
    };
    checkPasskeyStatus();
  }, [currentUser?.email]);
  useEffect(() => {
    if (emailFromUrl || roleFromUrl) {
      navigate("/VendorDashboard", { replace: true });
    }
  }, [emailFromUrl, roleFromUrl, navigate]);
  useEffect(() => {
    const fetchVendorInfo = async () => {
      if (vendorInfoFetched || vendorData && vendorData.vendorId) {
        return;
      }
      try {
        const userEmail = currentUser?.email;
        if (!userEmail) {
          console.log("VendorDashboard: No user email available to fetch vendor data");
          return;
        }
        console.log("VendorDashboard: Fetching vendor data (secure /me) for:", userEmail);
        const token = localStorage.getItem("authToken");
        const headers = {
          "Content-Type": "application/json"
        };
        if (token) {
          headers["Authorization"] = `Bearer ${token}`;
        }
        const meResponse = await fetch(`${config.VENDOR_BACKEND_URL}/api/vendor/me`, {
          credentials: "include",
          headers
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
            if (currentUser && !currentUser.name && vendorDetail.vendorDetails?.primaryContactName) {
              setUser({
                ...currentUser,
                vendorId,
                // Make sure to set the correct vendorId
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
      } catch (error2) {
        console.error("VendorDashboard: Error fetching vendor info:", error2);
        setError("Failed to fetch vendor information");
      }
    };
    if (currentUser && currentUser.email && !vendorInfoFetched) {
      fetchVendorInfo();
    }
  }, [currentUser, setVendorData, setUser, vendorData, vendorInfoFetched]);
  useEffect(() => {
    vendorDataRef.current = vendorData;
  }, [vendorData]);
  const scheduleCompanyPrompt = (delayMs) => {
    clearTimeout(companyPromptTimer.current);
    companyPromptTimer.current = setTimeout(() => {
      const missing = getMissingCompanyFields(vendorDataRef.current?.companyDetails);
      if (missing.length > 0) {
        setMissingCompanyFields(missing);
        setShowCompanyDetailsPrompt(true);
      }
    }, delayMs);
  };
  useEffect(() => {
    if (companyDetailsChecked.current || !vendorData?.vendorId)
      return;
    companyDetailsChecked.current = true;
    if (currentUser?.isTeamMember)
      return;
    const missing = getMissingCompanyFields(vendorData.companyDetails);
    if (missing.length === 0)
      return;
    setMissingCompanyFields(missing);
    const snoozeUntil = Number(localStorage.getItem(companyPromptSnoozeKey(vendorData.vendorId)) || 0);
    const remaining = snoozeUntil - Date.now();
    if (remaining > 0)
      scheduleCompanyPrompt(remaining);
    else
      setShowCompanyDetailsPrompt(true);
  }, [vendorData, currentUser]);
  useEffect(() => {
    document.body.style.overflow = showCompanyDetailsPrompt ? "hidden" : "unset";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [showCompanyDetailsPrompt]);
  useEffect(() => () => clearTimeout(companyPromptTimer.current), []);
  const handleCompanyPromptLater = () => {
    setShowCompanyDetailsPrompt(false);
    try {
      localStorage.setItem(
        companyPromptSnoozeKey(vendorData?.vendorId),
        String(Date.now() + COMPANY_PROMPT_SNOOZE_MS)
      );
    } catch {
    }
    scheduleCompanyPrompt(COMPANY_PROMPT_SNOOZE_MS);
  };
  const fetchProjects = useCallback(async () => {
    if (projectsFetched)
      return;
    try {
      if (projects.length === 0)
        setIsLoading(true);
      const vendorId = currentUser?.vendorId || vendorData?.vendorId || currentUser?.id;
      if (!vendorId) {
        setIsLoading(false);
        return;
      }
      const leadsRes = await fetch(`${config.VENDOR_BACKEND_URL}/api/vendor-leads`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vendorId })
      });
      if (!leadsRes.ok)
        throw new Error(`Server responded with status: ${leadsRes.status}`);
      const leadsPayload = await leadsRes.json();
      let workspaceProjects = [];
      if (leadsPayload.success && Array.isArray(leadsPayload.leads)) {
        const approvedLeads = leadsPayload.leads.filter((lead) => lead.pmId).filter((lead) => lead.pmDecision?.approved && lead.pmDecision?.workspaceAccess).filter((lead) => String(lead.vendorId) === String(vendorId));
        workspaceProjects = approvedLeads.map((lead) => ({
          id: lead.projectId || lead.leadId,
          clientId: lead.projectId,
          name: lead.projectName || lead.leadTitle || "Approved Lead",
          description: lead.leadDescription || "",
          manager: lead.pmName || "Project Manager",
          createdAt: lead.createdAt ? new Date(lead.createdAt) : /* @__PURE__ */ new Date(),
          completedAt: null,
          lastUpdate: lead.updatedAt ? new Date(lead.updatedAt).toLocaleDateString("en-IN", {
            year: "numeric",
            month: "short",
            day: "numeric"
          }) : "",
          status: "InProgress",
          // will be replaced by real status
          fromLead: true,
          leadId: lead.leadId,
          pmId: lead.pmId,
          hasWorkspaceAccess: true
        }));
      }
      setProjects(workspaceProjects);
      writeCache(PROJECTS_CACHE_KEY, workspaceProjects);
      const statusMap = {};
      await Promise.all(
        workspaceProjects.map(async (proj) => {
          try {
            const res = await fetch(`/api/workspaces/project/${proj.id}`);
            if (res.ok) {
              const data = await res.json();
              if (data && data.status)
                statusMap[proj.id] = data.status;
            }
          } catch {
          }
        })
      );
      setWorkspaceStatuses(statusMap);
      writeCache(WORKSPACE_STATUSES_CACHE_KEY, statusMap);
      setProjectsFetched(true);
      setIsLoading(false);
    } catch (error2) {
      setError("Failed to fetch projects");
      setIsLoading(false);
    }
  }, [currentUser, vendorData, projectsFetched]);
  useEffect(() => {
    const hasVendorId = currentUser?.vendorId || vendorData?.vendorId || currentUser?.id;
    if (hasVendorId && !projectsFetched) {
      fetchProjects();
    }
  }, [currentUser, vendorData, fetchProjects, projectsFetched]);
  useEffect(() => {
    return () => {
      setVendorInfoFetched(false);
      setProjectsFetched(false);
    };
  }, [currentUser?.email]);
  useEffect(() => {
    if (vendorData?.vendorDetails?.primaryContactName) {
      setVendorName(vendorData.vendorDetails.primaryContactName);
    } else if (currentUser?.name) {
      setVendorName(currentUser.name);
    }
  }, [vendorData, currentUser]);
  const getStandardStatus = (status) => {
    if (!status)
      return "Pending";
    const lowercaseStatus = status.toLowerCase();
    if (lowercaseStatus.includes("complete") || lowercaseStatus === "done" || lowercaseStatus === "finished") {
      return "Completed";
    } else if (lowercaseStatus.includes("progress") || lowercaseStatus === "ongoing" || lowercaseStatus === "inprogress") {
      return "InProgress";
    } else if (lowercaseStatus.includes("pend") || lowercaseStatus === "new" || lowercaseStatus === "waiting") {
      return "Pending";
    }
    return status;
  };
  const totalProjects = projects.length;
  const completedProjects = projects.filter((project) => getStandardStatus(workspaceStatuses[project.id] || project.status) === "Completed").length;
  const pendingProjects = projects.filter((project) => getStandardStatus(workspaceStatuses[project.id] || project.status) === "Pending").length;
  const inProgressProjects = projects.filter((project) => getStandardStatus(workspaceStatuses[project.id] || project.status) === "InProgress").length;
  const completionPercentage = totalProjects > 0 ? Math.round(completedProjects / totalProjects * 100) : 0;
  const tenderCount = tenders.length;
  const vendorDisplayName = vendorName || vendorData?.vendorDetails?.primaryContactName || currentUser?.name || "Vendor";
  const vendorCompanyName = vendorData?.companyDetails?.companyName || "Your company profile";
  const revenueTrend = financeData.map((point) => point.revenue);
  const tiles = [
    { label: "Total projects", value: totalProjects, hint: "Approved with workspace access" },
    { label: "In progress", value: inProgressProjects, status: STATUS.IN_PROGRESS, hint: "Work underway" },
    { label: "Completed", value: completedProjects, status: STATUS.COMPLETED, hint: "Delivered" },
    { label: "Pending", value: pendingProjects, status: STATUS.PENDING, hint: "Awaiting first move" },
    { label: "Open tenders", value: tenderCount, hint: "Matched to your profile" },
    { label: "Net profit", value: formatCurrencyShort(financeSummary.netProfit), hint: "From finance records", trend: revenueTrend }
  ];
  const statusCounts = {
    [STATUS.PENDING]: pendingProjects,
    [STATUS.IN_PROGRESS]: inProgressProjects,
    [STATUS.COMPLETED]: completedProjects
  };
  const financeForPanel = {
    series: financeData.map((point) => ({ label: point.date, date: point.date, revenue: point.revenue })),
    totalRevenue: financeSummary.totalRevenue,
    totalExpenses: financeSummary.totalExpenses,
    netProfit: financeSummary.netProfit
  };
  const quickActions = [
    { label: "Open Projects", onClick: () => navigate("/VendorDashboard/projects") },
    { label: "Review Leads", onClick: () => navigate("/VendorDashboard/leads") },
    { label: "Manage Team", onClick: () => navigate("/VendorDashboard/team") }
  ];
  useEffect(() => {
    const vendorId = vendorData?.vendorId || currentUser?.vendorId || currentUser?.id;
    if (!vendorId)
      return;
    const fetchTenders = async () => {
      try {
        const res = await fetch(`/api/vendor/tenders?vendorId=${encodeURIComponent(vendorId)}`, {
          credentials: "include"
        });
        const json = await res.json();
        if (json.success && Array.isArray(json.data) && json.data.length > 0) {
          setTenders(
            json.data.map((t) => ({
              title: t.title || t.tenderTitle || "Untitled Tender",
              description: t.description || t.tenderDescription || "",
              closingDate: t.closingDate ? new Date(t.closingDate).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }) : t.deadline || "",
              amount: t.amount || t.budget || t.estimatedValue || ""
            }))
          );
        }
      } catch (err) {
        console.warn("[VendorDashboard] Could not load tenders:", err.message);
      }
    };
    fetchTenders();
  }, [vendorData?.vendorId, currentUser?.vendorId, currentUser?.id]);
  useEffect(() => {
    const fetchFinanceData = async () => {
      try {
        setLoadingFinance(true);
        const token = localStorage.getItem("authToken");
        const headers = {
          "Content-Type": "application/json"
        };
        if (token) {
          headers["Authorization"] = `Bearer ${token}`;
        }
        const response = await fetch(`${config.VENDOR_BACKEND_URL}/api/finance/overview`, {
          credentials: "include",
          headers
        });
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data?.monthlyData) {
            const chartData = data.data.monthlyData.map((month) => ({
              date: month.month + ", 2024",
              // Convert 'MMM YYYY' to date format
              revenue: month.totalRevenue || 0
            }));
            setFinanceData(chartData);
            if (data.data?.summary) {
              setFinanceSummary({
                totalRevenue: data.data.summary.totalRevenue || 0,
                totalExpenses: data.data.summary.totalExpenses || 0,
                netProfit: data.data.summary.netProfit || 0
              });
            }
          }
        }
      } catch (error2) {
        console.error("Error fetching finance data:", error2);
      } finally {
        setLoadingFinance(false);
      }
    };
    fetchFinanceData();
  }, []);
  useEffect(() => {
    console.log("VendorDashboard - Current User:", currentUser);
    console.log("VendorDashboard - Vendor Data:", vendorData);
  }, []);
  return /* @__PURE__ */ React.createElement("div", { className: "mx-auto max-w-[1440px] space-y-6 px-4 pb-16 pt-6 sm:px-6 sm:pt-8 sm:pb-24 lg:px-8" }, !checkingPasskey && !userHasPasskey && currentUser?.email && /* @__PURE__ */ React.createElement(
    PasskeyRegistrationBanner,
    {
      userId: currentUser?.vendorId || currentUser?.id,
      email: currentUser.email,
      onPasskeyRegistered: () => {
        setUserHasPasskey(true);
      }
    }
  ), /* @__PURE__ */ React.createElement("header", { className: "flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between" }, /* @__PURE__ */ React.createElement("div", { className: "min-w-0" }, /* @__PURE__ */ React.createElement("p", { className: "text-[10px] font-medium uppercase tracking-[0.16em] text-dim" }, "Dashboard"), /* @__PURE__ */ React.createElement("h1", { className: "mt-1.5 truncate text-[26px] font-semibold tracking-tight text-ink sm:text-[28px]" }, "Good day, ", vendorDisplayName), /* @__PURE__ */ React.createElement("div", { className: "mt-2 flex flex-wrap items-center gap-4 text-sm text-dim" }, /* @__PURE__ */ React.createElement("span", { className: "inline-flex items-center gap-1.5" }, /* @__PURE__ */ React.createElement(Building2, { size: 14 }), vendorCompanyName), /* @__PURE__ */ React.createElement("span", { className: "inline-flex items-center gap-1.5" }, /* @__PURE__ */ React.createElement(TrendingUp, { size: 14 }), tenderCount, " tenders"))), /* @__PURE__ */ React.createElement("nav", { className: "flex flex-wrap items-center gap-x-5 gap-y-2", "aria-label": "Quick actions" }, quickActions.map((action) => /* @__PURE__ */ React.createElement(
    "button",
    {
      key: action.label,
      type: "button",
      onClick: action.onClick,
      className: "group inline-flex items-center gap-1 text-sm font-medium text-ink transition-colors hover:text-dim focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink"
    },
    action.label,
    /* @__PURE__ */ React.createElement(ArrowRight, { size: 14, className: "vd-row-arrow" })
  )))), /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6" }, tiles.map((tile) => /* @__PURE__ */ React.createElement(MetricTile, { key: tile.label, ...tile, loading: isLoading }))), /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-1 gap-4 lg:grid-cols-[2fr_1fr]" }, /* @__PURE__ */ React.createElement("section", { className: "rounded-lg border border-line bg-surface p-5" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-baseline justify-between gap-4" }, /* @__PURE__ */ React.createElement("h2", { className: "text-[15px] font-semibold tracking-tight text-ink" }, "Portfolio split"), /* @__PURE__ */ React.createElement("p", { className: "tnum text-xs text-dim" }, totalProjects, " projects")), /* @__PURE__ */ React.createElement("div", { className: "mt-4" }, /* @__PURE__ */ React.createElement(StatusBar, { total: totalProjects, counts: statusCounts }))), /* @__PURE__ */ React.createElement("section", { className: "rounded-lg border border-line bg-surface p-5" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-baseline justify-between gap-4" }, /* @__PURE__ */ React.createElement("h2", { className: "text-[15px] font-semibold tracking-tight text-ink" }, "Pipeline completion"), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-dim" }, pendingProjects + inProgressProjects > 0 ? `${pendingProjects + inProgressProjects} need follow-up` : "up to date")), /* @__PURE__ */ React.createElement("div", { className: "mt-4" }, /* @__PURE__ */ React.createElement(ProgressBar, { percent: completionPercentage, label: "Completed of total" })))), /* @__PURE__ */ React.createElement(AdditionalDocsPanel, null), /* @__PURE__ */ React.createElement(
    FinancePanel,
    {
      finance: financeForPanel,
      state: loadingFinance ? "loading" : financeData.length > 0 ? "ready" : "empty"
    }
  ), /* @__PURE__ */ React.createElement(
    Panel,
    {
      title: "Delivery pipeline",
      meta: `${completedProjects}/${totalProjects} complete`,
      state: isLoading ? "loading" : error ? "error" : "ready",
      errorHint: error,
      bodyPadded: false
    },
    /* @__PURE__ */ React.createElement(
      ProjectTable,
      {
        projects: projects.map((project) => ({
          ...project,
          status: getStandardStatus(workspaceStatuses[project.id] || project.status)
        }))
      }
    )
  ), /* @__PURE__ */ React.createElement(
    TenderPanel,
    {
      tenders,
      state: isLoading ? "loading" : tenders.length > 0 ? "ready" : "empty"
    }
  ), /* @__PURE__ */ React.createElement("div", { className: "pb-4 sm:pb-0" }, /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => navigate("/VendorDashboard/support"),
      className: "flex w-full items-center justify-center gap-2 rounded-lg bg-cta px-4 py-3 text-sm font-semibold text-cta-foreground shadow-lg transition-all hover:opacity-90 sm:fixed sm:bottom-6 sm:left-auto sm:right-6 sm:z-30 sm:w-auto",
      title: "Open Support Centre"
    },
    /* @__PURE__ */ React.createElement(LifeBuoy, { size: 18 }),
    /* @__PURE__ */ React.createElement("span", null, "Support")
  )), showCompanyDetailsPrompt && /* @__PURE__ */ React.createElement("div", { className: "fixed inset-0 bg-cta backdrop-blur-sm z-50 flex items-center justify-center p-4 sm:p-6" }, /* @__PURE__ */ React.createElement("div", { className: "bg-surface rounded-xl shadow-xl w-full max-w-md flex flex-col overflow-hidden" }, /* @__PURE__ */ React.createElement("div", { className: "flex justify-between items-center px-6 py-4 border-b border-line flex-shrink-0 bg-surface" }, /* @__PURE__ */ React.createElement("h2", { className: "text-xl font-semibold text-ink" }, "Complete your company details"), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: handleCompanyPromptLater,
      className: "text-dim hover:text-ink transition-colors",
      "aria-label": "Close"
    },
    /* @__PURE__ */ React.createElement(X, { size: 20 })
  )), /* @__PURE__ */ React.createElement("div", { className: "p-6 bg-surface" }, /* @__PURE__ */ React.createElement("p", { className: "text-sm text-dim" }, "Please fill the company details \u2014 some information is missing from your vendor profile. Complete it so clients can see your full company profile."), missingCompanyFields.length > 0 && /* @__PURE__ */ React.createElement("ul", { className: "mt-4 space-y-1.5 text-sm text-ink" }, missingCompanyFields.map((label) => /* @__PURE__ */ React.createElement("li", { key: label, className: "flex items-center gap-2" }, /* @__PURE__ */ React.createElement("span", { className: "h-1.5 w-1.5 rounded-full bg-ink" }), label))), /* @__PURE__ */ React.createElement("div", { className: "flex justify-end gap-3 pt-6 mt-6 border-t border-line" }, /* @__PURE__ */ React.createElement(
    "button",
    {
      type: "button",
      onClick: handleCompanyPromptLater,
      className: "px-4 py-2 bg-surface-hover text-ink rounded-md hover:bg-surface-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-line transition-colors"
    },
    "Remind me later"
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      type: "button",
      onClick: () => navigate("/portfolio?tab=company"),
      className: "px-4 py-2 bg-black text-white rounded-md hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ink transition-opacity"
    },
    "Fill company details"
  ))))));
};

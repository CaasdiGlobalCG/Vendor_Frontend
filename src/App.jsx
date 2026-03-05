import { Routes, Route, useNavigate, useLocation } from "react-router-dom";
import { useEffect, useContext, useState, useMemo } from "react";
import HomePage from "./pages/HomePage";
import { VendorProvider, VendorContext } from "./context/VendorContext";
import { UserProvider, UserContext } from "./context/UserContext";
import { NotificationProvider } from "./context/NotificationContext";
import { RBACProvider } from "./rbac";
import TeamPage from "./rbac/pages/TeamPage";
import InviteAcceptPage from "./rbac/pages/InviteAcceptPage";
import { ModuleGuard } from "./rbac/components/ModuleGuard";
import UnauthorizedPage from "./pages/UnauthorizedPage";
import SignUp from "./components/SignUp";
import Home from "./pages/Home/Home";
import UserProjectPage from './pages/UserProjectPage/UserProjectPage'; // Assuming UserProjectPage is here
import UserPortfolio from './pages/UserProductPage/UserProductPage'; // Assuming UserProductPage is here
import { VendorDashboard } from "./pages/VendorDashboard/VendorDashboard";
import WorkspacePage from "./pages/WorkspacePage";
import WorkspaceList from "./pages/WorkspaceList/WorkspaceList";
import NewAuditorDashboard from "./components/NewAuditorDashboard";
import Form1 from "./components/Form1";
import Form2 from "./components/Form2";
import Form3 from "./components/Form3";
import Form4 from "./components/Form4";
import Form5 from "./components/Form5";
import Form6 from "./components/Form6";
import Auditor from "./components/AuditorWaiting";
import Login from "./components/Login";
import GoogleOAuthCallback from "./components/GoogleOAuthCallback";
import { Header } from "./components/Header/Header";
import { Outlet } from "react-router-dom";
import ProjectsPage from "./pages/ProjectsPage/ProjectsPage"; // Assuming ProjectsPage is here
import LeadDetailPage from "./pages/LeadDetailPage/LeadDetailPage"; // Assuming LeadDetailPage is here
import LeadsPage from "./pages/Leadspage/LeadsPage"; // Assuming LeadsPage is here
import NewLeadsPage from "./pages/Leadspage/NewLeadsPage";
import SentLeadsPage from "./pages/Leadspage/SentLeadsPage";
import ProjectLeadForm from "./pages/ProjectLeadFolder/ProjectLeadForm"; // Assuming ProjectLeadForm is here
import NotificationsPage from "./pages/NotificationPage/NotificationPage"; // Import NotificationsPage
import RoleSelection from "./pages/Onboarding/RoleSelection"; // Import Role Selector
import Verification from "./components/Verification";
import TermsAndConditions from "./components/TermsAndConditions";
import { Component } from "react";
import config from "./config/env";
import './App.css';
import NewCustomerPage from "./pages/WorkspacePage/components/invoice/customers/NewCustomerPage";
import PMPOManagementPage from "./pages/PMDashboard/PMPOManagementPage";
import VendorPOResponsePage from "./pages/WorkspacePage/components/invoice/purchase-orders/VendorPOResponsePage";

// Error Boundary Component
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // You can log the error to an error reporting service
    console.error("ErrorBoundary caught an error:", error, errorInfo);
    this.setState({ error, errorInfo });
  }

  render() {
    if (this.state.hasError) {
      // You can render any custom fallback UI
      return (
        <div className="p-6 bg-red-100 border border-red-300 rounded-lg">
          <h2 className="text-lg font-semibold text-red-700 mb-2">Something went wrong!</h2>
          <p className="text-red-600 mb-4">The application encountered an error.</p>
          <button 
            onClick={() => this.setState({ hasError: false })}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// Mock projects data for the VendorDashboard
const mockProjects = [
  {
    id: 1,
    name: "Highway Construction Project",
    client: "National Highway Authority",
    status: "Completed",
    progress: 100,
    budget: "₹15.3 cr",
    startDate: "2023-01-15",
    endDate: "2023-12-20"
  },
  {
    id: 2,
    name: "Railway Electrification",
    client: "Ministry of Railways",
    status: "Pending",
    progress: 65,
    budget: "₹8.7 cr",
    startDate: "2023-05-10",
    endDate: "2024-06-30"
  },
  {
    id: 3,
    name: "Municipal Waste Management",
    client: "Municipal Corporation",
    status: "Completed",
    progress: 100,
    budget: "₹4.2 cr",
    startDate: "2023-03-01",
    endDate: "2023-11-15"
  }
];

// Layout component with app initialization logging
const Layout = () => {
  const { currentUser: vendorUser } = useContext(VendorContext);
  const { currentUser: userContextUser } = useContext(UserContext);
  
  // Log context values on mount
  useEffect(() => {
    console.log("Layout mounted - VendorContext user:", vendorUser);
    console.log("Layout mounted - UserContext user:", userContextUser);
  }, [vendorUser, userContextUser]);

  return (
    <div className="bg-white min-h-screen ">{/* Or your default page background */}
        <div className="pt-5 px-5 pb-0">
            <Header />
        </div>
 
      <main>
        <Outlet /> {/* Page content will render here */}
      </main>
    </div>
  );
};

function App() {
  return (
      <UserProvider>
        <VendorProvider>
          <RBACProvider>
            <ErrorBoundary>
              <NotificationProvider>
                <AppContent />
              </NotificationProvider>
            </ErrorBoundary>
          </RBACProvider>
        </VendorProvider>
      </UserProvider>
  );
}

function AppContent() {
  const { currentUser: vendorUser } = useContext(VendorContext);
  const { hydrateCurrentUser } = useContext(VendorContext);
  const { currentUser: userContextUser } = useContext(UserContext);
  const navigate = useNavigate();
  const location = useLocation();
  const [isExchangingHandoff, setIsExchangingHandoff] = useState(false);

  // Synchronous check to avoid a 1-frame flash of the '/' page.
  // useEffect runs after first paint, so we gate rendering here when handoff is present.
  const handoffParam = useMemo(() => {
    const params = new URLSearchParams(location.search);
    const handoff = params.get('handoff');
    if (!handoff) return null;
    const guardKey = `vendorHandoffExchanged:${handoff}`;
    const already = sessionStorage.getItem(guardKey) === 'true';
    return already ? null : handoff;
  }, [location.search]);
  
  // Log context values on mount
  useEffect(() => {
    // console.log("Check mirroring");
    console.log("App initialized - VendorContext user:", vendorUser);
    console.log("App initialized - UserContext user:", userContextUser);
    console.log("Added GitHub Actions");
  }, []);

  // Client → Vendor switch: accept one-time handoff code and set vendor httpOnly cookie.
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const handoff = params.get('handoff');
    if (!handoff) return;

    const guardKey = `vendorHandoffExchanged:${handoff}`;
    const already = sessionStorage.getItem(guardKey) === 'true';
    if (already) {
      params.delete('handoff');
      navigate({ search: params.toString() }, { replace: true });
      return;
    }

    let isCancelled = false;
    setIsExchangingHandoff(true);

    (async () => {
      try {
        const r = await fetch(`/api/auth/handoff/vendor-exchange?code=${encodeURIComponent(handoff)}`, {
          method: 'GET',
          credentials: 'include',
        });
        const d = await r.json().catch(() => null);
        if (!r.ok || !d?.success) {
          console.error('Vendor App: handoff vendor-exchange failed', { status: r.status, body: d });
          return;
        }

        // Refresh VendorContext from cookie-authenticated /api/vendor/me
        try {
          await hydrateCurrentUser();
        } catch {}

        sessionStorage.setItem(guardKey, 'true');

        // Remove handoff param from URL
        params.delete('handoff');
        navigate({ search: params.toString() }, { replace: true });

        // Route into the vendor dashboard; VendorGuard will redirect if onboarding is incomplete.
        navigate('/VendorDashboard', { replace: true });
      } catch (e) {
        console.error('Vendor App: handoff vendor-exchange error', e);
      } finally {
        if (!isCancelled) setIsExchangingHandoff(false);
      }
    })();

    return () => {
      isCancelled = true;
    };
  }, [location.search, navigate, hydrateCurrentUser]);

  if (handoffParam || isExchangingHandoff) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-700">Switching to Vendor…</p>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/role-selection" element={<RoleSelection />} />
      <Route path="/verification" element={<Verification />} />
      <Route path="/home" element={<HomePage />} />
      <Route path="/signup" element={<SignUp />} />
      <Route path="/login" element={<Login />} />
      <Route path="/invite/accept" element={<InviteAcceptPage />} />
      <Route path="/unauthorized" element={<UnauthorizedPage />} />
      {/* Protect vendor onboarding routes behind RoleGuard */}
      <Route path="/Form1" element={<RoleGuard><Form1 /></RoleGuard>} />
      <Route path="/Form2" element={<Form2 />} />
      <Route path="/Form3" element={<Form3 />} />
      <Route path="/Form4" element={<Form4 />} />
      <Route path="/Form5" element={<Form5 />} />
      <Route path="/Form6" element={<Form6 />} />
      <Route path="/terms-and-conditions" element={<TermsAndConditions />} />
      <Route path="/Auditorapprove" element={<Auditor />} />
      <Route path="/NewAuditor" element={<NewAuditorDashboard />} />
      <Route path="/auth/google/callback" element={<GoogleOAuthCallback />} />
      {/* Nested route for VendorDashboard */}
      <Route path="/VendorDashboard" element={<RoleGuard><VendorGuard><Layout /></VendorGuard></RoleGuard>}>
        <Route index element={<VendorDashboard mockProjects={mockProjects} />} />
        <Route path="projects" element={<ModuleGuard module="projects"><ProjectsPage mockProjects={mockProjects} /></ModuleGuard>} />
        <Route path="leads" element={<ModuleGuard module="leads"><LeadsPage /></ModuleGuard>} />
        <Route path="leads/newleads" element={<ModuleGuard module="leads"><NewLeadsPage /></ModuleGuard>} />
        <Route path="leads/sent" element={<ModuleGuard module="leads"><SentLeadsPage /></ModuleGuard>} />
        <Route path="workspace" element={<ModuleGuard module="workspace"><WorkspaceList /></ModuleGuard>} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="team" element={<ModuleGuard module="user_management"><TeamPage /></ModuleGuard>} />

      </Route>
      {/* PM PO Management Route */}
      <Route path="/pm/po-management" element={<RoleGuard><PMPOManagementPage /></RoleGuard>} />
      {/* Vendor PO Response Route */}
      <Route path="/workspace/po-responses" element={<RoleGuard><VendorPOResponsePage /></RoleGuard>} />
      {/* Removed EditCompany route as it's now handled with a modal */}
      <Route path="/vendor-home" element={<Home />} />
      <Route path="/userproject" element={<UserProjectPage />} />
      <Route path="/userproduct" element={<UserPortfolio />} />
      <Route path="/pmleads" element={<ProjectLeadForm />} />
      <Route path="/leads/:leadId" element={<LeadDetailPage />} />
      <Route path="/workspace" element={<WorkspacePage />} />
      <Route path="/VendorDashboard/workspace/:workspaceId" element={<WorkspacePage />} />
      <Route path="/VendorDashboard/workspace/:workspaceId/invoices" element={<WorkspacePage />} />
      <Route path="/customers/new" element={<NewCustomerPage />} />
      

      
      {/* Add other routes as needed */}
    </Routes>
  );
}

export default App;

// Guard to ensure role is selected before accessing protected routes
function RoleGuard({ children }) {
  const navigate = useNavigate();
  const { currentUser, isHydratingUser } = useContext(VendorContext);
  useEffect(() => {
    const checkRole = async () => {
      // With cookie-based auth, role-selection is driven by vendor backend state.
      // If we're authenticated, allow navigation and let VendorGuard handle onboarding.
      if (isHydratingUser) return;
      if (currentUser) return;

      if (window.location.pathname !== '/login') {
        navigate('/login', { replace: true });
      }
    };
    checkRole();
  }, [navigate, currentUser, isHydratingUser]);
  return children;
}

// Guard to ensure vendor has completed onboarding; otherwise send to Form1/Auditorapprove
function VendorGuard({ children }) {
  const navigate = useNavigate();
  const { currentUser, isHydratingUser } = useContext(VendorContext);
  useEffect(() => {
    // Avoid redirecting during hydration; otherwise users can briefly land on dashboard
    // and then get sent to Form1 due to an intermediate/unknown hasFilledForm state.
    if (isHydratingUser) return;

    // Team members are pre-approved — always allow dashboard access.
    // Their permissions are controlled by RBAC, not the onboarding gate.
    if (currentUser?.isTeamMember === true) return;

    // Only redirect when we have a resolved user AND a resolved hasFilledForm boolean.
    const hasFilledFormRaw = currentUser?.hasFilledForm;
    if (typeof hasFilledFormRaw !== 'boolean') return;

    const status = String(currentUser?.status || '').trim().toLowerCase();

    // Approved vendors should never be bounced back to onboarding.
    if (status === 'approved') return;

    // If the vendor is already in a review state, do not send them back to Form1.
    if (status === 'pending') {
      if (hasFilledFormRaw === true) {
        navigate('/Auditorapprove', { replace: true });
      } else {
        navigate('/Form1', { replace: true });
      }
      return;
    }

    if (hasFilledFormRaw === false) {
      navigate('/Form1', { replace: true });
      return;
    }
  }, [navigate, currentUser, isHydratingUser]);
  return children;
}
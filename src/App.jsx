import { Routes, Route, useNavigate } from "react-router-dom";
import { useEffect, useContext } from "react";
import HomePage from "./pages/HomePage";
import { VendorProvider, VendorContext } from "./context/VendorContext";
import { UserProvider, UserContext } from "./context/UserContext";
import { NotificationProvider } from "./context/NotificationContext";
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
import ProjectLeadForm from "./pages/ProjectLeadFolder/ProjectLeadForm"; // Assuming ProjectLeadForm is here
import NotificationsPage from "./pages/NotificationPage/NotificationPage"; // Import NotificationsPage
import RoleSelection from "./pages/Onboarding/RoleSelection"; // Import Role Selector
import Verification from "./components/Verification";
  import TermsAndConditions from "./components/TermsAndConditions";
import { Component } from "react";
import config from "./config/env";
import './App.css';
import NewCustomerPage from "./pages/WorkspacePage/components/invoice/customers/NewCustomerPage";

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
        <ErrorBoundary>
          <NotificationProvider>
            <AppContent />
          </NotificationProvider>
        </ErrorBoundary>
      </VendorProvider>
    </UserProvider>
  );
}

function AppContent() {
  const { currentUser: vendorUser } = useContext(VendorContext);
  const { currentUser: userContextUser } = useContext(UserContext);
  
  // Log context values on mount
  useEffect(() => {
    // console.log("Check mirroring");
    console.log("App initialized - VendorContext user:", vendorUser);
    console.log("App initialized - UserContext user:", userContextUser);
  }, []);

  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/role-selection" element={<RoleSelection />} />
      <Route path="/verification" element={<Verification />} />
      <Route path="/home" element={<HomePage />} />
      <Route path="/signup" element={<SignUp />} />
      <Route path="/login" element={<Login />} />
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
        <Route path="projects" element={<ProjectsPage mockProjects={mockProjects} />} />
        <Route path="leads" element={<LeadsPage />} />
        <Route path="workspace" element={<WorkspaceList />} />
        <Route path="notifications" element={<NotificationsPage />} />

      </Route>
      {/* Removed EditCompany route as it's now handled with a modal */}
      <Route path="/vendor-home" element={<Home />} />
      <Route path="/userproject" element={<UserProjectPage />} />
      <Route path="/userproduct" element={<UserPortfolio />} />
      <Route path="/pmleads" element={<ProjectLeadForm />} />
      <Route path="/leads/:leadId" element={<LeadDetailPage />} />
      <Route path="/workspace" element={<WorkspacePage />} />
      <Route path="/VendorDashboard/workspace/:workspaceId" element={<WorkspacePage />} />
      <Route path="/customers/new" element={<NewCustomerPage />} />
      

      
      {/* Add other routes as needed */}
    </Routes>
  );
}

export default App;

// Guard to ensure role is selected before accessing protected routes
function RoleGuard({ children }) {
  const navigate = useNavigate();
  useEffect(() => {
    const checkRole = async () => {
      const rs = localStorage.getItem('roleSelected');
      if (rs === 'true') return;
      const token = localStorage.getItem('authToken');
      if (token) {
        try {
          const r = await fetch('/api/auth/verify', {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (r.ok) {
            const d = await r.json();
            if (d?.roleSelected === true) {
              localStorage.setItem('roleSelected', 'true');
              return;
            }
          }
        } catch {}
      }
      // Avoid redirect loop if already on role-selection
      if (window.location.pathname !== '/role-selection') {
        navigate('/role-selection', { replace: true });
      }
    };
    checkRole();
  }, [navigate]);
  return children;
}

// Guard to ensure vendor has completed onboarding; otherwise send to Form1/Auditorapprove
function VendorGuard({ children }) {
  const navigate = useNavigate();
  useEffect(() => {
    const checkVendorStatus = async () => {
      try {
        const email = localStorage.getItem('email');
        if (!email) return;
        const res = await fetch(`/api/vendor/user-status?email=${encodeURIComponent(email)}`);
        if (!res.ok) return;
        const data = await res.json();
        const hasFilledForm = data?.data?.hasFilledForm === true;
        const status = (data?.data?.status || '').toLowerCase();
        if (!hasFilledForm) {
          try {
            await fetch(`/api/vendor/create-user`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email }),
            });
          } catch {}
          return navigate('/Form1', { replace: true });
        }
        if (status !== 'approved') return navigate('/Auditorapprove', { replace: true });
      } catch {}
    };
    checkVendorStatus();
  }, [navigate]);
  return children;
}
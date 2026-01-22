import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "../Styles/RoleSelection.css"; // Assuming this is your CSS file
import { Auth } from "aws-amplify";
import config from '../config/env';
function RoleSelection() {
  const [role, setRole] = useState("");
  const navigate = useNavigate();
  const location = useLocation();

  // Extract email from URL params or state (googleId no longer required)
  const queryParams = new URLSearchParams(location.search);
  const email = queryParams.get("email") || location.state?.email;

  // Check authentication status on page load
  useEffect(() => {
    const verifyAuth = async () => {
      try {
        const user = await Auth.currentAuthenticatedUser();
        console.log("Authenticated user:", user);
        const session = await Auth.currentSession();
        console.log("Current session:", session);
        const idToken = session.getIdToken().getJwtToken();
        const response = await fetch(`/api/auth/verify`, {
          headers: { Authorization: `Bearer ${idToken}` },
        });
        const data = await response.json();
        console.log("Verify response:", data);
        const selectedRole = (data?.lastSelectedRole || data?.role || '').toLowerCase();
        const roleSelected = data?.roleSelected === true;
        if (roleSelected && selectedRole) {
          if (selectedRole === "vendor") navigate("/Form1", { replace: true });
          else if (selectedRole === "client") navigate("/client-page", { replace: true });
        }
      } catch (error) {
        console.error("Authentication failed:", error);
        navigate("/login", { replace: true }); // Redirect to login if no session
      }
    };
    verifyAuth();
  }, [navigate]);

  const handleRoleSelection = async () => {
    if (!role) {
      alert("Please select a role.");
      return;
    }

    try {
      let session;
      try {
        session = await Auth.currentSession();
      } catch (sessionError) {
        console.error("No active session, attempting to refresh:", sessionError);
        const user = await Auth.currentAuthenticatedUser(); // Try to refresh session
        session = await Auth.currentSession();
      }
      const idToken = session.getIdToken().getJwtToken();

      const response = await fetch(`/api/auth/set-role`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ role }),
      });

      const data = await response.json();
      if (response.ok) {
        if (role === "vendor") navigate("/Form1", { replace: true });
        else navigate("/client-page", { replace: true });
      } else {
        throw new Error(data.error || "Failed to save role");
      }
    } catch (error) {
      console.error("Error saving role:", error);
      if (error.message === "No current user") {
        alert("Session expired. Please log in again.");
        navigate("/login");
      } else {
        alert("Failed to save role. Please try again.");
      }
    }
  };

  return (
    <div className="role-main-container">
      {/* Left Section (Background and Text) */}
      <div className="role-left-section">
        <div className="role-rectangle" />
        <span className="role-whats-new">what’s new?</span>
        <span className="role-vendor-project-management">
          Vendor and project management
        </span>
        <span className="role-smart-vendor-matching">
          Offers smart vendor matching, private tendering, dedicated project
          managers, CRM & task management, forecasting & analytics, and
          end-to-end project support. While currently managed manually, we are
          developing an AI-driven SaaS platform to enhance efficiency and
          automation.
        </span>
        <div className="role-pagination">
          <div className="role-rectangle-9" />
          <div className="role-rectangle-a" />
          <div className="role-rectangle-b" />
        </div>
      </div>

      {/* Right Section (Form Content) */}
      <div className="role-right-section">
        <span className="role-cg">CG</span>
        <div className="entire-selection">
          <span className="role-vendor-client">Are you a vendor or client?</span>
          <span className="role-specify-role">
            Please specify whether you are a vendor or a client
          </span>

          {/* Vendor Option */}
          <div className="role-rectangle-1">
            <div className="role-ellipse" />
            <div className="role-ellipse-2" />
            <div className="role-ellipse-3" />
            <span className="role-vendor">Vendor</span>
            <span className="role-choose-vendor">Choose 'Vendor' if you are one</span>
            <input
              type="radio"
              name="role"
              value="vendor"
              onChange={(e) => setRole(e.target.value)}
              className="role-radio-button-line"
            />
          </div>

          {/* Client Option */}
          <div className="role-rectangle-4">
            <div className="role-ellipse-5" />
            <div className="role-ellipse-6" />
            <div className="role-ellipse-7" />
            <span className="role-client">Client</span>
            <span className="role-choose-client-text">
              Choose 'Client' if you are one
            </span>
            <input
              type="radio"
              name="role"
              value="client"
              onChange={(e) => setRole(e.target.value)}
              className="role-radio-button-regular"
            />
          </div>
        </div>

        {/* Continue Button */}
        <div className="role-rectangle-8" onClick={handleRoleSelection}>
          <span className="role-continue">Continue</span>
        </div>
      </div>
    </div>
  );
}

export default RoleSelection;
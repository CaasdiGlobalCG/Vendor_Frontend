import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import SidebarContent from "./SidebarContent";
import StepIndicator from "./StepIndicator";

function TermsAndConditions() {
  const navigate = useNavigate();
  const [isAccepted, setIsAccepted] = useState(false);

  const handleAccept = () => {
    if (isAccepted) {
      // Navigate to the next step or dashboard
      navigate("/VendorDashboard");
    }
  };

  const handleDecline = () => {
    // Navigate back or show message
    navigate("/Form6");
  };

  return (
    <div className="flex min-h-screen bg-white">
      {/* Left Sidebar */}
      <SidebarContent />

      {/* Right Content */}
      <div className="flex-1 flex flex-col">
        {/* Step Indicator */}
        <StepIndicator currentStep={7} />

        {/* Terms Content */}
        <div className="w-full max-w-4xl mx-auto px-4 pb-10 bg-white md:px-0">
          <h1 className="text-2xl font-bold text-gray-900 mb-8">
            Terms & Condition
          </h1>

          <div className="max-w-none space-y-8">
            {/* Terms Content */}
            <div className="border-t border-gray-200 pt-6">
              <div className="max-h-96 overflow-y-auto space-y-6 text-gray-700">
                <p className="text-sm leading-relaxed">
                  Welcome to CAASDI Global ("Company", "we", "our", or "us"). These Terms and Conditions ("Terms") govern your use of the CAASDI Global platform, services, and related applications (collectively, the "Platform"). By registering, accessing, or using the Platform, you ("User", "Client", "Vendor", or "Project Manager") agree to these Terms.
                </p>

                <section>
                  <h3 className="text-base font-semibold text-gray-900 mb-2">
                    1. Eligibility & Account Registration
                  </h3>
                  <div className="space-y-2 text-sm leading-relaxed">
                    <p>1.1 You must be at least 18 years of age and legally capable of entering into contracts.</p>
                    <p>1.2 Vendors must complete KYC verification and provide accurate business details before being listed.</p>
                    <p>1.3 Clients must provide valid project requirements for accurate vendor matching.</p>
                    <p>1.4 You are responsible for maintaining confidentiality of your account credentials.</p>
                  </div>
                </section>

                <section>
                  <h3 className="text-base font-semibold text-gray-900 mb-2">
                    2. Platform Services
                  </h3>
                  <div className="space-y-2 text-sm leading-relaxed">
                    <p>2.1 CAASDI Global provides a B2B marketplace connecting vendors with clients for project collaboration.</p>
                    <p>2.2 We facilitate vendor-client matching based on project requirements and vendor capabilities.</p>
                    <p>2.3 All transactions and agreements are between vendors and clients directly.</p>
                  </div>
                </section>

                <section>
                  <h3 className="text-base font-semibold text-gray-900 mb-2">
                    3. User Responsibilities
                  </h3>
                  <div className="space-y-2 text-sm leading-relaxed">
                    <p>3.1 Provide accurate and up-to-date information during registration and profile setup.</p>
                    <p>3.2 Maintain the confidentiality of your account credentials.</p>
                    <p>3.3 Comply with all applicable laws and regulations in your jurisdiction.</p>
                    <p>3.4 Respect intellectual property rights of other users and third parties.</p>
                  </div>
                </section>

                <section>
                  <h3 className="text-base font-semibold text-gray-900 mb-2">
                    4. Privacy & Data Protection
                  </h3>
                  <div className="space-y-2 text-sm leading-relaxed">
                    <p>4.1 We collect and process personal data in accordance with our Privacy Policy.</p>
                    <p>4.2 Your data is protected using industry-standard security measures.</p>
                    <p>4.3 We may share necessary information with vendors/clients for project facilitation.</p>
                  </div>
                </section>

                <section>
                  <h3 className="text-base font-semibold text-gray-900 mb-2">
                    5. Limitation of Liability
                  </h3>
                  <div className="space-y-2 text-sm leading-relaxed">
                    <p>5.1 CAASDI Global acts as an intermediary platform and is not responsible for vendor-client disputes.</p>
                    <p>5.2 We do not guarantee the quality, accuracy, or reliability of vendor services.</p>
                    <p>5.3 Our liability is limited to the maximum extent permitted by law.</p>
                  </div>
                </section>

                <section>
                  <h3 className="text-base font-semibold text-gray-900 mb-2">
                    6. Termination
                  </h3>
                  <div className="space-y-2 text-sm leading-relaxed">
                    <p>6.1 Either party may terminate this agreement at any time with written notice.</p>
                    <p>6.2 We reserve the right to suspend or terminate accounts for violations of these terms.</p>
                    <p>6.3 Upon termination, your access to the platform will be revoked.</p>
                  </div>
                </section>

                <section>
                  <h3 className="text-base font-semibold text-gray-900 mb-2">
                    7. Governing Law
                  </h3>
                  <p className="text-sm leading-relaxed">
                    These terms are governed by the laws of India. Any disputes shall be subject to the exclusive jurisdiction of the courts in India.
                  </p>
                </section>
              </div>
            </div>

            {/* Acceptance Checkbox */}
            <div className="flex items-start space-x-3 pt-6">
              <input
                type="checkbox"
                id="acceptTerms"
                checked={isAccepted}
                onChange={(e) => setIsAccepted(e.target.checked)}
                className="mt-1 h-4 w-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
              />
              <label htmlFor="acceptTerms" className="text-sm text-gray-700 leading-relaxed">
                I agree to terms and condition
              </label>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-between pt-6">
              <button
                type="button"
                onClick={handleDecline}
                className="px-6 py-2 border border-emerald-500 text-emerald-500 rounded-lg hover:bg-emerald-50 transition-colors"
              >
                cancel
              </button>
              <button
                type="button"
                onClick={handleAccept}
                disabled={!isAccepted}
                className="text-white px-6 py-2 rounded-lg font-medium bg-gradient-to-r from-[#0F5848] to-[#21BE9C] hover:from-[#0F5848]/90 hover:to-[#21BE9C]/90 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Agree and continue
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TermsAndConditions;



import React, { useState } from "react";
import footerImage from '../assets/footer_image.png';
import instagramIcon from '../assets/instagram.svg';
import linkedinIcon from '../assets/linkedin.svg';
import twitterIcon from '../assets/twitter.svg';

const TermsAndConditionsModal = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[1000] p-4">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl animate-modalFadeIn">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#21be9c] to-[#0f5848] px-8 py-6 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-white">Terms and Conditions</h2>
            <p className="text-white/80 text-sm mt-1">Caasdi Global Pvt. Ltd.</p>
          </div>
          <button 
            onClick={onClose}
            className="text-white hover:bg-white/20 rounded-full w-10 h-10 flex items-center justify-center transition-colors text-2xl"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="p-8 overflow-y-auto max-h-[calc(90vh-180px)]">
          <p className="text-gray-500 text-sm mb-6">Last Updated: December 2024</p>

          <div className="space-y-6 text-gray-700">
            <section>
              <h3 className="text-lg font-semibold text-black mb-3">1. Acceptance of Terms</h3>
              <p className="leading-relaxed">
                By accessing and using Caasdi Global's services, website, and platform, you acknowledge that you have read, understood, and agree to be bound by these Terms and Conditions. If you do not agree with any part of these terms, you must not use our services.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-black mb-3">2. Services Description</h3>
              <p className="leading-relaxed">
                Caasdi Global provides vendor and project management services, including but not limited to:
              </p>
              <ul className="list-disc ml-6 mt-2 space-y-1">
                <li>Smart vendor matching and procurement solutions</li>
                <li>Private tendering and bidding management</li>
                <li>Project management and execution support</li>
                <li>CRM and task management services</li>
                <li>B2B e-commerce and supply chain solutions</li>
                <li>Cost estimation and business execution services</li>
              </ul>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-black mb-3">3. User Obligations</h3>
              <p className="leading-relaxed">Users of our platform agree to:</p>
              <ul className="list-disc ml-6 mt-2 space-y-1">
                <li>Provide accurate, current, and complete information during registration</li>
                <li>Maintain the confidentiality of account credentials</li>
                <li>Use the platform only for lawful business purposes</li>
                <li>Not engage in any activity that could harm, disable, or impair our services</li>
                <li>Comply with all applicable laws and regulations</li>
              </ul>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-black mb-3">4. Vendor and Client Responsibilities</h3>
              <p className="leading-relaxed">
                <strong>For Vendors:</strong> Vendors must provide accurate information about their products, services, capabilities, and certifications. All pricing, delivery timelines, and quality commitments must be honored as agreed upon through the platform.
              </p>
              <p className="leading-relaxed mt-3">
                <strong>For Clients:</strong> Clients must provide clear project requirements, make timely payments as per agreed terms, and communicate professionally with vendors and project managers.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-black mb-3">5. Payment Terms</h3>
              <p className="leading-relaxed">
                All payments processed through our platform are subject to our payment policies. Service fees, transaction charges, and payment schedules will be clearly communicated before engagement. Late payments may incur additional charges as specified in individual service agreements.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-black mb-3">6. Intellectual Property</h3>
              <p className="leading-relaxed">
                All content, trademarks, logos, and intellectual property displayed on the Caasdi Global platform are owned by Caasdi Global Pvt. Ltd. or its licensors. Users may not copy, reproduce, distribute, or create derivative works without express written permission.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-black mb-3">7. Confidentiality</h3>
              <p className="leading-relaxed">
                Both parties agree to maintain strict confidentiality of all business information, trade secrets, pricing details, and proprietary data shared through the platform. This obligation survives the termination of services.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-black mb-3">8. Limitation of Liability</h3>
              <p className="leading-relaxed">
                Caasdi Global shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from the use of our services. Our total liability shall not exceed the fees paid by the user in the twelve months preceding the claim.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-black mb-3">9. Dispute Resolution</h3>
              <p className="leading-relaxed">
                Any disputes arising from these terms shall first be attempted to be resolved through good-faith negotiations. If unresolved, disputes shall be subject to arbitration in Bengaluru, Karnataka, India, in accordance with the Arbitration and Conciliation Act, 1996.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-black mb-3">10. Governing Law</h3>
              <p className="leading-relaxed">
                These Terms and Conditions are governed by and construed in accordance with the laws of India. The courts of Bengaluru, Karnataka shall have exclusive jurisdiction over any legal proceedings.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-black mb-3">11. Modifications</h3>
              <p className="leading-relaxed">
                Caasdi Global reserves the right to modify these Terms and Conditions at any time. Users will be notified of significant changes via email or platform notifications. Continued use of services after modifications constitutes acceptance of updated terms.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-black mb-3">12. Contact Information</h3>
              <p className="leading-relaxed">
                For questions regarding these Terms and Conditions, please contact us at:
              </p>
              <div className="mt-3 p-4 bg-gray-50 rounded-lg">
                <p className="font-semibold text-black">Caasdi Global Pvt. Ltd.</p>
                <p>#262, 80ft Road, BSK 1st stage, 2nd Block,</p>
                <p>Srinivasnagar, Bengaluru, Karnataka-560050</p>
                <p className="mt-2">Email: corporate@caasdiglobal.in</p>
                <p>Phone: +91-9606461633</p>
              </div>
            </section>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-8 py-4 bg-gray-50 flex justify-end gap-4">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-black text-white rounded-full font-medium hover:bg-gray-800 transition-colors"
          >
            I Understand
          </button>
        </div>
      </div>
    </div>
  );
};

const PoliciesModal = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[1000] p-4">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl animate-modalFadeIn">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#21be9c] to-[#0f5848] px-8 py-6 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-white">Privacy & Company Policies</h2>
            <p className="text-white/80 text-sm mt-1">Caasdi Global Pvt. Ltd.</p>
          </div>
          <button 
            onClick={onClose}
            className="text-white hover:bg-white/20 rounded-full w-10 h-10 flex items-center justify-center transition-colors text-2xl"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="p-8 overflow-y-auto max-h-[calc(90vh-180px)]">
          <p className="text-gray-500 text-sm mb-6">Last Updated: December 2024</p>

          <div className="space-y-6 text-gray-700">
            {/* Privacy Policy */}
            <div className="border-b border-gray-200 pb-6">
              <h2 className="text-xl font-bold text-[#21be9c] mb-4">Privacy Policy</h2>
              
              <section>
                <h3 className="text-lg font-semibold text-black mb-3">1. Information We Collect</h3>
                <p className="leading-relaxed mb-3">
                  We collect information that you provide directly to us, including:
                </p>
                <ul className="list-disc ml-6 space-y-1">
                  <li><strong>Personal Information:</strong> Name, email address, phone number, company name, job title, and business address</li>
                  <li><strong>Account Information:</strong> Username, password, and account preferences</li>
                  <li><strong>Business Information:</strong> Company registration details, GST numbers, certifications, and capabilities</li>
                  <li><strong>Transaction Data:</strong> Project details, quotes, invoices, and payment information</li>
                  <li><strong>Communication Data:</strong> Messages, feedback, and support requests</li>
                </ul>
              </section>

              <section className="mt-4">
                <h3 className="text-lg font-semibold text-black mb-3">2. How We Use Your Information</h3>
                <p className="leading-relaxed">We use the collected information to:</p>
                <ul className="list-disc ml-6 mt-2 space-y-1">
                  <li>Provide, maintain, and improve our vendor management platform</li>
                  <li>Match vendors with appropriate business opportunities</li>
                  <li>Process transactions and send related information</li>
                  <li>Send promotional communications (with your consent)</li>
                  <li>Respond to your comments, questions, and support requests</li>
                  <li>Monitor and analyze trends, usage, and activities</li>
                  <li>Detect, investigate, and prevent fraudulent transactions</li>
                </ul>
              </section>

              <section className="mt-4">
                <h3 className="text-lg font-semibold text-black mb-3">3. Information Sharing</h3>
                <p className="leading-relaxed">
                  We do not sell your personal information. We may share your information with:
                </p>
                <ul className="list-disc ml-6 mt-2 space-y-1">
                  <li><strong>Business Partners:</strong> Vendors and clients as necessary for project execution</li>
                  <li><strong>Service Providers:</strong> Third-party companies that perform services on our behalf</li>
                  <li><strong>Legal Requirements:</strong> When required by law or to protect our rights</li>
                  <li><strong>Business Transfers:</strong> In connection with any merger or acquisition</li>
                </ul>
              </section>

              <section className="mt-4">
                <h3 className="text-lg font-semibold text-black mb-3">4. Data Security</h3>
                <p className="leading-relaxed">
                  We implement industry-standard security measures including encryption, secure servers, and regular security audits to protect your personal information. However, no method of transmission over the Internet is 100% secure.
                </p>
              </section>

              <section className="mt-4">
                <h3 className="text-lg font-semibold text-black mb-3">5. Your Rights</h3>
                <p className="leading-relaxed">You have the right to:</p>
                <ul className="list-disc ml-6 mt-2 space-y-1">
                  <li>Access and receive a copy of your personal data</li>
                  <li>Rectify inaccurate or incomplete data</li>
                  <li>Request deletion of your personal data</li>
                  <li>Object to or restrict processing of your data</li>
                  <li>Data portability</li>
                  <li>Withdraw consent at any time</li>
                </ul>
              </section>
            </div>

            {/* Cookie Policy */}
            <div className="border-b border-gray-200 pb-6">
              <h2 className="text-xl font-bold text-[#21be9c] mb-4">Cookie Policy</h2>
              
              <section>
                <h3 className="text-lg font-semibold text-black mb-3">Use of Cookies</h3>
                <p className="leading-relaxed mb-3">
                  Our platform uses cookies and similar tracking technologies to enhance your experience. Types of cookies we use:
                </p>
                <ul className="list-disc ml-6 space-y-1">
                  <li><strong>Essential Cookies:</strong> Required for basic platform functionality</li>
                  <li><strong>Analytics Cookies:</strong> Help us understand how users interact with our platform</li>
                  <li><strong>Preference Cookies:</strong> Remember your settings and preferences</li>
                  <li><strong>Marketing Cookies:</strong> Used to deliver relevant advertisements (with consent)</li>
                </ul>
                <p className="leading-relaxed mt-3">
                  You can control cookies through your browser settings. Disabling certain cookies may limit platform functionality.
                </p>
              </section>
            </div>

            {/* Refund Policy */}
            <div className="border-b border-gray-200 pb-6">
              <h2 className="text-xl font-bold text-[#21be9c] mb-4">Refund & Cancellation Policy</h2>
              
              <section>
                <h3 className="text-lg font-semibold text-black mb-3">Service Cancellations</h3>
                <p className="leading-relaxed">
                  Cancellation requests must be submitted in writing at least 7 business days before the scheduled service date. Cancellations made within 7 days may be subject to cancellation fees as outlined in your service agreement.
                </p>
              </section>

              <section className="mt-4">
                <h3 className="text-lg font-semibold text-black mb-3">Refund Eligibility</h3>
                <ul className="list-disc ml-6 space-y-1">
                  <li>Full refunds are available for services not yet commenced</li>
                  <li>Partial refunds may be issued based on work completed</li>
                  <li>Platform fees are non-refundable once services have been initiated</li>
                  <li>Refund requests must be submitted within 30 days of service delivery</li>
                </ul>
              </section>

              <section className="mt-4">
                <h3 className="text-lg font-semibold text-black mb-3">Refund Processing</h3>
                <p className="leading-relaxed">
                  Approved refunds will be processed within 7-10 business days. Refunds will be credited to the original payment method.
                </p>
              </section>
            </div>

            {/* Data Retention Policy */}
            <div className="border-b border-gray-200 pb-6">
              <h2 className="text-xl font-bold text-[#21be9c] mb-4">Data Retention Policy</h2>
              <p className="leading-relaxed">
                We retain your personal information for as long as necessary to fulfill the purposes outlined in this policy, unless a longer retention period is required by law. Typically:
              </p>
              <ul className="list-disc ml-6 mt-2 space-y-1">
                <li><strong>Active Accounts:</strong> Data retained throughout the account's active period</li>
                <li><strong>Inactive Accounts:</strong> Data retained for 3 years after last activity</li>
                <li><strong>Transaction Records:</strong> Retained for 7 years for legal and tax purposes</li>
                <li><strong>Communication Logs:</strong> Retained for 2 years</li>
              </ul>
            </div>

            {/* Anti-Corruption Policy */}
            <div className="pb-6">
              <h2 className="text-xl font-bold text-[#21be9c] mb-4">Anti-Corruption & Ethics Policy</h2>
              <p className="leading-relaxed mb-3">
                Caasdi Global is committed to conducting business ethically and in compliance with all applicable anti-corruption laws. We prohibit:
              </p>
              <ul className="list-disc ml-6 space-y-1">
                <li>Bribery or corrupt payments of any kind</li>
                <li>Facilitation payments</li>
                <li>Conflicts of interest that are not disclosed</li>
                <li>Fraudulent business practices</li>
                <li>Unfair competitive practices</li>
              </ul>
              <p className="leading-relaxed mt-3">
                All users and partners are expected to adhere to these standards. Violations should be reported to corporate@caasdiglobal.in.
              </p>
            </div>

            {/* Contact */}
            <section>
              <h3 className="text-lg font-semibold text-black mb-3">Policy Inquiries</h3>
              <p className="leading-relaxed">
                For questions about our policies or to exercise your data rights, please contact:
              </p>
              <div className="mt-3 p-4 bg-gray-50 rounded-lg">
                <p className="font-semibold text-black">Data Protection Officer</p>
                <p>Caasdi Global Pvt. Ltd.</p>
                <p>#262, 80ft Road, BSK 1st stage, 2nd Block,</p>
                <p>Srinivasnagar, Bengaluru, Karnataka-560050</p>
                <p className="mt-2">Email: corporate@caasdiglobal.in</p>
                <p>Phone: +91-9606461633</p>
              </div>
            </section>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-8 py-4 bg-gray-50 flex justify-end gap-4">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-black text-white rounded-full font-medium hover:bg-gray-800 transition-colors"
          >
            I Understand
          </button>
        </div>
      </div>
    </div>
  );
};

const Footer = () => {
  const [termsModalOpen, setTermsModalOpen] = useState(false);
  const [policiesModalOpen, setPoliciesModalOpen] = useState(false);
  return (
    <footer className="relative w-full pt-15 pb-[30px] bg-black">
      <div className="max-w-[1440px] mx-auto px-5">
        <div className="flex flex-wrap justify-between items-start gap-[30px] lg:flex-nowrap md:text-left text-center">
          {/* Logo and Contact Info Column */}
          <div className="flex flex-col gap-[15px] p-5 flex-1 md:items-start items-center">
            <div className="flex items-center justify-start md:justify-start w-full">
            <div
  className="w-28 h-14 bg-no-repeat bg-center bg-cover lg:w-24 lg:h-12 md:w-20 md:h-10 sm:w-20 sm:h-10"
  style={{ backgroundImage: `url(${footerImage})` }}
></div>

              {/* <div className="w-28 h-14 bg-[url('../assets/footer_image.png')] bg-no-repeat bg-center bg-cover lg:w-24 lg:h-12 md:w-20 md:h-10 sm:w-20 sm:h-10"></div> */}
            </div>
            <div className="flex flex-col gap-[15px]">
              <h3 className="text-white font-poppins font-bold text-lg">Caasdi Global</h3>
              <p className="text-gray-400 font-poppins text-base leading-normal">
                #262, 80ft Road, BSK 1st stage, 2nd Block,<br />
                Srinivasnagar, Bengaluru, Karnataka-560050
              </p>
              <h3 className="text-white font-poppins font-bold text-lg">Contact Information</h3>
              <p className="text-gray-400 font-poppins text-base leading-normal">Email: corporate@caasdiglobal.in</p>
              <p className="text-gray-400 font-poppins text-base leading-normal">
                Phone: +91-9606461633, +91-9606461642, 
                <br />+91-9606461643
              </p>
            </div>
          </div>

          {/* Legal Links Column */}
          <div className="flex flex-col gap-[15px] flex-1 md:items-start items-center py-5 md:py-0">
            <h3 className="text-white font-poppins font-bold text-lg">Legal</h3>
            <button 
              onClick={() => setTermsModalOpen(true)}
              className="text-white no-underline hover:underline text-[clamp(16px,1.2vw,18px)] bg-transparent border-none cursor-pointer text-left"
            >
              Terms and conditions
            </button>
            <button 
              onClick={() => setPoliciesModalOpen(true)}
              className="text-white no-underline hover:underline text-[clamp(16px,1.2vw,18px)] bg-transparent border-none cursor-pointer text-left"
            >
              Policies
            </button>
          </div>

          {/* Company Links Column */}
          <div className="flex flex-col gap-[15px] flex-1 md:items-start items-center py-5 md:py-0">
            <h3 className="text-white font-poppins font-bold text-lg">Company</h3>
            <a href="#about" className="text-white no-underline hover:underline text-[clamp(16px,1.2vw,18px)]">
              About Us
            </a>
            <a href="#expertise" className="text-white no-underline hover:underline text-[clamp(16px,1.2vw,18px)]">
              Expertise
            </a>
            <a href="#scroller" className="text-white no-underline hover:underline text-[clamp(16px,1.2vw,18px)]">
              Services
            </a>
            <a href="https://www.linkedin.com/company/caasdi-global/jobs/" className="text-white no-underline hover:underline text-[clamp(16px,1.2vw,18px)]">
              Career
            </a>
            <a href="https://www.linkedin.com/company/caasdi-global/posts/?feedView=all" className="text-white no-underline hover:underline text-[clamp(16px,1.2vw,18px)]">
              Blogs
            </a>
          </div>

          {/* Social Media Column */}
          <div className="flex flex-col gap-[15px] flex-1 md:items-start items-center py-5 md:py-0">
            <h3 className="text-white font-poppins font-semibold text-lg">Follow Us</h3>
            <div className="flex gap-[15px]">
              <a href="https://www.instagram.com/caasdi_global/" className="block w-[30px] h-[30px] sm:w-[25px] sm:h-[25px]" aria-label="Instagram">
                <img src={instagramIcon} alt="Instagram" className="w-full h-full" />
              </a>
              <a href="https://in.linkedin.com/company/caasdi-global" className="block w-[30px] h-[30px] sm:w-[25px] sm:h-[25px]" aria-label="LinkedIn">
                <img src={linkedinIcon} alt="LinkedIn" className="w-full h-full" />
              </a>
              <a href="https://x.com/caasdiglobal" className="block w-[30px] h-[30px] sm:w-[25px] sm:h-[25px]" aria-label="Twitter">
                <img src={twitterIcon} alt="Twitter" className="w-full h-full" />
              </a>
            </div>
          </div>
        </div>

        <div className="flex justify-center mt-5">
          <p className="text-white font-poppins text-[clamp(14px,1vw,18px)] text-center">© Caasdi Global 2024 All Rights Reserved</p>
        </div>
      </div>

      {/* Terms and Conditions Modal */}
      <TermsAndConditionsModal 
        isOpen={termsModalOpen} 
        onClose={() => setTermsModalOpen(false)} 
      />

      {/* Policies Modal */}
      <PoliciesModal 
        isOpen={policiesModalOpen} 
        onClose={() => setPoliciesModalOpen(false)} 
      />
    </footer>
  );
};

export default Footer;

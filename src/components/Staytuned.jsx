import React from "react";
import "../styles/Staytuned.css";

const StayTunedSection = () => {
  return (
    <section className="stay-tuned-section">
      <div className="stay-tuned-content">
        <div className="stay-tuned-row">
          <div className="stay-tuned-heading">
            <span className="stay-tuned-8c">Stay tuned </span>
            <span className="smiley-face">:)</span>
          </div>
          
          <div className="ecosystem-info">
            <span className="saas-ecosystem">Powerful </span>
            <span className="saas-ecosystem-8d">SaaS-based ecosystem </span>
            <span className="global-operations">
              designed to streamline global B2B Operations
            </span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default StayTunedSection;
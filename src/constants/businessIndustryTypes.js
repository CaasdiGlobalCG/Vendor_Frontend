// Business Type (Legal Entity Type – India)
export const BUSINESS_TYPES = {
  "Individual & Small Businesses": [
    "Proprietorship",
    "Individual / Freelancer",
    "Hindu Undivided Family (HUF)"
  ],
  "Partnerships": [
    "Partnership Firm",
    "Limited Liability Partnership (LLP)"
  ],
  "Companies": [
    "Private Limited Company",
    "Public Limited Company",
    "One Person Company (OPC)"
  ],
  "Trusts & Non-profits": [
    "Trust",
    "Society",
    "Section 8 Company (Non-Profit)"
  ],
  "Government & Others": [
    "Government Entity",
    "Public Sector Undertaking (PSU)",
    "Cooperative Society"
  ]
};

// Flatten business types for dropdown
export const FLAT_BUSINESS_TYPES = Object.values(BUSINESS_TYPES).flat();

// Industry Type (India-focused)
export const INDUSTRY_TYPES = {
  "Manufacturing & Industrial": [
    "Manufacturing",
    "Heavy Engineering",
    "Light Engineering",
    "Automotive & Auto Components",
    "Electrical & Electronics Manufacturing",
    "Machinery & Equipment",
    "Industrial Tools & Hardware",
    "Plastic & Rubber Products",
    "Metal & Steel Industries",
    "Chemical Manufacturing",
    "Pharmaceuticals",
    "Medical Devices Manufacturing",
    "Textile & Garments Manufacturing",
    "Food Processing",
    "FMCG Manufacturing",
    "Packaging Industry",
    "Printing & Publishing",
    "Furniture Manufacturing"
  ],
  "Construction & Infrastructure": [
    "Construction",
    "Real Estate Development",
    "Civil Engineering Contractors",
    "Infrastructure & Roads",
    "EPC Contractors",
    "Architecture & Interior Design",
    "Electrical Contracting",
    "Plumbing & Sanitary Services",
    "HVAC & Fire Safety"
  ],
  "Trading & Retail": [
    "Wholesale Trading",
    "Retail Trading",
    "Import & Export",
    "Distributor / Dealer",
    "E-commerce Seller",
    "B2B Trading",
    "Commodity Trading"
  ],
  "Logistics & Supply Chain": [
    "Logistics & Transportation",
    "Warehousing",
    "Freight Forwarding",
    "Courier Services",
    "Cold Chain Logistics",
    "Fleet Management"
  ],
  "IT, Software & Digital": [
    "IT Services",
    "Software Development",
    "SaaS / Cloud Services",
    "Data & Analytics",
    "AI / Machine Learning",
    "Cybersecurity",
    "Web & App Development",
    "IT Consulting",
    "Digital Marketing",
    "Gaming & AR/VR"
  ],
  "Financial Services": [
    "Banking & NBFC",
    "Accounting & Tax Services",
    "Auditing & Compliance",
    "Insurance Services",
    "FinTech",
    "Investment & Advisory",
    "Payment Services"
  ],
  "Healthcare & Life Sciences": [
    "Hospitals & Clinics",
    "Diagnostic Centers",
    "Medical Laboratories",
    "Pharmaceuticals Distribution",
    "Medical Equipment Supply",
    "Home Healthcare",
    "Wellness & Fitness"
  ],
  "Education & Training": [
    "Schools & Colleges",
    "EdTech",
    "Coaching & Training Institutes",
    "Corporate Training",
    "Skill Development Centers"
  ],
  "Professional & Business Services": [
    "Legal Services",
    "Consulting Services",
    "HR & Recruitment",
    "Facility Management",
    "Security Services",
    "Housekeeping Services",
    "Business Process Outsourcing (BPO)",
    "KPO / Research Services"
  ],
  "Agriculture & Allied": [
    "Agriculture",
    "AgriTech",
    "Dairy & Poultry",
    "Fisheries",
    "Organic Farming",
    "Agricultural Trading",
    "Food & Grain Trading"
  ],
  "Energy, Utilities & Environment": [
    "Power & Energy",
    "Renewable Energy (Solar/Wind)",
    "Oil & Gas",
    "Water Management",
    "Waste Management",
    "Environmental Services"
  ],
  "Hospitality, Travel & Lifestyle": [
    "Hotels & Resorts",
    "Restaurants & Cafes",
    "Catering Services",
    "Travel & Tourism",
    "Event Management",
    "Entertainment & Media"
  ],
  "Handicrafts & MSME": [
    "Handicrafts",
    "Cottage Industries",
    "Artisans & Handmade Products",
    "MSME Services"
  ],
  "Research & Emerging": [
    "Research & Development",
    "Biotechnology",
    "SpaceTech",
    "Drone & Robotics",
    "Defence & Aerospace"
  ]
};

// Flatten industry types for dropdown
export const FLAT_INDUSTRY_TYPES = Object.values(INDUSTRY_TYPES).flat();

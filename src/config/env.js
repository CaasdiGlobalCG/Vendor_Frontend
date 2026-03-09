const PROD_FRONTEND_BASE_URL = 'https://www.caasdiglobal.in';
const DEV_FRONTEND_BASE_URL = 'http://localhost:5173';
const DEFAULT_B2B_MARKETPLACE_BASE_URL = 'https://www.graviyx.com';
const DEV_B2B_MARKETPLACE_BASE_URL = 'http://localhost:5176';

const resolveEnvValue = (value) => {
  if (typeof value !== 'string') {
    return '';
  }
  return value.trim();
};

const isDevMode = import.meta.env.MODE === 'development';

const resolvedVendorUrl =
  resolveEnvValue(import.meta.env.VITE_VENDOR_URL) ||
  resolveEnvValue(import.meta.env.VITE_VENDOR_FRONTEND_URL) ||
  (isDevMode ? DEV_FRONTEND_BASE_URL : PROD_FRONTEND_BASE_URL);

// Use empty string for relative paths - Vite proxy handles /api in dev, same-origin in prod
export const VENDOR_FRONTEND_URL = resolvedVendorUrl;
export const VENDOR_URL = resolvedVendorUrl;
export const VENDOR_BACKEND_URL = ''; // Empty string = relative paths

const resolvedClientUrl = resolveEnvValue(import.meta.env.VITE_CLIENT_URL) || '';
const resolvedSalesUrl = resolveEnvValue(import.meta.env.VITE_SALES_URL) || '';
const resolvedB2BMarketplaceBaseUrl =
  resolveEnvValue(import.meta.env.VITE_B2B_MARKETPLACE_URL) ||
  (isDevMode ? DEV_B2B_MARKETPLACE_BASE_URL : DEFAULT_B2B_MARKETPLACE_BASE_URL);

export const CLIENT_URL = resolvedClientUrl;
export const SALES_URL = resolvedSalesUrl;
export const B2B_MARKETPLACE_URL = `${resolvedB2BMarketplaceBaseUrl.replace(/\/+$/, '')}/home`;


const config = {
  VENDOR_FRONTEND_URL,
  VENDOR_URL,
  VENDOR_BACKEND_URL,
  SALES_URL,
  CLIENT_URL,
  B2B_MARKETPLACE_URL,
};

export default config;

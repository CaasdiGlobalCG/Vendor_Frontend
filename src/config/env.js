const PROD_FRONTEND_BASE_URL = 'https://www.caasdiglobal.in';
const DEV_FRONTEND_BASE_URL = 'http://localhost:5173';

const resolveEnvValue = (value) => {
  if (typeof value !== 'string') {
    return '';
  }
  return value.trim();
};

const isDevMode = import.meta.env.MODE === 'development';

const resolvedFrontendBase =
  resolveEnvValue(import.meta.env.VITE_VENDOR_FRONTEND_URL) ||
  (isDevMode ? DEV_FRONTEND_BASE_URL : PROD_FRONTEND_BASE_URL);

// Use empty string for relative paths - Vite proxy handles /api in dev, same-origin in prod
export const VENDOR_FRONTEND_URL = resolvedFrontendBase;
export const VENDOR_BACKEND_URL = ''; // Empty string = relative paths

const resolvedClientUrl = resolveEnvValue(import.meta.env.VITE_CLIENT_URL) || '';
const resolvedSalesUrl = resolveEnvValue(import.meta.env.VITE_SALES_URL) || '';

export const CLIENT_URL = resolvedClientUrl;
export const SALES_URL = resolvedSalesUrl;


const config = {
  VENDOR_FRONTEND_URL,
  VENDOR_BACKEND_URL,
  SALES_URL,
  CLIENT_URL,
};

export default config;

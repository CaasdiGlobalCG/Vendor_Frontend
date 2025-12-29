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
export const CLIENT_URL = import.meta.env.VITE_CLIENT_URL;
export const SALES_URL = import.meta.env.VITE_SALES__URL;


const config = {
  VENDOR_FRONTEND_URL,
  VENDOR_BACKEND_URL,
  SALES_URL,
  CLIENT_URL,
};

export default config;

// ============================================================
// CRISIS MAP — API CONFIGURATION
// Reads VITE_API_URL from environment for the backend URL.
// ============================================================

const RAW_API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8080';

/** HTTP base for REST calls — no trailing slash */
export const API_URL: string = RAW_API_URL.replace(/\/+$/, '');

/**
 * client.js
 * ----------------------------------------------------------------------------
 * One shared Axios instance for the whole frontend. Centralising this here
 * means:
 *   1. Every request automatically carries the current access token AND the
 *      CSRF header on state-changing requests, so individual pages never
 *      have to remember to attach them.
 *   2. A single 401 interceptor can attempt ONE silent token refresh (via
 *      the HttpOnly refresh-token cookie) before giving up and redirecting
 *      to /login — implementing the short-lived-access-token /
 *      longer-lived-refresh-token session model from Proposal Section 8.
 * ----------------------------------------------------------------------------
 */
import axios from 'axios';

const baseURL = import.meta.env.VITE_API_BASE_URL || '/api';

export const api = axios.create({
  baseURL,
  withCredentials: true, // required so the HttpOnly refresh-token cookie is sent
});

// In-memory access token (never localStorage — an XSS payload that can run
// JS can also read localStorage, whereas an in-memory variable disappears
// on page reload and is not exposed to any storage API at all).
let accessToken = null;
export function setAccessToken(token) { accessToken = token; }
export function getAccessToken() { return accessToken; }

function readCookie(name) {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

api.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  // Echo the CSRF cookie back as a header on state-changing requests — see
  // backend/src/middleware/csrf.js for why this defeats CSRF attacks.
  if (['post', 'put', 'patch', 'delete'].includes((config.method || '').toLowerCase())) {
    const csrfToken = readCookie('csrfToken');
    if (csrfToken) config.headers['X-CSRF-Token'] = csrfToken;
  }
  return config;
});

let refreshingPromise = null;

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retried && !original.url.includes('/auth/login') && !original.url.includes('/auth/refresh')) {
      original._retried = true;
      try {
        // De-duplicate concurrent refresh attempts if several requests 401 at once.
        refreshingPromise = refreshingPromise || api.post('/auth/refresh');
        const { data } = await refreshingPromise;
        refreshingPromise = null;
        setAccessToken(data.accessToken);
        original.headers.Authorization = `Bearer ${data.accessToken}`;
        return api(original);
      } catch (refreshError) {
        refreshingPromise = null;
        setAccessToken(null);
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  }
);

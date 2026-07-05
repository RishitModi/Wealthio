import axios from "axios";

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

export const apiClient = axios.create({
  baseURL: apiBaseUrl,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 120000, // 120s — Render cold starts can take 30-50s
});

// ── Automatic retry interceptor for Render free-tier cold starts ─────────────
// When Render spins down after 15 min of inactivity, the first request may
// time out or fail with a network error. This interceptor retries up to 3 times
// with an 8s delay, giving the backend ~2 minutes to fully wake up.
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 8000; // 8 seconds between retries

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config;

    // Only retry on network errors or 502/503/504 (cold start / wake-up errors)
    const isRetryable =
      !error.response ||                           // Network error / timeout
      [502, 503, 504].includes(error.response.status); // Gateway errors

    // Don't retry if we've already exhausted retries, or it's not retryable
    if (!isRetryable || (config._retryCount || 0) >= MAX_RETRIES) {
      return Promise.reject(error);
    }

    config._retryCount = (config._retryCount || 0) + 1;
    console.log(
      `[httpClient] Request to ${config.url} failed (attempt ${config._retryCount}/${MAX_RETRIES}). ` +
      `Retrying in ${RETRY_DELAY_MS / 1000}s... (Render cold start likely)`
    );

    // Wait before retrying
    await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));

    return apiClient(config);
  }
);

export function getErrorMessage(error) {
  const data = error?.response?.data;
  if (typeof data === "string") {
    return data;
  }
  if (data?.message) {
    return data.message;
  }
  if (error?.response?.statusText) {
    return `${error.response.status} ${error.response.statusText}`;
  }
  if (error?.message) {
    if (error.message === "Network Error") {
      return `The server is waking up. Please wait a moment and try again.`;
    }
    if (error.code === "ECONNABORTED") {
      return `Request timed out. The server may be starting up — please try again.`;
    }
    return error.message;
  }
  return "Request failed.";
}

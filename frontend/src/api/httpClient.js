import axios from "axios";

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

export const apiClient = axios.create({
  baseURL: apiBaseUrl,
  headers: {
    "Content-Type": "application/json",
  },
});

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
      return "Network error or CORS issue. Make sure the backend is running at http://localhost:8080 and that http://localhost:5174 is allowed in CORS.";
    }
    return error.message;
  }
  return "Request failed.";
}


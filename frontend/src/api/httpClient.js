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
      return `Network error or CORS issue. The application tried to reach ${apiBaseUrl} but failed. Check if the backend is running and CORS allows this domain.`;
    }
    return error.message;
  }
  return "Request failed.";
}


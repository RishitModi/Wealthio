import { apiClient, getErrorMessage } from "./httpClient";

/**
 * Authentication API.
 */

export async function register(data) {
  const payload = {
    email: data.email,
    password: data.password,
    fullName: data.fullName,
  };
  const url = "/api/auth/register";
  console.log("Register API URL:", apiClient.defaults.baseURL + url);
  console.log("Register payload:", payload);

  try {
    const response = await apiClient.post(url, payload);
    console.log("Register response:", response.data);
    return response.data;
  } catch (error) {
    console.error("Register error:", error);
    throw new Error(getErrorMessage(error), { cause: error });
  }
}

export async function login(data) {
  const payload = {
    email: data.email,
    password: data.password,
  };
  const url = "/api/auth/login";
  console.log("Login API URL:", apiClient.defaults.baseURL + url);
  console.log("Login payload:", payload);

  try {
    const response = await apiClient.post(url, payload);
    console.log("Login response status:", response.status);
    console.log("Login response data:", response.data);
    return response.data;
  } catch (error) {
    console.error("Login error object:", error);
    console.error("Login error response:", error?.response);
    console.error("Login error message:", error?.message);
    throw new Error(getErrorMessage(error), { cause: error });
  }
}

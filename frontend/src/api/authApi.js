import { apiClient, getErrorMessage } from "./httpClient";

/**
 * Authentication API.
 */

export async function register(data) {
  try {
    const payload = {
      email: data.email,
      password: data.password,
      fullName: data.fullName,
    };
    const response = await apiClient.post("/api/auth/register", payload);
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error), { cause: error });
  }
}

export async function login(data) {
  try {
    const payload = {
      email: data.email,
      password: data.password,
    };
    const response = await apiClient.post("/api/auth/login", payload);
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error), { cause: error });
  }
}

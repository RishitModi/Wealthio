import { apiClient, getErrorMessage } from "./httpClient";

const mlApiBaseUrl = "/api/ml";

export async function predictRisk(payload, token) {
  const url = `${mlApiBaseUrl}/risk-profile`;
  console.log("Risk API URL:", url);
  console.log("Request payload:", payload);

  try {
    const headers = token
      ? { headers: { Authorization: `Bearer ${token}` } }
      : {};
    const response = await apiClient.post(url, payload, headers);
    console.log("Risk API response:", response.data);
    return response.data;
  } catch (error) {
    console.error("Risk API error:", error);
    if (!error.response) {
      throw new Error(
        "Network error or CORS issue while calling the risk service. Verify http://localhost:8001 is reachable and CORS is enabled.",
        { cause: error }
      );
    }
    throw new Error(getErrorMessage(error), { cause: error });
  }
}

export default { predictRisk };

export async function persistSelection(payload, token) {
  const url = `${mlApiBaseUrl}/risk-selection`;
  console.log("Risk persist URL:", url);
  console.log("Persist selection payload:", payload);

  try {
    const headers = token
      ? { headers: { Authorization: `Bearer ${token}` } }
      : {};
    const response = await apiClient.post(url, payload, headers);
    console.log("Persist selection response:", response.data);
    return response.data;
  } catch (error) {
    console.error("Persist selection error:", error);
    if (!error.response) {
      throw new Error(
        "Network error or CORS issue while saving selection. Verify http://localhost:8001 is reachable and CORS is enabled.",
        { cause: error }
      );
    }
    throw new Error(getErrorMessage(error), { cause: error });
  }
}

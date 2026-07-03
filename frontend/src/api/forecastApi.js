import { apiClient } from "./httpClient";

/**
 * Forecast API client for Prophet predictions
 */

const mlApiBaseUrl = "/api/ml";

export async function getForecast(asset, periods = 30, currency = "INR") {
  try {
    const url = `${mlApiBaseUrl}/market/forecast?asset=${asset}&periods=${periods}&currency=${currency}`;
    const response = await apiClient.get(url);
    return response.data;
  } catch (err) {
    return null;
  }
}

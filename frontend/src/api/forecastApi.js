/**
 * Forecast API client for Prophet predictions
 */

export async function getForecast(asset, periods = 30) {
  try {
    const url = `http://localhost:8001/api/market/forecast?asset=${asset}&periods=${periods}`;
    const response = await fetch(url);
    if (!response.ok) return null;
    const data = await response.json();
    return data;
  } catch (err) {
    return null;
  }
}

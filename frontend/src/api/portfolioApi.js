import { apiClient, getErrorMessage } from "./httpClient";

/**
 * POST /api/portfolio/generate
 * Triggers the full ML pipeline and returns a fresh PortfolioResponse.
 */
export async function generatePortfolio(token) {
  if (!token) throw new Error("Authentication required.");
  try {
    const response = await apiClient.post(
      "/api/portfolio/generate",
      {},
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error), { cause: error });
  }
}

/**
 * GET /api/portfolio
 * Returns existing portfolio; backend auto-generates one if none exists.
 */
export async function getPortfolio(token) {
  if (!token) throw new Error("Authentication required.");
  try {
    const response = await apiClient.get("/api/portfolio", {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error), { cause: error });
  }
}

/**
 * GET /api/portfolio/market
 * Returns live market snapshot proxied through the Spring Boot backend.
 */
export async function getMarketData(token) {
  if (!token) throw new Error("Authentication required.");
  try {
    const response = await apiClient.get("/api/portfolio/market", {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error), { cause: error });
  }
}

/**
 * GET /api/ml/market/ticker
 * Returns live market ticker for the curated list of BSE stocks.
 */
export async function getMarketTicker(token) {
  if (!token) throw new Error("Authentication required.");
  try {
    const response = await apiClient.get("/api/ml/market/ticker", {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error), { cause: error });
  }
}

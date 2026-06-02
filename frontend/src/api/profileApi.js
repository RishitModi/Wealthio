import { apiClient, getErrorMessage } from "./httpClient";

const goalMap = {
  retirement: "RETIREMENT",
  wealth_growth: "WEALTH_GROWTH",
  short_term: "SHORT_TERM",
  education: "EDUCATION",
};

const riskMap = {
  conservative: "LOW",
  moderate: "MEDIUM",
  aggressive: "HIGH",
  very_aggressive: "VERY_HIGH",
};

const toNumber = (value) => {
  if (value === "" || value === null || value === undefined) return null;
  // Remove commas before converting to number
  const cleaned = String(value).replace(/,/g, "");
  const num = Number(cleaned);
  return isNaN(num) ? null : num;
};

export async function saveProfile(form, token) {
  if (!token) {
    throw new Error("Authentication required.");
  }

  const investmentGoal = goalMap[form.goal];
  const riskAppetite = riskMap[form.riskAppetite];

  if (!investmentGoal || !riskAppetite) {
    throw new Error("Please complete all required fields.");
  }

  const payload = {
    age: toNumber(form.age),
    investmentGoal,
    investmentHorizonYears: toNumber(form.horizon),
    monthlyIncome: toNumber(form.monthlyIncome),
    monthlySavings: toNumber(form.monthlySavings),
    monthlyExpenses: toNumber(form.monthlyExpenses),
    lifetimeSavings: toNumber(form.lifetimeSavings),
    riskAppetite,
  };

  try {
    const response = await apiClient.post("/api/profile", payload, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error), { cause: error });
  }
}

export async function getProfile(token) {
  if (!token) {
    throw new Error("Authentication required.");
  }

  try {
    const response = await apiClient.get("/api/profile", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error), { cause: error });
  }
}

export async function updateRiskAppetite(selectedRisk, token) {
  if (!token) {
    throw new Error("Authentication required.");
  }

  const payload = { selectedRisk };

  try {
    const response = await apiClient.post('/api/profile/risk', payload, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error), { cause: error });
  }
}

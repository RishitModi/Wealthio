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
};

const toNumber = (value) => (value === "" || value === null || value === undefined ? null : Number(value));

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
    totalSavings: toNumber(form.totalSavings),
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

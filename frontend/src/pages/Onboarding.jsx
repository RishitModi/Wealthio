import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  User, 
  Calendar, 
  Target, 
  TrendingUp, 
  DollarSign, 
  Wallet, 
  Compass, 
  ArrowLeft, 
  ArrowRight, 
  ShieldCheck, 
  CheckCircle,
  HelpCircle
} from "lucide-react";
import useAuth from "../context/useAuth";
import { saveProfile } from "../api/profileApi";
import { predictRisk } from "../api/riskApi";
import { formatNumberWithCommas, getNumericValue, numberToWords } from "../utils/numberUtils";

const RISK_OPTIONS = ["Conservative", "Moderate", "Aggressive", "Very Aggressive"];
const EXPECTED_RETURN_OPTIONS = ["10%-20%", "20%-30%", "30%-40%"];

const RISK_META = {
  Conservative: { label: "Conservative", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  Moderate: { label: "Moderate", color: "bg-amber-50 text-amber-700 border-amber-200" },
  Aggressive: { label: "Aggressive", color: "bg-rose-50 text-rose-700 border-rose-200" },
  "Very Aggressive": { label: "Very Aggressive", color: "bg-red-50 text-red-700 border-red-200" },
};

const GOAL_LABELS = {
  retirement: "Retirement Planning",
  wealth_growth: "Long-term Wealth Growth",
  short_term: "Short-term Safety Buffer",
  education: "Higher Education Fund"
};

function getPersonalizedExplanation(form, recommendedRisk) {
  const age = Number(form.age) || 30;
  const horizon = Number(form.horizon) || 5;
  const incomeVal = getNumericValue(form.monthlyIncome);
  const savingsVal = getNumericValue(form.monthlySavings);
  const savingsRate = incomeVal > 0 ? Math.round((savingsVal / incomeVal) * 100) : 0;
  const goalLabel = GOAL_LABELS[form.goal] || "Long-term Wealth Growth";

  if (recommendedRisk === "Aggressive" || recommendedRisk === "Very Aggressive") {
    return `Your suggested risk appetite is ${recommendedRisk} because you have a long investment horizon (${horizon} years) and a strong preference for high-growth assets like Equities (Score: ${form.equity_preference}/7). With a solid savings rate of ${savingsRate}% of your income, you have the financial cushion to withstand short-term market volatility in pursuit of compound growth. This strategy aligns perfectly with your goal of ${goalLabel} at age ${age}.`;
  }
  
  if (recommendedRisk === "Conservative") {
    return `Your suggested risk appetite is Conservative because you prioritize capital safety and preservation, as indicated by your preference for Fixed Deposits (Score: ${form.fixed_deposit_preference}/7) or PPF (Score: ${form.ppf_preference}/7). With an investment horizon of ${horizon} years, this defensive asset allocation shields your hard-earned savings from market swings while ensuring stable returns for your goal of ${goalLabel}.`;
  }
  
  // Moderate
  return `Your suggested risk appetite is Moderate because you seek a balanced approach between capital growth and safety. You indicated a balanced preference for both growth assets (Equities: ${form.equity_preference}/7) and safety buffers (Fixed Deposits: ${form.fixed_deposit_preference}/7). Combined with an investment horizon of ${horizon} years, this risk tolerance optimizes steady wealth accumulation while sheltering a portion of your capital from severe market dips, helping you achieve your goal of ${goalLabel} safely.`;
}


function getPillars(form, recommendedRisk) {
  const horizon = Number(form.horizon) || 5;
  const incomeVal = getNumericValue(form.monthlyIncome);
  const savingsVal = getNumericValue(form.monthlySavings);
  const savingsRate = incomeVal > 0 ? Math.round((savingsVal / incomeVal) * 100) : 0;
  
  // 1. Horizon
  let horizonTitle = "Medium Horizon";
  let horizonText = `${horizon} years balances growth potential with mid-term liquidity.`;
  if (horizon >= 7) {
    horizonTitle = "Long Horizon";
    horizonText = `${horizon} years gives you more time to benefit from compounding.`;
  } else if (horizon < 3) {
    horizonTitle = "Short Horizon";
    horizonText = `${horizon} years prioritizes capital safety and high accessibility.`;
  }

  // 2. Risk Tolerance
  let riskTitle = "Balanced Tolerance";
  let riskText = "You balance stable income assets with growth-oriented equities.";
  if (recommendedRisk === "Aggressive" || recommendedRisk === "Very Aggressive") {
    riskTitle = "High Risk Tolerance";
    riskText = "You're comfortable with market ups and downs for higher returns.";
  } else if (recommendedRisk === "Conservative") {
    riskTitle = "Low Risk Tolerance";
    riskText = "You prioritize safety and capital preservation over market gains.";
  }

  // 3. Goal
  let goalTitle = "Growth Goal";
  let goalText = "Focused on long-term wealth creation and financial freedom.";
  if (form.goal === "short_term") {
    goalTitle = "Safety Goal";
    goalText = "Prioritizing capital preservation and short-term liquidity.";
  } else if (form.goal === "education") {
    goalTitle = "Targeted Goal";
    goalText = "Targeted funding for high-priority future expenditures.";
  }

  // 4. Savings
  let savingsTitle = "Healthy Savings";
  let savingsText = `${savingsRate}% savings rate offers good investment support.`;
  if (savingsRate >= 30) {
    savingsTitle = "Strong Savings";
    savingsText = `${savingsRate}% savings rate provides a solid financial foundation.`;
  } else if (savingsRate < 15) {
    savingsTitle = "Modest Savings";
    savingsText = `${savingsRate}% savings rate is a starting buffer to build upon.`;
  }

  return {
    horizon: { title: horizonTitle, text: horizonText },
    risk: { title: riskTitle, text: riskText },
    goal: { title: goalTitle, text: goalText },
    savings: { title: savingsTitle, text: savingsText }
  };
}

function getBannerMessage(recommendedRisk) {
  if (recommendedRisk === "Aggressive" || recommendedRisk === "Very Aggressive") {
    return "This portfolio aims to maximize long-term returns while accepting higher short-term volatility.";
  }
  if (recommendedRisk === "Conservative") {
    return "This portfolio focuses on inflation protection and strict capital preservation.";
  }
  return "This portfolio seeks a balanced blend of capital appreciation and defensive safety.";
}

export default function Onboarding() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState("");

  const [form, setForm] = useState({
    age: "",
    goal: "",
    horizon: "",
    monthlyIncome: "",
    monthlySavings: "",
    monthlyExpenses: "",
    lifetimeSavings: "",
    equity_preference: 4,
    fixed_deposit_preference: 4,
    ppf_preference: 4,
    gold_preference: 4,
    expected_return: "20%-30%",
  });

  const [errors, setErrors] = useState({});
  const [recommendedRisk, setRecommendedRisk] = useState("");
  const [selectedRisk, setSelectedRisk] = useState("");
  const [predictionExplanation, setPredictionExplanation] = useState("");
  const [recommendationStage, setRecommendationStage] = useState("idle");
  const [savingProfile, setSavingProfile] = useState(false);
  const [recommendationError, setRecommendationError] = useState("");

  const setField = (field) => (e) => {
    let value = e.target.value;

    if (['monthlyIncome', 'monthlySavings', 'monthlyExpenses', 'lifetimeSavings'].includes(field)) {
      const numericValue = getNumericValue(value);
      value = formatNumberWithCommas(numericValue);
    }

    setForm((p) => {
      const updated = { ...p, [field]: value };

      if (field === 'monthlyIncome' || field === 'monthlySavings') {
        const income = getNumericValue(updated.monthlyIncome);
        const savings = getNumericValue(updated.monthlySavings);

        if (income && savings) {
          const incomeNum = Number(income);
          const savingsNum = Number(savings);
          const expenses = incomeNum - savingsNum;

          if (expenses >= 0) {
            updated.monthlyExpenses = formatNumberWithCommas(expenses.toString());
          }
        }
      }

      return updated;
    });

    setErrors((p) => ({ ...p, [field]: undefined }));
    setApiError("");
  };

  const validateStep1 = () => {
    const e = {};
    if (!form.age) e.age = "Age is required.";
    else if (isNaN(form.age) || Number(form.age) <= 0) e.age = "Enter a valid age.";
    if (!form.goal) e.goal = "Please select an investment goal.";
    if (!form.horizon) e.horizon = "Investment horizon is required.";
    else if (isNaN(form.horizon) || Number(form.horizon) <= 0) e.horizon = "Enter a valid number of years.";
    return e;
  };

  const validateStep2 = () => {
    const e = {};
    if (!form.monthlyIncome) e.monthlyIncome = "Required.";
    if (!form.monthlySavings) e.monthlySavings = "Required.";
    if (!form.monthlyExpenses) e.monthlyExpenses = "Required.";
    if (!form.lifetimeSavings) e.lifetimeSavings = "Required.";
    return e;
  };

  const handleNext = () => {
    let v = {};
    if (step === 1) v = validateStep1();
    if (step === 2) v = validateStep2();
    setErrors(v);
    if (Object.keys(v).length) return;
    setStep((s) => Math.min(s + 1, 3));
  };

  const handleBack = () => {
    if (step === 3 && recommendationStage !== "idle") {
      setRecommendationStage("idle");
    }
    setStep((s) => Math.max(s - 1, 1));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setRecommendationError("");
    setLoading(true);

    try {
      const payload = {
        age: Number(form.age),
        investment_duration: form.horizon === "" ? "Less than 1 year" : (Number(form.horizon) <= 1 ? "Less than 1 year" : Number(form.horizon) <= 3 ? "1-3 years" : Number(form.horizon) <= 5 ? "3-5 years" : "More than 5 years"),
        expected_return: form.expected_return,
        equity_preference: Number(form.equity_preference),
        fixed_deposit_preference: Number(form.fixed_deposit_preference),
        ppf_preference: Number(form.ppf_preference),
        gold_preference: Number(form.gold_preference),
      };

      const result = await predictRisk(payload, user?.token);
      setRecommendedRisk(result.risk_label);
      setSelectedRisk(result.risk_label);
      setPredictionExplanation(result.explanation || "");
      setRecommendationStage("recommendation");
    } catch (err) {
      setRecommendationError(err.message || "Failed to get recommendation.");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmSelection = async (risk) => {
    setSelectedRisk(risk);
    setSavingProfile(true);
    setRecommendationError("");
    try {
      const payload = {
        ...form,
        riskAppetite: risk.toLowerCase().replace(/\s+/g, "_"),
      };
      await saveProfile(payload, user?.token);
      navigate("/dashboard", { state: { fromOnboarding: true } });
    } catch (err) {
      setRecommendationError(err.message || "Failed to save profile.");
    } finally {
      setSavingProfile(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#111827] font-body flex flex-col items-center justify-center py-10 antialiased overflow-x-hidden">
      <main className={`w-full px-6 flex flex-col gap-8 transition-all duration-300 ${step === 3 && recommendationStage !== "idle" ? "max-w-[960px]" : "max-w-[580px]"}`}>
        
        {/* Step Indicator Header */}
        <div className="bg-white rounded-3xl p-6 border border-[#E5E7EB] shadow-premium flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 p-2.5 rounded-xl text-primary flex items-center justify-center">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div>
              <h4 className="font-display font-bold text-sm text-[#111827]">Risk Profiling</h4>
              <p className="text-xs text-[#6B7280]">Tailoring your optimize portfolio</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 font-mono text-xs">
            <span className={`h-6 w-6 rounded-full flex items-center justify-center font-bold transition-all ${step >= 1 ? "bg-primary text-white" : "bg-[#F1F5F9] text-[#6B7280]"}`}>1</span>
            <div className={`h-0.5 w-6 rounded ${step >= 2 ? "bg-primary" : "bg-[#E2E8F0]"}`} />
            <span className={`h-6 w-6 rounded-full flex items-center justify-center font-bold transition-all ${step >= 2 ? "bg-primary text-white" : "bg-[#F1F5F9] text-[#6B7280]"}`}>2</span>
            <div className={`h-0.5 w-6 rounded ${step >= 3 ? "bg-primary" : "bg-[#E2E8F0]"}`} />
            <span className={`h-6 w-6 rounded-full flex items-center justify-center font-bold transition-all ${step >= 3 ? "bg-primary text-white" : "bg-[#F1F5F9] text-[#6B7280]"}`}>3</span>
          </div>
        </div>

        {/* Step 1: Basic Info */}
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="bg-white border border-[#E5E7EB] rounded-3xl p-8 shadow-premium flex flex-col gap-6"
            >
              <div>
                <h2 className="font-display text-xl font-bold text-[#111827]">Tell us about yourself</h2>
                <p className="text-sm font-medium text-[#6B7280] mt-1">This context helps us model appropriate volatility boundaries.</p>
              </div>

              <div className="flex flex-col gap-5">
                {/* Age Input */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-[#111827] uppercase tracking-wider font-mono" htmlFor="age">Age</label>
                  <div className="relative group">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#9CA3AF] group-focus-within:text-primary transition-colors">
                      <Calendar className="h-4.5 w-4.5" />
                    </span>
                    <input 
                      className="w-full bg-[#F8FAFC] border border-[#E5E7EB] rounded-xl py-3 pl-11 pr-4 text-[#111827] text-sm font-medium placeholder-[#9CA3AF] focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors" 
                      id="age" 
                      name="age" 
                      placeholder="e.g. 30" 
                      type="number" 
                      value={form.age} 
                      onChange={setField("age")} 
                    />
                  </div>
                  {errors.age && <p className="text-red-500 text-xs font-semibold">{errors.age}</p>}
                </div>
                
                {/* Goal Selection */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-[#111827] uppercase tracking-wider font-mono" htmlFor="goal">Primary Investment Goal</label>
                  <div className="relative group">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#9CA3AF] group-focus-within:text-primary transition-colors pointer-events-none">
                      <Target className="h-4.5 w-4.5" />
                    </span>
                    <select 
                      className="w-full bg-[#F8FAFC] border border-[#E5E7EB] rounded-xl py-3 pl-11 pr-10 text-[#111827] text-sm font-medium focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors cursor-pointer" 
                      id="goal" 
                      name="goal" 
                      value={form.goal} 
                      onChange={setField("goal")}
                    >
                      <option disabled value="">Select a goal</option>
                      <option value="retirement">Retirement Planning</option>
                      <option value="wealth_growth">Long-term Wealth Growth</option>
                      <option value="short_term">Short-term Safety Buffer</option>
                      <option value="education">Higher Education Fund</option>
                    </select>
                  </div>
                  {errors.goal && <p className="text-red-500 text-xs font-semibold">{errors.goal}</p>}
                </div>

                {/* Horizon Input */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-[#111827] uppercase tracking-wider font-mono" htmlFor="horizon">Investment Horizon (Years)</label>
                  <div className="relative group">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#9CA3AF] group-focus-within:text-primary transition-colors">
                      <Compass className="h-4.5 w-4.5" />
                    </span>
                    <input 
                      className="w-full bg-[#F8FAFC] border border-[#E5E7EB] rounded-xl py-3 pl-11 pr-4 text-[#111827] text-sm font-medium placeholder-[#9CA3AF] focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors" 
                      id="horizon" 
                      name="horizon" 
                      placeholder="e.g. 10" 
                      type="number" 
                      value={form.horizon} 
                      onChange={setField("horizon")} 
                    />
                  </div>
                  {errors.horizon && <p className="text-red-500 text-xs font-semibold">{errors.horizon}</p>}
                </div>
              </div>
              
              <div className="flex items-center gap-4 mt-4 pt-6 border-t border-[#E5E7EB]">
                <button className="flex-1 px-5 py-3 rounded-xl border border-[#E5E7EB] text-xs font-bold text-[#6B7280] opacity-50 cursor-not-allowed" disabled type="button">Back</button>
                <button className="flex-1 bg-primary text-white px-5 py-3 rounded-xl text-xs font-bold hover:bg-opacity-95 flex items-center justify-center gap-1.5 cursor-pointer shadow-sm active:scale-95 transition-all" type="button" onClick={handleNext}>
                  <span>Next Step</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </motion.div>
          )}

          {/* Step 2: Financial Info */}
          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="bg-white border border-[#E5E7EB] rounded-3xl p-8 shadow-premium flex flex-col gap-6"
            >
              <div>
                <h2 className="font-display text-xl font-bold text-[#111827]">Financial Cash Flow</h2>
                <p className="text-sm font-medium text-[#6B7280] mt-1">Determine your investable capacity and monthly buffers.</p>
              </div>

              <div className="flex flex-col gap-5">
                {[
                  { id: "monthlyIncome", label: "Monthly Income", icon: <DollarSign className="h-4.5 w-4.5" /> },
                  { id: "monthlySavings", label: "Monthly Savings", icon: <Wallet className="h-4.5 w-4.5" /> },
                  { id: "monthlyExpenses", label: "Monthly Expenses (Calculated)", icon: <Wallet className="h-4.5 w-4.5" />, readOnly: true },
                  { id: "lifetimeSavings", label: "Lifetime Savings", icon: <DollarSign className="h-4.5 w-4.5" /> }
                ].map((field) => (
                  <div key={field.id} className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-[#111827] uppercase tracking-wider font-mono pl-1" htmlFor={field.id}>{field.label}</label>
                    <div className="relative group">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#111827] font-mono text-sm font-extrabold select-none">₹</span>
                      <input
                        className={`w-full bg-[#F8FAFC] border border-[#E5E7EB] rounded-xl py-3 pl-8 pr-4 text-[#111827] text-sm font-semibold placeholder-[#9CA3AF] focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all ${field.readOnly ? 'bg-[#F1F5F9]/70 cursor-not-allowed text-[#6B7280]' : ''}`}
                        id={field.id}
                        name={field.id}
                        placeholder="0.00"
                        type="text"
                        value={form[field.id]}
                        onChange={setField(field.id)}
                        readOnly={field.readOnly}
                      />
                    </div>
                    {form[field.id] && (
                      <p className="text-[#6B7280] text-[10px] pl-1 font-mono uppercase font-bold italic">
                        {numberToWords(getNumericValue(form[field.id]))}
                      </p>
                    )}
                    {errors[field.id] && <p className="text-red-500 text-xs pl-1 font-semibold">{errors[field.id]}</p>}
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-4 mt-4 pt-6 border-t border-[#E5E7EB]">
                <button className="flex-1 px-5 py-3 rounded-xl border border-[#E5E7EB] text-xs font-bold text-[#111827] hover:bg-[#F8FAFC] flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 transition-all" type="button" onClick={handleBack}>
                  <ArrowLeft className="h-3.5 w-3.5" />
                  <span>Back</span>
                </button>
                <button className="flex-1 bg-primary text-white px-5 py-3 rounded-xl text-xs font-bold hover:bg-opacity-95 flex items-center justify-center gap-1.5 cursor-pointer shadow-sm active:scale-95 transition-all" type="button" onClick={handleNext}>
                  <span>Next Step</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </motion.div>
          )}

          {/* Step 3: Preferences */}
          {step === 3 && recommendationStage === "idle" && (
            <motion.div
              key="step3-preferences"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="bg-white border border-[#E5E7EB] rounded-3xl p-8 shadow-premium flex flex-col gap-6"
            >
              <div>
                <h2 className="font-display text-xl font-bold text-[#111827]">Investment Preferences</h2>
                <p className="text-sm font-medium text-[#6B7280] mt-1">Refine asset class weights and adjust risk constraints.</p>
              </div>
              
              {recommendationError && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-xs px-4 py-3 rounded-2xl font-medium">{recommendationError}</div>
              )}

              <div className="flex flex-col gap-5">
                {/* Expected Return Selection */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-[#111827] uppercase tracking-wider font-mono" htmlFor="expected_return">Expected Return Range</label>
                  <select
                    id="expected_return"
                    className="w-full bg-[#F8FAFC] border border-[#E5E7EB] rounded-xl py-3 px-4 text-[#111827] text-sm font-medium focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors cursor-pointer"
                    value={form.expected_return}
                    onChange={(e) => setForm((p) => ({ ...p, expected_return: e.target.value }))}
                  >
                    {EXPECTED_RETURN_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>

                {/* Preference Range Sliders */}
                <div className="flex flex-col gap-4 border-t border-[#E5E7EB] pt-4">
                  {[
                    { id: "equity_preference", label: "Equity Preference", desc: "Growth orientation" },
                    { id: "fixed_deposit_preference", label: "Fixed Deposit Preference", desc: "Capital preservation" },
                    { id: "ppf_preference", label: "PPF Preference", desc: "Long-term guaranteed safety" },
                    { id: "gold_preference", label: "Gold Preference", desc: "Inflation hedge" },
                  ].map((item) => (
                    <div key={item.id} className="flex flex-col gap-1.5">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-[#111827]">{item.label}</span>
                        <span className="font-mono font-extrabold bg-primary/10 text-primary px-2 py-0.5 rounded-full text-[10px]">
                          Score: {form[item.id]} / 7
                        </span>
                      </div>
                      <input
                        id={item.id}
                        type="range"
                        min="1"
                        max="7"
                        value={form[item.id]}
                        onChange={(e) => setForm((p) => ({ ...p, [item.id]: Number(e.target.value) }))}
                        className="w-full h-1.5 bg-[#E2E8F0] rounded-lg appearance-none cursor-pointer accent-primary"
                      />
                      <span className="text-[10px] text-[#6B7280] font-medium">{item.desc}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-4 mt-4 pt-6 border-t border-[#E5E7EB]">
                <button className="flex-1 px-5 py-3 rounded-xl border border-[#E5E7EB] text-xs font-bold text-[#111827] hover:bg-[#F8FAFC] flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 transition-all" type="button" onClick={handleBack}>
                  <ArrowLeft className="h-3.5 w-3.5" />
                  <span>Back</span>
                </button>
                <button className="flex-1 bg-primary text-white px-5 py-3 rounded-xl text-xs font-bold hover:bg-opacity-95 flex items-center justify-center gap-1.5 cursor-pointer shadow-sm active:scale-95 transition-all" onClick={handleSubmit} disabled={loading} type="button">
                  {loading ? (
                    <>
                      <div className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                      <span>Optimizing...</span>
                    </>
                  ) : (
                    <>
                      <span>Get Recommendations</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          )}

          {/* Step 3: Recommendation Stage */}
          {step === 3 && recommendationStage !== "idle" && (
            <motion.div
              key="step3-results"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
              className="w-full flex flex-col gap-8"
            >
              {/* Top Row: Side-by-side Profile Summary and Suggested Profile */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
                {/* Left Card: Questionnaire Summary */}
                <div className="bg-white border border-[#E5E7EB] rounded-3xl p-6 shadow-premium flex flex-col gap-5 justify-between">
                  <div className="flex flex-col gap-4">
                    <div>
                      <h3 className="font-display font-bold text-base text-[#111827]">Profile Summary</h3>
                      <p className="text-xs text-[#6B7280]">Your questionnaire inputs</p>
                    </div>

                    <div className="flex flex-col gap-3">
                      {/* Age, Goal, Horizon */}
                      <div className="bg-[#F8FAFC] border border-[#E5E7EB] p-3 rounded-2xl flex flex-col gap-2">
                        <div className="flex justify-between text-xs">
                          <span className="font-semibold text-[#6B7280]">Age</span>
                          <span className="font-bold text-[#111827]">{form.age} years</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="font-semibold text-[#6B7280]">Goal</span>
                          <span className="font-bold text-[#111827]">{GOAL_LABELS[form.goal] || "Wealth Growth"}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="font-semibold text-[#6B7280]">Horizon</span>
                          <span className="font-bold text-[#111827]">{form.horizon} Years</span>
                        </div>
                      </div>

                      {/* Cash Flow summary */}
                      <div className="bg-[#F8FAFC] border border-[#E5E7EB] p-3 rounded-2xl flex flex-col gap-2.5">
                        <div className="flex justify-between text-xs">
                          <span className="font-semibold text-[#6B7280]">Income</span>
                          <span className="font-bold text-[#111827]">₹{form.monthlyIncome}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="font-semibold text-[#6B7280]">Savings</span>
                          <span className="font-bold text-[#111827]">₹{form.monthlySavings}</span>
                        </div>
                        {/* Savings Rate Bar */}
                        <div className="mt-0.5">
                          <div className="flex justify-between text-[10px] text-[#6B7280] font-mono font-bold uppercase mb-1">
                            <span>Savings Rate</span>
                            <span>{(() => {
                              const income = getNumericValue(form.monthlyIncome);
                              const savings = getNumericValue(form.monthlySavings);
                              return income > 0 ? Math.round((savings / income) * 100) : 0;
                            })()}%</span>
                          </div>
                          <div className="w-full bg-[#E2E8F0] h-1.5 rounded-full overflow-hidden">
                            <div 
                              className="bg-primary h-full rounded-full transition-all duration-500" 
                              style={{ 
                                width: `${Math.min(100, (() => {
                                  const income = getNumericValue(form.monthlyIncome);
                                  const savings = getNumericValue(form.monthlySavings);
                                  return income > 0 ? Math.round((savings / income) * 100) : 0;
                                })())}%` 
                              }} 
                            />
                          </div>
                        </div>
                      </div>

                      {/* Score Preferences */}
                      <div className="bg-[#F8FAFC] border border-[#E5E7EB] p-3 rounded-2xl flex flex-col gap-2.5">
                        <span className="text-[10px] font-bold text-[#6B7280] font-mono uppercase tracking-wider block">Asset Preferences</span>
                        <div className="flex flex-col gap-2">
                          {[
                            { label: "Equities", val: form.equity_preference },
                            { label: "Fixed Deposit", val: form.fixed_deposit_preference },
                            { label: "PPF", val: form.ppf_preference },
                            { label: "Gold", val: form.gold_preference },
                          ].map((item) => (
                            <div key={item.label} className="flex flex-col gap-1">
                              <div className="flex justify-between text-[10px] font-semibold text-[#6B7280]">
                                <span>{item.label}</span>
                                <span className="font-mono">{item.val}/7</span>
                              </div>
                              <div className="w-full bg-[#E2E8F0] h-1 rounded-full overflow-hidden">
                                <div className="bg-primary/70 h-full rounded-full" style={{ width: `${(item.val / 7) * 100}%` }} />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Card: Recommendation & Decisions */}
                <div className="bg-white border border-[#E5E7EB] rounded-3xl p-6 shadow-premium flex flex-col gap-5 justify-between">
                  <div className="flex flex-col gap-5">
                    <div>
                      <h2 className="font-display text-xl font-bold text-[#111827]">Suggested Profile</h2>
                      <p className="text-sm font-medium text-[#6B7280] mt-1">Recommended strategy based on your parameters.</p>
                    </div>

                    <div className="bg-[#F8FAFC] border border-[#E5E7EB] rounded-2xl p-5 flex flex-col gap-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[#6B7280] uppercase tracking-wider font-mono">Suggested Risk Appetite</span>
                        <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold ${RISK_META[recommendedRisk]?.color || "bg-slate-50 text-slate-700 border-slate-200"}`}>
                          <span className="h-1.5 w-1.5 rounded-full bg-current" />
                          {recommendedRisk}
                        </span>
                      </div>
                      
                      <p className="text-xs text-[#4B5563] font-medium leading-relaxed bg-white border border-[#E5E7EB] p-4 rounded-xl shadow-sm">
                        {getPersonalizedExplanation(form, recommendedRisk)}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-4">
                    {recommendationStage === "recommendation" && (
                      <div className="flex flex-col sm:flex-row gap-3">
                        <button onClick={() => handleConfirmSelection(recommendedRisk)} className="flex-1 px-5 py-3 bg-primary text-white rounded-xl text-xs font-bold hover:bg-opacity-95 shadow-sm transition-all cursor-pointer active:scale-95">Accept Recommendation</button>
                        <button onClick={() => setRecommendationStage("choose-profile")} className="flex-1 px-5 py-3 border border-[#E5E7EB] bg-white text-[#111827] rounded-xl text-xs font-bold hover:bg-[#F8FAFC] transition-all cursor-pointer">Modify Selection</button>
                      </div>
                    )}

                    {recommendationStage === "choose-profile" && (
                      <div className="flex flex-col gap-4">
                        <div className="grid grid-cols-1 gap-2.5">
                          {RISK_OPTIONS.map((risk) => (
                            <button
                              key={risk}
                              type="button"
                              onClick={() => setSelectedRisk(risk)}
                              className={`w-full text-left p-4 rounded-2xl border ${selectedRisk === risk ? 'border-primary bg-primary/5' : 'border-[#E5E7EB] bg-[#F8FAFC] hover:bg-white'} transition-all cursor-pointer`}
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-display font-bold text-sm text-[#111827]">{risk}</span>
                                <span className={`h-4.5 w-4.5 rounded-full border flex items-center justify-center ${selectedRisk === risk ? "border-primary text-primary bg-white" : "border-[#CBD5E1]"}`}>
                                  {selectedRisk === risk && <div className="h-2 w-2 rounded-full bg-primary" />}
                                </span>
                              </div>
                              <p className="text-[11px] text-[#6B7280] font-medium mt-1">
                                {risk === 'Very Aggressive' ? 'Maximum allocation towards higher volatility equity instruments for extreme compounding.' : 
                                 risk === 'Aggressive' ? 'Significant exposure to capital growth assets with moderate stability buffers.' : 
                                 risk === 'Moderate' ? 'Balanced allocation split evenly between capital preservation and steady market returns.' : 
                                 'Defensive asset structure prioritizing capital preservation and inflation protection.'}
                              </p>
                            </button>
                          ))}
                        </div>
                        <div className="flex gap-3">
                          <button onClick={() => setRecommendationStage("recommendation")} className="flex-1 px-5 py-3 border border-[#E5E7EB] bg-white text-[#111827] rounded-xl text-xs font-bold hover:bg-[#F8FAFC] transition-all cursor-pointer">Cancel</button>
                          <button onClick={() => handleConfirmSelection(selectedRisk)} className="flex-1 px-5 py-3 bg-primary text-white rounded-xl text-xs font-bold hover:bg-opacity-95 shadow-sm transition-all cursor-pointer active:scale-95 flex items-center justify-center gap-1.5">
                            <CheckCircle className="h-4 w-4" />
                            <span>Confirm Selected Profile</span>
                          </button>
                        </div>
                      </div>
                    )}

                    {savingProfile && (
                      <div className="flex items-center justify-center gap-2 text-xs font-semibold text-[#6B7280] font-mono mt-2">
                        <div className="h-3 w-3 rounded-full border-2 border-[#CBD5E1] border-t-primary animate-spin" />
                        <span>Saving risk profile & portfolio weights...</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Bottom Row: Why this profile fits you (Stripe) */}
              <div className="bg-white border border-[#E5E7EB] rounded-3xl p-8 shadow-premium flex flex-col gap-6">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#111827] font-mono">
                  Why this profile fits you
                </h4>
                
                {(() => {
                  const pillars = getPillars(form, recommendedRisk);
                  return (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      {/* 1. Horizon */}
                      <div className="bg-[#F8FAFC] border border-[#E5E7EB] p-4.5 rounded-2xl flex flex-col gap-2.5">
                        <div className="bg-emerald-50 text-emerald-600 h-8 w-8 rounded-xl flex items-center justify-center shrink-0">
                          <Calendar className="h-4.5 w-4.5" />
                        </div>
                        <div>
                          <h5 className="text-xs font-bold text-[#111827]">{pillars.horizon.title}</h5>
                          <p className="text-[10px] text-[#6B7280] font-medium mt-1 leading-normal">{pillars.horizon.text}</p>
                        </div>
                      </div>

                      {/* 2. Risk Tolerance */}
                      <div className="bg-[#F8FAFC] border border-[#E5E7EB] p-4.5 rounded-2xl flex flex-col gap-2.5">
                        <div className="bg-blue-50 text-blue-600 h-8 w-8 rounded-xl flex items-center justify-center shrink-0">
                          <ShieldCheck className="h-4.5 w-4.5" />
                        </div>
                        <div>
                          <h5 className="text-xs font-bold text-[#111827]">{pillars.risk.title}</h5>
                          <p className="text-[10px] text-[#6B7280] font-medium mt-1 leading-normal">{pillars.risk.text}</p>
                        </div>
                      </div>

                      {/* 3. Goal */}
                      <div className="bg-[#F8FAFC] border border-[#E5E7EB] p-4.5 rounded-2xl flex flex-col gap-2.5">
                        <div className="bg-purple-50 text-purple-600 h-8 w-8 rounded-xl flex items-center justify-center shrink-0">
                          <Target className="h-4.5 w-4.5" />
                        </div>
                        <div>
                          <h5 className="text-xs font-bold text-[#111827]">{pillars.goal.title}</h5>
                          <p className="text-[10px] text-[#6B7280] font-medium mt-1 leading-normal">{pillars.goal.text}</p>
                        </div>
                      </div>

                      {/* 4. Savings */}
                      <div className="bg-[#F8FAFC] border border-[#E5E7EB] p-4.5 rounded-2xl flex flex-col gap-2.5">
                        <div className="bg-amber-50 text-amber-600 h-8 w-8 rounded-xl flex items-center justify-center shrink-0">
                          <Wallet className="h-4.5 w-4.5" />
                        </div>
                        <div>
                          <h5 className="text-xs font-bold text-[#111827]">{pillars.savings.title}</h5>
                          <p className="text-[10px] text-[#6B7280] font-medium mt-1 leading-normal">{pillars.savings.text}</p>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

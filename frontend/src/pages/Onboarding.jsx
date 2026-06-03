import { useState } from "react";
import { useNavigate } from "react-router-dom";
import useAuth from "../context/useAuth";
import { saveProfile } from "../api/profileApi";
import { predictRisk } from "../api/riskApi";
import { formatNumberWithCommas, getNumericValue, numberToWords } from "../utils/numberUtils";

const RISK_OPTIONS = ["Conservative", "Moderate", "Aggressive", "Very Aggressive"];
const EXPECTED_RETURN_OPTIONS = ["10%-20%", "20%-30%", "30%-40%"];

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

    // For money inputs, format with commas
    if (['monthlyIncome', 'monthlySavings', 'monthlyExpenses', 'lifetimeSavings'].includes(field)) {
      // Get numeric value and format it
      const numericValue = getNumericValue(value);
      value = formatNumberWithCommas(numericValue);
    }

    setForm((p) => {
      const updated = { ...p, [field]: value };

      // Auto-calculate monthly expenses when income or savings change
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
        investment_duration: form.horizon === "" ? "Less than 1 year" : (form.horizon <= 1 ? "Less than 1 year" : form.horizon <= 3 ? "1-3 years" : form.horizon <= 5 ? "3-5 years" : "More than 5 years"),
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
      navigate("/dashboard");
    } catch (err) {
      setRecommendationError(err.message || "Failed to save profile.");
    } finally {
      setSavingProfile(false);
    }
  };

  return (
    <div className="bg-background text-on-background min-h-screen flex flex-col justify-center items-center py-margin-desktop custom-scrollbar">
      <main className="w-full max-w-[560px] px-margin-mobile md:px-0 mx-auto flex flex-col gap-margin-desktop">
        
        {step === 1 && (
          <>
            <header className="flex flex-col items-center gap-base text-center">
              <img alt="Wealthio Logo" className="h-12 w-auto object-contain" src="/wealthio-logo.svg" />
              <h1 className="font-headline-lg text-headline-lg text-on-surface">Basic Info</h1>
              <p className="font-body-md text-body-md text-on-surface-variant">Help us tailor your investment strategy.</p>
            </header>
            
            <div className="flex items-center justify-between gap-2 px-4">
              <div className="flex-1 flex flex-col gap-2">
                <div className="h-1 w-full bg-secondary rounded-full"></div>
                <span className="font-label-sm text-label-sm text-secondary uppercase">Step 1</span>
              </div>
              <div className="flex-1 flex flex-col gap-2 opacity-30">
                <div className="h-1 w-full bg-surface-variant rounded-full"></div>
                <span className="font-label-sm text-label-sm text-on-surface-variant uppercase hidden md:block">Step 2</span>
              </div>
              <div className="flex-1 flex flex-col gap-2 opacity-30">
                <div className="h-1 w-full bg-surface-variant rounded-full"></div>
                <span className="font-label-sm text-label-sm text-on-surface-variant uppercase hidden md:block">Step 3</span>
              </div>
            </div>

            <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 md:p-8 shadow-sm">
              <form className="flex flex-col gap-gutter" onSubmit={(e) => { e.preventDefault(); handleNext(); }}>
                <div className="flex flex-col gap-2">
                  <label className="font-label-sm text-label-sm text-on-surface uppercase" htmlFor="age">Age</label>
                  <div className="relative">
                    <input className="w-full bg-surface-container border border-outline rounded-md px-4 py-3 font-body-md text-body-md text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors placeholder:text-on-surface-variant/70" id="age" name="age" placeholder="e.g. 30" type="number" value={form.age} onChange={setField("age")} />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-outline pointer-events-none">person</span>
                  </div>
                  {errors.age && <p className="text-error text-xs">{errors.age}</p>}
                </div>
                
                <div className="flex flex-col gap-2">
                  <label className="font-label-sm text-label-sm text-on-surface uppercase" htmlFor="goal">Investment Goal</label>
                  <select className="w-full bg-surface-container border border-outline rounded-md px-4 py-3 font-body-md text-body-md text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors pr-10 cursor-pointer" id="goal" name="goal" value={form.goal} onChange={setField("goal")}>
                    <option disabled value="">Select a goal</option>
                    <option value="retirement">Retirement</option>
                    <option value="wealth_growth">Wealth Growth</option>
                    <option value="short_term">Short Term</option>
                    <option value="education">Education</option>
                  </select>
                  {errors.goal && <p className="text-error text-xs">{errors.goal}</p>}
                </div>

                <div className="flex flex-col gap-2">
                  <label className="font-label-sm text-label-sm text-on-surface uppercase" htmlFor="horizon">Investment Horizon (Years)</label>
                  <div className="relative">
                    <input className="w-full bg-surface-container border border-outline rounded-md px-4 py-3 font-body-md text-body-md text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors placeholder:text-on-surface-variant/70" id="horizon" name="horizon" placeholder="e.g. 10" type="number" value={form.horizon} onChange={setField("horizon")} />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-outline pointer-events-none">timeline</span>
                  </div>
                  <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">How long do you plan to stay invested?</p>
                  {errors.horizon && <p className="text-error text-xs">{errors.horizon}</p>}
                </div>
              </form>
            </div>
            
            <div className="flex items-center gap-4 mt-4">
              <button className="flex-1 bg-transparent border border-outline text-on-surface font-label-md text-label-md py-3 rounded-md opacity-50 cursor-not-allowed transition-colors" disabled type="button">Back</button>
              <button className="flex-1 bg-primary hover:bg-on-surface-variant text-on-primary font-label-md text-label-md py-3 rounded-md transition-all duration-200 active:scale-95 flex items-center justify-center gap-2" type="button" onClick={handleNext}>Next</button>
            </div>
          </>
        )}

        {step === 2 && (
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-margin-desktop shadow-sm">
            <div className="flex gap-base mb-margin-desktop">
              <div aria-label="Step 1 completed" className="flex-1 h-1 bg-primary opacity-50 rounded-full"></div>
              <div aria-label="Step 2 active" className="flex-1 h-1 bg-primary rounded-full shadow-sm"></div>
              <div aria-label="Step 3 pending" className="flex-1 h-1 bg-surface-variant rounded-full"></div>
              <div aria-label="Step 4 pending" className="flex-1 h-1 bg-surface-variant rounded-full"></div>
            </div>

            <header className="mb-margin-desktop">
              <h1 className="font-headline-lg text-headline-lg text-on-surface">Financial Info</h1>
              <p className="font-body-md text-body-md text-on-surface-variant mt-2">Let's understand your monthly cash flow to tailor your strategy.</p>
            </header>

            <form className="flex flex-col gap-gutter" onSubmit={(e) => { e.preventDefault(); handleNext(); }}>
              {[
                { id: "monthlyIncome", label: "Monthly Income" },
                { id: "monthlySavings", label: "Monthly Savings" },
                { id: "monthlyExpenses", label: "Monthly Expenses", readOnly: true },
                { id: "lifetimeSavings", label: "Lifetime Savings" }
              ].map((field) => (
                <div key={field.id} className="flex flex-col gap-2">
                  <label className="font-label-sm text-label-sm text-on-surface uppercase pl-1" htmlFor={field.id}>{field.label}</label>
                  <div className="relative premium-focus transition-shadow duration-200 rounded-lg">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface font-body-md font-semibold select-none">₹</span>
                    <input
                      className={`w-full bg-surface border border-outline-variant rounded-lg py-3 pl-8 pr-4 font-body-md text-body-md text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:border-primary transition-colors ${field.readOnly ? 'opacity-75 cursor-not-allowed' : ''}`}
                      id={field.id}
                      name={field.id}
                      placeholder="0.00"
                      type="text"
                      value={form[field.id]}
                      onChange={setField(field.id)}
                      readOnly={field.readOnly}
                    />
                  </div>
                  {/* Display number in words */}
                  {form[field.id] && (
                    <p className="text-on-surface-variant text-xs pl-1 italic">
                      {numberToWords(getNumericValue(form[field.id]))}
                    </p>
                  )}
                  {errors[field.id] && <p className="text-error text-xs pl-1">{errors[field.id]}</p>}
                </div>
              ))}

              <div className="flex items-center justify-between mt-gutter pt-gutter border-t border-outline-variant/50">
                <button className="group flex items-center gap-2 px-6 py-3 rounded-lg border border-primary/30 text-primary font-label-md text-label-md hover:bg-primary/5 hover:border-primary transition-all duration-200 active:scale-95" type="button" onClick={handleBack}>
                  <span className="material-symbols-outlined text-[20px] transition-transform group-hover:-translate-x-1">arrow_back</span>
                  Back
                </button>
                <button className="relative overflow-hidden flex items-center justify-center min-w-[120px] px-6 py-3 rounded-lg bg-primary text-on-primary font-label-md text-label-md hover:bg-primary/90 transition-all duration-200 active:scale-95" type="submit">
                  <span className="flex items-center gap-2 transition-opacity duration-200">
                    Next
                    <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
                  </span>
                </button>
              </div>
            </form>
          </div>
        )}

        {step === 3 && recommendationStage === "idle" && (
          <div className="w-full max-w-[560px] mx-auto flex flex-col gap-8">
            <header className="flex flex-col gap-2 text-center">
              <div className="flex gap-1 mb-4 justify-center w-full max-w-xs mx-auto">
                <div className="h-1 flex-1 bg-surface-variant rounded-full opacity-50"></div>
                <div className="h-1 flex-1 bg-surface-variant rounded-full opacity-50"></div>
                <div className="h-1 flex-1 bg-primary rounded-full"></div>
              </div>
              <h1 className="font-headline-lg text-headline-lg text-on-surface">Investment Preferences</h1>
              <p className="font-body-md text-body-md text-on-surface-variant">Tell us your preferred allocation style so we can recommend the best risk profile.</p>
            </header>
            
            {recommendationError && (
              <div className="bg-error-container text-on-error-container text-sm px-4 py-3 rounded-lg">{recommendationError}</div>
            )}

            <div className="flex flex-col gap-2 mb-2">
              <label className="font-label-sm text-label-sm text-on-surface uppercase" htmlFor="expected_return">Expected Return</label>
              <select
                id="expected_return"
                className="w-full bg-surface-container border border-outline rounded-md px-4 py-3 font-body-md text-body-md text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors cursor-pointer"
                value={form.expected_return}
                onChange={(e) => setForm((p) => ({ ...p, expected_return: e.target.value }))}
              >
                {EXPECTED_RETURN_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
              <p className="font-body-sm text-body-sm text-on-surface-variant">What annual returns do you expect from your investments?</p>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {[
                { id: "equity_preference", label: "Equity Preference" },
                { id: "fixed_deposit_preference", label: "Fixed Deposit Preference" },
                { id: "ppf_preference", label: "PPF Preference" },
                { id: "gold_preference", label: "Gold Preference" },
              ].map((item) => (
                <div key={item.id} className="flex flex-col gap-2">
                  <label className="font-label-sm text-label-sm text-on-surface uppercase" htmlFor={item.id}>{item.label}</label>
                  <input
                    id={item.id}
                    type="range"
                    min="1"
                    max="7"
                    value={form[item.id]}
                    onChange={(e) => setForm((p) => ({ ...p, [item.id]: Number(e.target.value) }))}
                    className="w-full"
                  />
                  <div className="text-body-sm text-on-surface-variant">{form[item.id]}</div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between mt-4 pt-4 border-t border-outline-variant/30">
              <button className="px-6 py-3 rounded-lg border border-outline-variant/50 text-on-surface-variant hover:text-on-surface hover:border-outline-variant transition-colors font-label-md text-label-md bg-transparent" onClick={handleBack} type="button">Back</button>
              <button className="px-8 py-3 rounded-lg bg-primary text-on-primary font-label-md text-label-md hover:bg-on-surface transition-all active:scale-95 flex items-center justify-center min-w-[180px]" onClick={handleSubmit} disabled={loading} type="button">
                {loading ? (
                  <span className="material-symbols-outlined animate-spin" style={{fontSize: '24px'}}>progress_activity</span>
                ) : (
                  <span className="btn-text">Get Recommendation</span>
                )}
              </button>
            </div>
          </div>
        )}

        {step === 3 && recommendationStage !== "idle" && (
          <div className="w-full max-w-[560px] mx-auto flex flex-col gap-8">
            <header className="flex flex-col gap-2 text-center">
              <h1 className="font-headline-lg text-headline-lg text-on-surface">Recommended Risk Profile</h1>
              <p className="font-body-md text-body-md text-on-surface-variant">Based on your answers, here is the recommended profile from our AI engine.</p>
            </header>

            <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6">
              <div className="text-sm text-on-surface-variant">Recommended Risk Profile</div>
              <div className="font-headline-lg text-headline-lg mt-2">{recommendedRisk}</div>
              <p className="mt-4 text-body-md text-on-surface-variant">{predictionExplanation}</p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button onClick={() => handleConfirmSelection(recommendedRisk)} className="flex-1 px-6 py-3 bg-primary text-on-primary rounded-md">Accept Recommendation</button>
              <button onClick={() => setRecommendationStage("choose-profile")} className="flex-1 px-6 py-3 border border-outline-variant rounded-md">Change Profile</button>
            </div>

            {recommendationStage === "choose-profile" && (
              <div className="grid grid-cols-1 gap-4 mt-4">
                {RISK_OPTIONS.map((risk) => (
                  <button
                    key={risk}
                    type="button"
                    onClick={() => setSelectedRisk(risk)}
                    className={`w-full text-left p-4 rounded-xl border ${selectedRisk === risk ? 'border-primary bg-primary/10' : 'border-outline-variant bg-surface-container-low'} transition-colors`}
                  >
                    <div className="font-headline-sm mb-1">{risk}</div>
                    <p className="text-body-sm text-on-surface-variant">{risk === 'Very Aggressive' ? 'Highest growth orientation with more portfolio volatility.' : risk === 'Aggressive' ? 'Higher growth potential with increased volatility.' : risk === 'Moderate' ? 'Balanced growth with managed risk.' : 'Preservation-first with conservative positioning.'}</p>
                  </button>
                ))}
                <button onClick={() => handleConfirmSelection(selectedRisk)} className="px-6 py-3 bg-primary text-on-primary rounded-md">Confirm Selected Profile</button>
              </div>
            )}

            {savingProfile && (
              <div className="text-on-surface-variant text-sm mt-4">Saving your profile...</div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

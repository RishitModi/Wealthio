import { useState } from "react";
import { useNavigate } from "react-router-dom";
import useAuth from "../context/useAuth";
import { saveProfile } from "../api/profileApi";

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
    totalSavings: "",
    riskAppetite: "moderate", // Default per design
  });

  const [errors, setErrors] = useState({});

  const setField = (field) => (e) => {
    // For money inputs, allow only numbers/decimals
    let value = e.target.value;
    if (['monthlyIncome', 'monthlySavings', 'monthlyExpenses', 'totalSavings'].includes(field)) {
      value = value.replace(/[^\d.]/g, '');
    }
    setForm((p) => ({ ...p, [field]: value }));
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
    if (!form.totalSavings) e.totalSavings = "Required.";
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

  const handleBack = () => setStep((s) => Math.max(s - 1, 1));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.riskAppetite) return;
    
    setLoading(true);
    setApiError("");
    try {
      await saveProfile(form, user?.token);
      navigate("/dashboard");
    } catch (err) {
      setApiError(err.message || "Failed to save profile.");
    } finally {
      setLoading(false);
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
                { id: "monthlyExpenses", label: "Monthly Expenses" },
                { id: "totalSavings", label: "Total Savings" }
              ].map((field) => (
                <div key={field.id} className="flex flex-col gap-2">
                  <label className="font-label-sm text-label-sm text-on-surface uppercase pl-1" htmlFor={field.id}>{field.label}</label>
                  <div className="relative premium-focus transition-shadow duration-200 rounded-lg">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface font-body-md font-semibold select-none">₹</span>
                    <input className="w-full bg-surface border border-outline-variant rounded-lg py-3 pl-8 pr-4 font-body-md text-body-md text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:border-primary transition-colors" id={field.id} name={field.id} placeholder="0.00" type="text" value={form[field.id]} onChange={setField(field.id)} />
                  </div>
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

        {step === 3 && (
          <div className="w-full max-w-[560px] mx-auto flex flex-col gap-8">
            <header className="flex flex-col gap-2 text-center">
              <div className="flex gap-1 mb-4 justify-center w-full max-w-xs mx-auto">
                <div className="h-1 flex-1 bg-surface-variant rounded-full opacity-50"></div>
                <div className="h-1 flex-1 bg-surface-variant rounded-full opacity-50"></div>
                <div className="h-1 flex-1 bg-primary rounded-full"></div>
              </div>
              <h1 className="font-headline-lg text-headline-lg text-on-surface">Risk Appetite</h1>
              <p className="font-body-md text-body-md text-on-surface-variant">Select the strategy that best aligns with your financial goals.</p>
            </header>
            
            {apiError && (
              <div className="bg-error-container text-on-error-container text-sm px-4 py-3 rounded-lg">{apiError}</div>
            )}

            <div className="flex flex-col gap-4">
              {[
                { id: "conservative", icon: "shield", title: "Conservative", desc: "Slow and steady growth with focus on capital preservation." },
                { id: "moderate", icon: "balance", title: "Moderate", desc: "A balanced approach aiming for growth with managed risk." },
                { id: "aggressive", icon: "rocket_launch", title: "Aggressive", desc: "High-growth potential with higher exposure to market volatility." }
              ].map((risk) => (
                <button key={risk.id} type="button" onClick={() => setForm(p => ({ ...p, riskAppetite: risk.id }))} className={`risk-card w-full flex items-start text-left p-4 rounded-xl border border-outline-variant hover:border-outline cursor-pointer relative overflow-hidden group ${form.riskAppetite === risk.id ? 'selected bg-[rgba(0,0,0,0.04)]' : 'bg-surface-container-low'}`}>
                  <div className={`icon-container flex-shrink-0 w-12 h-12 rounded-full bg-surface-container border border-outline-variant flex items-center justify-center transition-colors mr-4 ${form.riskAppetite === risk.id ? 'text-primary' : 'text-on-surface-variant'}`}>
                    <span className="material-symbols-outlined">{risk.icon}</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <h2 className="font-headline-md text-headline-md text-on-surface">{risk.title}</h2>
                    <p className="font-body-md text-body-md text-on-surface">{risk.desc}</p>
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent to-black/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
                </button>
              ))}
            </div>

            <div className="flex items-center justify-between mt-4 pt-4 border-t border-outline-variant/30">
              <button className="px-6 py-3 rounded-lg border border-outline-variant/50 text-on-surface-variant hover:text-on-surface hover:border-outline-variant transition-colors font-label-md text-label-md bg-transparent" onClick={handleBack} type="button">Back</button>
              <button className="px-8 py-3 rounded-lg bg-primary text-on-primary font-label-md text-label-md hover:bg-on-surface transition-all active:scale-95 flex items-center justify-center min-w-[180px]" onClick={handleSubmit} disabled={loading} type="button">
                {loading ? (
                  <span className="material-symbols-outlined animate-spin" style={{fontSize: '24px'}}>progress_activity</span>
                ) : (
                  <span className="btn-text">Build My Portfolio</span>
                )}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

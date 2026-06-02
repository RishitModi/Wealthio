import { useState } from "react";
import useAuth from "../context/useAuth";
import { predictRisk, persistSelection } from "../api/riskApi";
import { updateRiskAppetite } from "../api/profileApi";
import { useNavigate } from "react-router-dom";

const DURATION_OPTIONS = [
  "Less than 1 year",
  "1-3 years",
  "3-5 years",
  "More than 5 years",
];

const EXPECT_OPTIONS = ["10%-20%", "20%-30%", "30%-40%"];

export default function RiskAssessment() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    age: "",
    investment_duration: DURATION_OPTIONS[0],
    expected_return: EXPECT_OPTIONS[0],
    equity_preference: 4,
    fixed_deposit_preference: 4,
    ppf_preference: 4,
    gold_preference: 4,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [recommended, setRecommended] = useState(null);
  const [selected, setSelected] = useState(null);
  const [predictionExplanation, setPredictionExplanation] = useState("");
  const [stage, setStage] = useState("form"); // form | result | manual | confirm
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  const setField = (field) => (e) => {
    const value = e?.target ? e.target.value : e;
    setForm((p) => ({ ...p, [field]: value }));
    setError("");
  };

  const handleSubmit = async (e) => {
    e?.preventDefault?.();
    setLoading(true);
    setError("");
    try {
      const payload = {
        age: Number(form.age),
        investment_duration: form.investment_duration,
        expected_return: form.expected_return,
        equity_preference: Number(form.equity_preference),
        fixed_deposit_preference: Number(form.fixed_deposit_preference),
        ppf_preference: Number(form.ppf_preference),
        gold_preference: Number(form.gold_preference),
      };

      const res = await predictRisk(payload, user?.token);
      // API returns cluster_id, risk_label, explanation
      setRecommended(res.risk_label);
      setSelected(res.risk_label);
      setPredictionExplanation(res.explanation || "");
      setStage("result");
    } catch (err) {
      console.error("RiskAssessment submit error:", err);
      setError(err.message || "Prediction failed.");
    } finally {
      setLoading(false);
    }
  };

  const useRecommended = () => {
    setSelected(recommended);
    setStage("confirm");
  };

  const chooseAnother = () => {
    setStage("result");
  };

  const openManual = () => {
    setStage("result");
  };

  const confirmSelection = () => {
    setStage("confirm");
  };

  const backToForm = () => {
    setStage("form");
    setRecommended(null);
    setSelected(null);
  };

  if (stage === "form") {
    return (
      <div className="min-h-screen bg-background text-on-background flex items-center justify-center py-12">
        <main className="w-full max-w-2xl bg-surface-container-lowest p-6 rounded-xl shadow-sm">
          <h1 className="font-headline-lg text-headline-lg mb-2">Risk Assessment</h1>
          <p className="font-body-md text-body-md text-on-surface-variant mb-4">Answer a few questions to get a recommended risk profile.</p>

          {error && <div className="bg-error-container text-on-error-container rounded-md p-3 mb-4">{error}</div>}

          <form className="grid grid-cols-1 gap-4" onSubmit={handleSubmit}>
            <div>
              <label className="block text-sm font-medium mb-1">Age</label>
              <input type="number" min="18" max="100" value={form.age} onChange={setField('age')} className="w-full rounded-md border px-3 py-2" required />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Investment Duration</label>
              <select value={form.investment_duration} onChange={setField('investment_duration')} className="w-full rounded-md border px-3 py-2">
                {DURATION_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Expected Return</label>
              <select value={form.expected_return} onChange={setField('expected_return')} className="w-full rounded-md border px-3 py-2">
                {EXPECT_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Equity Preference (1-7)</label>
                <input type="range" min="1" max="7" value={form.equity_preference} onChange={setField('equity_preference')} className="w-full" />
                <div className="text-sm text-on-surface-variant">{form.equity_preference}</div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Fixed Deposit Preference (1-7)</label>
                <input type="range" min="1" max="7" value={form.fixed_deposit_preference} onChange={setField('fixed_deposit_preference')} className="w-full" />
                <div className="text-sm text-on-surface-variant">{form.fixed_deposit_preference}</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">PPF Preference (1-7)</label>
                <input type="range" min="1" max="7" value={form.ppf_preference} onChange={setField('ppf_preference')} className="w-full" />
                <div className="text-sm text-on-surface-variant">{form.ppf_preference}</div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Gold Preference (1-7)</label>
                <input type="range" min="1" max="7" value={form.gold_preference} onChange={setField('gold_preference')} className="w-full" />
                <div className="text-sm text-on-surface-variant">{form.gold_preference}</div>
              </div>
            </div>

            <div className="flex items-center justify-between mt-4">
              <button type="button" onClick={() => navigate(-1)} className="px-4 py-2 border rounded-md">Cancel</button>
              <button type="submit" disabled={loading} className="px-6 py-2 bg-primary text-on-primary rounded-md">
                {loading ? 'Analyzing...' : 'Get Recommendation'}
              </button>
            </div>
          </form>
        </main>
      </div>
    );
  }

  if (stage === "result" || stage === "manual") {
    return (
      <div className="min-h-screen flex items-center justify-center py-12">
        <main className="w-full max-w-2xl bg-surface-container-lowest p-6 rounded-xl shadow-sm">
          <h2 className="font-headline-md mb-2">Recommended Risk Profile</h2>
          <div className="p-4 border rounded-lg mb-4">
            <div className="text-sm text-on-surface-variant">Recommended Risk Profile</div>
            <div className="font-headline-lg text-headline-lg mt-2">{recommended}</div>
            {predictionExplanation && (
              <p className="mt-3 text-body-md text-on-surface-variant">{predictionExplanation}</p>
            )}
          </div>

          <div className="flex gap-3 flex-wrap">
            <button onClick={useRecommended} className="px-6 py-2 bg-primary text-on-primary rounded-md">Accept Recommendation</button>
            <button onClick={() => setStage('manual')} className="px-6 py-2 border rounded-md">Change Profile</button>
            <button onClick={backToForm} className="px-4 py-2 text-sm">Edit Answers</button>
          </div>

          {stage === 'manual' && (
            <div className="mt-6">
              <h4 className="font-headline-sm mb-2">Choose another profile</h4>
              <div className="flex gap-3 flex-wrap">
                {['Conservative','Moderate','Aggressive'].map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => { setSelected(r); setStage('confirm'); }}
                    className={`px-4 py-2 rounded-md border ${selected===r ? 'border-primary bg-primary/10' : 'border-outline-variant bg-surface-container-low'}`}>
                    {r}
                  </button>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>
    );
  }

  // confirm
  const handleConfirmAndSave = async () => {
    setSaving(true);
    setSaveError("");
    try {
      const chosenRisk = selected || recommended;
      const payload = {
        recommendedRisk: recommended,
        selectedRisk: chosenRisk,
        feature_overview: form,
      };
      console.log("Saving selection payload:", payload);
      // Persist to ML service for auditing
      await persistSelection(payload, user?.token);
      // Persist to main Spring backend user profile
      await updateRiskAppetite(chosenRisk, user?.token);
      navigate('/dashboard');
    } catch (err) {
      console.error("RiskAssessment save error:", err);
      setSaveError(err.message || 'Failed to save selection');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center py-12">
      <main className="w-full max-w-2xl bg-surface-container-lowest p-6 rounded-xl shadow-sm">
        <h2 className="font-headline-md mb-2">Confirm Risk Profile</h2>
        <div className="p-4 border rounded-lg mb-4">
          <div className="text-sm text-on-surface-variant">Recommended</div>
          <div className="font-headline-lg">{recommended}</div>
        </div>

        <div className="p-4 border rounded-lg mb-4">
          <div className="text-sm text-on-surface-variant">Selected</div>
          <div className="font-headline-lg">{selected}</div>
        </div>

        {recommended !== selected && (
          <div className="bg-warning-container text-on-warning-container rounded-md p-3 mb-4">You have chosen a different profile from the ML recommendation.</div>
        )}

        {saveError && <div className="text-error text-sm mb-3">{saveError}</div>}
        <div className="flex gap-3">
          <button onClick={handleConfirmAndSave} disabled={saving} className="px-6 py-2 bg-primary text-on-primary rounded-md">{saving ? 'Saving...' : 'Confirm'}</button>
          <button onClick={() => setStage('form')} className="px-6 py-2 border rounded-md">Start Over</button>
        </div>
      </main>
    </div>
  );
}

import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import useAuth from "../context/useAuth";
import { register } from "../api/authApi";

export default function Register() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ fullName: "", email: "", password: "", confirmPassword: "" });
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState("");
  const [loading, setLoading] = useState(false);
  const [redirectOnboarding, setRedirectOnboarding] = useState(false);

  if (user && !redirectOnboarding) return <Navigate to="/dashboard" replace />;

  const validate = () => {
    const e = {};
    if (!form.fullName.trim()) e.fullName = "Full name is required.";
    if (!form.email.trim()) e.email = "Email is required.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = "Enter a valid email.";
    if (!form.password) e.password = "Password is required.";
    else if (form.password.length < 6) e.password = "Minimum 6 characters.";
    if (!form.confirmPassword) e.confirmPassword = "Please confirm your password.";
    else if (form.password !== form.confirmPassword) e.confirmPassword = "Passwords do not match.";
    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setApiError("");
    const v = validate();
    setErrors(v);
    if (Object.keys(v).length) return;
    setLoading(true);
    setRedirectOnboarding(true);
    try {
      const res = await register(form);
      login(res);
      navigate("/dashboard");
    } catch (err) {
      setRedirectOnboarding(false);
      setApiError(err.message || "Registration failed.");
    } finally {
      setLoading(false);
    }
  };

  const set = (field) => (e) => {
    setForm((p) => ({ ...p, [field]: e.target.value }));
    setErrors((p) => ({ ...p, [field]: undefined }));
    setApiError("");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-0 md:p-10">
      <div className="flex flex-col md:flex-row w-full max-w-[1280px] bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-2xl relative min-h-[800px]">
        {/* Left Panel */}
        <div className="hidden md:flex md:w-1/2 flex-col justify-between p-12 bg-abstract-growth relative border-r border-outline-variant">
          <div className="growth-curves"></div>
          <div className="z-10 flex flex-col gap-8">
            <img alt="Wealthio Logo" className="h-12 w-auto object-contain self-start brightness-0 invert" src="/wealthio-logo.svg" />
            <div className="mt-24 space-y-4">
              <h1 className="font-display text-[48px] leading-[56px] tracking-[-0.02em] font-extrabold text-white max-w-md">
                Grow your wealth with AI-powered precision.
              </h1>
              <p className="font-body text-[18px] leading-[28px] font-medium text-gray-300 max-w-md">
                Join thousands of Indian professionals building their future with Wealthio.
              </p>
            </div>
          </div>
          {/* Decorative bars */}
          <div className="z-10 self-end opacity-60">
            <div className="flex items-end gap-2 h-32">
              <div className="w-1 bg-gradient-to-t from-transparent to-surface-variant h-1/4 rounded-full relative"><div className="absolute -top-1 -left-0.5 w-2 h-2 rounded-full bg-surface-variant"></div></div>
              <div className="w-1 bg-gradient-to-t from-transparent to-surface-variant h-2/4 rounded-full relative"><div className="absolute -top-1 -left-0.5 w-2 h-2 rounded-full bg-surface-variant"></div></div>
              <div className="w-1 bg-gradient-to-t from-transparent to-tertiary-fixed-dim h-1/2 rounded-full relative"><div className="absolute -top-1 -left-0.5 w-2 h-2 rounded-full bg-tertiary-fixed-dim"></div></div>
              <div className="w-1 bg-gradient-to-t from-transparent to-secondary-container h-3/4 rounded-full relative"><div className="absolute -top-1 -left-0.5 w-2 h-2 rounded-full bg-secondary-container"></div></div>
              <div className="w-1 bg-gradient-to-t from-transparent to-secondary h-full rounded-full relative"><div className="absolute -top-1 -left-0.5 w-2 h-2 rounded-full bg-secondary"></div></div>
            </div>
          </div>
        </div>

        {/* Right Panel — Form */}
        <div className="w-full md:w-1/2 p-4 md:p-16 flex flex-col justify-center bg-surface relative z-20">
          <div className="md:hidden flex justify-center mb-8">
            <img alt="Wealthio Logo" className="h-10 w-auto object-contain" src="/wealthio-logo.svg" />
          </div>
          <div className="max-w-md w-full mx-auto space-y-8">
            <div className="text-center md:text-left space-y-2">
              <h2 className="font-display text-[32px] leading-[40px] tracking-[-0.01em] font-bold text-on-surface">Create Account</h2>
              <p className="font-body text-[16px] leading-[24px] font-medium text-on-surface-variant">Secure your financial future today.</p>
            </div>

            {apiError && (
              <div className="bg-error-container text-on-error-container text-sm px-4 py-3 rounded-lg">{apiError}</div>
            )}

            <form className="space-y-4" onSubmit={handleSubmit} id="registerForm">
              {/* Full Name */}
              <div className="space-y-2">
                <label className="font-mono text-[12px] leading-[16px] tracking-[0.04em] font-semibold text-on-surface-variant uppercase" htmlFor="fullName">Full Name</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline-variant">person</span>
                  <input className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg py-3 pl-12 pr-4 font-body text-[16px] leading-[24px] text-on-surface placeholder:text-outline-variant transition-colors hover:border-outline" id="fullName" placeholder="Jane Doe" type="text" value={form.fullName} onChange={set("fullName")} />
                </div>
                {errors.fullName && <p className="text-error text-xs mt-1">{errors.fullName}</p>}
              </div>
              {/* Email */}
              <div className="space-y-2">
                <label className="font-mono text-[12px] leading-[16px] tracking-[0.04em] font-semibold text-on-surface-variant uppercase" htmlFor="email">Email Address</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline-variant">mail</span>
                  <input className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg py-3 pl-12 pr-4 font-body text-[16px] leading-[24px] text-on-surface placeholder:text-outline-variant transition-colors hover:border-outline" id="email" placeholder="jane@example.com" type="email" value={form.email} onChange={set("email")} />
                </div>
                {errors.email && <p className="text-error text-xs mt-1">{errors.email}</p>}
              </div>
              {/* Password */}
              <div className="space-y-2">
                <label className="font-mono text-[12px] leading-[16px] tracking-[0.04em] font-semibold text-on-surface-variant uppercase" htmlFor="password">Password</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline-variant">lock</span>
                  <input className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg py-3 pl-12 pr-4 font-body text-[16px] leading-[24px] text-on-surface placeholder:text-outline-variant transition-colors hover:border-outline" id="password" placeholder="••••••••" type="password" value={form.password} onChange={set("password")} />
                </div>
                {errors.password && <p className="text-error text-xs mt-1">{errors.password}</p>}
              </div>
              {/* Confirm Password */}
              <div className="space-y-2">
                <label className="font-mono text-[12px] leading-[16px] tracking-[0.04em] font-semibold text-on-surface-variant uppercase" htmlFor="confirmPassword">Confirm Password</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline-variant">lock</span>
                  <input className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg py-3 pl-12 pr-4 font-body text-[16px] leading-[24px] text-on-surface placeholder:text-outline-variant transition-colors hover:border-outline" id="confirmPassword" placeholder="••••••••" type="password" value={form.confirmPassword} onChange={set("confirmPassword")} />
                </div>
                {errors.confirmPassword && <p className="text-error text-xs mt-1">{errors.confirmPassword}</p>}
              </div>
              {/* Submit */}
              <div className="pt-2">
                <button className="w-full bg-secondary-container hover:bg-secondary text-on-secondary-container font-mono text-[14px] leading-[20px] tracking-[0.02em] font-semibold py-3 px-4 rounded-lg transition-all duration-200 flex justify-center items-center gap-2 shadow-sm active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed" id="submitBtn" type="submit" disabled={loading}>
                  {loading ? (<><span className="material-symbols-outlined animate-spin text-[20px]">progress_activity</span> Please wait...</>) : "Create Account"}
                </button>
              </div>
            </form>
            <div className="text-center pt-2">
              <p className="font-body text-[16px] leading-[24px] font-medium text-on-surface-variant">
                Already have an account?{" "}
                <Link className="text-secondary hover:text-secondary-container transition-colors font-semibold" to="/login">Log In</Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

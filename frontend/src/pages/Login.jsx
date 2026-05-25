import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import useAuth from "../context/useAuth";
import { login } from "../api/authApi";

export default function Login() {
  const { user, login: setAuthUser } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  if (user) return <Navigate to="/dashboard" replace />;

  const validate = () => {
    const e = {};
    if (!form.email.trim()) e.email = "Email is required.";
    if (!form.password) e.password = "Password is required.";
    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setApiError("");
    const v = validate();
    setErrors(v);
    if (Object.keys(v).length) return;
    setLoading(true);
    try {
      const res = await login(form);
      setAuthUser(res);
      navigate("/dashboard");
    } catch (err) {
      setApiError(err.message || "Login failed.");
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
    <div className="bg-background text-on-surface h-screen overflow-hidden font-body text-[16px] leading-[24px] flex antialiased">
      {/* Left Panel */}
      <div className="hidden lg:flex flex-col w-1/2 bg-primary-container relative p-margin-desktop justify-between geometric-bg overflow-hidden border-r border-outline-variant">
        {/* Abstract Decoration Elements */}
        <div className="absolute inset-0 pointer-events-none opacity-10">
          <svg height="100%" width="100%" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern height="40" id="grid" patternUnits="userSpaceOnUse" width="40">
                <path className="text-secondary-fixed" d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="0.5"></path>
              </pattern>
            </defs>
            <rect fill="url(#grid)" height="100%" width="100%"></rect>
          </svg>
        </div>
        <div className="absolute top-[20%] right-[-10%] w-[600px] h-[600px] rounded-full border border-secondary/20 pointer-events-none"></div>
        <div className="absolute bottom-[-10%] left-[-20%] w-[800px] h-[800px] rounded-full border border-tertiary/20 pointer-events-none"></div>
        
        {/* Logo */}
        <div className="relative z-10 flex items-center">
          <img alt="Wealthio Logo" className="h-12 w-auto object-contain brightness-0 invert" src="/wealthio-logo.svg" />
        </div>

        {/* Headline & Subtext */}
        <div className="relative z-10 flex flex-col gap-8 max-w-lg mb-20">
          <h1 className="font-display text-[48px] leading-[56px] tracking-[-0.02em] font-extrabold text-surface-container-lowest">
            Welcome back to smarter investing.
          </h1>
          <p className="font-body text-[18px] leading-[28px] font-medium text-primary-fixed-dim">
            Securely access your portfolio and AI recommendations. Your financial future, algorithmically optimized and precisely managed.
          </p>
        </div>
        <div className="relative z-10">
          <p className="font-mono text-[12px] leading-[16px] tracking-[0.04em] text-primary-fixed-dim uppercase font-semibold">
            Bank-level Security • End-to-end Encryption
          </p>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="w-full lg:w-1/2 bg-surface flex flex-col justify-center items-center p-4 md:p-10 relative">
        <div className="lg:hidden absolute top-4 left-4">
          <img alt="Wealthio Logo" className="h-8 w-auto object-contain" src="/wealthio-logo.svg" />
        </div>
        
        <div className="w-full max-w-[400px] flex flex-col gap-8">
          <div className="flex flex-col gap-2 text-center lg:text-left mb-4">
            <h2 className="font-display text-[32px] leading-[40px] tracking-[-0.01em] text-on-surface font-bold">Sign In</h2>
            <p className="font-body text-[16px] leading-[24px] text-on-surface-variant font-medium">Enter your details to access your account.</p>
          </div>

          {apiError && (
            <div className="bg-error-container text-on-error-container text-sm px-4 py-3 rounded-lg">{apiError}</div>
          )}

          <form className="flex flex-col gap-6" onSubmit={handleSubmit}>
            {/* Email Field */}
            <div className="flex flex-col gap-2">
              <label className="font-mono text-[12px] leading-[16px] tracking-[0.04em] text-on-surface uppercase font-bold" htmlFor="email">Email Address</label>
              <div className="relative group">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px] group-focus-within:text-primary">mail</span>
                <input className="w-full bg-surface-container-lowest border border-outline-variant rounded py-3 pl-10 pr-4 text-on-surface font-body font-medium placeholder:text-outline-variant focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors" id="email" placeholder="name@example.com" type="email" value={form.email} onChange={set("email")} />
              </div>
              {errors.email && <p className="text-error text-xs">{errors.email}</p>}
            </div>

            {/* Password Field */}
            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <label className="font-mono text-[12px] leading-[16px] tracking-[0.04em] text-on-surface uppercase font-bold" htmlFor="password">Password</label>
                <Link className="font-mono text-[12px] leading-[16px] tracking-[0.04em] text-secondary hover:text-on-secondary-fixed-variant transition-colors font-bold" to="#">Forgot password?</Link>
              </div>
              <div className="relative group">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px] group-focus-within:text-primary">lock</span>
                <input className="w-full bg-surface-container-lowest border border-outline-variant rounded py-3 pl-10 pr-10 text-on-surface font-body font-medium placeholder:text-outline-variant focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors" id="password" placeholder="••••••••" type={showPassword ? "text" : "password"} value={form.password} onChange={set("password")} />
                <button className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface transition-colors focus:outline-none" type="button" onClick={() => setShowPassword(!showPassword)}>
                  <span className="material-symbols-outlined text-[20px]">{showPassword ? "visibility" : "visibility_off"}</span>
                </button>
              </div>
              {errors.password && <p className="text-error text-xs">{errors.password}</p>}
            </div>

            {/* Submit */}
            <button className="mt-2 w-full bg-primary text-on-primary font-mono text-[14px] leading-[20px] tracking-[0.02em] py-3 px-4 rounded font-bold transition-all duration-200 hover:bg-on-surface active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed" type="submit" disabled={loading}>
              {loading ? (<><span className="material-symbols-outlined animate-spin text-[20px]">progress_activity</span> Authenticating...</>) : "Sign In"}
            </button>
          </form>
          <div className="text-center mt-4">
            <p className="font-body text-[16px] leading-[24px] text-on-surface-variant font-medium">
              New to Wealthio? <Link className="text-secondary hover:text-on-secondary-fixed-variant font-bold transition-colors" to="/register">Create Account</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

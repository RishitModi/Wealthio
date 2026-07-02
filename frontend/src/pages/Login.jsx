import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Mail, Lock, Eye, EyeOff, ShieldCheck, ArrowRight, TrendingUp } from "lucide-react";
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
    <div className="min-h-screen w-full flex bg-[#F8FAFC] font-body text-[#111827] antialiased overflow-x-hidden">
      {/* Left side panel (45% width on desktop) */}
      <div className="hidden lg:flex flex-col w-[45%] bg-abstract-growth relative p-12 justify-between border-r border-[#E5E7EB] text-white">
        <div className="growth-curves" />
        
        {/* Brand logo */}
        <div className="relative z-10 flex items-center gap-2 cursor-pointer" onClick={() => navigate("/")}>
          <div className="bg-white/10 p-2.5 rounded-xl backdrop-blur-md border border-white/20 flex items-center justify-center">
            <TrendingUp className="h-6 w-6 text-white" />
          </div>
          <span className="text-xl font-extrabold tracking-tight font-display">
            Wealthio
          </span>
        </div>

        {/* Feature/Headline */}
        <div className="relative z-10 flex flex-col gap-6 max-w-md my-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/10 border border-white/20 backdrop-blur-md mb-4 text-[#A5B4FC]">
              <ShieldCheck className="h-3.5 w-3.5" />
              Smarter Personal Finance
            </span>
            <h1 className="font-display text-4xl font-extrabold leading-tight tracking-tight mb-4">
              Welcome back to smarter investing.
            </h1>
            <p className="text-white/80 text-sm leading-relaxed font-medium">
              Securely access your portfolio and AI recommendations. Your financial future, algorithmically optimized and precisely managed.
            </p>
          </motion.div>

          <div className="mt-8 grid grid-cols-2 gap-4 border-t border-white/10 pt-8">
            <div>
              <p className="text-2xl font-extrabold font-display text-white">100%</p>
              <p className="text-xs text-white/60 font-semibold uppercase tracking-wider mt-1">Data Control</p>
            </div>
            <div>
              <p className="text-2xl font-extrabold font-display text-white">Prophet</p>
              <p className="text-xs text-white/60 font-semibold uppercase tracking-wider mt-1">AI Forecasting</p>
            </div>
          </div>
        </div>

        {/* Security badge footer */}
        <div className="relative z-10 flex items-center gap-2 text-white/60 text-xs font-mono uppercase tracking-wider font-semibold">
          <ShieldCheck className="h-4 w-4 text-emerald-400" />
          <span>Bank-level Security • End-to-end Encryption</span>
        </div>
      </div>

      {/* Right side form panel */}
      <div className="w-full lg:w-[55%] flex flex-col justify-center items-center p-6 md:p-12 relative bg-[#F8FAFC]">
        {/* Mobile Header Logo */}
        <div className="lg:hidden absolute top-6 left-6 flex items-center gap-2">
          <div className="bg-primary/10 p-2 rounded-xl text-primary flex items-center justify-center">
            <TrendingUp className="h-5 w-5" />
          </div>
          <span className="text-lg font-extrabold tracking-tight text-[#111827] font-display">
            Wealthio
          </span>
        </div>

        <motion.div 
          className="w-full max-w-[420px] bg-white rounded-3xl p-8 border border-[#E5E7EB] shadow-premium hover:shadow-premium-hover transition-all duration-300"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
        >
          <div className="flex flex-col gap-2 mb-8">
            <h2 className="font-display text-2xl font-bold text-[#111827]">Sign In</h2>
            <p className="text-sm font-medium text-[#6B7280]">Enter your credentials to manage your investments.</p>
          </div>

          {apiError && (
            <motion.div 
              className="bg-red-50 border border-red-200 text-red-700 text-xs px-4 py-3 rounded-2xl mb-6 font-medium"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              {apiError}
            </motion.div>
          )}

          <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
            {/* Email Field */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-[#111827] uppercase tracking-wider font-mono" htmlFor="email">
                Email Address
              </label>
              <div className="relative group">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#9CA3AF] group-focus-within:text-primary transition-colors">
                  <Mail className="h-4.5 w-4.5" />
                </span>
                <input
                  className="w-full bg-[#F8FAFC] border border-[#E5E7EB] rounded-xl py-3 pl-11 pr-4 text-[#111827] text-sm font-medium placeholder-[#9CA3AF] focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
                  id="email"
                  placeholder="name@example.com"
                  type="email"
                  value={form.email}
                  onChange={set("email")}
                />
              </div>
              {errors.email && <p className="text-red-500 text-xs font-semibold">{errors.email}</p>}
            </div>

            {/* Password Field */}
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-[#111827] uppercase tracking-wider font-mono" htmlFor="password">
                  Password
                </label>
                <Link
                  className="text-xs font-bold text-secondary hover:text-primary transition-colors font-mono uppercase tracking-wider"
                  to="#"
                >
                  Forgot Password?
                </Link>
              </div>
              <div className="relative group">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#9CA3AF] group-focus-within:text-primary transition-colors">
                  <Lock className="h-4.5 w-4.5" />
                </span>
                <input
                  className="w-full bg-[#F8FAFC] border border-[#E5E7EB] rounded-xl py-3 pl-11 pr-11 text-[#111827] text-sm font-medium placeholder-[#9CA3AF] focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
                  id="password"
                  placeholder="••••••••"
                  type={showPassword ? "text" : "password"}
                  value={form.password}
                  onChange={set("password")}
                />
                <button
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-[#111827] transition-colors focus:outline-none cursor-pointer"
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
                </button>
              </div>
              {errors.password && <p className="text-red-500 text-xs font-semibold">{errors.password}</p>}
            </div>

            {/* Submit */}
            <button
              className="mt-2 w-full bg-primary text-white py-3 px-4 rounded-xl font-bold text-sm tracking-wide transition-all duration-200 hover:bg-opacity-95 hover:shadow-md active:scale-98 flex items-center justify-center gap-2 cursor-pointer"
              type="submit"
              disabled={loading}
            >
              {loading ? (
                <>
                  <div className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  <span>Signing In...</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          <div className="text-center mt-6 pt-6 border-t border-[#E5E7EB]">
            <p className="text-sm font-medium text-[#6B7280]">
              New to Wealthio?{" "}
              <Link className="text-secondary hover:text-primary font-bold transition-colors" to="/register">
                Create Account
              </Link>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

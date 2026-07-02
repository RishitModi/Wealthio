import { useNavigate } from "react-router-dom";
import { LogOut, TrendingUp, User } from "lucide-react";
import useAuth from "../context/useAuth";

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <header className="sticky top-0 z-50 border-b border-[#E5E7EB] bg-white/80 backdrop-blur-md px-6 py-4 flex justify-between items-center shadow-premium">
      {/* Brand logo */}
      <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate("/dashboard")}>
        <div className="bg-primary/10 p-2 rounded-xl text-primary flex items-center justify-center">
          <TrendingUp className="h-5 w-5" />
        </div>
        <span
          className="text-lg font-extrabold tracking-tight text-[#111827] font-display"
        >
          Wealthio
        </span>
      </div>

      {/* Right nav options */}
      <div className="flex items-center gap-4">
        {user && (
          <div className="flex items-center gap-2 bg-[#F1F5F9] px-3 py-1.5 rounded-xl border border-[#E5E7EB]">
            <div className="h-5 w-5 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-xs">
              <User className="h-3 w-3" />
            </div>
            <span
              className="hidden sm:block text-xs font-semibold text-[#6B7280] font-mono"
            >
              {user.email}
            </span>
          </div>
        )}
        <button
          id="navbar-logout-btn"
          onClick={handleLogout}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border border-[#E5E7EB] text-xs font-bold text-[#111827] hover:bg-[#F8FAFC] transition-all cursor-pointer shadow-sm active:scale-95"
        >
          <LogOut className="h-3.5 w-3.5" />
          <span>Log out</span>
        </button>
      </div>
    </header>
  );
}

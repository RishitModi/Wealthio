import { useNavigate } from "react-router-dom";
import useAuth from "../context/useAuth";

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <header className="sticky top-0 z-50 border-b border-outline-variant bg-surface-container-lowest/90 backdrop-blur-md px-6 py-3 flex justify-between items-center shadow-sm">
      {/* ── Logo / Brand ── */}
      <div className="flex items-center gap-2">
        <span className="material-symbols-outlined text-[22px] text-primary">
          show_chart
        </span>
        <span
          className="font-display text-[18px] font-extrabold tracking-tight text-on-surface"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Wealthio
        </span>
      </div>

      {/* ── Right side ── */}
      <div className="flex items-center gap-4">
        <span
          className="hidden sm:block text-sm font-semibold text-on-surface-variant"
          style={{ fontFamily: "var(--font-mono)" }}
        >
          {user?.email}
        </span>
        <button
          id="navbar-logout-btn"
          onClick={handleLogout}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-outline-variant text-sm font-semibold text-on-surface hover:bg-surface-variant transition-all duration-150"
        >
          <span className="material-symbols-outlined text-[16px]">logout</span>
          Log out
        </button>
      </div>
    </header>
  );
}

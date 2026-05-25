import { useAuth } from "../context/AuthContext";

export default function Dashboard() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-background text-on-surface flex flex-col font-body">
      {/* Top Navbar */}
      <header className="border-b border-outline-variant bg-surface-container-lowest px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <img alt="Wealthio Logo" className="h-8 w-auto object-contain" src="/wealthio-logo.svg" />
        </div>
        <div className="flex items-center gap-4">
          <span className="font-mono text-sm font-semibold">{user?.email}</span>
          <button onClick={logout} className="px-4 py-2 border border-outline-variant rounded-md text-sm font-semibold hover:bg-surface-variant transition-colors">
            Log out
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col items-center justify-center p-6 text-center">
        <span className="material-symbols-outlined text-[64px] text-secondary mb-4 opacity-80">monitoring</span>
        <h1 className="font-display-lg text-display-lg text-on-surface mb-2">
          Dashboard coming soon
        </h1>
        <p className="font-body-lg text-body-lg text-on-surface-variant max-w-md">
          Your personalized investment portfolio is being generated. Check back shortly.
        </p>
      </main>
    </div>
  );
}

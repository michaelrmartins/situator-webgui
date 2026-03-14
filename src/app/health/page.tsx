import HardwareDashboard from "@/components/health/HardwareDashboard";
import OperatorsDashboard from "@/components/health/OperatorsDashboard";
import LifecycleDashboard from "@/components/health/LifecycleDashboard";

export default function HealthPage() {
  return (
    <div className="min-h-screen p-8 max-w-7xl mx-auto space-y-12 pb-20">
      <header className="mb-10 text-center animate-in fade-in slide-in-from-top-4 duration-700">
        <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">
          Health Check
        </h1>
      </header>

      {/* Section 1: Hardware & Redes */}
      <section>
        <div className="flex items-center gap-2 mb-6">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><line x1="12" x2="12" y1="8" y2="16"/><line x1="8" x2="16" y1="12" y2="12"/></svg>
          <h2 className="text-xl font-medium text-white tracking-tight">Cybersecurity & Hardware Health</h2>
        </div>
        <HardwareDashboard />
      </section>

      {/* Section 2: Operadores */}
      <section>
        <div className="flex items-center gap-2 mb-6">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-rose-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          <h2 className="text-xl font-medium text-white tracking-tight">Operator Productivity</h2>
        </div>
        <OperatorsDashboard />
      </section>

      {/* Section 3: Ciclo de Vida */}
      <section>
        <div className="flex items-center gap-2 mb-6">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-purple-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 22h14a2 2 0 0 0 2-2V7l-5-5H6a2 2 0 0 0-2 2v4"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M3 15h6"/><path d="M3 18h6"/><path d="M3 12h6"/></svg>
          <h2 className="text-xl font-medium text-white tracking-tight">Credential Lifecycle</h2>
        </div>
        <LifecycleDashboard />
      </section>

    </div>
  );
}

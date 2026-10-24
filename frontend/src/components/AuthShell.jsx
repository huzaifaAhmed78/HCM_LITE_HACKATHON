export default function AuthShell({ title, subtitle, children }) {
  return (
    <div className="grid min-h-screen md:grid-cols-[1fr_1.1fr]">
      <div className="hidden bg-pine-dark p-12 text-white md:flex md:flex-col md:justify-between">
        <div className="font-display text-3xl font-bold">HCM-Lite</div>
        <div>
          <p className="font-display text-4xl font-semibold leading-tight">Hiring, attendance, leave and payroll in one place.</p>
          <p className="mt-4 max-w-sm text-sm text-white/70">A lightweight people-operations system for growing teams.</p>
        </div>
        <div className="text-xs text-white/50">Hackathon build</div>
      </div>
      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <h1 className="text-2xl font-bold">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-ink/70">{subtitle}</p>}
          <div className="mt-6">{children}</div>
        </div>
      </div>
    </div>
  )
}

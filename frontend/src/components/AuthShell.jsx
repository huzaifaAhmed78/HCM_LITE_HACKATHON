// Decorative attendance heatmap for the sign-in panel (purely visual, fixed pattern).
const LEVELS = [
  [1, 2, 2, 3, 2, 0, 0],
  [2, 3, 4, 4, 3, 1, 0],
  [3, 4, 4, 4, 4, 1, 0],
  [2, 4, 4, 3, 4, 2, 0],
  [1, 3, 4, 4, 3, 1, 0],
]
const SHADE = ['bg-white/10', 'bg-white/20', 'bg-white/35', 'bg-white/55', 'bg-white/80']

export default function AuthShell({ title, subtitle, children }) {
  return (
    <div className="grid min-h-screen md:grid-cols-[1fr_1.1fr]">
      <div className="hidden bg-gradient-to-br from-pine-dark via-pine-dark to-pine p-12 text-white md:flex md:flex-col md:justify-between">
        <div className="font-display text-3xl font-bold">HCM-Lite</div>
        <div>
          <div className="mb-8 grid max-w-xs grid-cols-7 gap-1.5" aria-hidden="true">
            {LEVELS.flat().map((l, i) => (
              <i key={i} className={`aspect-square rounded-md ${SHADE[l]}`} style={{ animation: `cell-in 0.4s ease-out ${i * 18}ms both` }} />
            ))}
          </div>
          <p className="font-display text-4xl font-semibold leading-tight">Hiring, attendance, leave and payroll in one place.</p>
          <p className="mt-4 max-w-sm text-sm text-white/70">A lightweight people-operations system for growing teams.</p>
        </div>
        <div className="text-xs text-white/50">Hackathon build</div>
      </div>
      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm rounded-2xl border border-sand bg-white p-7 shadow-card">
          <h1 className="text-2xl font-bold">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-ink/70">{subtitle}</p>}
          <div className="mt-6">{children}</div>
        </div>
      </div>
    </div>
  )
}

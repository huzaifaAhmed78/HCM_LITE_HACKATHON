import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth.jsx'
import { cx } from './ui.jsx'
import AiChat from './AiChat.jsx'
import Notifications from './Notifications.jsx'

// Simple stroke icons, one per menu item.
const ICONS = {
  home: 'M3 11l9-8 9 8M5 10v10h5v-6h4v6h5V10',
  building: 'M4 21V5a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v16M14 9h5a1 1 0 0 1 1 1v11M8 8h2M8 12h2M8 16h2M3 21h18',
  tag: 'M20 12l-8 8-9-9V3h8l9 9zM7.5 7.5h.01',
  lock: 'M6 11h12v9H6zM8 11V8a4 4 0 0 1 8 0v3',
  users: 'M16 20v-1.5a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4V20M9.5 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7M21 20v-1.5a4 4 0 0 0-3-3.9M16 4.2a3.5 3.5 0 0 1 0 6.6',
  user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0',
  clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2',
  inbox: 'M5 3h10l4 4v14H5zM14 3v5h5M9 14l2 2 4-4',
  wallet: 'M3 7h16a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM3 7l2-3h12M16 14h2',
  receipt: 'M6 3h12v18l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6',
  calendar: 'M4 6h16v14H4zM4 10h16M8 3v4M16 3v4',
  settings: 'M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M14 4v4M8 10v4M16 16v4',
  megaphone: 'M3 11v2a1 1 0 0 0 1 1h3l8 4V6L7 10H4a1 1 0 0 0-1 1zM19 9a4 4 0 0 1 0 6',
  shield: 'M9 3h6l1 2h3v16H5V5h3zM9 12h6M9 16h6',
}

function Icon({ name }) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="shrink-0">
      <path d={ICONS[name]} />
    </svg>
  )
}

const NAV = {
  admin: [
    ['/', 'Home', 'home'],
    ['/departments', 'Departments', 'building'],
    ['/designations', 'Designations', 'tag'],
    ['/hr-users', 'HR logins', 'lock'],
    ['/employees', 'Employees', 'users'],
    ['/attendance-board', 'Attendance', 'clock'],
    ['/leave-requests', 'Leave requests', 'inbox'],
    ['/payroll', 'Payroll', 'wallet'],
    ['/leave-setup', 'Leave and holidays', 'calendar'],
    ['/settings', 'Settings', 'settings'],
    ['/announcements', 'Announcements', 'megaphone'],
    ['/audit', 'Audit log', 'shield'],
  ],
  hr: [
    ['/', 'Home', 'home'],
    ['/employees', 'Employees', 'users'],
    ['/attendance-board', 'Attendance', 'clock'],
    ['/leave-requests', 'Leave requests', 'inbox'],
    ['/payroll', 'Payroll', 'wallet'],
    ['/settings', 'Settings', 'settings'],
    ['/announcements', 'Announcements', 'megaphone'],
  ],
  employee: [
    ['/', 'Home', 'home'],
    ['/me', 'My profile', 'user'],
    ['/attendance', 'Attendance', 'clock'],
    ['/leave', 'Leave', 'calendar'],
    ['/payslips', 'Payslips', 'receipt'],
    ['/announcements', 'Announcements', 'megaphone'],
  ],
}

const initials = (name = '') => name.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase() || '?'

export default function Layout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const items = NAV[user.role] || NAV.employee

  return (
    <div className="min-h-screen bg-paper md:flex">
      <aside className="border-b border-sand bg-white md:sticky md:top-0 md:flex md:h-screen md:w-64 md:shrink-0 md:flex-col md:border-b-0 md:border-r">
        <div className="flex items-center gap-3 px-5 py-4 md:py-6">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-pine-dark font-display text-lg font-bold text-white">H</span>
          <div>
            <div className="font-display text-xl font-bold leading-none">HCM-Lite</div>
            <div className="mt-1 text-xs text-ink/50">People operations</div>
          </div>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-3 md:flex-1 md:flex-col md:overflow-y-auto md:pb-6">
          {items.map(([to, label, icon]) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                cx(
                  'flex shrink-0 items-center gap-3 whitespace-nowrap rounded-full px-4 py-2.5 text-sm transition-colors',
                  isActive ? 'bg-pine-dark font-medium text-white shadow-card' : 'text-ink/70 hover:bg-paper hover:text-ink'
                )
              }
            >
              <Icon name={icon} />
              {label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="flex flex-wrap items-center justify-end gap-3 px-5 py-4 md:px-8">
          <Notifications />
          <div className="flex items-center gap-3 rounded-full border border-sand bg-white py-1.5 pl-1.5 pr-4 shadow-card">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-pine-dark text-sm font-semibold text-white">{initials(user.name)}</span>
            <div className="leading-tight">
              <div className="text-sm font-medium">{user.name}</div>
              <div className="text-xs capitalize text-ink/50">{user.role}</div>
            </div>
          </div>
          <button className="rounded-full border border-sand bg-white px-3.5 py-2 text-sm transition-colors hover:bg-paper" onClick={() => navigate('/change-password')}>
            Change password
          </button>
          <button className="rounded-full border border-sand bg-white px-3.5 py-2 text-sm transition-colors hover:bg-paper" onClick={() => { logout(); navigate('/login') }}>
            Sign out
          </button>
        </header>

        <main className="mx-auto max-w-6xl px-5 pb-10 md:px-8">
          <div key={pathname} className="anim-page"><Outlet /></div>
        </main>
        <AiChat role={user.role} />
      </div>
    </div>
  )
}

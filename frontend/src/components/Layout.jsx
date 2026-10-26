import { useEffect, useRef, useState } from 'react'
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
  search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-4-4',
  chevron: 'M6 9l6 6 6-6',
  key: 'M14 10a4 4 0 1 0-3.5 4H12l1.5 1.5H16V18h2v-2l2-2v-2.5L14.5 10zM8 10h.01',
  logout: 'M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 16l-4-4 4-4M6 12h10',
}

function Icon({ name, size = 18 }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="shrink-0">
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
const todayLabel = () => new Date().toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })

// Avatar button with a small menu: change password and sign out.
function UserMenu({ user, onPassword, onLogout }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  useEffect(() => {
    if (!open) return undefined
    const close = (e) => { if (!ref.current?.contains(e.target)) setOpen(false) }
    const esc = (e) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', esc)
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', esc) }
  }, [open])

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-2.5 rounded-xl border border-sand bg-white py-1.5 pl-1.5 pr-3 transition-colors hover:bg-paper"
      >
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-pine-dark text-sm font-semibold text-white">{initials(user.name)}</span>
        <span className="hidden text-left leading-tight sm:block">
          <span className="block text-sm font-medium">{user.name}</span>
          <span className="block text-xs capitalize text-ink/50">{user.role}</span>
        </span>
        <Icon name="chevron" size={16} />
      </button>
      {open && (
        <div role="menu" className="anim-pop absolute right-0 z-30 mt-2 w-48 overflow-hidden rounded-xl border border-sand bg-white p-1 shadow-lift">
          <button role="menuitem" onClick={() => { setOpen(false); onPassword() }} className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm hover:bg-paper">
            <Icon name="key" size={16} /> Change password
          </button>
          <button role="menuitem" onClick={() => { setOpen(false); onLogout() }} className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-red-700 hover:bg-red-50">
            <Icon name="logout" size={16} /> Sign out
          </button>
        </div>
      )}
    </div>
  )
}

export default function Layout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [q, setQ] = useState('')
  const all = NAV[user.role] || NAV.employee
  const items = q.trim() ? all.filter(([, label]) => label.toLowerCase().includes(q.trim().toLowerCase())) : all

  return (
    <div className="min-h-screen bg-paper md:flex">
      <aside className="border-b border-sand bg-white md:sticky md:top-0 md:flex md:h-screen md:w-64 md:shrink-0 md:flex-col md:border-b-0 md:border-r">
        <div className="flex items-center gap-3 px-5 py-4 md:pb-4 md:pt-6">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-pine-dark font-display text-lg font-bold text-white">H</span>
          <div>
            <div className="font-display text-xl font-bold leading-none">HCM-Lite</div>
            <div className="mt-1 text-xs text-ink/50">People operations</div>
          </div>
        </div>

        <div className="hidden px-4 pb-3 md:block">
          <label className="flex items-center gap-2 rounded-xl border border-sand bg-paper px-3 py-2 text-ink/50 focus-within:border-pine focus-within:bg-white focus-within:ring-2 focus-within:ring-pine/20">
            <Icon name="search" size={16} />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Quick search"
              aria-label="Search the menu"
              className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-ink/40"
            />
          </label>
        </div>

        <nav className="flex gap-1 overflow-x-auto px-3 pb-3 md:flex-1 md:flex-col md:overflow-y-auto md:pb-6">
          {items.map(([to, label, icon]) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                cx(
                  'flex shrink-0 items-center gap-3 whitespace-nowrap rounded-xl px-3.5 py-2.5 text-sm transition-colors',
                  isActive ? 'bg-pine/10 font-semibold text-pine-dark' : 'text-ink/65 hover:bg-paper hover:text-ink'
                )
              }
            >
              {({ isActive }) => (
                <>
                  <span className={cx('grid h-7 w-7 place-items-center rounded-lg', isActive ? 'bg-pine-dark text-white' : 'text-ink/55')}>
                    <Icon name={icon} size={16} />
                  </span>
                  {label}
                </>
              )}
            </NavLink>
          ))}
          {items.length === 0 && <p className="px-3.5 py-2 text-sm text-ink/50">No match</p>}
        </nav>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 md:px-8">
          <div className="flex items-center gap-2.5 rounded-xl border border-sand bg-white px-3.5 py-2 text-sm text-ink/70 shadow-card">
            <Icon name="calendar" size={16} />
            {todayLabel()}
          </div>
          <div className="flex items-center gap-3">
            <Notifications />
            <UserMenu user={user} onPassword={() => navigate('/change-password')} onLogout={() => { logout(); navigate('/login') }} />
          </div>
        </header>

        <main className="mx-auto max-w-6xl px-5 pb-10 md:px-8">
          <div key={pathname} className="anim-page"><Outlet /></div>
        </main>
        <AiChat role={user.role} />
      </div>
    </div>
  )
}

import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { useAuth } from './auth.jsx'
import Layout from './components/Layout.jsx'
import Setup from './pages/Setup.jsx'
import Login from './pages/Login.jsx'
import ChangePassword from './pages/ChangePassword.jsx'
import Home from './pages/Home.jsx'
import NamedList from './pages/NamedList.jsx'
import HrUsers from './pages/HrUsers.jsx'
import Employees from './pages/Employees.jsx'
import EmployeeDetail from './pages/EmployeeDetail.jsx'
import MyProfile from './pages/MyProfile.jsx'
import Attendance from './pages/Attendance.jsx'
import AttendanceAdmin from './pages/AttendanceAdmin.jsx'
import Leave from './pages/Leave.jsx'
import LeaveInbox from './pages/LeaveInbox.jsx'
import LeaveSetup from './pages/LeaveSetup.jsx'
import Payroll from './pages/Payroll.jsx'
import Payslips from './pages/Payslips.jsx'
import Settings from './pages/Settings.jsx'
import AuditLog from './pages/AuditLog.jsx'
import Announcements from './pages/Announcements.jsx'

function Guard({ roles, children }) {
  const { user } = useAuth()
  const loc = useLocation()
  if (!user) return <Navigate to="/login" replace state={{ from: loc.pathname }} />
  if (user.mustChangePassword && loc.pathname !== '/change-password') return <Navigate to="/change-password" replace />
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />
  return children
}

export default function App() {
  return (
    <Routes>
      <Route path="/setup" element={<Setup />} />
      <Route path="/login" element={<Login />} />
      <Route path="/change-password" element={<Guard><ChangePassword /></Guard>} />
      <Route element={<Guard><Layout /></Guard>}>
        <Route path="/" element={<Home />} />
        <Route path="/departments" element={<Guard roles={['admin']}><NamedList title="Departments" path="/departments" noun="department" /></Guard>} />
        <Route path="/designations" element={<Guard roles={['admin']}><NamedList title="Designations" path="/designations" noun="designation" /></Guard>} />
        <Route path="/hr-users" element={<Guard roles={['admin']}><HrUsers /></Guard>} />
        <Route path="/employees" element={<Guard roles={['hr', 'admin']}><Employees /></Guard>} />
        <Route path="/employees/:id" element={<Guard roles={['hr', 'admin']}><EmployeeDetail /></Guard>} />
        <Route path="/me" element={<Guard roles={['employee']}><MyProfile /></Guard>} />
        <Route path="/attendance" element={<Guard roles={['employee']}><Attendance /></Guard>} />
        <Route path="/attendance-board" element={<Guard roles={['hr', 'admin']}><AttendanceAdmin /></Guard>} />
        <Route path="/leave" element={<Guard roles={['employee']}><Leave /></Guard>} />
        <Route path="/leave-requests" element={<Guard roles={['hr', 'admin']}><LeaveInbox /></Guard>} />
        <Route path="/leave-setup" element={<Guard roles={['admin']}><LeaveSetup /></Guard>} />
        <Route path="/payroll" element={<Guard roles={['hr', 'admin']}><Payroll /></Guard>} />
        <Route path="/payslips" element={<Guard roles={['employee']}><Payslips /></Guard>} />
        <Route path="/settings" element={<Guard roles={['hr', 'admin']}><Settings /></Guard>} />
        <Route path="/audit" element={<Guard roles={['admin']}><AuditLog /></Guard>} />
        <Route path="/announcements" element={<Guard><Announcements /></Guard>} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

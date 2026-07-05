import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Calendar, Users, Receipt, Stethoscope,
  Package, Boxes, Database, LogOut, HeartPulse,
} from 'lucide-react'
import { getUser, logout, canManage } from '../lib/auth'

const NAV = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'แดชบอร์ด' },
  { to: '/appointments', icon: Calendar, label: 'ตารางนัด' },
  { to: '/patients', icon: Users, label: 'คนไข้' },
  { to: '/bills', icon: Receipt, label: 'บิล / ชำระเงิน' },
  { to: '/employees', icon: Stethoscope, label: 'บุคลากร' },
  { to: '/items', icon: Package, label: 'สินค้า' },
  { to: '/materials', icon: Boxes, label: 'วัสดุ' },
  { to: '/master', icon: Database, label: 'ข้อมูลหลัก', manage: true },
]

const ROLE_LABEL = { MASTER: 'Master', ADMIN: 'ผู้ดูแล', DOCTOR: 'แพทย์', ASSISTANT: 'ผู้ช่วยแพทย์', EMPLOYEE: 'พนักงาน' }

export default function Layout({ children }) {
  const user = getUser()

  return (
    <div className="flex flex-col h-screen bg-[#f6f8f9]">
      <header className="sticky top-0 z-40 bg-white border-b border-gray-100 shadow-sm">
        {/* accent bar — soft, light */}
        <div className="h-1 bg-gradient-to-r from-brand-200 via-brand-300 to-brand-100" />

        <div className="max-w-[1320px] mx-auto px-5">
          {/* top row */}
          <div className="flex items-center gap-3 py-3">
            <NavLink to="/dashboard" className="flex items-center gap-2.5 group" aria-label="Patient Clinic">
              <div className="w-9 h-9 rounded-lg bg-brand-600 text-white flex items-center justify-center group-hover:bg-brand-700 transition">
                <HeartPulse size={18} />
              </div>
              <div className="leading-none">
                <p className="font-semibold text-gray-800">Patient Clinic</p>
                <p className="text-[11px] text-gray-400 mt-1">ระบบจัดการคลินิก</p>
              </div>
            </NavLink>

            <div className="ml-auto flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <p className="text-sm text-gray-700 leading-none">{user?.name}</p>
                <p className="text-[11px] text-brand-600 mt-1">
                  {ROLE_LABEL[user?.role] || user?.role} · {user?.code}
                </p>
              </div>
              <span className="w-9 h-9 rounded-full bg-brand-50 text-brand-700 flex items-center justify-center text-sm font-semibold flex-shrink-0">
                {user?.name?.[0] || '?'}
              </span>
              <button
                onClick={logout}
                title="ออกจากระบบ"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-gray-200 text-gray-500 text-xs hover:bg-red-50 hover:border-red-200 hover:text-red-500 transition"
              >
                <LogOut size={14} /> <span className="hidden sm:inline">ออกจากระบบ</span>
              </button>
            </div>
          </div>

          {/* nav */}
          <nav
            aria-label="เมนูหลัก"
            className="flex items-center gap-1 py-2 border-t border-gray-100 overflow-x-auto [scrollbar-width:thin]"
          >
            {NAV.filter(i => !i.manage || canManage(user)).map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm whitespace-nowrap border transition ${
                    isActive
                      ? 'bg-brand-50 text-brand-700 border-brand-200 font-medium'
                      : 'text-gray-500 border-transparent hover:bg-gray-50 hover:text-gray-800'
                  }`
                }
              >
                <Icon size={17} /> {label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  )
}

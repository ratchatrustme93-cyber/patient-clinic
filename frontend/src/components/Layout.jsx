import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, Calendar, Users, Receipt, Stethoscope,
  Package, Boxes, Database, LogOut, HeartPulse, Palette,
} from 'lucide-react'
import { getUser, logout, canManage } from '../lib/auth'
import { getTheme, nextTheme, themeLabel } from '../lib/theme'

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
  const { pathname } = useLocation()
  const [theme, setTheme] = useState(getTheme)

  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar__accent" />

        <div className="shell">
          <div className="topbar__row">
            <NavLink to="/dashboard" className="brand" aria-label="Patient Clinic">
              <div className="brand__mark"><HeartPulse size={18} /></div>
              <div className="brand__text">
                <p className="brand__name">Patient Clinic</p>
                <p className="brand__sub">ระบบจัดการคลินิก</p>
              </div>
            </NavLink>

            <div className="userbox">
              <div className="userbox__meta">
                <p className="userbox__name">{user?.name}</p>
                <p className="userbox__role">
                  {ROLE_LABEL[user?.role] || user?.role} · {user?.code}
                </p>
              </div>
              <span className="avatar">{user?.name?.[0] || '?'}</span>
              <button
                onClick={() => setTheme(nextTheme())}
                title={`หน้าตา: ${themeLabel(theme)} — กดเพื่อสลับ`}
                aria-label="สลับหน้าตาแอป"
                className="icon-btn"
              >
                <Palette size={16} />
              </button>
              <button onClick={logout} title="ออกจากระบบ" className="pill-btn">
                <LogOut size={14} /> <span className="only-sm-up">ออกจากระบบ</span>
              </button>
            </div>
          </div>

          <nav aria-label="เมนูหลัก" className="nav">
            {NAV.filter(i => !i.manage || canManage(user)).map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) => `nav__link${isActive ? ' is-active' : ''}`}
              >
                <Icon size={17} /> {label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>

      <main className="app__main">
        <div key={pathname} className="page-enter app__page">{children}</div>
      </main>
    </div>
  )
}

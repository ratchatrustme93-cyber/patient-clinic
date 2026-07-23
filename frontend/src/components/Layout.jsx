import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, Calendar, Users, Receipt, Stethoscope,
  Package, Boxes, Database, LogOut, HeartPulse, Palette, Languages,
} from 'lucide-react'
import { getUser, logout, canManage } from '../lib/auth'
import { getTheme, nextTheme, themeLabel } from '../lib/theme'
import { useT, LANGS } from '../lib/i18n'

const NAV = [
  { to: '/dashboard', icon: LayoutDashboard, key: 'dashboard' },
  { to: '/appointments', icon: Calendar, key: 'appointments' },
  { to: '/patients', icon: Users, key: 'patients' },
  { to: '/bills', icon: Receipt, key: 'bills' },
  { to: '/employees', icon: Stethoscope, key: 'employees' },
  { to: '/items', icon: Package, key: 'items' },
  { to: '/materials', icon: Boxes, key: 'materials' },
  { to: '/master', icon: Database, key: 'master', manage: true },
]

export default function Layout({ children }) {
  const user = getUser()
  const { pathname } = useLocation()
  const { t, lang, toggleLang } = useT()
  const [theme, setTheme] = useState(getTheme)
  const langLabel = LANGS.find(l => l.id === lang)

  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar__accent" />

        <div className="shell">
          <div className="topbar__row">
            <NavLink to="/dashboard" className="brand" aria-label={t('nav.appName')}>
              <div className="brand__mark"><HeartPulse size={18} /></div>
              <div className="brand__text">
                <p className="brand__name">{t('nav.appName')}</p>
                <p className="brand__sub">{t('nav.appTagline')}</p>
              </div>
            </NavLink>

            <div className="userbox">
              <div className="userbox__meta">
                <p className="userbox__name">{user?.name}</p>
                <p className="userbox__role">
                  {t(`enum.role.${user?.role}`)} · {user?.code}
                </p>
              </div>
              <span className="avatar">{user?.name?.[0] || '?'}</span>

              <button
                onClick={toggleLang}
                title={t('nav.language', { name: langLabel?.label })}
                aria-label={t('nav.languageAria')}
                className="lang-btn"
              >
                <Languages size={15} /> {langLabel?.short}
              </button>

              <button
                onClick={() => setTheme(nextTheme())}
                title={t('nav.theme', { name: themeLabel(theme) })}
                aria-label={t('nav.themeAria')}
                className="icon-btn"
              >
                <Palette size={16} />
              </button>

              <button onClick={logout} title={t('nav.logout')} className="pill-btn">
                <LogOut size={14} /> <span className="only-sm-up">{t('nav.logout')}</span>
              </button>
            </div>
          </div>

          <nav aria-label={t('nav.menu')} className="nav">
            {NAV.filter(i => !i.manage || canManage(user)).map(({ to, icon: Icon, key }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) => `nav__link${isActive ? ' is-active' : ''}`}
              >
                <Icon size={17} /> {t(`nav.${key}`)}
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

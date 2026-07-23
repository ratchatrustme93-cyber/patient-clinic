import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { HeartPulse } from 'lucide-react'
import api from '../lib/api'
import { saveAuth } from '../lib/auth'
import { useT } from '../lib/i18n'
import { Btn } from '../components/ui'

export default function Login() {
  const nav = useNavigate()
  const { t } = useT()
  const [form, setForm] = useState({ email: 'master@clinic.local', password: 'master123' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setError(''); setLoading(true)
    try {
      const r = await api.post('/auth/login', form)
      saveAuth(r.data)
      nav('/dashboard')
    } catch (err) {
      setError(err.response?.data?.error || t('login.failed'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login">
      <div className="login__box">
        <div className="login__brand">
          <div className="login__mark"><HeartPulse size={24} /></div>
          <h1 className="login__title">{t('nav.appName')}</h1>
          <p className="login__sub">{t('nav.appTagline')}</p>
        </div>

        <form onSubmit={submit} className="login__card stack">
          <div>
            <label className="field__label">{t('login.email')}</label>
            <input className="input" type="email" required value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })} />
          </div>
          <div>
            <label className="field__label">{t('login.password')}</label>
            <input className="input" type="password" required value={form.password}
              onChange={e => setForm({ ...form, password: e.target.value })} />
          </div>
          {error && <p className="login__error">{error}</p>}
          <Btn type="submit" disabled={loading} className="btn--block">{loading ? t('login.signingIn') : t('login.signIn')}</Btn>
        </form>

        <div className="login__hint">
          <p className="medium mb-4">{t('login.testAccounts')}</p>
          <p>master@clinic.local / master123 · admin@clinic.local / admin123</p>
          <p>doctor@clinic.local / doctor123 · employee@clinic.local / employee123</p>
        </div>
      </div>
    </div>
  )
}

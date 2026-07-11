import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { HeartPulse } from 'lucide-react'
import api from '../lib/api'
import { saveAuth } from '../lib/auth'
import { inputCls, Btn } from '../components/ui'

export default function Login() {
  const nav = useNavigate()
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
      setError(err.response?.data?.error || 'เข้าสู่ระบบไม่สำเร็จ')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#e8edf2] p-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-6">
          <div className="w-12 h-12 rounded-xl bg-brand-600 text-white flex items-center justify-center mb-3">
            <HeartPulse size={24} />
          </div>
          <h1 className="text-lg font-semibold text-gray-800">Patient Clinic</h1>
          <p className="text-sm text-gray-500">ระบบจัดการคลินิก</p>
        </div>

        <form onSubmit={submit} className="bg-white rounded-2xl border border-gray-200 p-6 space-y-3">
          <div>
            <label className="text-sm text-gray-600 block mb-1">อีเมล</label>
            <input className={inputCls} type="email" required value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })} />
          </div>
          <div>
            <label className="text-sm text-gray-600 block mb-1">รหัสผ่าน</label>
            <input className={inputCls} type="password" required value={form.password}
              onChange={e => setForm({ ...form, password: e.target.value })} />
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <Btn type="submit" disabled={loading} className="w-full">{loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}</Btn>
        </form>

        <div className="mt-4 text-xs text-gray-500 bg-white/60 rounded-lg p-3 border border-gray-200">
          <p className="font-medium text-gray-500 mb-1">บัญชีทดสอบ (seed):</p>
          <p>master@clinic.local / master123 · admin@clinic.local / admin123</p>
          <p>doctor@clinic.local / doctor123 · employee@clinic.local / employee123</p>
        </div>
      </div>
    </div>
  )
}

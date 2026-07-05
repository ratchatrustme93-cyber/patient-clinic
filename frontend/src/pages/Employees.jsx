import { useEffect, useState } from 'react'
import { Plus, Pencil, X, Shield, Stethoscope, HeartHandshake, UserCog, Crown } from 'lucide-react'
import api from '../lib/api'
import { canManage } from '../lib/auth'
import { PageHeader, Btn, Modal, Field, inputCls, Empty, Badge } from '../components/ui'

const ROLES = {
  MASTER: { label: 'Master', icon: Crown, cls: 'bg-purple-50 text-purple-600' },
  ADMIN: { label: 'ผู้ดูแล', icon: Shield, cls: 'bg-gray-100 text-gray-600' },
  DOCTOR: { label: 'แพทย์', icon: Stethoscope, cls: 'bg-brand-50 text-brand-600' },
  ASSISTANT: { label: 'ผู้ช่วยแพทย์', icon: HeartHandshake, cls: 'bg-purple-50 text-purple-600' },
  EMPLOYEE: { label: 'พนักงาน', icon: UserCog, cls: 'bg-blue-50 text-blue-600' },
}
const TABS = ['ALL', 'DOCTOR', 'ASSISTANT', 'EMPLOYEE', 'ADMIN', 'MASTER']
const EMPTY = { name: '', email: '', password: '', role: 'EMPLOYEE', phone: '', position: '', specialty: '', licenseNo: '', departmentId: '' }

export default function Employees() {
  const manage = canManage()
  const [people, setPeople] = useState([])
  const [departments, setDepartments] = useState([])
  const [tab, setTab] = useState('ALL')
  const [open, setOpen] = useState(false)
  const [editId, setEditId] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  const set = f => e => setForm(p => ({ ...p, [f]: e.target.value }))
  const fetch = () => api.get('/employees').then(r => setPeople(r.data))
  useEffect(() => { fetch(); api.get('/master/departments').then(r => setDepartments(r.data)) }, [])

  function openNew() { setEditId(null); setForm(EMPTY); setErr(''); setOpen(true) }
  function openEdit(u) {
    setEditId(u.id); setErr('')
    setForm({ name: u.name, email: u.email, password: '', role: u.role, phone: u.phone || '', position: u.position || '', specialty: u.specialty || '', licenseNo: u.licenseNo || '', departmentId: u.departmentId || '' })
    setOpen(true)
  }
  async function save(e) {
    e.preventDefault(); setSaving(true); setErr('')
    try {
      if (editId) await api.put(`/employees/${editId}`, form)
      else await api.post('/employees', form)
      setOpen(false); fetch()
    } catch (e) { setErr(e.response?.data?.error || 'บันทึกไม่สำเร็จ') } finally { setSaving(false) }
  }
  async function deactivate(id) {
    if (!confirm('ปิดการใช้งานบุคลากรคนนี้?')) return
    await api.delete(`/employees/${id}`); fetch()
  }

  const list = people.filter(u => tab === 'ALL' || u.role === tab)

  return (
    <div className="p-6 mx-auto max-w-4xl">
      <PageHeader title="บุคลากร" subtitle={`${people.length} คน`}>
        {manage && <Btn onClick={openNew}><Plus size={14} className="inline mr-1" /> เพิ่มบุคลากร</Btn>}
      </PageHeader>

      <div className="flex gap-1 mb-4 flex-wrap">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-3 py-1.5 rounded-lg text-xs transition ${tab === t ? 'bg-brand-600 text-white' : 'bg-white border border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
            {t === 'ALL' ? 'ทั้งหมด' : ROLES[t].label}
          </button>
        ))}
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        {list.map(u => {
          const r = ROLES[u.role]; const Icon = r.icon
          return (
            <div key={u.id} className={`bg-white rounded-xl p-4 border border-gray-100 flex items-start gap-3 ${u.active ? '' : 'opacity-50'}`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${r.cls}`}>
                <Icon size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-800 text-sm flex items-center gap-2">
                  {u.name} {!u.active && <Badge tone="gray">ปิด</Badge>}
                </p>
                <p className="text-xs text-gray-400">{u.code} · {r.label}{u.department ? ` · ${u.department.name}` : ''}</p>
                {u.specialty && <p className="text-xs text-gray-400">เชี่ยวชาญ: {u.specialty}{u.licenseNo ? ` · ${u.licenseNo}` : ''}</p>}
                <p className="text-xs text-gray-400 mt-0.5">{u.email}{u.phone ? ` · ${u.phone}` : ''}</p>
              </div>
              {manage && (
                <div className="flex flex-col gap-1">
                  <button onClick={() => openEdit(u)} className="p-1.5 text-gray-400 hover:text-brand-600"><Pencil size={13} /></button>
                  {u.active && u.role !== 'MASTER' && <button onClick={() => deactivate(u.id)} className="p-1.5 text-gray-400 hover:text-red-500"><X size={13} /></button>}
                </div>
              )}
            </div>
          )
        })}
        {list.length === 0 && <div className="sm:col-span-2"><Empty>ไม่มีบุคลากรในกลุ่มนี้</Empty></div>}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title={editId ? 'แก้ไขบุคลากร' : 'เพิ่มบุคลากร'}>
        <form onSubmit={save} className="space-y-3">
          <Field label="ชื่อ-นามสกุล *"><input required className={inputCls} value={form.name} onChange={set('name')} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="บทบาท">
              <select className={inputCls} value={form.role} onChange={set('role')}>
                <option value="DOCTOR">แพทย์</option><option value="ASSISTANT">ผู้ช่วยแพทย์</option>
                <option value="EMPLOYEE">พนักงาน</option><option value="ADMIN">ผู้ดูแล</option><option value="MASTER">Master</option>
              </select>
            </Field>
            <Field label="แผนก">
              <select className={inputCls} value={form.departmentId} onChange={set('departmentId')}>
                <option value="">ไม่ระบุ</option>
                {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="เบอร์โทร"><input className={inputCls} value={form.phone} onChange={set('phone')} /></Field>
            <Field label="ตำแหน่ง"><input className={inputCls} value={form.position} onChange={set('position')} /></Field>
          </div>
          {(form.role === 'DOCTOR' || form.role === 'ASSISTANT') && (
            <div className="grid grid-cols-2 gap-3">
              <Field label="ความเชี่ยวชาญ"><input className={inputCls} value={form.specialty} onChange={set('specialty')} /></Field>
              <Field label="เลขใบประกอบฯ"><input className={inputCls} value={form.licenseNo} onChange={set('licenseNo')} /></Field>
            </div>
          )}
          <Field label={`อีเมล (ใช้เข้าระบบ) ${editId ? '' : '*'}`}>
            <input type="email" required={!editId} disabled={!!editId} className={inputCls + (editId ? ' bg-gray-50 text-gray-400' : '')} value={form.email} onChange={set('email')} />
          </Field>
          {!editId && <Field label="รหัสผ่าน (เว้นว่าง = clinic123)"><input type="text" className={inputCls} value={form.password} onChange={set('password')} placeholder="clinic123" /></Field>}
          {err && <p className="text-sm text-red-500">{err}</p>}
          <div className="flex gap-2 pt-2">
            <Btn type="button" variant="ghost" className="flex-1" onClick={() => setOpen(false)}>ยกเลิก</Btn>
            <Btn type="submit" disabled={saving} className="flex-1">{saving ? 'กำลังบันทึก...' : 'บันทึก'}</Btn>
          </div>
        </form>
      </Modal>
    </div>
  )
}

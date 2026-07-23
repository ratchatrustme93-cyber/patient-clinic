import { useEffect, useState } from 'react'
import { Plus, Pencil, X, Shield, Stethoscope, HeartHandshake, UserCog, Crown } from 'lucide-react'
import api from '../lib/api'
import { canManage } from '../lib/auth'
import { PageHeader, Btn, Modal, Field, Empty, Badge } from '../components/ui'

const ROLES = {
  MASTER: { label: 'Master', icon: Crown, tone: 'purple' },
  ADMIN: { label: 'ผู้ดูแล', icon: Shield, tone: 'gray' },
  DOCTOR: { label: 'แพทย์', icon: Stethoscope, tone: 'brand' },
  ASSISTANT: { label: 'ผู้ช่วยแพทย์', icon: HeartHandshake, tone: 'purple' },
  EMPLOYEE: { label: 'พนักงาน', icon: UserCog, tone: 'blue' },
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
    <div className="page">
      <PageHeader title="บุคลากร" subtitle={`${people.length} คน`}>
        {manage && <Btn onClick={openNew}><Plus size={14} /> เพิ่มบุคลากร</Btn>}
      </PageHeader>

      <div className="tabs">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)} className={`tab${tab === t ? ' is-active' : ''}`}>
            {t === 'ALL' ? 'ทั้งหมด' : ROLES[t].label}
          </button>
        ))}
      </div>

      <div className="people-grid">
        {list.map(u => {
          const r = ROLES[u.role]; const Icon = r.icon
          return (
            <div key={u.id} className={`person tone-${r.tone}${u.active ? '' : ' is-inactive'}`}>
              <div className="person__icon"><Icon size={18} /></div>
              <div className="grow-min">
                <p className="person__name">
                  {u.name} {!u.active && <Badge tone="gray">ปิด</Badge>}
                </p>
                <p className="person__meta">{u.code} · {r.label}{u.department ? ` · ${u.department.name}` : ''}</p>
                {u.specialty && <p className="person__meta">เชี่ยวชาญ: {u.specialty}{u.licenseNo ? ` · ${u.licenseNo}` : ''}</p>}
                <p className="person__meta mt-4">{u.email}{u.phone ? ` · ${u.phone}` : ''}</p>
              </div>
              {manage && (
                <div className="person__actions">
                  <button onClick={() => openEdit(u)} className="icon-btn"><Pencil size={13} /></button>
                  {u.active && u.role !== 'MASTER' && <button onClick={() => deactivate(u.id)} className="icon-btn icon-btn--danger"><X size={13} /></button>}
                </div>
              )}
            </div>
          )
        })}
        {list.length === 0 && <div className="people-grid__wide"><Empty>ไม่มีบุคลากรในกลุ่มนี้</Empty></div>}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title={editId ? 'แก้ไขบุคลากร' : 'เพิ่มบุคลากร'}>
        <form onSubmit={save} className="stack">
          <Field label="ชื่อ-นามสกุล *"><input required className="input" value={form.name} onChange={set('name')} /></Field>
          <div className="form-grid">
            <Field label="บทบาท">
              <select className="input" value={form.role} onChange={set('role')}>
                <option value="DOCTOR">แพทย์</option><option value="ASSISTANT">ผู้ช่วยแพทย์</option>
                <option value="EMPLOYEE">พนักงาน</option><option value="ADMIN">ผู้ดูแล</option><option value="MASTER">Master</option>
              </select>
            </Field>
            <Field label="แผนก">
              <select className="input" value={form.departmentId} onChange={set('departmentId')}>
                <option value="">ไม่ระบุ</option>
                {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </Field>
          </div>
          <div className="form-grid">
            <Field label="เบอร์โทร"><input className="input" value={form.phone} onChange={set('phone')} /></Field>
            <Field label="ตำแหน่ง"><input className="input" value={form.position} onChange={set('position')} /></Field>
          </div>
          {(form.role === 'DOCTOR' || form.role === 'ASSISTANT') && (
            <div className="form-grid">
              <Field label="ความเชี่ยวชาญ"><input className="input" value={form.specialty} onChange={set('specialty')} /></Field>
              <Field label="เลขใบประกอบฯ"><input className="input" value={form.licenseNo} onChange={set('licenseNo')} /></Field>
            </div>
          )}
          <Field label={`อีเมล (ใช้เข้าระบบ) ${editId ? '' : '*'}`}>
            <input type="email" required={!editId} disabled={!!editId} className="input" value={form.email} onChange={set('email')} />
          </Field>
          {!editId && <Field label="รหัสผ่าน (เว้นว่าง = clinic123)"><input type="text" className="input" value={form.password} onChange={set('password')} placeholder="clinic123" /></Field>}
          {err && <p className="small text-danger">{err}</p>}
          <div className="form-actions">
            <Btn type="button" variant="ghost" className="btn--grow" onClick={() => setOpen(false)}>ยกเลิก</Btn>
            <Btn type="submit" disabled={saving} className="btn--grow">{saving ? 'กำลังบันทึก...' : 'บันทึก'}</Btn>
          </div>
        </form>
      </Modal>
    </div>
  )
}

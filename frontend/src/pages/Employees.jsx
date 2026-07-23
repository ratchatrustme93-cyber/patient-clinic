import { useEffect, useState } from 'react'
import { Plus, Pencil, X, Shield, Stethoscope, HeartHandshake, UserCog, Crown } from 'lucide-react'
import api from '../lib/api'
import { useT } from '../lib/i18n'
import { canManage } from '../lib/auth'
import { PageHeader, Btn, Modal, Field, Empty, Badge } from '../components/ui'

const ROLES = {
  MASTER: { icon: Crown, tone: 'purple' },
  ADMIN: { icon: Shield, tone: 'gray' },
  DOCTOR: { icon: Stethoscope, tone: 'brand' },
  ASSISTANT: { icon: HeartHandshake, tone: 'purple' },
  EMPLOYEE: { icon: UserCog, tone: 'blue' },
}
const TABS = ['ALL', 'DOCTOR', 'ASSISTANT', 'EMPLOYEE', 'ADMIN', 'MASTER']
const EMPTY = { name: '', email: '', password: '', role: 'EMPLOYEE', phone: '', position: '', specialty: '', licenseNo: '', departmentId: '' }

export default function Employees() {
  const manage = canManage()
  const { t } = useT()
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
  // ช่องเลือกแผนกเอาเฉพาะที่ยังเปิดใช้งาน
  useEffect(() => { fetch(); api.get('/master/departments?activeOnly=1').then(r => setDepartments(r.data)) }, [])

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
    } catch (e) { setErr(e.response?.data?.error || t('employees.saveFailed')) } finally { setSaving(false) }
  }
  async function deactivate(id) {
    if (!confirm(t('employees.deactivateConfirm'))) return
    await api.delete(`/employees/${id}`); fetch()
  }

  const list = people.filter(u => tab === 'ALL' || u.role === tab)

  return (
    <div className="page">
      <PageHeader title={t('employees.title')} subtitle={t('employees.count', { n: people.length })}>
        {manage && <Btn onClick={openNew}><Plus size={14} /> {t('employees.add')}</Btn>}
      </PageHeader>

      <div className="tabs">
        {TABS.map(k => (
          <button key={k} onClick={() => setTab(k)} className={`tab${tab === k ? ' is-active' : ''}`}>
            {k === 'ALL' ? t('common.all') : t(`enum.role.${k}`)}
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
                  {u.name} {!u.active && <Badge tone="gray">{t('employees.disabledTag')}</Badge>}
                </p>
                <p className="person__meta">{u.code} · {t(`enum.role.${u.role}`)}{u.department ? ` · ${u.department.name}` : ''}</p>
                {u.specialty && <p className="person__meta">{t('employees.specialtyLine', { text: u.specialty })}{u.licenseNo ? ` · ${u.licenseNo}` : ''}</p>}
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
        {list.length === 0 && <div className="people-grid__wide"><Empty>{t('employees.noneInGroup')}</Empty></div>}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title={editId ? t('employees.editTitle') : t('employees.addTitle')}>
        <form onSubmit={save} className="stack">
          <Field label={t('employees.name')}><input required className="input" value={form.name} onChange={set('name')} /></Field>
          <div className="form-grid">
            <Field label={t('employees.role')}>
              <select className="input" value={form.role} onChange={set('role')}>
                {['DOCTOR', 'ASSISTANT', 'EMPLOYEE', 'ADMIN', 'MASTER'].map(r => (
                  <option key={r} value={r}>{t(`enum.role.${r}`)}</option>
                ))}
              </select>
            </Field>
            <Field label={t('employees.department')}>
              <select className="input" value={form.departmentId} onChange={set('departmentId')}>
                <option value="">{t('common.unspecified')}</option>
                {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </Field>
          </div>
          <div className="form-grid">
            <Field label={t('employees.phone')}><input className="input" value={form.phone} onChange={set('phone')} /></Field>
            <Field label={t('employees.position')}><input className="input" value={form.position} onChange={set('position')} /></Field>
          </div>
          {(form.role === 'DOCTOR' || form.role === 'ASSISTANT') && (
            <div className="form-grid">
              <Field label={t('employees.specialty')}><input className="input" value={form.specialty} onChange={set('specialty')} /></Field>
              <Field label={t('employees.licenseNo')}><input className="input" value={form.licenseNo} onChange={set('licenseNo')} /></Field>
            </div>
          )}
          <Field label={t('employees.email', { required: editId ? '' : '*' })}>
            <input type="email" required={!editId} disabled={!!editId} className="input" value={form.email} onChange={set('email')} />
          </Field>
          {!editId && <Field label={t('employees.password')}><input type="text" className="input" value={form.password} onChange={set('password')} placeholder="clinic123" /></Field>}
          {err && <p className="small text-danger">{err}</p>}
          <div className="form-actions">
            <Btn type="button" variant="ghost" className="btn--grow" onClick={() => setOpen(false)}>{t('common.cancel')}</Btn>
            <Btn type="submit" disabled={saving} className="btn--grow">{saving ? t('common.saving') : t('common.save')}</Btn>
          </div>
        </form>
      </Modal>
    </div>
  )
}

import { useEffect, useState } from 'react'
import { Plus, Trash2, Building2, Stethoscope, Ruler, Tags, CreditCard, DoorOpen, ToggleLeft, ToggleRight } from 'lucide-react'
import api from '../lib/api'
import { canManage } from '../lib/auth'
import { useT } from '../lib/i18n'
import { PageHeader, Btn, Empty, Card, Badge } from '../components/ui'

const TABS = [
  { key: 'rooms', icon: DoorOpen },
  { key: 'departments', icon: Building2 },
  { key: 'services', icon: Stethoscope },
  { key: 'units', icon: Ruler },
  { key: 'categories', icon: Tags },
  { key: 'paymentMethods', icon: CreditCard },
]
// key ที่ใช้ในพจนานุกรม → path ของ API
const PATHS = {
  rooms: 'rooms', departments: 'departments', services: 'services',
  units: 'units', categories: 'categories', paymentMethods: 'payment-methods',
}

export default function Master() {
  const manage = canManage()
  const { t } = useT()
  const [tab, setTab] = useState('departments')

  return (
    <div className="page">
      <PageHeader title={t('master.title')} subtitle={t('master.subtitle')} />
      <div className="tabs">
        {TABS.map(({ key, icon: Icon }) => (
          <button key={key} onClick={() => setTab(key)} className={`tab${tab === key ? ' is-active' : ''}`}>
            <Icon size={13} /> {t(`master.${key}`)}
          </button>
        ))}
      </div>

      {tab === 'rooms' && <NamedNote manage={manage} path="rooms" nameLabel={t('master.roomName')} />}
      {tab === 'departments' && <NamedNote manage={manage} path="departments" nameLabel={t('master.deptName')} deleteMsg={t('master.deleteDept')} />}
      {tab === 'services' && <Services manage={manage} />}
      {tab === 'units' && <SimpleList manage={manage} path={PATHS.units} placeholder={t('master.unitPlaceholder')} />}
      {tab === 'categories' && <SimpleList manage={manage} path={PATHS.categories} placeholder={t('master.categoryPlaceholder')} />}
      {tab === 'paymentMethods' && <SimpleList manage={manage} path={PATHS.paymentMethods} placeholder={t('master.paymentPlaceholder')} />}
    </div>
  )
}

// ── ปุ่มเปิด/ปิดใช้งาน — ใช้ร่วมกันทุกแท็บ ──
function ActiveToggle({ item, onToggle, manage }) {
  const { t } = useT()
  const on = item.active !== false
  if (!manage) return on ? null : <Badge tone="gray">{t('common.inactive')}</Badge>
  return (
    <button
      onClick={() => onToggle(item)}
      title={on ? t('master.disableTip') : t('master.enableTip')}
      className={`toggle${on ? ' is-on' : ''}`}
    >
      {on ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
      <span>{on ? t('common.active') : t('common.inactive')}</span>
    </button>
  )
}

// สรุปจำนวนเปิด/ปิด ไว้บนหัวการ์ด
function CountLine({ items }) {
  const { t } = useT()
  const active = items.filter(i => i.active !== false).length
  return <p className="tiny muted mb-8">{t('master.activeCount', { active, inactive: items.length - active })}</p>
}

// ── hook รวมงาน CRUD + toggle ที่ทุกแท็บใช้เหมือนกัน ──
function useMasterList(path) {
  const [items, setItems] = useState([])
  const fetch = () => api.get(`/master/${path}`).then(r => setItems(r.data))
  useEffect(() => { fetch() }, [path])
  const toggle = async item => {
    await api.put(`/master/${path}/${item.id}`, { ...item, active: !(item.active !== false) })
    fetch()
  }
  const remove = async (id, message) => {
    if (confirm(message)) { await api.delete(`/master/${path}/${id}`); fetch() }
  }
  return { items, fetch, toggle, remove }
}

// ── master ที่มีแค่ชื่อ (หน่วยนับ, หมวดสินค้า, วิธีชำระเงิน) ──
function SimpleList({ manage, path, placeholder }) {
  const { t } = useT()
  const { items, fetch, toggle, remove } = useMasterList(path)
  const [name, setName] = useState('')
  async function add(e) {
    e.preventDefault(); if (!name) return
    await api.post(`/master/${path}`, { name }); setName(''); fetch()
  }
  return (
    <Card pad="md">
      {manage && (
        <form onSubmit={add} className="row gap-8 mb-12">
          <input className="input" placeholder={placeholder} value={name} onChange={e => setName(e.target.value)} />
          <Btn type="submit"><Plus size={14} /></Btn>
        </form>
      )}
      {items.length === 0 ? <Empty /> : (
        <>
          <CountLine items={items} />
          <div className="list">
            {items.map(it => (
              <div key={it.id} className={`list__row${it.active === false ? ' is-off' : ''}`}>
                <span>{it.name}</span>
                <span className="row gap-12">
                  <ActiveToggle item={it} onToggle={toggle} manage={manage} />
                  {manage && <button onClick={() => remove(it.id, t('common.deleteConfirm'))} className="icon-btn icon-btn--danger icon-btn--quiet"><Trash2 size={13} /></button>}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </Card>
  )
}

// ── master ที่มีชื่อ + หมายเหตุ (ห้อง, แผนก) ──
function NamedNote({ manage, path, nameLabel, deleteMsg }) {
  const { t } = useT()
  const { items, fetch, toggle, remove } = useMasterList(path)
  const [form, setForm] = useState({ name: '', note: '' })
  async function add(e) {
    e.preventDefault(); if (!form.name) return
    await api.post(`/master/${path}`, form); setForm({ name: '', note: '' }); fetch()
  }
  return (
    <Card pad="md">
      {manage && (
        <form onSubmit={add} className="row gap-8 mb-12">
          <input className="input" placeholder={nameLabel} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          <input className="input" placeholder={t('master.note')} value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} />
          <Btn type="submit"><Plus size={14} /></Btn>
        </form>
      )}
      {items.length === 0 ? <Empty /> : (
        <>
          <CountLine items={items} />
          <div className="list">
            {items.map(it => (
              <div key={it.id} className={`list__row${it.active === false ? ' is-off' : ''}`}>
                <span>{it.name}{it.note ? <span className="muted"> · {it.note}</span> : ''}</span>
                <span className="row gap-12">
                  <ActiveToggle item={it} onToggle={toggle} manage={manage} />
                  {manage && <button onClick={() => remove(it.id, deleteMsg || t('common.deleteConfirm'))} className="icon-btn icon-btn--danger icon-btn--quiet"><Trash2 size={13} /></button>}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </Card>
  )
}

// ── บริการ/ค่ารักษา (ชื่อ + ราคา + แผนก) ──
function Services({ manage }) {
  const { t } = useT()
  const { items, fetch, toggle, remove } = useMasterList('services')
  const [depts, setDepts] = useState([])
  const [form, setForm] = useState({ name: '', price: '', departmentId: '' })
  // ช่องเลือกแผนกเอาเฉพาะที่ยังเปิดใช้งาน
  useEffect(() => { api.get('/master/departments?activeOnly=1').then(r => setDepts(r.data)) }, [])
  async function add(e) {
    e.preventDefault(); if (!form.name) return
    await api.post('/master/services', form); setForm({ name: '', price: '', departmentId: '' }); fetch()
  }
  return (
    <Card pad="md">
      {manage && (
        <form onSubmit={add} className="grid-12 mb-12">
          <input className="input span-5" placeholder={t('master.serviceName')} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          <input type="number" className="input span-2" placeholder={t('master.price')} value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} />
          <select className="input span-4" value={form.departmentId} onChange={e => setForm(f => ({ ...f, departmentId: e.target.value }))}>
            <option value="">{t('master.noDept')}</option>{depts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
          <Btn type="submit" className="span-1"><Plus size={14} /></Btn>
        </form>
      )}
      {items.length === 0 ? <Empty /> : (
        <>
          <CountLine items={items} />
          <div className="list">
            {items.map(s => (
              <div key={s.id} className={`list__row${s.active === false ? ' is-off' : ''}`}>
                <span>{s.code} · {s.name} <span className="muted">{s.department ? `· ${s.department.name}` : ''}</span></span>
                <span className="row gap-12">
                  <span className="muted">{t('common.baht')}{s.price.toLocaleString()}</span>
                  <ActiveToggle item={s} onToggle={toggle} manage={manage} />
                  {manage && <button onClick={() => remove(s.id, t('master.deleteService'))} className="icon-btn icon-btn--danger icon-btn--quiet"><Trash2 size={13} /></button>}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </Card>
  )
}

import { useEffect, useState } from 'react'
import { Plus, Trash2, Building2, Stethoscope, Ruler, Tags, CreditCard, DoorOpen } from 'lucide-react'
import api from '../lib/api'
import { canManage } from '../lib/auth'
import { PageHeader, Btn, inputCls, Empty, Card } from '../components/ui'

const TABS = [
  { key: 'rooms', label: 'ห้อง', icon: DoorOpen },
  { key: 'departments', label: 'แผนก', icon: Building2 },
  { key: 'services', label: 'บริการ/ค่ารักษา', icon: Stethoscope },
  { key: 'units', label: 'หน่วยนับ', icon: Ruler },
  { key: 'categories', label: 'หมวดสินค้า', icon: Tags },
  { key: 'payment-methods', label: 'วิธีชำระเงิน', icon: CreditCard },
]

export default function Master() {
  const manage = canManage()
  const [tab, setTab] = useState('departments')

  return (
    <div className="p-6 mx-auto max-w-3xl">
      <PageHeader title="ข้อมูลหลัก (Master Data)" subtitle="ตั้งค่ารายการอ้างอิงที่ใช้ทั้งระบบ" />
      <div className="flex gap-1 mb-4 flex-wrap">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-3 py-1.5 rounded-lg text-xs transition flex items-center gap-1.5 ${tab === t.key ? 'bg-brand-600 text-white' : 'bg-white border border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
            <t.icon size={13} /> {t.label}
          </button>
        ))}
      </div>

      {tab === 'rooms' && <NamedNote manage={manage} path="rooms" nameLabel="ชื่อห้อง" />}
      {tab === 'departments' && <Departments manage={manage} />}
      {tab === 'services' && <Services manage={manage} />}
      {tab === 'units' && <SimpleList manage={manage} path="units" label="หน่วยนับ" placeholder="เช่น ชิ้น, ขวด, mg" />}
      {tab === 'categories' && <SimpleList manage={manage} path="categories" label="หมวดสินค้า" placeholder="เช่น ยา, เวชภัณฑ์" />}
      {tab === 'payment-methods' && <SimpleList manage={manage} path="payment-methods" label="วิธีชำระเงิน" placeholder="เช่น เงินสด, โอน" />}
    </div>
  )
}

function SimpleList({ manage, path, label, placeholder }) {
  const [items, setItems] = useState([])
  const [name, setName] = useState('')
  const fetch = () => api.get(`/master/${path}`).then(r => setItems(r.data))
  useEffect(() => { fetch() }, [path])
  async function add(e) { e.preventDefault(); if (!name) return; await api.post(`/master/${path}`, { name }); setName(''); fetch() }
  async function del(id) { if (confirm('ลบรายการนี้?')) { await api.delete(`/master/${path}/${id}`); fetch() } }
  return (
    <Card className="p-4">
      {manage && (
        <form onSubmit={add} className="flex gap-2 mb-3">
          <input className={inputCls} placeholder={placeholder} value={name} onChange={e => setName(e.target.value)} />
          <Btn type="submit"><Plus size={14} /></Btn>
        </form>
      )}
      {items.length === 0 ? <Empty /> : (
        <div className="space-y-1">
          {items.map(it => (
            <div key={it.id} className="flex items-center justify-between border-b border-gray-50 last:border-0 py-2 text-sm">
              <span className="text-gray-800">{it.name}</span>
              {manage && <button onClick={() => del(it.id)} className="text-gray-400 hover:text-red-500"><Trash2 size={13} /></button>}
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}

function NamedNote({ manage, path, nameLabel }) {
  const [items, setItems] = useState([])
  const [form, setForm] = useState({ name: '', note: '' })
  const fetch = () => api.get(`/master/${path}`).then(r => setItems(r.data))
  useEffect(() => { fetch() }, [path])
  async function add(e) { e.preventDefault(); if (!form.name) return; await api.post(`/master/${path}`, form); setForm({ name: '', note: '' }); fetch() }
  async function del(id) { if (confirm('ลบรายการนี้?')) { await api.delete(`/master/${path}/${id}`); fetch() } }
  return (
    <Card className="p-4">
      {manage && (
        <form onSubmit={add} className="flex gap-2 mb-3">
          <input className={inputCls} placeholder={nameLabel} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          <input className={inputCls} placeholder="หมายเหตุ" value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} />
          <Btn type="submit"><Plus size={14} /></Btn>
        </form>
      )}
      {items.length === 0 ? <Empty /> : (
        <div className="space-y-1">
          {items.map(it => (
            <div key={it.id} className="flex items-center justify-between border-b border-gray-50 last:border-0 py-2 text-sm">
              <span className="text-gray-800">{it.name}{it.note ? <span className="text-gray-500"> · {it.note}</span> : ''}{it.active === false ? <span className="text-gray-400"> · ปิด</span> : ''}</span>
              {manage && <button onClick={() => del(it.id)} className="text-gray-400 hover:text-red-500"><Trash2 size={13} /></button>}
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}

function Departments({ manage }) {
  const [items, setItems] = useState([])
  const [form, setForm] = useState({ name: '', note: '' })
  const fetch = () => api.get('/master/departments').then(r => setItems(r.data))
  useEffect(() => { fetch() }, [])
  async function add(e) { e.preventDefault(); if (!form.name) return; await api.post('/master/departments', form); setForm({ name: '', note: '' }); fetch() }
  async function del(id) { if (confirm('ลบแผนกนี้?')) { await api.delete(`/master/departments/${id}`); fetch() } }
  return (
    <Card className="p-4">
      {manage && (
        <form onSubmit={add} className="flex gap-2 mb-3">
          <input className={inputCls} placeholder="ชื่อแผนก" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          <input className={inputCls} placeholder="หมายเหตุ" value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} />
          <Btn type="submit"><Plus size={14} /></Btn>
        </form>
      )}
      {items.length === 0 ? <Empty /> : (
        <div className="space-y-1">
          {items.map(d => (
            <div key={d.id} className="flex items-center justify-between border-b border-gray-50 last:border-0 py-2 text-sm">
              <span className="text-gray-800">{d.name}{d.note ? <span className="text-gray-500"> · {d.note}</span> : ''}</span>
              {manage && <button onClick={() => del(d.id)} className="text-gray-400 hover:text-red-500"><Trash2 size={13} /></button>}
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}

function Services({ manage }) {
  const [items, setItems] = useState([])
  const [depts, setDepts] = useState([])
  const [form, setForm] = useState({ name: '', price: '', departmentId: '' })
  const fetch = () => api.get('/master/services').then(r => setItems(r.data))
  useEffect(() => { fetch(); api.get('/master/departments').then(r => setDepts(r.data)) }, [])
  async function add(e) { e.preventDefault(); if (!form.name) return; await api.post('/master/services', form); setForm({ name: '', price: '', departmentId: '' }); fetch() }
  async function del(id) { if (confirm('ลบบริการนี้?')) { await api.delete(`/master/services/${id}`); fetch() } }
  return (
    <Card className="p-4">
      {manage && (
        <form onSubmit={add} className="grid grid-cols-12 gap-2 mb-3">
          <input className={inputCls + ' col-span-5'} placeholder="ชื่อบริการ" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          <input type="number" className={inputCls + ' col-span-2'} placeholder="ราคา" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} />
          <select className={inputCls + ' col-span-4'} value={form.departmentId} onChange={e => setForm(f => ({ ...f, departmentId: e.target.value }))}>
            <option value="">ไม่ระบุแผนก</option>{depts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
          <Btn type="submit" className="col-span-1"><Plus size={14} /></Btn>
        </form>
      )}
      {items.length === 0 ? <Empty /> : (
        <div className="space-y-1">
          {items.map(s => (
            <div key={s.id} className="flex items-center justify-between border-b border-gray-50 last:border-0 py-2 text-sm">
              <span className="text-gray-800">{s.code} · {s.name} <span className="text-gray-500">{s.department ? `· ${s.department.name}` : ''}</span></span>
              <span className="flex items-center gap-3">
                <span className="text-gray-600">฿{s.price.toLocaleString()}</span>
                {manage && <button onClick={() => del(s.id)} className="text-gray-400 hover:text-red-500"><Trash2 size={13} /></button>}
              </span>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}

import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, Search, Boxes, AlertTriangle } from 'lucide-react'
import api from '../lib/api'
import { canManage } from '../lib/auth'
import { PageHeader, Btn, Modal, Field, Card } from '../components/ui'

const EMPTY = { name: '', unitId: '', cost: '', stockQty: '', reorderLevel: '' }

export default function Materials() {
  const manage = canManage()
  const [items, setItems] = useState([])
  const [units, setUnits] = useState([])
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)
  const [editId, setEditId] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)

  const set = f => e => setForm(p => ({ ...p, [f]: e.target.value }))
  const fetch = () => api.get('/materials').then(r => setItems(r.data))
  useEffect(() => { fetch(); api.get('/master/units').then(r => setUnits(r.data)) }, [])

  function openNew() { setEditId(null); setForm(EMPTY); setOpen(true) }
  function openEdit(m) {
    setEditId(m.id)
    setForm({ name: m.name, unitId: m.unitId || '', cost: m.cost, stockQty: m.stockQty, reorderLevel: m.reorderLevel ?? '' })
    setOpen(true)
  }
  async function save(e) {
    e.preventDefault(); setSaving(true)
    try {
      if (editId) await api.put(`/materials/${editId}`, form); else await api.post('/materials', form)
      setOpen(false); fetch()
    } finally { setSaving(false) }
  }
  async function remove(id) { if (confirm('ลบวัสดุนี้?')) { await api.delete(`/materials/${id}`); fetch() } }

  const low = m => m.reorderLevel != null && m.stockQty <= m.reorderLevel
  const filtered = items.filter(i => i.name.toLowerCase().includes(search.toLowerCase()) || i.code.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="page">
      <PageHeader title="วัสดุสิ้นเปลือง" subtitle={`${items.length} รายการ`}>
        {manage && <Btn onClick={openNew}><Plus size={14} /> เพิ่มวัสดุ</Btn>}
      </PageHeader>

      <div className="search mb-16">
        <Search size={16} className="search__icon" />
        <input className="input" placeholder="ค้นหาชื่อ, รหัส..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <Card className="card--clip">
        <div className="table-wrap">
          <table className="table table--hover">
            <thead>
              <tr>
                <th>รหัส/ชื่อ</th>
                <th className="right">ทุน</th>
                <th className="right">คงเหลือ</th>
                <th className="right">จุดสั่งซื้อ</th>
                {manage && <th></th>}
              </tr>
            </thead>
            <tbody>
              {filtered.map(m => (
                <tr key={m.id}>
                  <td>
                    <p className="strong row gap-6">
                      {m.name}{low(m) && <AlertTriangle size={13} className="text-warn" />}
                    </p>
                    <p className="tiny muted">{m.code}</p>
                  </td>
                  <td className="right muted">฿{m.cost.toLocaleString()}</td>
                  <td className="right">
                    <span className={low(m) ? 'text-warn' : undefined}>{m.stockQty}{m.unit ? ` ${m.unit.name}` : ''}</span>
                  </td>
                  <td className="right muted">{m.reorderLevel ?? '-'}</td>
                  {manage && (
                    <td className="right nowrap">
                      <button onClick={() => openEdit(m)} className="icon-btn"><Pencil size={13} /></button>
                      <button onClick={() => remove(m.id)} className="icon-btn icon-btn--danger"><Trash2 size={13} /></button>
                    </td>
                  )}
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={5} className="table__empty"><Boxes size={28} />ยังไม่มีวัสดุ</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal open={open} onClose={() => setOpen(false)} title={editId ? 'แก้ไขวัสดุ' : 'เพิ่มวัสดุ'}>
        <form onSubmit={save} className="stack">
          <Field label="ชื่อวัสดุ *"><input required className="input" value={form.name} onChange={set('name')} /></Field>
          <div className="form-grid">
            <Field label="หน่วย">
              <select className="input" value={form.unitId} onChange={set('unitId')}>
                <option value="">ไม่ระบุ</option>{units.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </Field>
            <Field label="ทุน/หน่วย"><input type="number" className="input" value={form.cost} onChange={set('cost')} /></Field>
          </div>
          <div className="form-grid">
            <Field label="คงเหลือ"><input type="number" className="input" value={form.stockQty} onChange={set('stockQty')} /></Field>
            <Field label="จุดสั่งซื้อ"><input type="number" className="input" value={form.reorderLevel} onChange={set('reorderLevel')} /></Field>
          </div>
          <div className="form-actions">
            <Btn type="button" variant="ghost" className="btn--grow" onClick={() => setOpen(false)}>ยกเลิก</Btn>
            <Btn type="submit" disabled={saving} className="btn--grow">{saving ? 'กำลังบันทึก...' : 'บันทึก'}</Btn>
          </div>
        </form>
      </Modal>
    </div>
  )
}

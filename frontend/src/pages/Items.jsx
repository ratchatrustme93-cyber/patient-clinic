import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, Search, Package } from 'lucide-react'
import api from '../lib/api'
import { canManage } from '../lib/auth'
import { PageHeader, Btn, Modal, Field, Card } from '../components/ui'

const EMPTY = { name: '', categoryId: '', unitId: '', price: '', cost: '', stockQty: '' }

export default function Items() {
  const manage = canManage()
  const [items, setItems] = useState([])
  const [cats, setCats] = useState([])
  const [units, setUnits] = useState([])
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)
  const [editId, setEditId] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)

  const set = f => e => setForm(p => ({ ...p, [f]: e.target.value }))
  const fetch = () => api.get('/items').then(r => setItems(r.data))
  useEffect(() => {
    fetch()
    api.get('/master/categories').then(r => setCats(r.data))
    api.get('/master/units').then(r => setUnits(r.data))
  }, [])

  function openNew() { setEditId(null); setForm(EMPTY); setOpen(true) }
  function openEdit(it) {
    setEditId(it.id)
    setForm({ name: it.name, categoryId: it.categoryId || '', unitId: it.unitId || '', price: it.price, cost: it.cost, stockQty: it.stockQty })
    setOpen(true)
  }
  async function save(e) {
    e.preventDefault(); setSaving(true)
    try {
      if (editId) await api.put(`/items/${editId}`, form); else await api.post('/items', form)
      setOpen(false); fetch()
    } finally { setSaving(false) }
  }
  async function remove(id) { if (confirm('ลบรายการนี้?')) { await api.delete(`/items/${id}`); fetch() } }

  const filtered = items.filter(i => i.name.toLowerCase().includes(search.toLowerCase()) || i.code.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="page">
      <PageHeader title="สินค้า" subtitle={`${items.length} รายการ`}>
        {manage && <Btn onClick={openNew}><Plus size={14} /> เพิ่มสินค้า</Btn>}
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
                <th>หมวด</th>
                <th className="right">ราคา</th>
                <th className="right">คงเหลือ</th>
                {manage && <th></th>}
              </tr>
            </thead>
            <tbody>
              {filtered.map(i => (
                <tr key={i.id}>
                  <td>
                    <p className="strong">{i.name}</p>
                    <p className="tiny muted">{i.code}</p>
                  </td>
                  <td className="muted">{i.category?.name || '-'}</td>
                  <td className="right">฿{i.price.toLocaleString()}</td>
                  <td className="right">
                    <span className={i.stockQty <= 0 ? 'text-danger' : undefined}>
                      {i.stockQty}{i.unit ? ` ${i.unit.name}` : ''}
                    </span>
                  </td>
                  {manage && (
                    <td className="right nowrap">
                      <button onClick={() => openEdit(i)} className="icon-btn"><Pencil size={13} /></button>
                      <button onClick={() => remove(i.id)} className="icon-btn icon-btn--danger"><Trash2 size={13} /></button>
                    </td>
                  )}
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={5} className="table__empty"><Package size={28} />ยังไม่มีสินค้า</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal open={open} onClose={() => setOpen(false)} title={editId ? 'แก้ไขสินค้า' : 'เพิ่มสินค้า'}>
        <form onSubmit={save} className="stack">
          <Field label="ชื่อสินค้า *"><input required className="input" value={form.name} onChange={set('name')} /></Field>
          <div className="form-grid">
            <Field label="หมวดหมู่">
              <select className="input" value={form.categoryId} onChange={set('categoryId')}>
                <option value="">ไม่ระบุ</option>{cats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Field>
            <Field label="หน่วย">
              <select className="input" value={form.unitId} onChange={set('unitId')}>
                <option value="">ไม่ระบุ</option>{units.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </Field>
          </div>
          <div className="form-grid form-grid--3">
            <Field label="ราคาขาย"><input type="number" className="input" value={form.price} onChange={set('price')} /></Field>
            <Field label="ทุน"><input type="number" className="input" value={form.cost} onChange={set('cost')} /></Field>
            <Field label="คงเหลือ"><input type="number" className="input" value={form.stockQty} onChange={set('stockQty')} /></Field>
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

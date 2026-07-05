import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, Search, Boxes, AlertTriangle } from 'lucide-react'
import api from '../lib/api'
import { canManage } from '../lib/auth'
import { PageHeader, Btn, Modal, Field, inputCls, Card } from '../components/ui'

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
    <div className="p-6 mx-auto max-w-4xl">
      <PageHeader title="วัสดุสิ้นเปลือง" subtitle={`${items.length} รายการ`}>
        {manage && <Btn onClick={openNew}><Plus size={14} className="inline mr-1" /> เพิ่มวัสดุ</Btn>}
      </PageHeader>

      <div className="relative mb-4">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input className={inputCls + ' pl-9'} placeholder="ค้นหาชื่อ, รหัส..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-400 border-b border-gray-100">
                <th className="px-4 py-2 font-medium">รหัส/ชื่อ</th>
                <th className="px-4 py-2 font-medium text-right">ทุน</th>
                <th className="px-4 py-2 font-medium text-right">คงเหลือ</th>
                <th className="px-4 py-2 font-medium text-right">จุดสั่งซื้อ</th>
                {manage && <th className="px-4 py-2"></th>}
              </tr>
            </thead>
            <tbody>
              {filtered.map(m => (
                <tr key={m.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                  <td className="px-4 py-3">
                    <p className="text-gray-800 flex items-center gap-1.5">{m.name}{low(m) && <AlertTriangle size={13} className="text-amber-500" />}</p>
                    <p className="text-xs text-gray-400">{m.code}</p>
                  </td>
                  <td className="px-4 py-3 text-right text-gray-500">฿{m.cost.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right"><span className={low(m) ? 'text-amber-600 font-medium' : 'text-gray-700'}>{m.stockQty}{m.unit ? ` ${m.unit.name}` : ''}</span></td>
                  <td className="px-4 py-3 text-right text-gray-400">{m.reorderLevel ?? '-'}</td>
                  {manage && (
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <button onClick={() => openEdit(m)} className="p-1.5 text-gray-400 hover:text-brand-600"><Pencil size={13} /></button>
                      <button onClick={() => remove(m.id)} className="p-1.5 text-gray-400 hover:text-red-500"><Trash2 size={13} /></button>
                    </td>
                  )}
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={5} className="px-4 py-12 text-center text-gray-300"><Boxes size={28} className="mx-auto mb-2 opacity-40" />ยังไม่มีวัสดุ</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal open={open} onClose={() => setOpen(false)} title={editId ? 'แก้ไขวัสดุ' : 'เพิ่มวัสดุ'}>
        <form onSubmit={save} className="space-y-3">
          <Field label="ชื่อวัสดุ *"><input required className={inputCls} value={form.name} onChange={set('name')} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="หน่วย">
              <select className={inputCls} value={form.unitId} onChange={set('unitId')}>
                <option value="">ไม่ระบุ</option>{units.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </Field>
            <Field label="ทุน/หน่วย"><input type="number" className={inputCls} value={form.cost} onChange={set('cost')} /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="คงเหลือ"><input type="number" className={inputCls} value={form.stockQty} onChange={set('stockQty')} /></Field>
            <Field label="จุดสั่งซื้อ"><input type="number" className={inputCls} value={form.reorderLevel} onChange={set('reorderLevel')} /></Field>
          </div>
          <div className="flex gap-2 pt-2">
            <Btn type="button" variant="ghost" className="flex-1" onClick={() => setOpen(false)}>ยกเลิก</Btn>
            <Btn type="submit" disabled={saving} className="flex-1">{saving ? 'กำลังบันทึก...' : 'บันทึก'}</Btn>
          </div>
        </form>
      </Modal>
    </div>
  )
}

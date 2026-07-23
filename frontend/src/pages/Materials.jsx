import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, Search, Boxes, AlertTriangle } from 'lucide-react'
import api from '../lib/api'
import { useT } from '../lib/i18n'
import { canManage } from '../lib/auth'
import { PageHeader, Btn, Modal, Field, Card } from '../components/ui'

const EMPTY = { name: '', unitId: '', cost: '', stockQty: '', reorderLevel: '' }

export default function Materials() {
  const manage = canManage()
  const { t } = useT()
  const [items, setItems] = useState([])
  const [units, setUnits] = useState([])
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)
  const [editId, setEditId] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)

  const set = f => e => setForm(p => ({ ...p, [f]: e.target.value }))
  const fetch = () => api.get('/materials').then(r => setItems(r.data))
  // ช่องเลือกหน่วยนับเอาเฉพาะที่ยังเปิดใช้งาน
  useEffect(() => { fetch(); api.get('/master/units?activeOnly=1').then(r => setUnits(r.data)) }, [])

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
  async function remove(id) { if (confirm(t('materials.deleteConfirm'))) { await api.delete(`/materials/${id}`); fetch() } }

  const low = m => m.reorderLevel != null && m.stockQty <= m.reorderLevel
  const filtered = items.filter(i => i.name.toLowerCase().includes(search.toLowerCase()) || i.code.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="page">
      <PageHeader title={t('materials.title')} subtitle={t('materials.count', { n: items.length })}>
        {manage && <Btn onClick={openNew}><Plus size={14} /> {t('materials.add')}</Btn>}
      </PageHeader>

      <div className="search mb-16">
        <Search size={16} className="search__icon" />
        <input className="input" placeholder={t('materials.searchPlaceholder')} value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <Card className="card--clip">
        <div className="table-wrap">
          <table className="table table--hover">
            <thead>
              <tr>
                <th>{t('materials.codeName')}</th>
                <th className="right">{t('materials.cost')}</th>
                <th className="right">{t('materials.stock')}</th>
                <th className="right">{t('materials.reorderLevel')}</th>
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
                  <td className="right muted">{t('common.baht')}{m.cost.toLocaleString()}</td>
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
                <tr><td colSpan={5} className="table__empty"><Boxes size={28} />{t('materials.empty')}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal open={open} onClose={() => setOpen(false)} title={editId ? t('materials.editTitle') : t('materials.addTitle')}>
        <form onSubmit={save} className="stack">
          <Field label={t('materials.name')}><input required className="input" value={form.name} onChange={set('name')} /></Field>
          <div className="form-grid">
            <Field label={t('materials.unit')}>
              <select className="input" value={form.unitId} onChange={set('unitId')}>
                <option value="">{t('common.unspecified')}</option>{units.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </Field>
            <Field label={t('materials.costPerUnit')}><input type="number" className="input" value={form.cost} onChange={set('cost')} /></Field>
          </div>
          <div className="form-grid">
            <Field label={t('materials.stock')}><input type="number" className="input" value={form.stockQty} onChange={set('stockQty')} /></Field>
            <Field label={t('materials.reorderLevel')}><input type="number" className="input" value={form.reorderLevel} onChange={set('reorderLevel')} /></Field>
          </div>
          <div className="form-actions">
            <Btn type="button" variant="ghost" className="btn--grow" onClick={() => setOpen(false)}>{t('common.cancel')}</Btn>
            <Btn type="submit" disabled={saving} className="btn--grow">{saving ? t('common.saving') : t('common.save')}</Btn>
          </div>
        </form>
      </Modal>
    </div>
  )
}

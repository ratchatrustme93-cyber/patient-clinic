import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, Search, Package } from 'lucide-react'
import api from '../lib/api'
import { useT } from '../lib/i18n'
import { canManage } from '../lib/auth'
import { PageHeader, Btn, Modal, Field, Card } from '../components/ui'

const EMPTY = { name: '', categoryId: '', unitId: '', price: '', cost: '', stockQty: '' }

export default function Items() {
  const manage = canManage()
  const { t } = useT()
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
    // ช่องเลือกเอาเฉพาะ master ที่ยังเปิดใช้งาน
    api.get('/master/categories?activeOnly=1').then(r => setCats(r.data))
    api.get('/master/units?activeOnly=1').then(r => setUnits(r.data))
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
  async function remove(id) { if (confirm(t('common.deleteConfirm'))) { await api.delete(`/items/${id}`); fetch() } }

  const filtered = items.filter(i => i.name.toLowerCase().includes(search.toLowerCase()) || i.code.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="page">
      <PageHeader title={t('items.title')} subtitle={t('items.count', { n: items.length })}>
        {manage && <Btn onClick={openNew}><Plus size={14} /> {t('items.add')}</Btn>}
      </PageHeader>

      <div className="search mb-16">
        <Search size={16} className="search__icon" />
        <input className="input" placeholder={t('items.searchPlaceholder')} value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <Card className="card--clip">
        <div className="table-wrap">
          <table className="table table--hover">
            <thead>
              <tr>
                <th>{t('items.codeName')}</th>
                <th>{t('items.category')}</th>
                <th className="right">{t('items.price')}</th>
                <th className="right">{t('items.stock')}</th>
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
                  <td className="right">{t('common.baht')}{i.price.toLocaleString()}</td>
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
                <tr><td colSpan={5} className="table__empty"><Package size={28} />{t('items.empty')}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal open={open} onClose={() => setOpen(false)} title={editId ? t('items.editTitle') : t('items.addTitle')}>
        <form onSubmit={save} className="stack">
          <Field label={t('items.name')}><input required className="input" value={form.name} onChange={set('name')} /></Field>
          <div className="form-grid">
            <Field label={t('items.categoryField')}>
              <select className="input" value={form.categoryId} onChange={set('categoryId')}>
                <option value="">{t('common.unspecified')}</option>{cats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Field>
            <Field label={t('items.unit')}>
              <select className="input" value={form.unitId} onChange={set('unitId')}>
                <option value="">{t('common.unspecified')}</option>{units.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </Field>
          </div>
          <div className="form-grid form-grid--3">
            <Field label={t('items.sellPrice')}><input type="number" className="input" value={form.price} onChange={set('price')} /></Field>
            <Field label={t('items.cost')}><input type="number" className="input" value={form.cost} onChange={set('cost')} /></Field>
            <Field label={t('items.stock')}><input type="number" className="input" value={form.stockQty} onChange={set('stockQty')} /></Field>
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

import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { Plus, Receipt, Printer, Wallet } from 'lucide-react'
import api from '../lib/api'
import { useT } from '../lib/i18n'
import { PageHeader, Btn, Modal, Field, Empty, Badge, Card } from '../components/ui'

const TONE = { DRAFT: 'gray', UNPAID: 'amber', PAID: 'green', CANCELLED: 'gray' }
const TABS = ['ALL', 'UNPAID', 'PAID']
const KINDS = ['SERVICE', 'ITEM', 'MATERIAL', 'OTHER']

export default function Bills() {
  const { t, dateLocale } = useT()
  const [bills, setBills] = useState([])
  const [tab, setTab] = useState('ALL')
  const [patients, setPatients] = useState([])
  const [services, setServices] = useState([])
  const [methods, setMethods] = useState([])
  const [creating, setCreating] = useState(false)
  const [detailId, setDetailId] = useState(null)

  const fetch = () => api.get(`/bills${tab === 'ALL' ? '' : `?status=${tab}`}`).then(r => setBills(r.data))
  useEffect(() => { fetch() }, [tab])
  useEffect(() => {
    api.get('/patients').then(r => setPatients(r.data))
    // ช่องเลือกเอาเฉพาะ master ที่ยังเปิดใช้งาน
    api.get('/master/services?activeOnly=1').then(r => setServices(r.data))
    api.get('/master/payment-methods?activeOnly=1').then(r => setMethods(r.data))
  }, [])

  const money = n => `${t('common.baht')}${n.toLocaleString()}`

  return (
    <div className="page">
      <PageHeader title={t('bills.title')}>
        <Btn onClick={() => setCreating(true)}><Plus size={14} /> {t('bills.create')}</Btn>
      </PageHeader>

      <div className="tabs">
        {TABS.map(k => (
          <button key={k} onClick={() => setTab(k)} className={`tab${tab === k ? ' is-active' : ''}`}>
            {k === 'ALL' ? t('common.all') : t(`enum.billStatus.${k}`)}
          </button>
        ))}
      </div>

      <div className="col gap-8">
        {bills.map(b => (
          <Card key={b.id} className="bill card--hoverable">
            <div onClick={() => setDetailId(b.id)} className="bill__main">
              <div className="bill__icon"><Receipt size={18} /></div>
              <div>
                <p className="bill__title">{b.billNo} · {b.patient.name}</p>
                <p className="bill__meta">
                  {b.patient.hn} · {format(new Date(b.date), 'd MMM yyyy', { locale: dateLocale })} · {t('bills.itemCount', { n: b._count.items })}
                </p>
              </div>
            </div>
            <div className="row gap-12">
              <span className="bill__amount">{money(b.total)}</span>
              <Badge tone={TONE[b.status]}>{t(`enum.billStatus.${b.status}`)}</Badge>
            </div>
          </Card>
        ))}
        {bills.length === 0 && <Empty>{t('bills.noBills')}</Empty>}
      </div>

      {creating && <CreateBill patients={patients} services={services} onClose={() => setCreating(false)} onSaved={() => { setCreating(false); fetch() }} />}
      {detailId && <BillDetail id={detailId} methods={methods} onClose={() => setDetailId(null)} onChanged={fetch} />}
    </div>
  )
}

function CreateBill({ patients, services, onClose, onSaved }) {
  const { t } = useT()
  const [patientId, setPatientId] = useState('')
  const [lines, setLines] = useState([{ kind: 'SERVICE', description: '', qty: 1, unitPrice: 0 }])
  const [discount, setDiscount] = useState(0)
  const [saving, setSaving] = useState(false)
  const setLine = (i, f, v) => setLines(ls => ls.map((l, idx) => idx === i ? { ...l, [f]: v } : l))
  const quickService = id => {
    const s = services.find(x => x.id === +id); if (!s) return
    setLines(ls => [...ls.filter(l => l.description), { kind: 'SERVICE', description: s.name, qty: 1, unitPrice: s.price }])
  }
  const subtotal = lines.reduce((s, l) => s + (+l.qty || 0) * (+l.unitPrice || 0), 0)
  const total = Math.max(0, subtotal - (+discount || 0))
  const money = n => `${t('common.baht')}${n.toLocaleString()}`
  async function save(e) {
    e.preventDefault(); setSaving(true)
    try { await api.post('/bills', { patientId, discount, items: lines }); onSaved() } finally { setSaving(false) }
  }
  return (
    <Modal open onClose={onClose} title={t('bills.createTitle')} wide>
      <form onSubmit={save} className="stack">
        <Field label={t('bills.patient')}>
          <select required className="input" value={patientId} onChange={e => setPatientId(e.target.value)}>
            <option value="">{t('bills.selectPatient')}</option>
            {patients.map(p => <option key={p.id} value={p.id}>{p.name} ({p.hn})</option>)}
          </select>
        </Field>
        <Field label={t('bills.quickAdd')}>
          <select className="input" value="" onChange={e => quickService(e.target.value)}>
            <option value="">{t('bills.selectService')}</option>
            {services.map(s => <option key={s.id} value={s.id}>{s.name} — {money(s.price)}</option>)}
          </select>
        </Field>
        <div className="stack-sm">
          {lines.map((l, i) => (
            <div key={i} className="grid-12">
              <select className="input span-2" value={l.kind} onChange={e => setLine(i, 'kind', e.target.value)}>
                {KINDS.map(k => <option key={k} value={k}>{t(`bills.kind.${k}`)}</option>)}
              </select>
              <input className="input span-5" placeholder={t('bills.description')} value={l.description} onChange={e => setLine(i, 'description', e.target.value)} />
              <input type="number" className="input span-2" placeholder={t('bills.qty')} value={l.qty} onChange={e => setLine(i, 'qty', e.target.value)} />
              <input type="number" className="input span-2" placeholder={t('bills.price')} value={l.unitPrice} onChange={e => setLine(i, 'unitPrice', e.target.value)} />
              <button type="button" onClick={() => setLines(ls => ls.filter((_, idx) => idx !== i))} className="icon-btn icon-btn--danger icon-btn--quiet span-1">×</button>
            </div>
          ))}
        </div>
        <button type="button" onClick={() => setLines(ls => [...ls, { kind: 'ITEM', description: '', qty: 1, unitPrice: 0 }])} className="link-btn">{t('bills.addLine')}</button>
        <div className="row row-end gap-12 divided-top">
          <span className="small muted">{t('bills.discount')}</span>
          <input type="number" className="input input--narrow" value={discount} onChange={e => setDiscount(e.target.value)} />
        </div>
        <div className="row row-between small">
          <span className="muted">{t('bills.subtotal', { amount: money(subtotal) })}</span>
          <span className="strong">{t('bills.total', { amount: money(total) })}</span>
        </div>
        <div className="form-actions">
          <Btn type="button" variant="ghost" className="btn--grow" onClick={onClose}>{t('common.cancel')}</Btn>
          <Btn type="submit" disabled={saving || !patientId} className="btn--grow">{saving ? t('common.saving') : t('bills.saveBill')}</Btn>
        </div>
      </form>
    </Modal>
  )
}

function BillDetail({ id, methods, onClose, onChanged }) {
  const { t, dateLocale } = useT()
  const [bill, setBill] = useState(null)
  const [pm, setPm] = useState('')
  const [paying, setPaying] = useState(false)
  useEffect(() => { api.get(`/bills/${id}`).then(r => setBill(r.data)) }, [id])
  const money = n => `${t('common.baht')}${n.toLocaleString()}`
  if (!bill) return <Modal open onClose={onClose} title={t('bills.title')}><p className="small muted">{t('common.loading')}</p></Modal>

  async function pay() {
    setPaying(true)
    try { await api.post(`/bills/${id}/pay`, { paymentMethodId: pm || null }); onChanged(); onClose() } finally { setPaying(false) }
  }

  return (
    <Modal open onClose={onClose} title={t('bills.billTitle', { no: bill.billNo })} wide>
      <div id="report-print" className="small">
        <div className="report__head">
          <div>
            <p className="report__brand">{t('nav.appName')}</p>
            <p className="report__meta">
              {bill.patient.name} ({bill.patient.hn}) · {format(new Date(bill.date), 'd MMM yyyy', { locale: dateLocale })}
            </p>
          </div>
          <Badge tone={TONE[bill.status]}>{t(`enum.billStatus.${bill.status}`)}</Badge>
        </div>
        <table className="table table--tight mb-12">
          <thead>
            <tr>
              <th>{t('bills.description')}</th>
              <th className="right">{t('bills.qty')}</th>
              <th className="right">{t('bills.price')}</th>
              <th className="right">{t('bills.amount')}</th>
            </tr>
          </thead>
          <tbody>
            {bill.items.map(it => (
              <tr key={it.id}>
                <td>{it.description}</td>
                <td className="right muted">{it.qty}</td>
                <td className="right muted">{money(it.unitPrice)}</td>
                <td className="right">{money(it.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="report__totals">
          <span>{t('bills.subtotal', { amount: money(bill.subtotal) })}</span>
          {bill.discount > 0 && <span>{t('bills.discountLine', { amount: money(bill.discount) })}</span>}
          <span className="report__grand">{t('bills.total', { amount: money(bill.total) })}</span>
          {bill.status === 'PAID' && (
            <span className="tiny text-ok">
              {t('bills.paidBy', {
                method: bill.paymentMethod?.name || '-',
                date: bill.paidAt ? format(new Date(bill.paidAt), 'd MMM yyyy HH:mm', { locale: dateLocale }) : '',
              })}
            </span>
          )}
        </div>
      </div>

      <div className="row gap-8 mt-12 divided-top">
        <Btn variant="ghost" onClick={() => window.print()}><Printer size={13} /> {t('common.print')}</Btn>
        {bill.status === 'UNPAID' && (
          <div className="row gap-8 grow">
            <select className="input" value={pm} onChange={e => setPm(e.target.value)}>
              <option value="">{t('bills.payMethod')}</option>
              {methods.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
            <Btn onClick={pay} disabled={paying}><Wallet size={13} /> {paying ? '...' : t('bills.pay')}</Btn>
          </div>
        )}
      </div>
    </Modal>
  )
}

import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { th } from 'date-fns/locale'
import { Plus, Receipt, Printer, Wallet } from 'lucide-react'
import api from '../lib/api'
import { PageHeader, Btn, Modal, Field, Empty, Badge, Card } from '../components/ui'

const STATUS = { DRAFT: ['ร่าง', 'gray'], UNPAID: ['ค้างชำระ', 'amber'], PAID: ['ชำระแล้ว', 'green'], CANCELLED: ['ยกเลิก', 'gray'] }
const TABS = [['ALL', 'ทั้งหมด'], ['UNPAID', 'ค้างชำระ'], ['PAID', 'ชำระแล้ว']]

export default function Bills() {
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
    api.get('/master/services').then(r => setServices(r.data))
    api.get('/master/payment-methods').then(r => setMethods(r.data))
  }, [])

  return (
    <div className="page">
      <PageHeader title="บิล / การชำระเงิน">
        <Btn onClick={() => setCreating(true)}><Plus size={14} /> สร้างบิล</Btn>
      </PageHeader>

      <div className="tabs">
        {TABS.map(([k, label]) => (
          <button key={k} onClick={() => setTab(k)} className={`tab${tab === k ? ' is-active' : ''}`}>
            {label}
          </button>
        ))}
      </div>

      <div className="col gap-8">
        {bills.map(b => {
          const [label, tone] = STATUS[b.status]
          return (
            <Card key={b.id} className="bill card--hoverable">
              <div onClick={() => setDetailId(b.id)} className="bill__main">
                <div className="bill__icon"><Receipt size={18} /></div>
                <div>
                  <p className="bill__title">{b.billNo} · {b.patient.name}</p>
                  <p className="bill__meta">{b.patient.hn} · {format(new Date(b.date), 'd MMM yyyy', { locale: th })} · {b._count.items} รายการ</p>
                </div>
              </div>
              <div className="row gap-12">
                <span className="bill__amount">฿{b.total.toLocaleString()}</span>
                <Badge tone={tone}>{label}</Badge>
              </div>
            </Card>
          )
        })}
        {bills.length === 0 && <Empty>ยังไม่มีบิล</Empty>}
      </div>

      {creating && <CreateBill patients={patients} services={services} onClose={() => setCreating(false)} onSaved={() => { setCreating(false); fetch() }} />}
      {detailId && <BillDetail id={detailId} methods={methods} onClose={() => setDetailId(null)} onChanged={fetch} />}
    </div>
  )
}

function CreateBill({ patients, services, onClose, onSaved }) {
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
  async function save(e) {
    e.preventDefault(); setSaving(true)
    try { await api.post('/bills', { patientId, discount, items: lines }); onSaved() } finally { setSaving(false) }
  }
  return (
    <Modal open onClose={onClose} title="สร้างบิล" wide>
      <form onSubmit={save} className="stack">
        <Field label="คนไข้ *">
          <select required className="input" value={patientId} onChange={e => setPatientId(e.target.value)}>
            <option value="">เลือกคนไข้...</option>
            {patients.map(p => <option key={p.id} value={p.id}>{p.name} ({p.hn})</option>)}
          </select>
        </Field>
        <Field label="เพิ่มบริการ (quick add)">
          <select className="input" value="" onChange={e => quickService(e.target.value)}>
            <option value="">เลือกบริการ...</option>
            {services.map(s => <option key={s.id} value={s.id}>{s.name} — ฿{s.price}</option>)}
          </select>
        </Field>
        <div className="stack-sm">
          {lines.map((l, i) => (
            <div key={i} className="grid-12">
              <select className="input span-2" value={l.kind} onChange={e => setLine(i, 'kind', e.target.value)}>
                <option value="SERVICE">บริการ</option><option value="ITEM">สินค้า</option><option value="MATERIAL">วัสดุ</option><option value="OTHER">อื่นๆ</option>
              </select>
              <input className="input span-5" placeholder="รายการ" value={l.description} onChange={e => setLine(i, 'description', e.target.value)} />
              <input type="number" className="input span-2" placeholder="จำนวน" value={l.qty} onChange={e => setLine(i, 'qty', e.target.value)} />
              <input type="number" className="input span-2" placeholder="ราคา" value={l.unitPrice} onChange={e => setLine(i, 'unitPrice', e.target.value)} />
              <button type="button" onClick={() => setLines(ls => ls.filter((_, idx) => idx !== i))} className="icon-btn icon-btn--danger icon-btn--quiet span-1">×</button>
            </div>
          ))}
        </div>
        <button type="button" onClick={() => setLines(ls => [...ls, { kind: 'ITEM', description: '', qty: 1, unitPrice: 0 }])} className="link-btn">+ เพิ่มรายการ</button>
        <div className="row row-end gap-12 divided-top">
          <span className="small muted">ส่วนลด</span>
          <input type="number" className="input input--narrow" value={discount} onChange={e => setDiscount(e.target.value)} />
        </div>
        <div className="row row-between small">
          <span className="muted">รวมย่อย ฿{subtotal.toLocaleString()}</span>
          <span className="strong">ยอดสุทธิ ฿{total.toLocaleString()}</span>
        </div>
        <div className="form-actions">
          <Btn type="button" variant="ghost" className="btn--grow" onClick={onClose}>ยกเลิก</Btn>
          <Btn type="submit" disabled={saving || !patientId} className="btn--grow">{saving ? 'กำลังบันทึก...' : 'บันทึกบิล'}</Btn>
        </div>
      </form>
    </Modal>
  )
}

function BillDetail({ id, methods, onClose, onChanged }) {
  const [bill, setBill] = useState(null)
  const [pm, setPm] = useState('')
  const [paying, setPaying] = useState(false)
  useEffect(() => { api.get(`/bills/${id}`).then(r => setBill(r.data)) }, [id])
  if (!bill) return <Modal open onClose={onClose} title="บิล"><p className="small muted">กำลังโหลด...</p></Modal>

  async function pay() {
    setPaying(true)
    try { await api.post(`/bills/${id}/pay`, { paymentMethodId: pm || null }); onChanged(); onClose() } finally { setPaying(false) }
  }
  const [label, tone] = STATUS[bill.status]

  return (
    <Modal open onClose={onClose} title={`บิล ${bill.billNo}`} wide>
      <div id="report-print" className="small">
        <div className="report__head">
          <div>
            <p className="report__brand">Patient Clinic</p>
            <p className="report__meta">{bill.patient.name} ({bill.patient.hn}) · {format(new Date(bill.date), 'd MMM yyyy', { locale: th })}</p>
          </div>
          <Badge tone={tone}>{label}</Badge>
        </div>
        <table className="table table--tight mb-12">
          <thead>
            <tr>
              <th>รายการ</th><th className="right">จำนวน</th><th className="right">ราคา</th><th className="right">รวม</th>
            </tr>
          </thead>
          <tbody>
            {bill.items.map(it => (
              <tr key={it.id}>
                <td>{it.description}</td>
                <td className="right muted">{it.qty}</td>
                <td className="right muted">฿{it.unitPrice.toLocaleString()}</td>
                <td className="right">฿{it.amount.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="report__totals">
          <span>รวมย่อย ฿{bill.subtotal.toLocaleString()}</span>
          {bill.discount > 0 && <span>ส่วนลด −฿{bill.discount.toLocaleString()}</span>}
          <span className="report__grand">ยอดสุทธิ ฿{bill.total.toLocaleString()}</span>
          {bill.status === 'PAID' && (
            <span className="tiny text-ok">
              ชำระโดย {bill.paymentMethod?.name || '-'} · {bill.paidAt ? format(new Date(bill.paidAt), 'd MMM yyyy HH:mm') : ''}
            </span>
          )}
        </div>
      </div>

      <div className="row gap-8 mt-12 divided-top">
        <Btn variant="ghost" onClick={() => window.print()}><Printer size={13} /> พิมพ์</Btn>
        {bill.status === 'UNPAID' && (
          <div className="row gap-8 grow">
            <select className="input" value={pm} onChange={e => setPm(e.target.value)}>
              <option value="">วิธีชำระ...</option>
              {methods.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
            <Btn onClick={pay} disabled={paying}><Wallet size={13} /> {paying ? '...' : 'ชำระเงิน'}</Btn>
          </div>
        )}
      </div>
    </Modal>
  )
}

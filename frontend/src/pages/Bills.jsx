import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { th } from 'date-fns/locale'
import { Plus, Receipt, Printer, Wallet } from 'lucide-react'
import api from '../lib/api'
import { PageHeader, Btn, Modal, Field, inputCls, Empty, Badge, Card } from '../components/ui'

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
    <div className="p-6 mx-auto max-w-4xl">
      <PageHeader title="บิล / การชำระเงิน">
        <Btn onClick={() => setCreating(true)}><Plus size={14} className="inline mr-1" /> สร้างบิล</Btn>
      </PageHeader>

      <div className="flex gap-1 mb-4">
        {TABS.map(([k, label]) => (
          <button key={k} onClick={() => setTab(k)}
            className={`px-3 py-1.5 rounded-lg text-xs transition ${tab === k ? 'bg-brand-600 text-white' : 'bg-white border border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
            {label}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {bills.map(b => {
          const [label, tone] = STATUS[b.status]
          return (
            <Card key={b.id} className="p-4 flex items-center justify-between cursor-pointer hover:border-brand-200" >
              <div onClick={() => setDetailId(b.id)} className="flex items-center gap-3 flex-1">
                <div className="w-10 h-10 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center"><Receipt size={18} /></div>
                <div>
                  <p className="text-sm font-medium text-gray-800">{b.billNo} · {b.patient.name}</p>
                  <p className="text-xs text-gray-500">{b.patient.hn} · {format(new Date(b.date), 'd MMM yyyy', { locale: th })} · {b._count.items} รายการ</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-semibold text-gray-800">฿{b.total.toLocaleString()}</span>
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
      <form onSubmit={save} className="space-y-3">
        <Field label="คนไข้ *">
          <select required className={inputCls} value={patientId} onChange={e => setPatientId(e.target.value)}>
            <option value="">เลือกคนไข้...</option>
            {patients.map(p => <option key={p.id} value={p.id}>{p.name} ({p.hn})</option>)}
          </select>
        </Field>
        <Field label="เพิ่มบริการ (quick add)">
          <select className={inputCls} value="" onChange={e => quickService(e.target.value)}>
            <option value="">เลือกบริการ...</option>
            {services.map(s => <option key={s.id} value={s.id}>{s.name} — ฿{s.price}</option>)}
          </select>
        </Field>
        <div className="space-y-2">
          {lines.map((l, i) => (
            <div key={i} className="grid grid-cols-12 gap-2">
              <select className={inputCls + ' col-span-2'} value={l.kind} onChange={e => setLine(i, 'kind', e.target.value)}>
                <option value="SERVICE">บริการ</option><option value="ITEM">สินค้า</option><option value="MATERIAL">วัสดุ</option><option value="OTHER">อื่นๆ</option>
              </select>
              <input className={inputCls + ' col-span-5'} placeholder="รายการ" value={l.description} onChange={e => setLine(i, 'description', e.target.value)} />
              <input type="number" className={inputCls + ' col-span-2'} placeholder="จำนวน" value={l.qty} onChange={e => setLine(i, 'qty', e.target.value)} />
              <input type="number" className={inputCls + ' col-span-2'} placeholder="ราคา" value={l.unitPrice} onChange={e => setLine(i, 'unitPrice', e.target.value)} />
              <button type="button" onClick={() => setLines(ls => ls.filter((_, idx) => idx !== i))} className="col-span-1 text-gray-400 hover:text-red-500 text-lg">×</button>
            </div>
          ))}
        </div>
        <button type="button" onClick={() => setLines(ls => [...ls, { kind: 'ITEM', description: '', qty: 1, unitPrice: 0 }])} className="text-xs text-brand-600 hover:underline">+ เพิ่มรายการ</button>
        <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-200">
          <span className="text-sm text-gray-500">ส่วนลด</span>
          <input type="number" className={inputCls + ' w-28'} value={discount} onChange={e => setDiscount(e.target.value)} />
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">รวมย่อย ฿{subtotal.toLocaleString()}</span>
          <span className="font-semibold text-gray-800">ยอดสุทธิ ฿{total.toLocaleString()}</span>
        </div>
        <div className="flex gap-2 pt-2">
          <Btn type="button" variant="ghost" className="flex-1" onClick={onClose}>ยกเลิก</Btn>
          <Btn type="submit" disabled={saving || !patientId} className="flex-1">{saving ? 'กำลังบันทึก...' : 'บันทึกบิล'}</Btn>
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
  if (!bill) return <Modal open onClose={onClose} title="บิล"><p className="text-sm text-gray-500">กำลังโหลด...</p></Modal>

  async function pay() {
    setPaying(true)
    try { await api.post(`/bills/${id}/pay`, { paymentMethodId: pm || null }); onChanged(); onClose() } finally { setPaying(false) }
  }
  const [label, tone] = STATUS[bill.status]

  return (
    <Modal open onClose={onClose} title={`บิล ${bill.billNo}`} wide>
      <div id="report-print" className="text-sm">
        <div className="flex items-center justify-between border-b border-gray-200 pb-3 mb-3">
          <div>
            <p className="text-lg font-semibold text-brand-700">Patient Clinic</p>
            <p className="text-xs text-gray-500">{bill.patient.name} ({bill.patient.hn}) · {format(new Date(bill.date), 'd MMM yyyy', { locale: th })}</p>
          </div>
          <Badge tone={tone}>{label}</Badge>
        </div>
        <table className="w-full mb-3">
          <thead><tr className="text-xs text-gray-500 text-left border-b border-gray-200">
            <th className="py-1.5">รายการ</th><th className="py-1.5 text-right">จำนวน</th><th className="py-1.5 text-right">ราคา</th><th className="py-1.5 text-right">รวม</th>
          </tr></thead>
          <tbody>
            {bill.items.map(it => (
              <tr key={it.id} className="border-b border-gray-50">
                <td className="py-1.5 text-gray-800">{it.description}</td>
                <td className="py-1.5 text-right text-gray-500">{it.qty}</td>
                <td className="py-1.5 text-right text-gray-500">฿{it.unitPrice.toLocaleString()}</td>
                <td className="py-1.5 text-right text-gray-700">฿{it.amount.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="flex flex-col items-end gap-0.5 text-sm">
          <span className="text-gray-500">รวมย่อย ฿{bill.subtotal.toLocaleString()}</span>
          {bill.discount > 0 && <span className="text-gray-500">ส่วนลด −฿{bill.discount.toLocaleString()}</span>}
          <span className="text-base font-semibold text-gray-800">ยอดสุทธิ ฿{bill.total.toLocaleString()}</span>
          {bill.status === 'PAID' && <span className="text-xs text-green-600">ชำระโดย {bill.paymentMethod?.name || '-'} · {bill.paidAt ? format(new Date(bill.paidAt), 'd MMM yyyy HH:mm') : ''}</span>}
        </div>
      </div>

      <div className="flex gap-2 pt-4 border-t border-gray-200 mt-3">
        <Btn variant="ghost" onClick={() => window.print()}><Printer size={13} className="inline mr-1" /> พิมพ์</Btn>
        {bill.status === 'UNPAID' && (
          <div className="flex gap-2 flex-1">
            <select className={inputCls} value={pm} onChange={e => setPm(e.target.value)}>
              <option value="">วิธีชำระ...</option>
              {methods.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
            <Btn onClick={pay} disabled={paying}><Wallet size={13} className="inline mr-1" /> {paying ? '...' : 'ชำระเงิน'}</Btn>
          </div>
        )}
      </div>
    </Modal>
  )
}

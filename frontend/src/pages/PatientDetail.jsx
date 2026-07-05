import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import { th } from 'date-fns/locale'
import { ArrowLeft, Pencil, Plus, FileText, Calendar, Receipt, Printer } from 'lucide-react'
import api from '../lib/api'
import { PageHeader, Btn, Modal, Field, inputCls, Empty, Badge, Card, TagInput } from '../components/ui'

const GENDER = { MALE: 'ชาย', FEMALE: 'หญิง', OTHER: 'อื่นๆ' }
const APPT = { SCHEDULED: 'นัดไว้', CONFIRMED: 'ยืนยัน', ARRIVED: 'มาถึง', IN_PROGRESS: 'กำลังตรวจ', COMPLETED: 'เสร็จ', CANCELLED: 'ยกเลิก', NO_SHOW: 'ไม่มา' }

export default function PatientDetail() {
  const { id } = useParams()
  const nav = useNavigate()
  const [patient, setPatient] = useState(null)
  const [doctors, setDoctors] = useState([])
  const [services, setServices] = useState([])
  const [methods, setMethods] = useState([])
  const [modal, setModal] = useState(null) // 'edit' | 'report' | 'bill'
  const [viewReport, setViewReport] = useState(null)

  const fetch = () => api.get(`/patients/${id}`).then(r => setPatient(r.data))
  useEffect(() => {
    fetch()
    api.get('/employees?role=DOCTOR&active=1').then(r => setDoctors(r.data))
    api.get('/master/services').then(r => setServices(r.data))
    api.get('/master/payment-methods').then(r => setMethods(r.data))
  }, [id])

  if (!patient) return <div className="p-6 text-gray-400 text-sm">กำลังโหลด...</div>

  return (
    <div className="p-6 mx-auto max-w-3xl">
      <button onClick={() => nav(-1)} className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600 mb-4">
        <ArrowLeft size={14} /> กลับ
      </button>

      {/* Info */}
      <Card className="p-5 mb-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-brand-50 flex items-center justify-center text-brand-600 font-bold text-xl">{patient.name[0]}</div>
            <div>
              <h2 className="text-lg font-semibold text-gray-800">{patient.name}</h2>
              <p className="text-sm text-gray-400">
                {patient.hn}{patient.gender ? ` · ${GENDER[patient.gender]}` : ''}{patient.phone ? ` · ${patient.phone}` : ''}
              </p>
              <div className="flex gap-1.5 mt-1">
                {patient.bloodType && <Badge tone="blue">กรุ๊ป {patient.bloodType}</Badge>}
                {patient.chronic && patient.chronic.split(',').map(c => c.trim()).filter(Boolean).map(c => <Badge key={c} tone="amber">{c}</Badge>)}
              </div>
            </div>
          </div>
          <Btn variant="ghost" onClick={() => setModal('edit')}><Pencil size={13} className="inline mr-1" /> แก้ไข</Btn>
        </div>
        {patient.allergies && <div className="mt-3 bg-red-50 rounded-lg px-3 py-2 text-xs text-red-600">⚠️ แพ้: {patient.allergies}</div>}
        {patient.address && <p className="mt-2 text-xs text-gray-400">ที่อยู่: {patient.address}</p>}
      </Card>

      {/* Reports / visits */}
      <Section title="ใบรายงาน / การรักษา" icon={FileText}
        action={<Btn onClick={() => setModal('report')}><Plus size={13} className="inline mr-1" /> บันทึกการรักษา</Btn>}>
        {patient.visits.length === 0 ? <Empty>ยังไม่มีประวัติการรักษา</Empty> : (
          <div className="space-y-2">
            {patient.visits.map(v => (
              <div key={v.id} className="border border-gray-100 rounded-xl p-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-800">{format(new Date(v.visitDate), 'd MMM yyyy', { locale: th })} · {v.diagnosis || 'ยังไม่วินิจฉัย'}</p>
                  <div className="flex items-center gap-1">
                    <button onClick={() => setViewReport(v)} className="text-xs text-brand-600 hover:underline">ดูรายงาน</button>
                    {!v.bill && <button onClick={() => setModal({ bill: true, visitId: v.id })} className="text-xs text-brand-600 hover:underline ml-2">+ ออกบิล</button>}
                  </div>
                </div>
                <p className="text-xs text-gray-400 mt-0.5">
                  {v.doctor ? `${v.doctor.name}` : ''}{v.chiefComplaint ? ` · อาการ: ${v.chiefComplaint}` : ''}
                  {v.bill ? ` · บิล ${v.bill.billNo}` : ''}
                </p>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Appointments */}
      <Section title="ประวัตินัดหมาย" icon={Calendar}>
        {patient.appointments.length === 0 ? <Empty>ยังไม่มีนัด</Empty> : (
          <div className="space-y-1.5">
            {patient.appointments.map(a => (
              <div key={a.id} className="flex items-center justify-between text-sm border-b border-gray-50 last:border-0 py-1.5">
                <span className="text-gray-800">
                  {format(new Date(a.scheduledAt), 'd MMM yyyy HH:mm', { locale: th })}{a.endAt ? `–${format(new Date(a.endAt), 'HH:mm')}` : ''}
                  <span className="text-gray-400">{a.service ? ` · ${a.service.name}` : ''}{a.doctor ? ` · ${a.doctor.name}` : ''}</span>
                </span>
                <Badge tone={a.status === 'COMPLETED' ? 'green' : a.status === 'CANCELLED' ? 'gray' : 'blue'}>{APPT[a.status]}</Badge>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Bills */}
      <Section title="บิล / การชำระเงิน" icon={Receipt}
        action={<Btn variant="ghost" onClick={() => setModal({ bill: true })}><Plus size={13} className="inline mr-1" /> สร้างบิล</Btn>}>
        {patient.bills.length === 0 ? <Empty>ยังไม่มีบิล</Empty> : (
          <div className="space-y-1.5">
            {patient.bills.map(b => (
              <div key={b.id} className="flex items-center justify-between text-sm border-b border-gray-50 last:border-0 py-1.5">
                <span className="text-gray-800">{b.billNo} · {format(new Date(b.date), 'd MMM yyyy', { locale: th })}</span>
                <span className="flex items-center gap-2">
                  <span className="text-gray-600">฿{b.total.toLocaleString()}</span>
                  <Badge tone={b.status === 'PAID' ? 'green' : b.status === 'UNPAID' ? 'amber' : 'gray'}>
                    {b.status === 'PAID' ? 'ชำระแล้ว' : b.status === 'UNPAID' ? 'ค้างชำระ' : b.status}
                  </Badge>
                </span>
              </div>
            ))}
          </div>
        )}
      </Section>

      {modal === 'edit' && <EditModal patient={patient} onClose={() => setModal(null)} onSaved={() => { setModal(null); fetch() }} />}
      {modal === 'report' && (
        <ReportModal patientId={patient.id} doctors={doctors}
          appointments={patient.appointments.filter(a => !['COMPLETED', 'CANCELLED', 'NO_SHOW'].includes(a.status))}
          onClose={() => setModal(null)} onSaved={() => { setModal(null); fetch() }} />
      )}
      {modal?.bill && (
        <BillModal patientId={patient.id} visitId={modal.visitId} services={services} methods={methods}
          onClose={() => setModal(null)} onSaved={() => { setModal(null); fetch() }} />
      )}
      {viewReport && <ViewReportModal visit={viewReport} patient={patient} onClose={() => setViewReport(null)} />}
    </div>
  )
}

function Section({ title, icon: Icon, action, children }) {
  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2"><Icon size={14} />{title}</h3>
        {action}
      </div>
      <Card className="p-3">{children}</Card>
    </div>
  )
}

function EditModal({ patient, onClose, onSaved }) {
  const [form, setForm] = useState({
    name: patient.name, gender: patient.gender || '',
    birthdate: patient.birthdate ? format(new Date(patient.birthdate), 'yyyy-MM-dd') : '',
    phone: patient.phone || '', email: patient.email || '', address: patient.address || '',
    bloodType: patient.bloodType || '', allergies: patient.allergies || '', chronic: patient.chronic || '', note: patient.note || '',
  })
  const [saving, setSaving] = useState(false)
  const set = f => e => setForm(p => ({ ...p, [f]: e.target.value }))
  async function save(e) {
    e.preventDefault(); setSaving(true)
    try { await api.put(`/patients/${patient.id}`, form); onSaved() } finally { setSaving(false) }
  }
  return (
    <Modal open onClose={onClose} title="แก้ไขข้อมูลคนไข้">
      <form onSubmit={save} className="space-y-3">
        <Field label="ชื่อ-นามสกุล *"><input required className={inputCls} value={form.name} onChange={set('name')} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="เพศ">
            <select className={inputCls} value={form.gender} onChange={set('gender')}>
              <option value="">ไม่ระบุ</option><option value="MALE">ชาย</option><option value="FEMALE">หญิง</option><option value="OTHER">อื่นๆ</option>
            </select>
          </Field>
          <Field label="เบอร์โทร"><input className={inputCls} value={form.phone} onChange={set('phone')} /></Field>
        </div>
        <Field label="ที่อยู่"><input className={inputCls} value={form.address} onChange={set('address')} /></Field>
        <Field label="แพ้ยา/สาร (คั่นด้วย ,)"><TagInput value={form.allergies} onChange={v => setForm(p => ({ ...p, allergies: v }))} placeholder="เช่น Penicillin, Aspirin" /></Field>
        <Field label="โรคประจำตัว (คั่นด้วย ,)"><TagInput value={form.chronic} onChange={v => setForm(p => ({ ...p, chronic: v }))} placeholder="เช่น เบาหวาน, ไขมัน, หัวใจ" /></Field>
        <div className="flex gap-2 pt-2">
          <Btn type="button" variant="ghost" className="flex-1" onClick={onClose}>ยกเลิก</Btn>
          <Btn type="submit" disabled={saving} className="flex-1">{saving ? 'กำลังบันทึก...' : 'บันทึก'}</Btn>
        </div>
      </form>
    </Modal>
  )
}

function ReportModal({ patientId, doctors, appointments, onClose, onSaved }) {
  const [form, setForm] = useState({ appointmentId: '', doctorId: '', chiefComplaint: '', diagnosis: '', treatment: '', note: '' })
  const [saving, setSaving] = useState(false)
  const set = f => e => setForm(p => ({ ...p, [f]: e.target.value }))
  async function save(e) {
    e.preventDefault(); setSaving(true)
    try { await api.post('/visits', { patientId, ...form }); onSaved() } finally { setSaving(false) }
  }
  return (
    <Modal open onClose={onClose} title="บันทึกการรักษา (ใบรายงานคนไข้)">
      <form onSubmit={save} className="space-y-3">
        {appointments.length > 0 && (
          <Field label="อ้างอิงนัด (ถ้ามี)">
            <select className={inputCls} value={form.appointmentId} onChange={set('appointmentId')}>
              <option value="">ไม่อ้างอิง</option>
              {appointments.map(a => <option key={a.id} value={a.id}>{format(new Date(a.scheduledAt), 'd MMM HH:mm')} {a.service ? `· ${a.service.name}` : ''}</option>)}
            </select>
          </Field>
        )}
        <Field label="แพทย์ผู้ตรวจ">
          <select className={inputCls} value={form.doctorId} onChange={set('doctorId')}>
            <option value="">ไม่ระบุ</option>
            {doctors.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </Field>
        <Field label="อาการสำคัญ (chief complaint)"><input className={inputCls} value={form.chiefComplaint} onChange={set('chiefComplaint')} /></Field>
        <Field label="การวินิจฉัย (diagnosis)"><input className={inputCls} value={form.diagnosis} onChange={set('diagnosis')} /></Field>
        <Field label="การรักษา / หัตถการ"><textarea rows={2} className={inputCls} value={form.treatment} onChange={set('treatment')} /></Field>
        <Field label="หมายเหตุ"><textarea rows={2} className={inputCls} value={form.note} onChange={set('note')} /></Field>
        <div className="flex gap-2 pt-2">
          <Btn type="button" variant="ghost" className="flex-1" onClick={onClose}>ยกเลิก</Btn>
          <Btn type="submit" disabled={saving} className="flex-1">{saving ? 'กำลังบันทึก...' : 'บันทึก'}</Btn>
        </div>
      </form>
    </Modal>
  )
}

function BillModal({ patientId, visitId, services, methods, onClose, onSaved }) {
  const [lines, setLines] = useState([{ kind: 'SERVICE', description: '', qty: 1, unitPrice: 0 }])
  const [discount, setDiscount] = useState(0)
  const [saving, setSaving] = useState(false)
  const setLine = (i, f, v) => setLines(ls => ls.map((l, idx) => idx === i ? { ...l, [f]: v } : l))
  const addLine = () => setLines(ls => [...ls, { kind: 'ITEM', description: '', qty: 1, unitPrice: 0 }])
  const rmLine = i => setLines(ls => ls.filter((_, idx) => idx !== i))
  const quickService = id => {
    const s = services.find(x => x.id === +id); if (!s) return
    setLines(ls => [...ls.filter(l => l.description), { kind: 'SERVICE', description: s.name, qty: 1, unitPrice: s.price }])
  }
  const subtotal = lines.reduce((s, l) => s + (+l.qty || 0) * (+l.unitPrice || 0), 0)
  const total = Math.max(0, subtotal - (+discount || 0))

  async function save(e) {
    e.preventDefault(); setSaving(true)
    try { await api.post('/bills', { patientId, visitId, discount, items: lines }); onSaved() } finally { setSaving(false) }
  }
  return (
    <Modal open onClose={onClose} title="สร้างบิล" wide>
      <form onSubmit={save} className="space-y-3">
        <Field label="เพิ่มบริการจากรายการ (quick add)">
          <select className={inputCls} value="" onChange={e => quickService(e.target.value)}>
            <option value="">เลือกบริการ...</option>
            {services.map(s => <option key={s.id} value={s.id}>{s.name} — ฿{s.price}</option>)}
          </select>
        </Field>
        <div className="space-y-2">
          {lines.map((l, i) => (
            <div key={i} className="grid grid-cols-12 gap-2 items-center">
              <select className={inputCls + ' col-span-2'} value={l.kind} onChange={e => setLine(i, 'kind', e.target.value)}>
                <option value="SERVICE">บริการ</option><option value="ITEM">สินค้า</option><option value="MATERIAL">วัสดุ</option><option value="OTHER">อื่นๆ</option>
              </select>
              <input className={inputCls + ' col-span-5'} placeholder="รายการ" value={l.description} onChange={e => setLine(i, 'description', e.target.value)} />
              <input type="number" className={inputCls + ' col-span-2'} placeholder="จำนวน" value={l.qty} onChange={e => setLine(i, 'qty', e.target.value)} />
              <input type="number" className={inputCls + ' col-span-2'} placeholder="ราคา" value={l.unitPrice} onChange={e => setLine(i, 'unitPrice', e.target.value)} />
              <button type="button" onClick={() => rmLine(i)} className="col-span-1 text-gray-300 hover:text-red-500 text-lg">×</button>
            </div>
          ))}
        </div>
        <button type="button" onClick={addLine} className="text-xs text-brand-600 hover:underline">+ เพิ่มรายการ</button>

        <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-100">
          <span className="text-sm text-gray-500">ส่วนลด</span>
          <input type="number" className={inputCls + ' w-28'} value={discount} onChange={e => setDiscount(e.target.value)} />
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">รวมย่อย ฿{subtotal.toLocaleString()}</span>
          <span className="font-semibold text-gray-800">ยอดสุทธิ ฿{total.toLocaleString()}</span>
        </div>
        <div className="flex gap-2 pt-2">
          <Btn type="button" variant="ghost" className="flex-1" onClick={onClose}>ยกเลิก</Btn>
          <Btn type="submit" disabled={saving} className="flex-1">{saving ? 'กำลังบันทึก...' : 'บันทึกบิล'}</Btn>
        </div>
      </form>
    </Modal>
  )
}

function ViewReportModal({ visit, patient, onClose }) {
  return (
    <Modal open onClose={onClose} title="ใบรายงานคนไข้ (Patient Report)" wide>
      <div id="report-print" className="space-y-3 text-sm">
        <div className="border-b border-gray-100 pb-3">
          <p className="text-lg font-semibold text-brand-700">Patient Clinic</p>
          <p className="text-xs text-gray-400">ใบรายงานการรักษา · {format(new Date(visit.visitDate), 'd MMMM yyyy', { locale: th })}</p>
        </div>
        <Row label="คนไข้" value={`${patient.name} (${patient.hn})`} />
        <Row label="แพทย์" value={visit.doctor?.name || '-'} />
        <Row label="อาการสำคัญ" value={visit.chiefComplaint || '-'} />
        <Row label="การวินิจฉัย" value={visit.diagnosis || '-'} />
        <Row label="การรักษา" value={visit.treatment || '-'} />
        <Row label="หมายเหตุ" value={visit.note || '-'} />
      </div>
      <div className="flex gap-2 pt-4">
        <Btn variant="ghost" className="flex-1" onClick={onClose}>ปิด</Btn>
        <Btn className="flex-1" onClick={() => window.print()}><Printer size={13} className="inline mr-1" /> พิมพ์</Btn>
      </div>
    </Modal>
  )
}

function Row({ label, value }) {
  return (
    <div className="flex gap-3">
      <span className="text-gray-400 w-28 flex-shrink-0">{label}</span>
      <span className="text-gray-800">{value}</span>
    </div>
  )
}

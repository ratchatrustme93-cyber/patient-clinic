import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { format, differenceInYears } from 'date-fns'
import { th } from 'date-fns/locale'
import { ArrowLeft, Pencil, Plus, FileText, Calendar, Receipt, Printer, AlertTriangle, User, Eye, EyeOff, Mic, Copy, Check, Trash2 } from 'lucide-react'
import api from '../lib/api'
import { PageHeader, Btn, Modal, Field, inputCls, Empty, Badge, Card, TagInput, StatTile } from '../components/ui'
import { PatientFields, EMPTY_PATIENT, maskId } from '../components/PatientForm'
import { useVoiceRecorder } from '../components/VoiceRecorder'

const GENDER = { MALE: 'ชาย', FEMALE: 'หญิง', OTHER: 'อื่นๆ' }
const APPT = { SCHEDULED: 'นัดไว้', CONFIRMED: 'ยืนยัน', ARRIVED: 'มาถึง', IN_PROGRESS: 'กำลังตรวจ', COMPLETED: 'เสร็จ', CANCELLED: 'ยกเลิก', NO_SHOW: 'ไม่มา' }
const TABS = [
  { key: 'personal', label: 'ประวัติส่วนตัว', icon: User },
  { key: 'treatment', label: 'ประวัติการรักษา', icon: FileText },
  { key: 'billing', label: 'ค่าใช้จ่าย', icon: Receipt },
]

export default function PatientDetail() {
  const { id } = useParams()
  const nav = useNavigate()
  const [patient, setPatient] = useState(null)
  const [doctors, setDoctors] = useState([])
  const [services, setServices] = useState([])
  const [methods, setMethods] = useState([])
  const [modal, setModal] = useState(null) // 'edit' | 'report' | 'bill'
  const [viewReport, setViewReport] = useState(null)
  const [tab, setTab] = useState('personal')
  const voice = useVoiceRecorder()

  const fetch = () => api.get(`/patients/${id}`).then(r => setPatient(r.data))
  useEffect(() => {
    fetch()
    api.get('/employees?role=DOCTOR&active=1').then(r => setDoctors(r.data))
    api.get('/master/services').then(r => setServices(r.data))
    api.get('/master/payment-methods').then(r => setMethods(r.data))
  }, [id])

  if (!patient) return <div className="p-6 text-gray-500 text-sm">กำลังโหลด...</div>

  const ageText = patient.birthdate ? `${differenceInYears(new Date(), new Date(patient.birthdate))} ปี` : '—'
  const chronicList = (patient.chronic || '').split(',').map(c => c.trim()).filter(Boolean)
  const outstanding = patient.bills.filter(b => b.status === 'UNPAID').reduce((s, b) => s + b.total, 0)

  return (
    <div className="p-6 mx-auto max-w-[1320px]">
      <button onClick={() => nav(-1)} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-600 mb-4">
        <ArrowLeft size={14} /> กลับ
      </button>

      {/* Identity — always visible */}
      <Card className="p-5 mb-4">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 rounded-full bg-brand-50 overflow-hidden flex items-center justify-center text-brand-600 font-bold text-2xl flex-shrink-0">
            {patient.photo ? <img src={patient.photo} alt={patient.name} className="w-full h-full object-cover" /> : patient.name[0]}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold text-gray-800">{patient.title ? `${patient.title} ` : ''}{patient.name}</h2>
                <p className="text-sm text-gray-500">
                  <span className="font-mono">{patient.hn}</span>
                  {[GENDER[patient.gender], ageText !== '—' ? ageText : null].filter(Boolean).map(t => <span key={t}> · {t}</span>)}
                </p>
              </div>
              <Btn variant="ghost" onClick={() => setModal('edit')}><Pencil size={13} className="inline mr-1" /> แก้ไข</Btn>
            </div>
          </div>
        </div>
        {patient.allergies && (
          <div className="mt-4 flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-700">
            <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
            <span><span className="font-semibold">แพ้ยา/สาร:</span> {patient.allergies}</span>
          </div>
        )}
      </Card>

      {/* Summary — always visible */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <StatTile icon={FileText} label="ประวัติการรักษา" value={patient.visits.length} tone="brand" />
        <StatTile icon={Calendar} label="นัดหมาย" value={patient.appointments.length} tone="blue" />
        <StatTile icon={Receipt} label="ยอดค้างชำระ" value={`฿${outstanding.toLocaleString()}`} tone="amber" />
      </div>

      {/* Tab bar */}
      <div className="flex items-center gap-1 mb-4 border-b border-gray-200 overflow-x-auto [scrollbar-width:thin]">
        {TABS.map(({ key, label, icon: Icon }) => {
          const count = key === 'treatment' ? patient.visits.length : key === 'billing' ? patient.bills.length : null
          return (
            <button key={key} onClick={() => setTab(key)}
              className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm whitespace-nowrap border-b-2 -mb-px transition ${
                tab === key ? 'border-brand-600 text-brand-700 font-medium' : 'border-transparent text-gray-500 hover:text-gray-800'
              }`}>
              <Icon size={16} /> {label}
              {count > 0 && <span className={`text-xs px-1.5 rounded-full ${tab === key ? 'bg-brand-100 text-brand-700' : 'bg-gray-100 text-gray-500'}`}>{count}</span>}
            </button>
          )
        })}
      </div>

      {/* เนื้อหาแต่ละแท็บ — key={tab} ทำให้ re-mount แล้วเล่น animation ทุกครั้งที่สลับ */}
      <div key={tab} className="tab-enter">
      {/* Tab: ประวัติส่วนตัว */}
      {tab === 'personal' && (
        <Card className="p-5 space-y-5">
          <div>
            <p className="text-sm font-semibold text-gray-700 mb-3">ข้อมูลทั่วไป</p>
            <dl className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-4">
              <Fact label="เพศ" value={GENDER[patient.gender] || '—'} />
              <Fact label="อายุ" value={ageText} />
              <Fact label="วันเกิด" value={patient.birthdate ? format(new Date(patient.birthdate), 'd MMM yyyy', { locale: th }) : '—'} />
              <NationalIdFact value={patient.nationalId} />
              <Fact label="สัญชาติ" value={patient.nationality || '—'} />
              <Fact label="ศาสนา" value={patient.religion || '—'} />
              <Fact label="สถานภาพ" value={patient.maritalStatus || '—'} />
              <Fact label="อาชีพ" value={patient.occupation || '—'} />
            </dl>
          </div>

          <div className="pt-4 border-t border-gray-100">
            <p className="text-sm font-semibold text-gray-700 mb-3">ข้อมูลติดต่อ</p>
            <dl className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-4">
              <Fact label="เบอร์โทร" value={patient.phone || '—'} />
              <Fact label="อีเมล" value={patient.email || '—'} />
              <div className="col-span-2 sm:col-span-3"><Fact label="ที่อยู่" value={patient.address || '—'} /></div>
            </dl>
          </div>

          <div className="pt-4 border-t border-gray-100">
            <p className="text-sm font-semibold text-gray-700 mb-3">ข้อมูลสุขภาพ</p>
            <dl className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-4">
              <Fact label="กรุ๊ปเลือด" value={patient.bloodType || '—'} />
              <Fact label="น้ำหนัก" value={patient.weight ? `${patient.weight} กก.` : '—'} />
              <Fact label="ส่วนสูง" value={patient.height ? `${patient.height} ซม.` : '—'} />
              <Fact label="สิทธิการรักษา" value={patient.insurance || '—'} />
            </dl>
            <div className="mt-4">
              <p className="text-xs text-gray-500 mb-1.5">โรคประจำตัว</p>
              {chronicList.length > 0
                ? <div className="flex flex-wrap gap-1.5">{chronicList.map(c => <Badge key={c} tone="amber">{c}</Badge>)}</div>
                : <p className="text-sm text-gray-400">—</p>}
            </div>
          </div>

          <div className="pt-4 border-t border-gray-100">
            <p className="text-sm font-semibold text-gray-700 mb-3">ผู้ติดต่อกรณีฉุกเฉิน</p>
            {patient.emergencyName || patient.emergencyPhone ? (
              <dl className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-4">
                <Fact label="ชื่อ-นามสกุล" value={patient.emergencyName || '—'} />
                <Fact label="ความสัมพันธ์" value={patient.emergencyRelation || '—'} />
                <Fact label="เบอร์โทร" value={patient.emergencyPhone || '—'} />
              </dl>
            ) : <p className="text-sm text-gray-400">—</p>}
          </div>

          {patient.note && (
            <div className="pt-4 border-t border-gray-100">
              <p className="text-xs text-gray-500 mb-1.5">หมายเหตุ</p>
              <p className="text-sm text-gray-800 whitespace-pre-wrap">{patient.note}</p>
            </div>
          )}
        </Card>
      )}

      {/* Tab: ประวัติการรักษา / รายงานการรักษา */}
      {tab === 'treatment' && (
        <>
          <Section title="ใบรายงาน / การรักษา" icon={FileText}
            action={<Btn onClick={() => setModal('report')}><Plus size={13} className="inline mr-1" /> บันทึกการรักษา</Btn>}>
            {patient.visits.length === 0 ? <Empty>ยังไม่มีประวัติการรักษา</Empty> : (
              <div className="space-y-2">
                {patient.visits.map(v => (
                  <div key={v.id} className="border border-gray-200 rounded-xl p-3.5 hover:border-brand-200 transition">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-medium text-gray-800">{v.diagnosis || 'ยังไม่วินิจฉัย'}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {format(new Date(v.visitDate), 'd MMM yyyy', { locale: th })}{v.doctor ? ` · ${v.doctor.name}` : ''}
                        </p>
                        {v.chiefComplaint && <p className="text-xs text-gray-500 mt-0.5">อาการ: {v.chiefComplaint}</p>}
                      </div>
                      <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                        <button onClick={() => setViewReport(v)} className="text-xs text-brand-600 hover:underline">ดูรายงาน</button>
                        {v.bill
                          ? <Badge tone="gray">บิล {v.bill.billNo}</Badge>
                          : <button onClick={() => setModal({ bill: true, visitId: v.id })} className="text-xs text-brand-600 hover:underline">+ ออกบิล</button>}
                      </div>
                    </div>

                    {/* บันทึกเสียง (ผูกได้หลายอันต่อการรักษา) */}
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs text-gray-500">🎙️ บันทึกเสียง {v.voiceRecords?.length ? `(${v.voiceRecords.length})` : ''}</span>
                        <button onClick={() => voice.open({ visitId: v.id, label: v.diagnosis || 'การรักษา', onSaved: fetch })}
                          className="text-xs text-brand-600 hover:underline inline-flex items-center gap-1">
                          <Mic size={12} /> อัดเสียง
                        </button>
                      </div>
                      {v.voiceRecords?.length > 0 && (
                        <div className="space-y-2">
                          {v.voiceRecords.map(vr => <VoiceItem key={vr.id} rec={vr} onChange={fetch} />)}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Section>

          <Section title="ประวัตินัดหมาย" icon={Calendar}>
            {patient.appointments.length === 0 ? <Empty>ยังไม่มีนัด</Empty> : (
              <div className="space-y-1.5">
                {patient.appointments.map(a => (
                  <div key={a.id} className="flex items-center justify-between text-sm border-b border-gray-100 last:border-0 py-1.5">
                    <span className="text-gray-800">
                      {format(new Date(a.scheduledAt), 'd MMM yyyy HH:mm', { locale: th })}{a.endAt ? `–${format(new Date(a.endAt), 'HH:mm')}` : ''}
                      <span className="text-gray-500">{a.service ? ` · ${a.service.name}` : ''}{a.doctor ? ` · ${a.doctor.name}` : ''}</span>
                    </span>
                    <Badge tone={a.status === 'COMPLETED' ? 'green' : a.status === 'CANCELLED' ? 'gray' : 'blue'}>{APPT[a.status]}</Badge>
                  </div>
                ))}
              </div>
            )}
          </Section>
        </>
      )}

      {/* Tab: ค่าใช้จ่าย */}
      {tab === 'billing' && (
        <Section title="บิล / การชำระเงิน" icon={Receipt}
          action={<Btn variant="ghost" onClick={() => setModal({ bill: true })}><Plus size={13} className="inline mr-1" /> สร้างบิล</Btn>}>
          {patient.bills.length === 0 ? <Empty>ยังไม่มีบิล</Empty> : (
            <div className="space-y-1.5">
              {patient.bills.map(b => (
                <div key={b.id} className="flex items-center justify-between text-sm border-b border-gray-100 last:border-0 py-1.5">
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
      )}
      </div>

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

function Fact({ label, value }) {
  return (
    <div>
      <dt className="text-xs text-gray-500">{label}</dt>
      <dd className="text-sm text-gray-800 mt-0.5">{value}</dd>
    </div>
  )
}

// รายการบันทึกเสียง 1 อัน — เล่นเสียง + ซับ (คัดลอก/แก้ไข/ลบ)
function VoiceItem({ rec, onChange }) {
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState(rec.transcript || '')
  const [copied, setCopied] = useState(false)
  const dur = `${Math.floor(rec.durationSec / 60)}:${String(rec.durationSec % 60).padStart(2, '0')}`
  const copy = () => { navigator.clipboard?.writeText(rec.transcript || ''); setCopied(true); setTimeout(() => setCopied(false), 1500) }
  const saveEdit = async () => { await api.put(`/voice-records/${rec.id}`, { transcript: text }); setEditing(false); onChange?.() }
  const del = async () => { if (!confirm('ลบบันทึกเสียงนี้?')) return; await api.delete(`/voice-records/${rec.id}`); onChange?.() }
  return (
    <div className="bg-gray-50 rounded-lg p-2.5 border border-gray-100">
      <div className="flex items-center gap-2 mb-1.5">
        {rec.audio && <audio controls src={rec.audio} className="h-8 flex-1 min-w-0" />}
        <span className="text-[11px] text-gray-400 flex-shrink-0">{dur}</span>
      </div>
      {editing ? (
        <div className="space-y-1.5">
          <textarea value={text} onChange={e => setText(e.target.value)} rows={3}
            className="w-full text-sm border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-brand-300 resize-none" />
          <div className="flex gap-3 justify-end">
            <button onClick={() => { setEditing(false); setText(rec.transcript || '') }} className="text-xs text-gray-500 hover:underline">ยกเลิก</button>
            <button onClick={saveEdit} className="text-xs text-brand-600 font-medium hover:underline">บันทึก</button>
          </div>
        </div>
      ) : (
        <>
          {rec.transcript
            ? <p className="text-xs text-gray-700 whitespace-pre-wrap leading-relaxed">{rec.transcript}</p>
            : <p className="text-xs text-gray-400 italic">ไม่มีซับ</p>}
          <div className="flex items-center gap-3 mt-1.5">
            <button onClick={copy} className="text-[11px] text-gray-500 hover:text-brand-600 inline-flex items-center gap-1">{copied ? <Check size={11} /> : <Copy size={11} />}{copied ? 'คัดลอกแล้ว' : 'คัดลอก'}</button>
            <button onClick={() => setEditing(true)} className="text-[11px] text-gray-500 hover:text-brand-600">แก้ไขซับ</button>
            <button onClick={del} className="text-[11px] text-gray-400 hover:text-red-500 ml-auto inline-flex items-center gap-1"><Trash2 size={11} /> ลบ</button>
          </div>
        </>
      )}
    </div>
  )
}

// เลขบัตร ปชช. แสดงแบบซ่อน (xxxxxxxxxx111) มีปุ่มตาเปิดดูชั่วคราว
function NationalIdFact({ value }) {
  const [reveal, setReveal] = useState(false)
  return (
    <div>
      <dt className="text-xs text-gray-500">เลขบัตรประชาชน</dt>
      <dd className="text-sm text-gray-800 mt-0.5 flex items-center gap-2">
        <span className="font-mono tracking-wider">{value ? (reveal ? value : maskId(value)) : '—'}</span>
        {value && (
          <button type="button" onClick={() => setReveal(r => !r)} className="text-gray-400 hover:text-gray-600">
            {reveal ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        )}
      </dd>
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
    ...EMPTY_PATIENT,
    ...Object.fromEntries(Object.keys(EMPTY_PATIENT).map(k => [k, patient[k] ?? ''])),
    birthdate: patient.birthdate ? format(new Date(patient.birthdate), 'yyyy-MM-dd') : '',
  })
  const [saving, setSaving] = useState(false)
  async function save(e) {
    e.preventDefault(); setSaving(true)
    try { await api.put(`/patients/${patient.id}`, form); onSaved() } finally { setSaving(false) }
  }
  return (
    <Modal open onClose={onClose} title="แก้ไขข้อมูลคนไข้" size="xl"
      footer={<>
        <Btn type="button" variant="ghost" onClick={onClose}>ยกเลิก</Btn>
        <Btn type="submit" form="patient-edit-form" disabled={saving}>{saving ? 'กำลังบันทึก...' : 'บันทึก'}</Btn>
      </>}>
      <form id="patient-edit-form" onSubmit={save}>
        <PatientFields form={form} setForm={setForm} />
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
              <button type="button" onClick={() => rmLine(i)} className="col-span-1 text-gray-400 hover:text-red-500 text-lg">×</button>
            </div>
          ))}
        </div>
        <button type="button" onClick={addLine} className="text-xs text-brand-600 hover:underline">+ เพิ่มรายการ</button>

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
        <div className="border-b border-gray-200 pb-3">
          <p className="text-lg font-semibold text-brand-700">Patient Clinic</p>
          <p className="text-xs text-gray-500">ใบรายงานการรักษา · {format(new Date(visit.visitDate), 'd MMMM yyyy', { locale: th })}</p>
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
      <span className="text-gray-500 w-28 flex-shrink-0">{label}</span>
      <span className="text-gray-800">{value}</span>
    </div>
  )
}

import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { format, differenceInYears } from 'date-fns'
import { th } from 'date-fns/locale'
import { ArrowLeft, Pencil, Plus, FileText, Calendar, Receipt, Printer, AlertTriangle, User, Eye, EyeOff, Mic, Copy, Check, Trash2 } from 'lucide-react'
import api from '../lib/api'
import { PageHeader, Btn, Modal, Field, Empty, Badge, Card, StatTile } from '../components/ui'
import { PatientFields, EMPTY_PATIENT, maskId } from '../components/PatientForm'
import { useVoiceRecorder } from '../components/VoiceRecorder'
import { getToken } from '../lib/auth'

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
  const [accessErr, setAccessErr] = useState('')
  const voice = useVoiceRecorder()

  const fetch = () => api.get(`/patients/${id}`).then(r => setPatient(r.data))
    .catch(e => setAccessErr(e.response?.status === 403 ? 'คุณไม่มีสิทธิ์เข้าถึงคนไข้รายนี้ (เห็นได้เฉพาะคนไข้ของตัวเอง)' : 'ไม่พบข้อมูลคนไข้'))
  useEffect(() => {
    fetch()
    api.get('/employees?role=DOCTOR&active=1').then(r => setDoctors(r.data))
    api.get('/master/services').then(r => setServices(r.data))
    api.get('/master/payment-methods').then(r => setMethods(r.data))
  }, [id])

  if (accessErr) return (
    <div className="page page--wide">
      <button onClick={() => nav(-1)} className="back-link"><ArrowLeft size={14} /> กลับ</button>
      <div className="alert alert--center tone-amber">🔒 {accessErr}</div>
    </div>
  )
  if (!patient) return <div className="page__loading">กำลังโหลด...</div>

  const ageText = patient.birthdate ? `${differenceInYears(new Date(), new Date(patient.birthdate))} ปี` : '—'
  const chronicList = (patient.chronic || '').split(',').map(c => c.trim()).filter(Boolean)
  const outstanding = patient.bills.filter(b => b.status === 'UNPAID').reduce((s, b) => s + b.total, 0)

  return (
    <div className="page">
      <button onClick={() => nav(-1)} className="back-link"><ArrowLeft size={14} /> กลับ</button>

      {/* ข้อมูลระบุตัวตน — เห็นตลอด */}
      <Card pad="lg" className="mb-16">
        <div className="row row-top gap-16">
          <div className="avatar avatar--lg">
            {patient.photo ? <img src={patient.photo} alt={patient.name} /> : patient.name[0]}
          </div>
          <div className="grow-min">
            <div className="row row-top row-between gap-12">
              <div>
                <h2 className="page-header__title">{patient.title ? `${patient.title} ` : ''}{patient.name}</h2>
                <p className="small muted">
                  <span className="mono">{patient.hn}</span>
                  {[GENDER[patient.gender], ageText !== '—' ? ageText : null].filter(Boolean).map(t => <span key={t}> · {t}</span>)}
                </p>
              </div>
              <Btn variant="ghost" onClick={() => setModal('edit')}><Pencil size={13} /> แก้ไข</Btn>
            </div>
          </div>
        </div>
        {patient.allergies && (
          <div className="alert tone-red mt-16">
            <AlertTriangle size={16} className="alert__icon" />
            <span><span className="strong">แพ้ยา/สาร:</span> {patient.allergies}</span>
          </div>
        )}
      </Card>

      {/* สรุป — เห็นตลอด */}
      <div className="stat-grid stat-grid--3 mb-16">
        <StatTile icon={FileText} label="ประวัติการรักษา" value={patient.visits.length} tone="brand" />
        <StatTile icon={Calendar} label="นัดหมาย" value={patient.appointments.length} tone="blue" />
        <StatTile icon={Receipt} label="ยอดค้างชำระ" value={`฿${outstanding.toLocaleString()}`} tone="amber" />
      </div>

      {/* แถบแท็บ */}
      <div className="tabline">
        {TABS.map(({ key, label, icon: Icon }) => {
          const count = key === 'treatment' ? patient.visits.length : key === 'billing' ? patient.bills.length : null
          return (
            <button key={key} onClick={() => setTab(key)} className={`tabline__item${tab === key ? ' is-active' : ''}`}>
              <Icon size={16} /> {label}
              {count > 0 && <span className="tabline__count">{count}</span>}
            </button>
          )
        })}
      </div>

      {/* เนื้อหาแต่ละแท็บ — key={tab} ทำให้ re-mount แล้วเล่น animation ทุกครั้งที่สลับ */}
      <div key={tab} className="tab-enter">
      {/* Tab: ประวัติส่วนตัว */}
      {tab === 'personal' && (
        <Card pad="lg">
          <div className="form-section">
            <p className="form-section__title">ข้อมูลทั่วไป</p>
            <dl className="facts">
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

          <div className="form-section">
            <p className="form-section__title">ข้อมูลติดต่อ</p>
            <dl className="facts">
              <Fact label="เบอร์โทร" value={patient.phone || '—'} />
              <Fact label="อีเมล" value={patient.email || '—'} />
              <div className="facts__wide"><Fact label="ที่อยู่" value={patient.address || '—'} /></div>
            </dl>
          </div>

          <div className="form-section">
            <p className="form-section__title">ข้อมูลสุขภาพ</p>
            <dl className="facts">
              <Fact label="กรุ๊ปเลือด" value={patient.bloodType || '—'} />
              <Fact label="น้ำหนัก" value={patient.weight ? `${patient.weight} กก.` : '—'} />
              <Fact label="ส่วนสูง" value={patient.height ? `${patient.height} ซม.` : '—'} />
              <Fact label="สิทธิการรักษา" value={patient.insurance || '—'} />
            </dl>
            <div className="mt-16">
              <p className="fact__label mb-6">โรคประจำตัว</p>
              {chronicList.length > 0
                ? <div className="row wrap gap-6">{chronicList.map(c => <Badge key={c} tone="amber">{c}</Badge>)}</div>
                : <p className="small soft">—</p>}
            </div>
          </div>

          <div className="form-section">
            <p className="form-section__title">ผู้ติดต่อกรณีฉุกเฉิน</p>
            {patient.emergencyName || patient.emergencyPhone ? (
              <dl className="facts">
                <Fact label="ชื่อ-นามสกุล" value={patient.emergencyName || '—'} />
                <Fact label="ความสัมพันธ์" value={patient.emergencyRelation || '—'} />
                <Fact label="เบอร์โทร" value={patient.emergencyPhone || '—'} />
              </dl>
            ) : <p className="small soft">—</p>}
          </div>

          {patient.note && (
            <div className="form-section">
              <p className="fact__label mb-6">หมายเหตุ</p>
              <p className="small pre">{patient.note}</p>
            </div>
          )}
        </Card>
      )}

      {/* Tab: ประวัติการรักษา / รายงานการรักษา */}
      {tab === 'treatment' && (
        <>
          <Section title="ใบรายงาน / การรักษา" icon={FileText}
            action={<Btn onClick={() => setModal('report')}><Plus size={13} /> บันทึกการรักษา</Btn>}>
            {patient.visits.length === 0 ? <Empty>ยังไม่มีประวัติการรักษา</Empty> : (
              <div className="col gap-8">
                {patient.visits.map(v => (
                  <div key={v.id} className="visit">
                    <div className="row row-top row-between gap-12">
                      <div className="grow-min">
                        <p className="visit__title">{v.diagnosis || 'ยังไม่วินิจฉัย'}</p>
                        <p className="visit__meta">
                          {format(new Date(v.visitDate), 'd MMM yyyy', { locale: th })}{v.doctor ? ` · ${v.doctor.name}` : ''}
                        </p>
                        {v.chiefComplaint && <p className="visit__meta">อาการ: {v.chiefComplaint}</p>}
                      </div>
                      <div className="col gap-6 no-shrink items-end">
                        <button onClick={() => setViewReport(v)} className="link-btn">ดูรายงาน</button>
                        {v.bill
                          ? <Badge tone="gray">บิล {v.bill.billNo}</Badge>
                          : <button onClick={() => setModal({ bill: true, visitId: v.id })} className="link-btn">+ ออกบิล</button>}
                      </div>
                    </div>

                    {/* บันทึกเสียง (ผูกได้หลายอันต่อการรักษา) */}
                    <div className="visit__voice">
                      <div className="row row-between mb-6">
                        <span className="tiny muted">🎙️ บันทึกเสียง {v.voiceRecords?.length ? `(${v.voiceRecords.length})` : ''}</span>
                        <button onClick={() => voice.open({ visitId: v.id, label: v.diagnosis || 'การรักษา', onSaved: fetch })} className="link-btn">
                          <Mic size={12} /> อัดเสียง
                        </button>
                      </div>
                      {v.voiceRecords?.length > 0 && v.voiceRecords.map(vr => <VoiceItem key={vr.id} rec={vr} onChange={fetch} />)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Section>

          <Section title="ประวัตินัดหมาย" icon={Calendar}>
            {patient.appointments.length === 0 ? <Empty>ยังไม่มีนัด</Empty> : (
              <div className="list">
                {patient.appointments.map(a => (
                  <div key={a.id} className="list__row">
                    <span>
                      {format(new Date(a.scheduledAt), 'd MMM yyyy HH:mm', { locale: th })}{a.endAt ? `–${format(new Date(a.endAt), 'HH:mm')}` : ''}
                      <span className="muted">{a.service ? ` · ${a.service.name}` : ''}{a.doctor ? ` · ${a.doctor.name}` : ''}</span>
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
          action={<Btn variant="ghost" onClick={() => setModal({ bill: true })}><Plus size={13} /> สร้างบิล</Btn>}>
          {patient.bills.length === 0 ? <Empty>ยังไม่มีบิล</Empty> : (
            <div className="list">
              {patient.bills.map(b => (
                <div key={b.id} className="list__row">
                  <span>{b.billNo} · {format(new Date(b.date), 'd MMM yyyy', { locale: th })}</span>
                  <span className="row gap-8">
                    <span className="muted">฿{b.total.toLocaleString()}</span>
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
      <dt className="fact__label">{label}</dt>
      <dd className="fact__value">{value}</dd>
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
    <div className="voice-item">
      <div className="voice-item__player">
        {rec.audioFile && <audio controls preload="none" src={`/api/voice-records/${rec.id}/audio?t=${getToken()}`} />}
        <span className="voice-item__dur">{dur}</span>
      </div>
      {editing ? (
        <div className="stack-sm">
          <textarea value={text} onChange={e => setText(e.target.value)} rows={3} className="input input--flat" />
          <div className="row row-end gap-12">
            <button onClick={() => { setEditing(false); setText(rec.transcript || '') }} className="link-btn link-btn--muted">ยกเลิก</button>
            <button onClick={saveEdit} className="link-btn medium">บันทึก</button>
          </div>
        </div>
      ) : (
        <>
          {rec.transcript
            ? <p className="voice-item__text">{rec.transcript}</p>
            : <p className="voice-item__empty">ไม่มีซับ</p>}
          <div className="voice-item__actions">
            <button onClick={copy} className="link-btn link-btn--muted">
              {copied ? <Check size={11} /> : <Copy size={11} />}{copied ? 'คัดลอกแล้ว' : 'คัดลอก'}
            </button>
            <button onClick={() => setEditing(true)} className="link-btn link-btn--muted">แก้ไขซับ</button>
            <button onClick={del} className="link-btn link-btn--muted ml-auto"><Trash2 size={11} /> ลบ</button>
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
      <dt className="fact__label">เลขบัตรประชาชน</dt>
      <dd className="fact__value row gap-8">
        <span className="mono">{value ? (reveal ? value : maskId(value)) : '—'}</span>
        {value && (
          <button type="button" onClick={() => setReveal(r => !r)} className="reveal-btn">
            {reveal ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        )}
      </dd>
    </div>
  )
}

function Section({ title, icon: Icon, action, children }) {
  return (
    <div className="section">
      <div className="section__head">
        <h3 className="section__title"><Icon size={14} />{title}</h3>
        {action}
      </div>
      <Card pad="sm">{children}</Card>
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
      <form onSubmit={save} className="stack">
        {appointments.length > 0 && (
          <Field label="อ้างอิงนัด (ถ้ามี)">
            <select className="input" value={form.appointmentId} onChange={set('appointmentId')}>
              <option value="">ไม่อ้างอิง</option>
              {appointments.map(a => <option key={a.id} value={a.id}>{format(new Date(a.scheduledAt), 'd MMM HH:mm')} {a.service ? `· ${a.service.name}` : ''}</option>)}
            </select>
          </Field>
        )}
        <Field label="แพทย์ผู้ตรวจ">
          <select className="input" value={form.doctorId} onChange={set('doctorId')}>
            <option value="">ไม่ระบุ</option>
            {doctors.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </Field>
        <Field label="อาการสำคัญ (chief complaint)"><input className="input" value={form.chiefComplaint} onChange={set('chiefComplaint')} /></Field>
        <Field label="การวินิจฉัย (diagnosis)"><input className="input" value={form.diagnosis} onChange={set('diagnosis')} /></Field>
        <Field label="การรักษา / หัตถการ"><textarea rows={2} className="input" value={form.treatment} onChange={set('treatment')} /></Field>
        <Field label="หมายเหตุ"><textarea rows={2} className="input" value={form.note} onChange={set('note')} /></Field>
        <div className="form-actions">
          <Btn type="button" variant="ghost" className="btn--grow" onClick={onClose}>ยกเลิก</Btn>
          <Btn type="submit" disabled={saving} className="btn--grow">{saving ? 'กำลังบันทึก...' : 'บันทึก'}</Btn>
        </div>
      </form>
    </Modal>
  )
}

function BillModal({ patientId, visitId, services, onClose, onSaved }) {
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
      <form onSubmit={save} className="stack">
        <Field label="เพิ่มบริการจากรายการ (quick add)">
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
              <button type="button" onClick={() => rmLine(i)} className="icon-btn icon-btn--danger icon-btn--quiet span-1">×</button>
            </div>
          ))}
        </div>
        <button type="button" onClick={addLine} className="link-btn">+ เพิ่มรายการ</button>

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
          <Btn type="submit" disabled={saving} className="btn--grow">{saving ? 'กำลังบันทึก...' : 'บันทึกบิล'}</Btn>
        </div>
      </form>
    </Modal>
  )
}

function ViewReportModal({ visit, patient, onClose }) {
  return (
    <Modal open onClose={onClose} title="ใบรายงานคนไข้ (Patient Report)" wide>
      <div id="report-print" className="stack small">
        <div className="report__head">
          <div>
            <p className="report__brand">Patient Clinic</p>
            <p className="report__meta">ใบรายงานการรักษา · {format(new Date(visit.visitDate), 'd MMMM yyyy', { locale: th })}</p>
          </div>
        </div>
        <Row label="คนไข้" value={`${patient.name} (${patient.hn})`} />
        <Row label="แพทย์" value={visit.doctor?.name || '-'} />
        <Row label="อาการสำคัญ" value={visit.chiefComplaint || '-'} />
        <Row label="การวินิจฉัย" value={visit.diagnosis || '-'} />
        <Row label="การรักษา" value={visit.treatment || '-'} />
        <Row label="หมายเหตุ" value={visit.note || '-'} />
      </div>
      <div className="form-actions mt-16">
        <Btn variant="ghost" className="btn--grow" onClick={onClose}>ปิด</Btn>
        <Btn className="btn--grow" onClick={() => window.print()}><Printer size={13} /> พิมพ์</Btn>
      </div>
    </Modal>
  )
}

function Row({ label, value }) {
  return (
    <div className="report-row">
      <span className="report-row__label">{label}</span>
      <span className="report-row__value">{value}</span>
    </div>
  )
}

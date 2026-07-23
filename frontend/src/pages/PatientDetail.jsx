import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { format, differenceInYears } from 'date-fns'
import { ArrowLeft, Pencil, Plus, FileText, Calendar, Receipt, Printer, AlertTriangle, User, Eye, EyeOff, Mic, Copy, Check, Trash2 } from 'lucide-react'
import api from '../lib/api'
import { useT } from '../lib/i18n'
import { PageHeader, Btn, Modal, Field, Empty, Badge, Card, StatTile } from '../components/ui'
import { PatientFields, EMPTY_PATIENT, maskId } from '../components/PatientForm'
import { useVoiceRecorder } from '../components/VoiceRecorder'

const TABS = [
  { key: 'personal', tkey: 'tabPersonal', icon: User },
  { key: 'treatment', tkey: 'tabTreatment', icon: FileText },
  { key: 'billing', tkey: 'tabBilling', icon: Receipt },
]
const KINDS = ['SERVICE', 'ITEM', 'MATERIAL', 'OTHER']

export default function PatientDetail() {
  const { id } = useParams()
  const nav = useNavigate()
  const { t, dateLocale } = useT()
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
    .catch(e => setAccessErr(e.response?.status === 403 ? t('patientDetail.accessDenied') : t('patientDetail.notFound')))
  useEffect(() => {
    fetch()
    api.get('/employees?role=DOCTOR&active=1').then(r => setDoctors(r.data))
    // ช่องเลือกเอาเฉพาะ master ที่ยังเปิดใช้งาน
    api.get('/master/services?activeOnly=1').then(r => setServices(r.data))
    api.get('/master/payment-methods?activeOnly=1').then(r => setMethods(r.data))
  }, [id])

  const dash = t('common.dash')
  const money = n => `${t('common.baht')}${n.toLocaleString()}`

  if (accessErr) return (
    <div className="page page--wide">
      <button onClick={() => nav(-1)} className="back-link"><ArrowLeft size={14} /> {t('common.back')}</button>
      <div className="alert alert--center tone-amber">🔒 {accessErr}</div>
    </div>
  )
  if (!patient) return <div className="page__loading">{t('common.loading')}</div>

  const ageText = patient.birthdate ? t('patientDetail.years', { n: differenceInYears(new Date(), new Date(patient.birthdate)) }) : dash
  const chronicList = (patient.chronic || '').split(',').map(c => c.trim()).filter(Boolean)
  const outstanding = patient.bills.filter(b => b.status === 'UNPAID').reduce((s, b) => s + b.total, 0)

  return (
    <div className="page">
      <button onClick={() => nav(-1)} className="back-link"><ArrowLeft size={14} /> {t('common.back')}</button>

      {/* ข้อมูลระบุตัวตน — เห็นตลอด */}
      <Card pad="lg" className="mb-16">
        <div className="row row-top gap-16">
          <div className="avatar avatar--lg">
            {patient.photo ? <img src={patient.photo} alt={patient.name} /> : patient.name[0]}
          </div>
          <div className="grow-min">
            <div className="row row-top row-between gap-12">
              <div>
                <h2 className="page-header__title">
                  {patient.title ? `${t(`enum.titles.${patient.title}`)} ` : ''}{patient.name}
                </h2>
                <p className="small muted">
                  <span className="mono">{patient.hn}</span>
                  {[patient.gender && t(`enum.gender.${patient.gender}`), ageText !== dash ? ageText : null]
                    .filter(Boolean).map(x => <span key={x}> · {x}</span>)}
                </p>
              </div>
              <Btn variant="ghost" onClick={() => setModal('edit')}><Pencil size={13} /> {t('patientDetail.edit')}</Btn>
            </div>
          </div>
        </div>
        {patient.allergies && (
          <div className="alert tone-red mt-16">
            <AlertTriangle size={16} className="alert__icon" />
            <span><span className="strong">{t('patientDetail.allergyWarning')}</span> {patient.allergies}</span>
          </div>
        )}
      </Card>

      {/* สรุป — เห็นตลอด */}
      <div className="stat-grid stat-grid--3 mb-16">
        <StatTile icon={FileText} label={t('patientDetail.visitCount')} value={patient.visits.length} tone="brand" />
        <StatTile icon={Calendar} label={t('patientDetail.apptCount')} value={patient.appointments.length} tone="blue" />
        <StatTile icon={Receipt} label={t('patientDetail.outstanding')} value={money(outstanding)} tone="amber" />
      </div>

      {/* แถบแท็บ */}
      <div className="tabline">
        {TABS.map(({ key, tkey, icon: Icon }) => {
          const count = key === 'treatment' ? patient.visits.length : key === 'billing' ? patient.bills.length : null
          return (
            <button key={key} onClick={() => setTab(key)} className={`tabline__item${tab === key ? ' is-active' : ''}`}>
              <Icon size={16} /> {t(`patientDetail.${tkey}`)}
              {count > 0 && <span className="tabline__count">{count}</span>}
            </button>
          )
        })}
      </div>

      {/* เนื้อหาแต่ละแท็บ — key={tab} ทำให้ re-mount แล้วเล่น animation ทุกครั้งที่สลับ */}
      <div key={tab} className="tab-enter">
      {tab === 'personal' && (
        <Card pad="lg">
          <div className="form-section">
            <p className="form-section__title">{t('patientDetail.general')}</p>
            <dl className="facts">
              <Fact label={t('patientForm.gender')} value={patient.gender ? t(`enum.gender.${patient.gender}`) : dash} />
              <Fact label={t('patients.age')} value={ageText} />
              <Fact label={t('patientForm.birthdate')} value={patient.birthdate ? format(new Date(patient.birthdate), 'd MMM yyyy', { locale: dateLocale }) : dash} />
              <NationalIdFact value={patient.nationalId} />
              <Fact label={t('patientForm.nationality')} value={patient.nationality || dash} />
              <Fact label={t('patientForm.religion')} value={patient.religion || dash} />
              <Fact label={t('patientForm.maritalStatus')} value={patient.maritalStatus ? t(`enum.marital.${patient.maritalStatus}`) : dash} />
              <Fact label={t('patientForm.occupation')} value={patient.occupation || dash} />
            </dl>
          </div>

          <div className="form-section">
            <p className="form-section__title">{t('patientDetail.contactInfo')}</p>
            <dl className="facts">
              <Fact label={t('patientForm.phone')} value={patient.phone || dash} />
              <Fact label={t('patientForm.email')} value={patient.email || dash} />
              <div className="facts__wide"><Fact label={t('patientForm.address')} value={patient.address || dash} /></div>
            </dl>
          </div>

          <div className="form-section">
            <p className="form-section__title">{t('patientDetail.healthInfo')}</p>
            <dl className="facts">
              <Fact label={t('patientForm.bloodType')} value={patient.bloodType || dash} />
              <Fact label={t('patientForm.weight')} value={patient.weight ? t('patientDetail.kg', { n: patient.weight }) : dash} />
              <Fact label={t('patientForm.height')} value={patient.height ? t('patientDetail.cm', { n: patient.height }) : dash} />
              <Fact label={t('patientForm.insurance')} value={patient.insurance ? t(`enum.insurance.${patient.insurance}`) : dash} />
            </dl>
            <div className="mt-16">
              <p className="fact__label mb-6">{t('patientDetail.chronicDiseases')}</p>
              {chronicList.length > 0
                ? <div className="row wrap gap-6">{chronicList.map(c => <Badge key={c} tone="amber">{c}</Badge>)}</div>
                : <p className="small soft">{dash}</p>}
            </div>
          </div>

          <div className="form-section">
            <p className="form-section__title">{t('patientDetail.emergencyContact')}</p>
            {patient.emergencyName || patient.emergencyPhone ? (
              <dl className="facts">
                <Fact label={t('patientForm.emergencyName')} value={patient.emergencyName || dash} />
                <Fact label={t('patientForm.relation')} value={patient.emergencyRelation || dash} />
                <Fact label={t('patientForm.phone')} value={patient.emergencyPhone || dash} />
              </dl>
            ) : <p className="small soft">{dash}</p>}
          </div>

          {patient.note && (
            <div className="form-section">
              <p className="fact__label mb-6">{t('patientDetail.note')}</p>
              <p className="small pre">{patient.note}</p>
            </div>
          )}
        </Card>
      )}

      {tab === 'treatment' && (
        <>
          <Section title={t('patientDetail.reportSection')} icon={FileText}
            action={<Btn onClick={() => setModal('report')}><Plus size={13} /> {t('patientDetail.addVisit')}</Btn>}>
            {patient.visits.length === 0 ? <Empty>{t('patientDetail.noVisits')}</Empty> : (
              <div className="col gap-8">
                {patient.visits.map(v => (
                  <div key={v.id} className="visit">
                    <div className="row row-top row-between gap-12">
                      <div className="grow-min">
                        <p className="visit__title">{v.diagnosis || t('patientDetail.undiagnosed')}</p>
                        <p className="visit__meta">
                          {format(new Date(v.visitDate), 'd MMM yyyy', { locale: dateLocale })}{v.doctor ? ` · ${v.doctor.name}` : ''}
                        </p>
                        {v.chiefComplaint && <p className="visit__meta">{t('patientDetail.symptom', { text: v.chiefComplaint })}</p>}
                      </div>
                      <div className="col gap-6 no-shrink items-end">
                        <button onClick={() => setViewReport(v)} className="link-btn">{t('patientDetail.viewReport')}</button>
                        {v.bill
                          ? <Badge tone="gray">{t('patientDetail.billNo', { no: v.bill.billNo })}</Badge>
                          : <button onClick={() => setModal({ bill: true, visitId: v.id })} className="link-btn">{t('patientDetail.issueBill')}</button>}
                      </div>
                    </div>

                    {/* บันทึกเสียง (ผูกได้หลายอันต่อการรักษา) */}
                    <div className="visit__voice">
                      <div className="row row-between mb-6">
                        <span className="tiny muted">{t('patientDetail.voiceSection')} {v.voiceRecords?.length ? `(${v.voiceRecords.length})` : ''}</span>
                        <button onClick={() => voice.open({ visitId: v.id, label: v.diagnosis || t('recorder.defaultLabel'), onSaved: fetch })} className="link-btn">
                          <Mic size={12} /> {t('patientDetail.record')}
                        </button>
                      </div>
                      {v.voiceRecords?.length > 0 && v.voiceRecords.map(vr => <VoiceItem key={vr.id} rec={vr} onChange={fetch} />)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Section>

          <Section title={t('patientDetail.apptHistory')} icon={Calendar}>
            {patient.appointments.length === 0 ? <Empty>{t('patientDetail.noAppts')}</Empty> : (
              <div className="list">
                {patient.appointments.map(a => (
                  <div key={a.id} className="list__row">
                    <span>
                      {format(new Date(a.scheduledAt), 'd MMM yyyy HH:mm', { locale: dateLocale })}{a.endAt ? `–${format(new Date(a.endAt), 'HH:mm')}` : ''}
                      <span className="muted">{a.service ? ` · ${a.service.name}` : ''}{a.doctor ? ` · ${a.doctor.name}` : ''}</span>
                    </span>
                    <Badge tone={a.status === 'COMPLETED' ? 'green' : a.status === 'CANCELLED' ? 'gray' : 'blue'}>
                      {t(`enum.apptStatus.${a.status}`)}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </Section>
        </>
      )}

      {tab === 'billing' && (
        <Section title={t('patientDetail.billSection')} icon={Receipt}
          action={<Btn variant="ghost" onClick={() => setModal({ bill: true })}><Plus size={13} /> {t('patientDetail.createBill')}</Btn>}>
          {patient.bills.length === 0 ? <Empty>{t('patientDetail.noBills')}</Empty> : (
            <div className="list">
              {patient.bills.map(b => (
                <div key={b.id} className="list__row">
                  <span>{b.billNo} · {format(new Date(b.date), 'd MMM yyyy', { locale: dateLocale })}</span>
                  <span className="row gap-8">
                    <span className="muted">{money(b.total)}</span>
                    <Badge tone={b.status === 'PAID' ? 'green' : b.status === 'UNPAID' ? 'amber' : 'gray'}>
                      {t(`enum.billStatus.${b.status}`)}
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
  const { t } = useT()
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState(rec.transcript || '')
  const [copied, setCopied] = useState(false)
  const [audioSrc, setAudioSrc] = useState(null)
  const dur = `${Math.floor(rec.durationSec / 60)}:${String(rec.durationSec % 60).padStart(2, '0')}`

  // <audio> ส่ง header ไม่ได้ จึงขอ "ตั๋ว" อายุ 15 นาทีที่ใช้ได้เฉพาะไฟล์นี้
  useEffect(() => {
    if (!rec.audioFile) return
    let alive = true
    api.get(`/voice-records/${rec.id}/ticket`)
      .then(r => { if (alive) setAudioSrc(`/api/voice-records/${rec.id}/audio?t=${r.data.ticket}`) })
      .catch(() => {})
    return () => { alive = false }
  }, [rec.id, rec.audioFile])

  const copy = () => { navigator.clipboard?.writeText(rec.transcript || ''); setCopied(true); setTimeout(() => setCopied(false), 1500) }
  const saveEdit = async () => { await api.put(`/voice-records/${rec.id}`, { transcript: text }); setEditing(false); onChange?.() }
  const del = async () => { if (!confirm(t('patientDetail.deleteVoiceConfirm'))) return; await api.delete(`/voice-records/${rec.id}`); onChange?.() }

  return (
    <div className="voice-item">
      <div className="voice-item__player">
        {audioSrc && <audio controls preload="none" src={audioSrc} />}
        <span className="voice-item__dur">{dur}</span>
      </div>
      {editing ? (
        <div className="stack-sm">
          <textarea value={text} onChange={e => setText(e.target.value)} rows={3} className="input input--flat" />
          <div className="row row-end gap-12">
            <button onClick={() => { setEditing(false); setText(rec.transcript || '') }} className="link-btn link-btn--muted">{t('common.cancel')}</button>
            <button onClick={saveEdit} className="link-btn medium">{t('common.save')}</button>
          </div>
        </div>
      ) : (
        <>
          {rec.transcript
            ? <p className="voice-item__text">{rec.transcript}</p>
            : <p className="voice-item__empty">{t('patientDetail.noTranscript')}</p>}
          <div className="voice-item__actions">
            <button onClick={copy} className="link-btn link-btn--muted">
              {copied ? <Check size={11} /> : <Copy size={11} />}{copied ? t('common.copied') : t('common.copy')}
            </button>
            <button onClick={() => setEditing(true)} className="link-btn link-btn--muted">{t('patientDetail.editTranscript')}</button>
            <button onClick={del} className="link-btn link-btn--muted ml-auto"><Trash2 size={11} /> {t('common.delete')}</button>
          </div>
        </>
      )}
    </div>
  )
}

// เลขบัตร ปชช. แสดงแบบซ่อน (xxxxxxxxxx111) มีปุ่มตาเปิดดูชั่วคราว
function NationalIdFact({ value }) {
  const { t } = useT()
  const [reveal, setReveal] = useState(false)
  return (
    <div>
      <dt className="fact__label">{t('patientDetail.nationalIdLabel')}</dt>
      <dd className="fact__value row gap-8">
        <span className="mono">{value ? (reveal ? value : maskId(value)) : t('common.dash')}</span>
        {value && (
          <button type="button" onClick={() => setReveal(r => !r)} className="reveal-btn" title={reveal ? t('patientForm.hide') : t('patientForm.show')}>
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
  const { t } = useT()
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
    <Modal open onClose={onClose} title={t('patientDetail.editPatient')} size="xl"
      footer={<>
        <Btn type="button" variant="ghost" onClick={onClose}>{t('common.cancel')}</Btn>
        <Btn type="submit" form="patient-edit-form" disabled={saving}>{saving ? t('common.saving') : t('common.save')}</Btn>
      </>}>
      <form id="patient-edit-form" onSubmit={save}>
        <PatientFields form={form} setForm={setForm} />
      </form>
    </Modal>
  )
}

function ReportModal({ patientId, doctors, appointments, onClose, onSaved }) {
  const { t, dateLocale } = useT()
  const [form, setForm] = useState({ appointmentId: '', doctorId: '', chiefComplaint: '', diagnosis: '', treatment: '', note: '' })
  const [saving, setSaving] = useState(false)
  const set = f => e => setForm(p => ({ ...p, [f]: e.target.value }))
  async function save(e) {
    e.preventDefault(); setSaving(true)
    try { await api.post('/visits', { patientId, ...form }); onSaved() } finally { setSaving(false) }
  }
  return (
    <Modal open onClose={onClose} title={t('patientDetail.visitModalTitle')}>
      <form onSubmit={save} className="stack">
        {appointments.length > 0 && (
          <Field label={t('patientDetail.refAppt')}>
            <select className="input" value={form.appointmentId} onChange={set('appointmentId')}>
              <option value="">{t('patientDetail.noRef')}</option>
              {appointments.map(a => (
                <option key={a.id} value={a.id}>
                  {format(new Date(a.scheduledAt), 'd MMM HH:mm', { locale: dateLocale })} {a.service ? `· ${a.service.name}` : ''}
                </option>
              ))}
            </select>
          </Field>
        )}
        <Field label={t('patientDetail.doctorInCharge')}>
          <select className="input" value={form.doctorId} onChange={set('doctorId')}>
            <option value="">{t('common.unspecified')}</option>
            {doctors.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </Field>
        <Field label={t('patientDetail.chiefComplaint')}><input className="input" value={form.chiefComplaint} onChange={set('chiefComplaint')} /></Field>
        <Field label={t('patientDetail.diagnosis')}><input className="input" value={form.diagnosis} onChange={set('diagnosis')} /></Field>
        <Field label={t('patientDetail.treatment')}><textarea rows={2} className="input" value={form.treatment} onChange={set('treatment')} /></Field>
        <Field label={t('patientDetail.note')}><textarea rows={2} className="input" value={form.note} onChange={set('note')} /></Field>
        <div className="form-actions">
          <Btn type="button" variant="ghost" className="btn--grow" onClick={onClose}>{t('common.cancel')}</Btn>
          <Btn type="submit" disabled={saving} className="btn--grow">{saving ? t('common.saving') : t('common.save')}</Btn>
        </div>
      </form>
    </Modal>
  )
}

function BillModal({ patientId, visitId, services, onClose, onSaved }) {
  const { t } = useT()
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
  const money = n => `${t('common.baht')}${n.toLocaleString()}`

  async function save(e) {
    e.preventDefault(); setSaving(true)
    try { await api.post('/bills', { patientId, visitId, discount, items: lines }); onSaved() } finally { setSaving(false) }
  }
  return (
    <Modal open onClose={onClose} title={t('bills.createTitle')} wide>
      <form onSubmit={save} className="stack">
        <Field label={t('bills.quickAddFrom')}>
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
              <button type="button" onClick={() => rmLine(i)} className="icon-btn icon-btn--danger icon-btn--quiet span-1">×</button>
            </div>
          ))}
        </div>
        <button type="button" onClick={addLine} className="link-btn">{t('bills.addLine')}</button>

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
          <Btn type="submit" disabled={saving} className="btn--grow">{saving ? t('common.saving') : t('bills.saveBill')}</Btn>
        </div>
      </form>
    </Modal>
  )
}

function ViewReportModal({ visit, patient, onClose }) {
  const { t, dateLocale } = useT()
  return (
    <Modal open onClose={onClose} title={t('patientDetail.reportTitle')} wide>
      <div id="report-print" className="stack small">
        <div className="report__head">
          <div>
            <p className="report__brand">{t('nav.appName')}</p>
            <p className="report__meta">
              {t('patientDetail.reportHeading')} · {format(new Date(visit.visitDate), 'd MMMM yyyy', { locale: dateLocale })}
            </p>
          </div>
        </div>
        <Row label={t('patientDetail.rPatient')} value={`${patient.name} (${patient.hn})`} />
        <Row label={t('patientDetail.rDoctor')} value={visit.doctor?.name || '-'} />
        <Row label={t('patientDetail.rComplaint')} value={visit.chiefComplaint || '-'} />
        <Row label={t('patientDetail.rDiagnosis')} value={visit.diagnosis || '-'} />
        <Row label={t('patientDetail.rTreatment')} value={visit.treatment || '-'} />
        <Row label={t('patientDetail.rNote')} value={visit.note || '-'} />
      </div>
      <div className="form-actions mt-16">
        <Btn variant="ghost" className="btn--grow" onClick={onClose}>{t('common.close')}</Btn>
        <Btn className="btn--grow" onClick={() => window.print()}><Printer size={13} /> {t('common.print')}</Btn>
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

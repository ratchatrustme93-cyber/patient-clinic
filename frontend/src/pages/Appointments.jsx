import { Fragment, useEffect, useRef, useState } from 'react'
import { format, addDays, subDays, isSameDay } from 'date-fns'
import { ChevronLeft, ChevronRight, Plus, Trash2, GripVertical, DoorOpen, AlertTriangle, Clock } from 'lucide-react'
import api from '../lib/api'
import { canManage } from '../lib/auth'
import { useT } from '../lib/i18n'
import { PageHeader, Btn, Modal, Field, Card } from '../components/ui'

// tone class ของแต่ละสถานะ · ข้อความอยู่ใน lib/locales (enum.apptStatus)
const STATUS_TONE = {
  SCHEDULED: 'tone-gray', CONFIRMED: 'tone-blue', ARRIVED: 'tone-brand',
  IN_PROGRESS: 'tone-purple', COMPLETED: 'tone-green', CANCELLED: 'tone-quiet', NO_SHOW: 'tone-red',
}
const EMPTY = { patientId: '', doctorId: '', assistantId: '', departmentId: '', serviceId: '', roomId: '', scheduledAt: '', durationMin: 30, note: '', status: 'SCHEDULED' }
const DURATIONS = [15, 30, 45, 60, 90, 120]

// ช่วงเวลาตาราง (ตั้งค่าเองได้ · เก็บใน localStorage) ทีละ 30 นาที
const STEP = 30
const DEFAULT_START = 8 * 60       // 08:00
const DEFAULT_END = 19 * 60 + 30   // 19:30 = แถวสุดท้าย
const minToLabel = t => `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`
const timeToMin = s => { const [h, m] = s.split(':').map(Number); return h * 60 + (m || 0) }
const readMin = (key, def) => { const v = parseInt(localStorage.getItem(key), 10); return Number.isFinite(v) ? v : def }

export default function Appointments() {
  const manage = canManage()
  const { t, dateLocale } = useT()
  const [date, setDate] = useState(new Date())
  const [now, setNow] = useState(new Date())
  const [appts, setAppts] = useState([])
  const [rooms, setRooms] = useState([])
  const [patients, setPatients] = useState([])
  const [doctors, setDoctors] = useState([])
  const [assistants, setAssistants] = useState([])
  const [departments, setDepartments] = useState([])
  const [services, setServices] = useState([])
  const [open, setOpen] = useState(false)
  const [editId, setEditId] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  // room quick-add
  const [roomOpen, setRoomOpen] = useState(false)
  const [roomName, setRoomName] = useState('')
  // pointer drag
  const [dragAppt, setDragAppt] = useState(null)
  const [hoverCell, setHoverCell] = useState(null) // { room, idx }
  const hoverRef = useRef(null)
  const posRef = useRef({ x: 0, y: 0 })
  const ghostRef = useRef(null)
  // time-range settings
  const [startMin, setStartMin] = useState(() => readMin('pc.sched.start', DEFAULT_START))
  const [endMin, setEndMin] = useState(() => readMin('pc.sched.end', DEFAULT_END))
  const slots = []
  for (let t = startMin; t <= endMin; t += STEP) slots.push({ h: Math.floor(t / 60), m: t % 60, label: minToLabel(t) })
  const idxOf = when => Math.floor((when.getHours() * 60 + when.getMinutes() - startMin) / STEP)
  // ตำแหน่งเส้นเวลาปัจจุบัน (แสดงเฉพาะวันนี้ และอยู่ในช่วงตาราง)
  const nowIdxFloat = (now.getHours() * 60 + now.getMinutes() - startMin) / STEP
  const nowRow = Math.floor(nowIdxFloat)
  const showNow = isSameDay(date, now) && nowIdxFloat >= 0 && nowRow < slots.length
  const nowFrac = nowIdxFloat - nowRow
  function setRange(field, timeStr) {
    let min = timeToMin(timeStr)
    if (field === 'start') { min = Math.min(min, endMin - STEP); setStartMin(min); localStorage.setItem('pc.sched.start', min) }
    else { min = Math.max(min, startMin + STEP); setEndMin(min); localStorage.setItem('pc.sched.end', min) }
  }

  const set = f => e => setForm(p => ({ ...p, [f]: e.target.value }))
  const dateStr = format(date, 'yyyy-MM-dd')
  const fetch = () => api.get(`/appointments?date=${dateStr}`).then(r => setAppts(r.data))
  const loadRooms = () => api.get('/master/rooms?activeOnly=1').then(r => setRooms(r.data))
  useEffect(() => { fetch() }, [dateStr])
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 30000); return () => clearInterval(t) }, [])
  useEffect(() => {
    loadRooms()
    api.get('/patients').then(r => setPatients(r.data))
    api.get('/employees?role=DOCTOR&active=1').then(r => setDoctors(r.data))
    api.get('/employees?role=ASSISTANT&active=1').then(r => setAssistants(r.data))
    api.get('/master/departments?activeOnly=1').then(r => setDepartments(r.data))
    api.get('/master/services?activeOnly=1').then(r => setServices(r.data))
  }, [])

  function openCreate() { setEditId(null); setForm({ ...EMPTY, scheduledAt: `${dateStr}T09:00` }); setOpen(true) }
  function openEdit(a) {
    setEditId(a.id)
    setForm({
      patientId: a.patientId, doctorId: a.doctorId || '', assistantId: a.assistantId || '',
      departmentId: a.departmentId || '', serviceId: a.serviceId || '', roomId: a.roomId || '',
      scheduledAt: format(new Date(a.scheduledAt), "yyyy-MM-dd'T'HH:mm"),
      durationMin: a.endAt ? Math.max(15, Math.round((new Date(a.endAt) - new Date(a.scheduledAt)) / 60000)) : 30,
      note: a.note || '', status: a.status,
    })
    setOpen(true)
  }
  function closeModal() { setOpen(false); setEditId(null); setForm(EMPTY) }

  async function save(e) {
    e.preventDefault()
    const when = new Date(form.scheduledAt)
    const c = conflictFor(form.roomId ? +form.roomId : null, when, editId)
    if (c && !warnConflict(c)) return
    setSaving(true)
    const endAt = new Date(when.getTime() + (+form.durationMin || 30) * 60000).toISOString()
    const payload = { ...form, scheduledAt: when.toISOString(), endAt }
    try {
      if (editId) await api.put(`/appointments/${editId}`, payload)
      else await api.post('/appointments', payload)
      closeModal(); fetch()
    } finally { setSaving(false) }
  }
  async function cancelById(id) {
    if (!confirm(t('appointments.cancelConfirm'))) return
    await api.delete(`/appointments/${id}`); closeModal(); fetch()
  }
  async function addRoom(e) {
    e.preventDefault(); if (!roomName.trim()) return
    await api.post('/master/rooms', { name: roomName.trim() })
    setRoomName(''); setRoomOpen(false); loadRooms()
  }

  // หานัดที่ชนกัน: ห้องเดียวกัน + ช่วงเวลา 30 นาทีเดียวกัน (ไม่นับที่ยกเลิก/ตัวเอง)
  function conflictFor(roomId, when, excludeId) {
    if (!roomId || !when || isNaN(when)) return null
    const idx = idxOf(when)
    return appts.find(a =>
      a.id !== excludeId &&
      a.status !== 'CANCELLED' &&
      a.roomId === roomId &&
      isSameDay(new Date(a.scheduledAt), when) &&
      idxOf(new Date(a.scheduledAt)) === idx
    ) || null
  }
  const warnConflict = c => confirm(t('appointments.conflictConfirm', { name: c.patient.name, time: format(new Date(c.scheduledAt), 'HH:mm') }))

  // ── Drag ด้วย window listeners (ทน re-render, ใช้ได้ทั้งเมาส์/ทัช) ──
  function onPointerDown(e, a) {
    if (a.status === 'CANCELLED' || (e.button != null && e.button !== 0)) return
    const start = { x: e.clientX, y: e.clientY, moved: false }
    posRef.current = { x: e.clientX, y: e.clientY }
    hoverRef.current = null

    const move = ev => {
      posRef.current = { x: ev.clientX, y: ev.clientY }
      if (!start.moved && Math.hypot(ev.clientX - start.x, ev.clientY - start.y) < 5) return
      if (ev.cancelable) ev.preventDefault()
      if (!start.moved) { start.moved = true; setDragAppt(a) }
      if (ghostRef.current) ghostRef.current.style.transform = `translate(${ev.clientX + 12}px, ${ev.clientY + 12}px)`
      const el = document.elementFromPoint(ev.clientX, ev.clientY)
      const cell = el?.closest('[data-cell]')
      const next = cell ? { room: cell.dataset.room, idx: +cell.dataset.idx } : null
      hoverRef.current = next
      setHoverCell(prev => (prev?.room === next?.room && prev?.idx === next?.idx ? prev : next))
    }
    const up = async () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', up)
      const hc = hoverRef.current
      const moved = start.moved
      setDragAppt(null); setHoverCell(null)
      if (!moved) { openEdit(a); return }
      if (!hc) return
      const slot = slots[hc.idx]
      const roomId = hc.room === 'none' ? null : +hc.room
      const d = new Date(date); d.setHours(slot.h, slot.m, 0, 0)
      const c = conflictFor(roomId, d, a.id)
      if (c && !warnConflict(c)) return
      const dur = a.endAt ? new Date(a.endAt) - new Date(a.scheduledAt) : null
      const endAt = dur ? new Date(d.getTime() + dur).toISOString() : null
      await api.put(`/appointments/${a.id}`, { scheduledAt: d.toISOString(), endAt, roomId })
      fetch()
    }
    window.addEventListener('pointermove', move, { passive: false })
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)
  }

  const columns = [...rooms.map(r => ({ id: r.id, name: r.name })), { id: null, name: t('appointments.unassignedRoom') }]
  const colKey = id => (id == null ? 'none' : String(id))
  const colIndex = {}
  columns.forEach((c, i) => { colIndex[colKey(c.id)] = i })
  const inRange = []
  const outRange = []
  const startCount = {} // conflict tint: จำนวนนัด active ที่เริ่มในช่องเดียวกัน
  appts.forEach(a => {
    const idx = idxOf(new Date(a.scheduledAt))
    if (idx < 0 || idx >= slots.length) { outRange.push(a); return }
    inRange.push(a)
    if (a.status !== 'CANCELLED') {
      const k = `${colKey(a.roomId)}-${idx}`
      startCount[k] = (startCount[k] || 0) + 1
    }
  })

  const formConflict = open ? conflictFor(form.roomId ? +form.roomId : null, form.scheduledAt ? new Date(form.scheduledAt) : null, editId) : null
  const startD = form.scheduledAt ? new Date(form.scheduledAt) : null
  const endHint = startD && !isNaN(startD)
    ? `${format(startD, 'HH:mm')}–${format(new Date(startD.getTime() + (+form.durationMin || 30) * 60000), 'HH:mm')}`
    : ''

  const renderAppt = a => (
    <div
      key={a.id}
      onPointerDown={e => onPointerDown(e, a)}
      style={{ touchAction: 'none' }}
      title={t('appointments.dragHint')}
      className={`appt ${STATUS_TONE[a.status]}${a.status === 'CANCELLED' ? ' is-locked' : ''}${dragAppt?.id === a.id ? ' is-dragging' : ''}`}
    >
      <GripVertical size={11} className="appt__grip" />
      <div className="grow-min">
        <p className="appt__title truncate">{format(new Date(a.scheduledAt), 'HH:mm')}{a.endAt ? `–${format(new Date(a.endAt), 'HH:mm')}` : ''} · {a.patient.name}</p>
        <p className="appt__detail truncate">{[a.service?.name, a.doctor?.name].filter(Boolean).join(' · ') || t(`enum.apptStatus.${a.status}`)}</p>
      </div>
    </div>
  )

  // เห็นทุกช่วงเวลาในหน้าเดียว: header สูง auto, แถวเวลาแบ่งพื้นที่เท่ากันเต็มความสูง
  const gridStyle = {
    gridTemplateColumns: `64px repeat(${columns.length}, minmax(150px, 1fr))`,
    gridTemplateRows: 'auto',
    gridAutoRows: 'minmax(0, 1fr)',
  }

  return (
    <div className="page page--full">
      <PageHeader title={t('appointments.title')} subtitle={t('appointments.subtitle')}>
        <div className="row gap-8">
          {manage && <Btn variant="ghost" onClick={() => setRoomOpen(true)}><DoorOpen size={14} /> {t('appointments.addRoom')}</Btn>}
          <Btn onClick={openCreate}><Plus size={14} /> {t('appointments.create')}</Btn>
        </div>
      </PageHeader>

      <div className="sched__toolbar">
        <button onClick={() => setDate(d => subDays(d, 1))} className="sched__step"><ChevronLeft size={18} /></button>
        <span className="sched__date">{format(date, 'EEEE d MMMM yyyy', { locale: dateLocale })}</span>
        <button onClick={() => setDate(d => addDays(d, 1))} className="sched__step"><ChevronRight size={18} /></button>
        <button onClick={() => setDate(new Date())} className="sched__today">{t('appointments.today')}</button>

        <div className="sched__range">
          <Clock size={14} />
          <span>{t('appointments.timeRange')}</span>
          <input type="time" step="1800" value={minToLabel(startMin)} onChange={e => setRange('start', e.target.value)} className="time-input" />
          <span>–</span>
          <input type="time" step="1800" value={minToLabel(endMin)} onChange={e => setRange('end', e.target.value)} className="time-input" />
          <span className="sched__count">{t('appointments.summary', { appts: appts.filter(a => a.status !== 'CANCELLED').length, rooms: rooms.length })}</span>
        </div>
      </div>

      {rooms.length === 0 && (
        <div className="alert alert--sm tone-amber mb-12">
          {t('appointments.noRooms', { add: t('appointments.addRoom'), menu: t('appointments.masterRooms') })}
        </div>
      )}

      {outRange.length > 0 && (
        <Card pad="sm" className="mb-12">
          <p className="tiny muted mb-8">{t('appointments.outsideRange', { from: minToLabel(startMin), to: minToLabel(endMin) })}</p>
          <div className="sched__outside">{outRange.map(a => renderAppt(a))}</div>
        </Card>
      )}

      {/* ตาราง ห้อง × เวลา — พอดีหนึ่งหน้าจอ */}
      <Card className="card--fill">
        <div className="sched__grid" style={gridStyle}>
          {/* หัวตาราง */}
          <div style={{ gridColumn: 1, gridRow: 1 }} className="sched__corner">{t('appointments.time')}</div>
          {columns.map((c, ci) => (
            <div key={colKey(c.id)} style={{ gridColumn: ci + 2, gridRow: 1 }}
              className={`sched__col-head${c.id == null ? ' sched__col-head--none' : ''}`}>
              <DoorOpen size={13} />
              <span className="truncate">{c.name}</span>
            </div>
          ))}

          {/* ป้ายเวลา + ช่องว่างสำหรับวางการ์ด */}
          {slots.map((slot, idx) => (
            <Fragment key={idx}>
              <div style={{ gridColumn: 1, gridRow: idx + 2 }}
                className={`sched__time${slot.m === 0 ? ' is-hour' : ''}`}>
                {slot.label}
              </div>
              {columns.map((c, ci) => {
                const ck = colKey(c.id)
                const conflict = ck !== 'none' && (startCount[`${ck}-${idx}`] || 0) >= 2
                const isHover = hoverCell && hoverCell.room === ck && hoverCell.idx === idx
                const state = isHover ? ' is-hover' : conflict ? ' is-conflict' : dragAppt ? ' is-dropzone' : ''
                return (
                  <div key={ck} data-cell data-room={ck} data-idx={idx}
                    style={{ gridColumn: ci + 2, gridRow: idx + 2 }}
                    className={`sched__cell${state}`} />
                )
              })}
            </Fragment>
          ))}

          {/* การ์ดนัด — กินพื้นที่ตั้งแต่เวลาเริ่มถึงเวลาจบ */}
          {inRange.map(a => {
            const s = new Date(a.scheduledAt)
            const startIdx = idxOf(s)
            const ci = colIndex[colKey(a.roomId)]
            if (ci == null) return null
            const durSlots = a.endAt ? Math.max(1, Math.round((new Date(a.endAt) - s) / (STEP * 60000))) : 1
            const span = Math.min(durSlots, slots.length - startIdx)
            const stTone = STATUS_TONE[a.status]
            const end = a.endAt ? new Date(a.endAt) : null
            const timeLabel = format(s, 'HH:mm') + (end ? `–${format(end, 'HH:mm')}` : '')
            const detail = [a.service?.name, a.doctor?.name].filter(Boolean).join(' · ') || t(`enum.apptStatus.${a.status}`)
            return (
              <div key={a.id}
                onPointerDown={e => onPointerDown(e, a)}
                style={{ gridColumn: ci + 2, gridRow: `${startIdx + 2} / span ${span}`, touchAction: 'none', pointerEvents: dragAppt ? 'none' : 'auto', zIndex: 10 }}
                title={`${timeLabel} · ${a.patient.name} · ${detail}`}
                className={`appt appt--block ${stTone}${span >= 2 ? ' is-tall' : ''}${a.status === 'CANCELLED' ? ' is-locked' : ''}${dragAppt?.id === a.id ? ' is-dragging' : ''}`}
              >
                {span >= 2 ? (
                  <>
                    <p className="appt__title truncate">{timeLabel} · {a.patient.name}</p>
                    <p className="appt__detail truncate">{detail}</p>
                    {end && <span className="appt__end">{t('appointments.until', { time: format(end, 'HH:mm') })}</span>}
                  </>
                ) : (
                  <div className="appt__oneline">
                    <span className="appt__title truncate">{format(s, 'HH:mm')} · {a.patient.name}</span>
                    {end && <span className="appt__title no-shrink ml-auto">{t('appointments.until', { time: format(end, 'HH:mm') })}</span>}
                  </div>
                )}
              </div>
            )
          })}

          {/* เส้นเวลาปัจจุบัน (สีแดง) */}
          {showNow && (
            <div className="now-line" style={{ gridRow: nowRow + 2 }}>
              <div className="now-line__inner" style={{ top: `${nowFrac * 100}%` }}>
                <span className="now-line__time">{format(now, 'HH:mm')}</span>
                <div className="now-line__rule" />
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* เงาที่ลากตามเมาส์ */}
      {dragAppt && (
        <div ref={ghostRef} className="drag-ghost"
          style={{ transform: `translate(${posRef.current.x + 10}px, ${posRef.current.y + 10}px)` }}>
          <div className={`drag-ghost__card ${STATUS_TONE[dragAppt.status]}`}>
            {format(new Date(dragAppt.scheduledAt), 'HH:mm')} · {dragAppt.patient.name}
          </div>
        </div>
      )}

      {/* เพิ่มห้องแบบเร็ว */}
      <Modal open={roomOpen} onClose={() => setRoomOpen(false)} title={t('appointments.addRoom')}>
        <form onSubmit={addRoom} className="stack">
          <Field label={t('appointments.roomName')}><input required autoFocus className="input" placeholder={t('appointments.roomNamePlaceholder')} value={roomName} onChange={e => setRoomName(e.target.value)} /></Field>
          <p className="tiny muted">{t('appointments.manageRoomsHint', { menu: t('appointments.masterRooms') })}</p>
          <div className="form-actions">
            <Btn type="button" variant="ghost" className="btn--grow" onClick={() => setRoomOpen(false)}>{t('common.cancel')}</Btn>
            <Btn type="submit" className="btn--grow">{t('appointments.addRoom')}</Btn>
          </div>
        </form>
      </Modal>

      <Modal open={open} onClose={closeModal} title={editId ? t('appointments.editTitle') : t('appointments.newTitle')}>
        <form onSubmit={save} className="stack">
          <Field label={t('appointments.patient')}>
            <select required disabled={!!editId} className="input" value={form.patientId} onChange={set('patientId')}>
              <option value="">{t('appointments.selectPatient')}</option>
              {patients.map(p => <option key={p.id} value={p.id}>{p.name} ({p.hn})</option>)}
            </select>
          </Field>
          <div className="form-grid">
            <Field label={t('appointments.room')}>
              <select className="input" value={form.roomId} onChange={set('roomId')}>
                <option value="">{t('appointments.unassignedRoom')}</option>
                {rooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </Field>
            <Field label={t('appointments.service')}>
              <select className="input" value={form.serviceId} onChange={set('serviceId')}>
                <option value="">{t('common.unspecified')}</option>
                {services.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </Field>
          </div>
          <div className="form-grid">
            <Field label={t('appointments.doctor')}>
              <select className="input" value={form.doctorId} onChange={set('doctorId')}>
                <option value="">{t('common.unspecified')}</option>
                {doctors.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </Field>
            <Field label={t('appointments.assistant')}>
              <select className="input" value={form.assistantId} onChange={set('assistantId')}>
                <option value="">{t('common.unspecified')}</option>
                {assistants.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </Field>
          </div>
          <Field label={t('appointments.startAt')}>
            <input type="datetime-local" required className="input" value={form.scheduledAt} onChange={set('scheduledAt')} />
          </Field>
          <div className="form-grid">
            <Field label={t('appointments.duration')}>
              <select className="input" value={form.durationMin} onChange={set('durationMin')}>
                {DURATIONS.map(m => <option key={m} value={m}>{t('appointments.minutes', { n: m })}</option>)}
              </select>
            </Field>
            <Field label={t('appointments.department')}>
              <select className="input" value={form.departmentId} onChange={set('departmentId')}>
                <option value="">{t('common.unspecified')}</option>
                {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </Field>
          </div>
          {endHint && <p className="tiny text-brand">{t('appointments.rangeHint', { range: endHint })}</p>}
          {formConflict && (
            <div className="alert alert--sm tone-red">
              <AlertTriangle size={14} className="alert__icon" />
              <span>{t('appointments.conflictInline', { name: formConflict.patient.name, time: format(new Date(formConflict.scheduledAt), 'HH:mm') })}</span>
            </div>
          )}
          {editId && (
            <Field label={t('appointments.status')}>
              <select className="input" value={form.status} onChange={set('status')}>
                {Object.keys(STATUS_TONE).map(k => <option key={k} value={k}>{t(`enum.apptStatus.${k}`)}</option>)}
              </select>
            </Field>
          )}
          <Field label={t('appointments.note')}><textarea rows={2} className="input" value={form.note} onChange={set('note')} /></Field>
          <div className="form-actions">
            {editId && <Btn type="button" variant="danger" onClick={() => cancelById(editId)}><Trash2 size={13} /> {t('appointments.cancelAppt')}</Btn>}
            <Btn type="button" variant="ghost" className="btn--grow" onClick={closeModal}>{t('common.close')}</Btn>
            <Btn type="submit" disabled={saving} className="btn--grow">{saving ? t('common.saving') : editId ? t('appointments.saveEdit') : t('appointments.saveNew')}</Btn>
          </div>
        </form>
      </Modal>
    </div>
  )
}

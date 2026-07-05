import { Fragment, useEffect, useRef, useState } from 'react'
import { format, addDays, subDays, isSameDay } from 'date-fns'
import { th } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Plus, Trash2, GripVertical, DoorOpen, AlertTriangle, Clock } from 'lucide-react'
import api from '../lib/api'
import { canManage } from '../lib/auth'
import { PageHeader, Btn, Modal, Field, inputCls, Card } from '../components/ui'

const STATUS = {
  SCHEDULED: ['นัดไว้', 'bg-gray-100 text-gray-600 border-gray-200'],
  CONFIRMED: ['ยืนยัน', 'bg-blue-100 text-blue-700 border-blue-200'],
  ARRIVED: ['มาถึง', 'bg-brand-100 text-brand-700 border-brand-200'],
  IN_PROGRESS: ['กำลังตรวจ', 'bg-purple-100 text-purple-700 border-purple-200'],
  COMPLETED: ['เสร็จ', 'bg-green-100 text-green-700 border-green-200'],
  CANCELLED: ['ยกเลิก', 'bg-gray-50 text-gray-400 border-gray-100'],
  NO_SHOW: ['ไม่มา', 'bg-red-100 text-red-500 border-red-200'],
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
  const [date, setDate] = useState(new Date())
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
  function setRange(field, timeStr) {
    let min = timeToMin(timeStr)
    if (field === 'start') { min = Math.min(min, endMin - STEP); setStartMin(min); localStorage.setItem('pc.sched.start', min) }
    else { min = Math.max(min, startMin + STEP); setEndMin(min); localStorage.setItem('pc.sched.end', min) }
  }

  const set = f => e => setForm(p => ({ ...p, [f]: e.target.value }))
  const dateStr = format(date, 'yyyy-MM-dd')
  const fetch = () => api.get(`/appointments?date=${dateStr}`).then(r => setAppts(r.data))
  const loadRooms = () => api.get('/master/rooms').then(r => setRooms(r.data.filter(x => x.active)))
  useEffect(() => { fetch() }, [dateStr])
  useEffect(() => {
    loadRooms()
    api.get('/patients').then(r => setPatients(r.data))
    api.get('/employees?role=DOCTOR&active=1').then(r => setDoctors(r.data))
    api.get('/employees?role=ASSISTANT&active=1').then(r => setAssistants(r.data))
    api.get('/master/departments').then(r => setDepartments(r.data))
    api.get('/master/services').then(r => setServices(r.data))
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
    if (!confirm('ยกเลิกนัดนี้?')) return
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
  const warnConflict = c => confirm(`⚠️ ห้องนี้มีนัดของ ${c.patient.name} เวลา ${format(new Date(c.scheduledAt), 'HH:mm')} อยู่แล้ว\nยืนยันจองซ้อนหรือไม่?`)

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

  const columns = [...rooms.map(r => ({ id: r.id, name: r.name })), { id: null, name: 'ยังไม่จัดห้อง' }]
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
    ? `${format(startD, 'HH:mm')}–${format(new Date(startD.getTime() + (+form.durationMin || 30) * 60000), 'HH:mm')} น.`
    : ''

  const renderAppt = a => (
    <div
      key={a.id}
      onPointerDown={e => onPointerDown(e, a)}
      style={{ touchAction: 'none' }}
      title="กดค้างแล้วลากเพื่อย้าย · แตะเพื่อแก้ไข"
      className={`select-none text-[11px] rounded-md border px-1.5 py-0.5 flex items-start gap-1 ${a.status === 'CANCELLED' ? 'cursor-pointer' : 'cursor-grab active:cursor-grabbing'} ${STATUS[a.status][1]} ${dragAppt?.id === a.id ? 'opacity-30' : 'hover:shadow-sm'}`}
    >
      <GripVertical size={11} className="mt-0.5 opacity-40 flex-shrink-0" />
      <div className="min-w-0 leading-tight">
        <p className="font-medium truncate">{format(new Date(a.scheduledAt), 'HH:mm')}{a.endAt ? `–${format(new Date(a.endAt), 'HH:mm')}` : ''} · {a.patient.name}</p>
        <p className="truncate opacity-70">{[a.service?.name, a.doctor?.name].filter(Boolean).join(' · ') || STATUS[a.status][0]}</p>
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
    <div className="p-6 mx-auto max-w-full h-full flex flex-col">
      <PageHeader title="ตารางนัด" subtitle="กดค้างที่การ์ดแล้วลากไปวางช่อง ห้อง × เวลา · แตะการ์ดเพื่อแก้ไข">
        <div className="flex gap-2">
          {manage && <Btn variant="ghost" onClick={() => setRoomOpen(true)}><DoorOpen size={14} className="inline mr-1" /> เพิ่มห้อง</Btn>}
          <Btn onClick={openCreate}><Plus size={14} className="inline mr-1" /> สร้างนัด</Btn>
        </div>
      </PageHeader>

      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <button onClick={() => setDate(d => subDays(d, 1))} className="p-1.5 hover:bg-gray-100 rounded-lg"><ChevronLeft size={18} /></button>
        <span className="font-medium text-gray-800">{format(date, 'EEEE d MMMM yyyy', { locale: th })}</span>
        <button onClick={() => setDate(d => addDays(d, 1))} className="p-1.5 hover:bg-gray-100 rounded-lg"><ChevronRight size={18} /></button>
        <button onClick={() => setDate(new Date())} className="text-xs px-2 py-1 bg-gray-100 rounded text-gray-500 hover:bg-gray-200">วันนี้</button>

        <div className="ml-auto flex items-center gap-2 text-xs text-gray-500">
          <Clock size={14} className="text-gray-400" />
          <span>ช่วงเวลา</span>
          <input type="time" step="1800" value={minToLabel(startMin)} onChange={e => setRange('start', e.target.value)}
            className="border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-brand-300" />
          <span className="text-gray-400">–</span>
          <input type="time" step="1800" value={minToLabel(endMin)} onChange={e => setRange('end', e.target.value)}
            className="border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-brand-300" />
          <span className="text-gray-300 ml-1 hidden md:inline">· {appts.filter(a => a.status !== 'CANCELLED').length} นัด · {rooms.length} ห้อง</span>
        </div>
      </div>

      {rooms.length === 0 && (
        <div className="mb-3 text-sm text-amber-700 bg-amber-50 border border-amber-100 rounded-xl px-4 py-2">
          ยังไม่มีห้อง — กด <span className="font-medium">เพิ่มห้อง</span> ด้านบน หรือที่เมนู <span className="font-medium">ข้อมูลหลัก → ห้อง</span>
        </div>
      )}

      {outRange.length > 0 && (
        <Card className="p-3 mb-3">
          <p className="text-xs text-gray-400 mb-2">นอกช่วง {minToLabel(startMin)}–{minToLabel(endMin)} (ลากลงตารางเพื่อจัดเวลา)</p>
          <div className="grid sm:grid-cols-3 gap-2">{outRange.map(a => renderAppt(a))}</div>
        </Card>
      )}

      {/* Room × time grid — fits one screen */}
      <Card className="flex-1 min-h-0 overflow-auto">
        <div className="grid min-w-max h-full" style={gridStyle}>
          {/* header */}
          <div style={{ gridColumn: 1, gridRow: 1 }} className="sticky top-0 left-0 z-30 bg-white border-b-2 border-r border-gray-200 px-2 py-1.5 text-xs text-gray-400">เวลา</div>
          {columns.map((c, ci) => (
            <div key={colKey(c.id)} style={{ gridColumn: ci + 2, gridRow: 1 }} className="sticky top-0 z-20 bg-white border-b-2 border-r border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-700 flex items-center gap-1.5">
              <DoorOpen size={13} className={c.id == null ? 'text-gray-300' : 'text-brand-500'} />
              <span className="truncate">{c.name}</span>
            </div>
          ))}

          {/* time labels + empty background cells (drop targets) */}
          {slots.map((slot, idx) => {
            const onHour = slot.m === 0
            const rowBorder = onHour ? 'border-gray-200' : 'border-gray-100'
            return (
              <Fragment key={idx}>
                <div style={{ gridColumn: 1, gridRow: idx + 2 }}
                  className={`sticky left-0 z-20 bg-white border-b border-r border-gray-100 px-2 py-1 text-xs flex items-center ${onHour ? 'text-gray-500 font-medium' : 'text-gray-300'}`}>
                  {slot.label}
                </div>
                {columns.map((c, ci) => {
                  const ck = colKey(c.id)
                  const conflict = ck !== 'none' && (startCount[`${ck}-${idx}`] || 0) >= 2
                  const isHover = hoverCell && hoverCell.room === ck && hoverCell.idx === idx
                  return (
                    <div key={ck} data-cell data-room={ck} data-idx={idx}
                      style={{ gridColumn: ci + 2, gridRow: idx + 2 }}
                      className={`border-b border-r ${rowBorder} border-r-gray-100 transition-colors
                        ${isHover ? 'bg-brand-100 ring-2 ring-brand-400 ring-inset'
                          : conflict ? 'bg-red-50/70 ring-1 ring-red-200 ring-inset'
                          : dragAppt ? 'bg-brand-50/40' : ''}`} />
                  )
                })}
              </Fragment>
            )
          })}

          {/* appointment blocks — span from start time to end time */}
          {inRange.map(a => {
            const s = new Date(a.scheduledAt)
            const startIdx = idxOf(s)
            const ci = colIndex[colKey(a.roomId)]
            if (ci == null) return null
            const durSlots = a.endAt ? Math.max(1, Math.round((new Date(a.endAt) - s) / (STEP * 60000))) : 1
            const span = Math.min(durSlots, slots.length - startIdx)
            const st = STATUS[a.status]
            const timeLabel = format(s, 'HH:mm') + (a.endAt ? `–${format(new Date(a.endAt), 'HH:mm')}` : '')
            const detail = [a.service?.name, a.doctor?.name].filter(Boolean).join(' · ') || st[0]
            return (
              <div key={a.id}
                onPointerDown={e => onPointerDown(e, a)}
                style={{ gridColumn: ci + 2, gridRow: `${startIdx + 2} / span ${span}`, touchAction: 'none', pointerEvents: dragAppt ? 'none' : 'auto', zIndex: 10 }}
                title={`${timeLabel} · ${a.patient.name} · ${detail}`}
                className={`relative mx-[2px] my-px rounded-md border px-1.5 py-0.5 text-[11px] leading-tight overflow-hidden select-none flex flex-col ${span >= 2 ? 'justify-start' : 'justify-center'} ${a.status === 'CANCELLED' ? 'cursor-pointer' : 'cursor-grab active:cursor-grabbing'} ${st[1]} ${dragAppt?.id === a.id ? 'opacity-30' : 'hover:shadow-md'}`}
              >
                <p className="font-medium truncate">{timeLabel} · {a.patient.name}</p>
                {span >= 2 && <p className="truncate opacity-70">{detail}</p>}
                {span >= 2 && a.endAt && (
                  <span className="absolute bottom-0.5 right-1.5 text-[10px] font-medium opacity-70 pointer-events-none">ถึง {format(new Date(a.endAt), 'HH:mm')}</span>
                )}
              </div>
            )
          })}
        </div>
      </Card>

      {/* drag ghost */}
      {dragAppt && (
        <div ref={ghostRef} className="fixed top-0 left-0 z-50 pointer-events-none"
          style={{ transform: `translate(${posRef.current.x + 10}px, ${posRef.current.y + 10}px)` }}>
          <div className={`text-xs rounded-md border px-2 py-1.5 shadow-lg ${STATUS[dragAppt.status][1]}`}>
            <p className="font-medium">{format(new Date(dragAppt.scheduledAt), 'HH:mm')} · {dragAppt.patient.name}</p>
          </div>
        </div>
      )}

      {/* Quick add room */}
      <Modal open={roomOpen} onClose={() => setRoomOpen(false)} title="เพิ่มห้อง">
        <form onSubmit={addRoom} className="space-y-3">
          <Field label="ชื่อห้อง *"><input required autoFocus className={inputCls} placeholder="เช่น ห้องตรวจ 3" value={roomName} onChange={e => setRoomName(e.target.value)} /></Field>
          <p className="text-xs text-gray-400">จัดการห้องทั้งหมด (แก้ไข/ลบ) ได้ที่ <span className="font-medium">ข้อมูลหลัก → ห้อง</span></p>
          <div className="flex gap-2 pt-1">
            <Btn type="button" variant="ghost" className="flex-1" onClick={() => setRoomOpen(false)}>ยกเลิก</Btn>
            <Btn type="submit" className="flex-1">เพิ่มห้อง</Btn>
          </div>
        </form>
      </Modal>

      <Modal open={open} onClose={closeModal} title={editId ? 'แก้ไขนัดหมาย' : 'สร้างนัดหมาย'}>
        <form onSubmit={save} className="space-y-3">
          <Field label="คนไข้ *">
            <select required disabled={!!editId} className={inputCls + (editId ? ' bg-gray-50 text-gray-400' : '')} value={form.patientId} onChange={set('patientId')}>
              <option value="">เลือกคนไข้...</option>
              {patients.map(p => <option key={p.id} value={p.id}>{p.name} ({p.hn})</option>)}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="ห้อง">
              <select className={inputCls} value={form.roomId} onChange={set('roomId')}>
                <option value="">ยังไม่จัดห้อง</option>
                {rooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </Field>
            <Field label="บริการ">
              <select className={inputCls} value={form.serviceId} onChange={set('serviceId')}>
                <option value="">ไม่ระบุ</option>
                {services.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="แพทย์">
              <select className={inputCls} value={form.doctorId} onChange={set('doctorId')}>
                <option value="">ไม่ระบุ</option>
                {doctors.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </Field>
            <Field label="ผู้ช่วยแพทย์">
              <select className={inputCls} value={form.assistantId} onChange={set('assistantId')}>
                <option value="">ไม่ระบุ</option>
                {assistants.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </Field>
          </div>
          <Field label="วันเวลาเริ่ม *">
            <input type="datetime-local" required className={inputCls} value={form.scheduledAt} onChange={set('scheduledAt')} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="ระยะเวลา">
              <select className={inputCls} value={form.durationMin} onChange={set('durationMin')}>
                {DURATIONS.map(m => <option key={m} value={m}>{m} นาที</option>)}
              </select>
            </Field>
            <Field label="แผนก">
              <select className={inputCls} value={form.departmentId} onChange={set('departmentId')}>
                <option value="">ไม่ระบุ</option>
                {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </Field>
          </div>
          {endHint && <p className="text-xs text-brand-600">ช่วงเวลา {endHint}</p>}
          {formConflict && (
            <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2 flex items-start gap-1.5">
              <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
              <span>ห้องนี้มีนัดของ <b>{formConflict.patient.name}</b> เวลา {format(new Date(formConflict.scheduledAt), 'HH:mm')} อยู่แล้ว — จองซ้อนได้ แต่จะถามยืนยันก่อนบันทึก</span>
            </div>
          )}
          {editId && (
            <Field label="สถานะ">
              <select className={inputCls} value={form.status} onChange={set('status')}>
                {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v[0]}</option>)}
              </select>
            </Field>
          )}
          <Field label="หมายเหตุ"><textarea rows={2} className={inputCls} value={form.note} onChange={set('note')} /></Field>
          <div className="flex gap-2 pt-2">
            {editId && <Btn type="button" variant="danger" onClick={() => cancelById(editId)}><Trash2 size={13} className="inline mr-1" /> ยกเลิกนัด</Btn>}
            <Btn type="button" variant="ghost" className="flex-1" onClick={closeModal}>ปิด</Btn>
            <Btn type="submit" disabled={saving} className="flex-1">{saving ? 'กำลังบันทึก...' : editId ? 'บันทึกการแก้ไข' : 'บันทึกนัด'}</Btn>
          </div>
        </form>
      </Modal>
    </div>
  )
}

import { useState, useRef, useEffect } from 'react'
import { Camera, Upload, X, RotateCcw, Eye, EyeOff } from 'lucide-react'
import { Field, TagInput } from './ui'

export const TITLES = ['นาย', 'นาง', 'นางสาว', 'เด็กชาย', 'เด็กหญิง', 'อื่นๆ']
export const MARITAL = ['โสด', 'สมรส', 'หย่า', 'หม้าย']
export const INSURANCE = ['เงินสด', 'ประกันสังคม', 'บัตรทอง (30 บาท)', 'ประกันสุขภาพ', 'ข้าราชการ/รัฐวิสาหกิจ']

// ค่าเริ่มต้นของฟอร์มคนไข้ — ใช้ทั้งหน้าเพิ่มและแก้ไข
export const EMPTY_PATIENT = {
  title: '', name: '', nationalId: '', photo: '', gender: '', birthdate: '',
  nationality: 'ไทย', religion: '', maritalStatus: '', occupation: '',
  phone: '', email: '', address: '', bloodType: '', weight: '', height: '', insurance: '',
  allergies: '', chronic: '', emergencyName: '', emergencyPhone: '', emergencyRelation: '', note: '',
}

// ซ่อนเลขบัตร เหลือ 4 ตัวท้าย → xxxxxxxxx2311
export function maskId(id) {
  const s = (id || '').replace(/\D/g, '')
  if (s.length <= 4) return s
  return 'x'.repeat(s.length - 4) + s.slice(-4)
}

// ถ่ายรูปคนไข้ด้วยกล้อง (มี fallback อัปโหลดไฟล์) · เก็บเป็น base64 data URL
export function PhotoCapture({ value, onChange }) {
  const [stream, setStream] = useState(null)
  const [err, setErr] = useState('')
  const videoRef = useRef(null)

  const stop = () => {
    setStream(s => { s?.getTracks().forEach(t => t.stop()); return null })
  }
  // ผูก stream เข้ากับ <video> หลัง element ถูก mount แล้ว (กันปัญหา ref ยังไม่พร้อม)
  useEffect(() => {
    const v = videoRef.current
    if (v && stream) {
      v.srcObject = stream
      v.play().catch(() => {})
    }
  }, [stream])
  useEffect(() => stop, []) // ปิดกล้องเมื่อ unmount

  async function start() {
    setErr('')
    if (!navigator.mediaDevices?.getUserMedia) {
      setErr('เบราว์เซอร์นี้ไม่รองรับกล้อง หรือหน้าเว็บไม่ใช่ https/localhost')
      return
    }
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } })
      setStream(s)
    } catch (e) {
      const msg = e.name === 'NotAllowedError' ? 'ถูกปฏิเสธสิทธิ์ — กดอนุญาตกล้องที่แถบ address bar'
        : e.name === 'NotFoundError' ? 'ไม่พบกล้องบนเครื่องนี้'
        : e.name === 'NotReadableError' ? 'กล้องถูกโปรแกรมอื่นใช้งานอยู่'
        : `เปิดกล้องไม่ได้ (${e.name || 'ข้อผิดพลาด'})`
      setErr(msg)
    }
  }

  function capture() {
    const v = videoRef.current
    if (!v || !v.videoWidth) { setErr('กล้องยังไม่พร้อม รอสักครู่แล้วลองใหม่'); return }
    const canvas = document.createElement('canvas')
    canvas.width = v.videoWidth
    canvas.height = v.videoHeight
    canvas.getContext('2d').drawImage(v, 0, 0)
    onChange(canvas.toDataURL('image/jpeg', 0.8))
    stop()
  }

  function onFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => onChange(reader.result)
    reader.readAsDataURL(file)
  }

  return (
    <div className="photo">
      <div className="photo__frame">
        {stream
          ? <video ref={videoRef} autoPlay playsInline muted />
          : value
            ? <img src={value} alt="รูปคนไข้" />
            : <Camera size={28} />}
      </div>
      <div className="photo__actions">
        {stream ? (
          <>
            <button type="button" onClick={capture} className="btn btn--primary btn--sm"><Camera size={14} /> ถ่ายภาพ</button>
            <button type="button" onClick={stop} className="link-btn link-btn--muted">ยกเลิก</button>
          </>
        ) : value ? (
          <>
            <button type="button" onClick={start} className="btn btn--ghost btn--sm"><RotateCcw size={14} /> ถ่ายใหม่</button>
            <button type="button" onClick={() => onChange('')} className="link-btn text-danger"><X size={12} /> ลบรูป</button>
          </>
        ) : (
          <>
            <button type="button" onClick={start} className="btn btn--primary btn--sm"><Camera size={14} /> เปิดกล้อง</button>
            <label className="btn btn--ghost btn--sm is-clickable">
              <Upload size={14} /> อัปโหลด
              <input type="file" accept="image/*" className="file-input" onChange={onFile} />
            </label>
          </>
        )}
        {err && <p className="photo__error">{err}</p>}
      </div>
    </div>
  )
}

// เลขบัตรประชาชน 13 หลัก · ปิดตา = แสดงแบบ xxxxxxxxx2311 (แต่ยังพิมพ์ได้) · เปิดตา = เห็นตัวเลขเต็ม
export function NationalIdInput({ value, onChange }) {
  const [reveal, setReveal] = useState(false)
  return (
    <div className="input-affix">
      <input
        className="input input--mono"
        inputMode="numeric"
        placeholder="เลข 13 หลัก"
        value={reveal ? value : maskId(value)}
        onChange={e => { if (reveal) onChange(e.target.value.replace(/\D/g, '').slice(0, 13)) }}
        onKeyDown={e => {
          if (reveal) return
          // ตอนซ่อน: จัดการพิมพ์เองแบบต่อท้าย เพื่อให้ display ยังเป็น xxxx...เลขท้าย
          if (e.key === 'Backspace') { e.preventDefault(); onChange(value.slice(0, -1)) }
          else if (/^[0-9]$/.test(e.key)) { e.preventDefault(); if (value.length < 13) onChange(value + e.key) }
        }}
        onPaste={e => {
          if (reveal) return
          e.preventDefault()
          onChange((value + e.clipboardData.getData('text')).replace(/\D/g, '').slice(0, 13))
        }}
      />
      <button type="button" onClick={() => setReveal(r => !r)} title={reveal ? 'ซ่อน' : 'แสดง'} className="input-affix__btn">
        {reveal ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  )
}

// ชุด field คนไข้ทั้งหมด (ไม่รวมปุ่ม submit) — ใช้ร่วมกันระหว่างฟอร์มเพิ่ม/แก้ไข
export function PatientFields({ form, setForm }) {
  const set = f => e => setForm(p => ({ ...p, [f]: e.target.value }))
  const setV = (f, v) => setForm(p => ({ ...p, [f]: v }))
  return (
    <div>
      {/* ข้อมูลส่วนตัว */}
      <div className="form-section">
        <p className="form-section__title">ข้อมูลส่วนตัว</p>
        <div className="row row-top gap-16 wrap">
          <PhotoCapture value={form.photo} onChange={v => setV('photo', v)} />
          <div className="form-grid grow">
            <Field label="คำนำหน้า">
              <select className="input" value={form.title} onChange={set('title')}>
                <option value="">—</option>
                {TITLES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </Field>
            <Field label="ชื่อ-นามสกุล *"><input required className="input" value={form.name} onChange={set('name')} /></Field>
            <div className="form-grid__wide">
              <Field label="เลขบัตรประชาชน (13 หลัก)"><NationalIdInput value={form.nationalId} onChange={v => setV('nationalId', v)} /></Field>
            </div>
          </div>
        </div>
        <div className="form-grid form-grid--md3 mt-12">
          <Field label="เพศ">
            <select className="input" value={form.gender} onChange={set('gender')}>
              <option value="">ไม่ระบุ</option><option value="MALE">ชาย</option><option value="FEMALE">หญิง</option><option value="OTHER">อื่นๆ</option>
            </select>
          </Field>
          <Field label="วันเกิด"><input type="date" className="input" value={form.birthdate} onChange={set('birthdate')} /></Field>
          <Field label="สัญชาติ"><input className="input" value={form.nationality} onChange={set('nationality')} /></Field>
          <Field label="ศาสนา"><input className="input" value={form.religion} onChange={set('religion')} placeholder="พุทธ, อิสลาม..." /></Field>
          <Field label="สถานภาพ">
            <select className="input" value={form.maritalStatus} onChange={set('maritalStatus')}>
              <option value="">—</option>
              {MARITAL.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </Field>
          <Field label="อาชีพ"><input className="input" value={form.occupation} onChange={set('occupation')} /></Field>
        </div>
      </div>

      {/* ข้อมูลติดต่อ */}
      <div className="form-section">
        <p className="form-section__title">ข้อมูลติดต่อ</p>
        <div className="form-grid form-grid--md3">
          <Field label="เบอร์โทร"><input className="input" value={form.phone} onChange={set('phone')} /></Field>
          <Field label="อีเมล"><input type="email" className="input" value={form.email} onChange={set('email')} /></Field>
          <div className="form-grid__wide"><Field label="ที่อยู่"><input className="input" value={form.address} onChange={set('address')} /></Field></div>
        </div>
      </div>

      {/* ข้อมูลสุขภาพ */}
      <div className="form-section">
        <p className="form-section__title">ข้อมูลสุขภาพ</p>
        <div className="form-grid form-grid--md3">
          <Field label="กรุ๊ปเลือด"><input className="input" value={form.bloodType} onChange={set('bloodType')} placeholder="A, B, O, AB" /></Field>
          <Field label="น้ำหนัก (กก.)"><input type="number" step="0.1" className="input" value={form.weight} onChange={set('weight')} /></Field>
          <Field label="ส่วนสูง (ซม.)"><input type="number" step="0.1" className="input" value={form.height} onChange={set('height')} /></Field>
          <Field label="สิทธิการรักษา">
            <select className="input" value={form.insurance} onChange={set('insurance')}>
              <option value="">—</option>
              {INSURANCE.map(i => <option key={i} value={i}>{i}</option>)}
            </select>
          </Field>
          <Field label="แพ้ยา/สาร (คั่นด้วย ,)"><TagInput value={form.allergies} onChange={v => setV('allergies', v)} placeholder="เช่น Penicillin" /></Field>
          <Field label="โรคประจำตัว (คั่นด้วย ,)"><TagInput value={form.chronic} onChange={v => setV('chronic', v)} placeholder="เช่น เบาหวาน" /></Field>
        </div>
      </div>

      {/* ผู้ติดต่อกรณีฉุกเฉิน */}
      <div className="form-section">
        <p className="form-section__title">ผู้ติดต่อกรณีฉุกเฉิน</p>
        <div className="form-grid form-grid--md3">
          <Field label="ชื่อ-นามสกุล"><input className="input" value={form.emergencyName} onChange={set('emergencyName')} /></Field>
          <Field label="ความสัมพันธ์"><input className="input" value={form.emergencyRelation} onChange={set('emergencyRelation')} placeholder="บิดา, มารดา, คู่สมรส..." /></Field>
          <Field label="เบอร์โทร"><input className="input" value={form.emergencyPhone} onChange={set('emergencyPhone')} /></Field>
        </div>
      </div>

      <div className="form-section">
        <Field label="หมายเหตุ"><textarea rows={2} className="input" value={form.note} onChange={set('note')} /></Field>
      </div>
    </div>
  )
}

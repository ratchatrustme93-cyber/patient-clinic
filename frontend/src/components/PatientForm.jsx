import { useState, useRef, useEffect } from 'react'
import { Camera, Upload, X, RotateCcw, Eye, EyeOff } from 'lucide-react'
import { Field, inputCls, TagInput } from './ui'

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

// ซ่อนเลขบัตร เหลือ 3 ตัวท้าย → xxxxxxxxxx111
export function maskId(id) {
  const s = (id || '').replace(/\D/g, '')
  if (s.length <= 3) return s
  return 'x'.repeat(s.length - 3) + s.slice(-3)
}

// ถ่ายรูปคนไข้ด้วยกล้อง (มี fallback อัปโหลดไฟล์) · เก็บเป็น base64 data URL
export function PhotoCapture({ value, onChange }) {
  const [streaming, setStreaming] = useState(false)
  const [err, setErr] = useState('')
  const videoRef = useRef(null)
  const streamRef = useRef(null)

  const stop = () => {
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
    setStreaming(false)
  }
  useEffect(() => stop, []) // ปิดกล้องเมื่อ unmount

  async function start() {
    setErr('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } })
      streamRef.current = stream
      setStreaming(true)
      requestAnimationFrame(() => { if (videoRef.current) videoRef.current.srcObject = stream })
    } catch {
      setErr('เปิดกล้องไม่ได้ — ตรวจสอบสิทธิ์การใช้กล้องของเบราว์เซอร์')
    }
  }

  function capture() {
    const v = videoRef.current
    if (!v || !v.videoWidth) return
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
    <div className="flex items-start gap-4">
      <div className="w-28 h-28 rounded-xl bg-gray-100 border border-gray-200 overflow-hidden flex items-center justify-center flex-shrink-0">
        {streaming
          ? <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
          : value
            ? <img src={value} alt="รูปคนไข้" className="w-full h-full object-cover" />
            : <Camera size={28} className="text-gray-400" />}
      </div>
      <div className="flex flex-col gap-2">
        {streaming ? (
          <>
            <button type="button" onClick={capture} className="px-3 py-1.5 rounded-lg bg-brand-600 text-white text-sm hover:bg-brand-700 inline-flex items-center gap-1.5"><Camera size={14} /> ถ่ายภาพ</button>
            <button type="button" onClick={stop} className="text-xs text-gray-500 hover:text-gray-700">ยกเลิก</button>
          </>
        ) : value ? (
          <>
            <button type="button" onClick={start} className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 inline-flex items-center gap-1.5"><RotateCcw size={14} /> ถ่ายใหม่</button>
            <button type="button" onClick={() => onChange('')} className="text-xs text-red-500 hover:underline inline-flex items-center gap-1"><X size={12} /> ลบรูป</button>
          </>
        ) : (
          <>
            <button type="button" onClick={start} className="px-3 py-1.5 rounded-lg bg-brand-600 text-white text-sm hover:bg-brand-700 inline-flex items-center gap-1.5"><Camera size={14} /> เปิดกล้อง</button>
            <label className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 inline-flex items-center gap-1.5 cursor-pointer">
              <Upload size={14} /> อัปโหลด
              <input type="file" accept="image/*" className="hidden" onChange={onFile} />
            </label>
          </>
        )}
        {err && <p className="text-xs text-red-500 max-w-[170px]">{err}</p>}
      </div>
    </div>
  )
}

// เลขบัตรประชาชน 13 หลัก · พิมพ์ปกติ + ปุ่มตาเพื่อซ่อน/แสดง (ค่าเริ่มต้น: มีข้อมูลอยู่แล้ว = ซ่อน)
export function NationalIdInput({ value, onChange }) {
  const [reveal, setReveal] = useState(!value)
  return (
    <div className="relative">
      <input
        className={inputCls + ' pr-9 font-mono tracking-wider'}
        inputMode="numeric"
        placeholder="เลข 13 หลัก"
        value={reveal ? value : maskId(value)}
        readOnly={!reveal}
        onChange={e => reveal && onChange(e.target.value.replace(/\D/g, '').slice(0, 13))}
      />
      <button type="button" onClick={() => setReveal(r => !r)} title={reveal ? 'ซ่อน' : 'แสดง'}
        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
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
    <div className="space-y-4">
      <PhotoCapture value={form.photo} onChange={v => setV('photo', v)} />

      <div className="grid grid-cols-3 gap-3">
        <Field label="คำนำหน้า">
          <select className={inputCls} value={form.title} onChange={set('title')}>
            <option value="">—</option>
            {TITLES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </Field>
        <div className="col-span-2">
          <Field label="ชื่อ-นามสกุล *"><input required className={inputCls} value={form.name} onChange={set('name')} /></Field>
        </div>
      </div>

      <Field label="เลขบัตรประชาชน (13 หลัก)">
        <NationalIdInput value={form.nationalId} onChange={v => setV('nationalId', v)} />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="เพศ">
          <select className={inputCls} value={form.gender} onChange={set('gender')}>
            <option value="">ไม่ระบุ</option><option value="MALE">ชาย</option><option value="FEMALE">หญิง</option><option value="OTHER">อื่นๆ</option>
          </select>
        </Field>
        <Field label="วันเกิด"><input type="date" className={inputCls} value={form.birthdate} onChange={set('birthdate')} /></Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="สัญชาติ"><input className={inputCls} value={form.nationality} onChange={set('nationality')} /></Field>
        <Field label="ศาสนา"><input className={inputCls} value={form.religion} onChange={set('religion')} placeholder="พุทธ, อิสลาม, คริสต์..." /></Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="สถานภาพ">
          <select className={inputCls} value={form.maritalStatus} onChange={set('maritalStatus')}>
            <option value="">—</option>
            {MARITAL.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </Field>
        <Field label="อาชีพ"><input className={inputCls} value={form.occupation} onChange={set('occupation')} /></Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="เบอร์โทร"><input className={inputCls} value={form.phone} onChange={set('phone')} /></Field>
        <Field label="อีเมล"><input type="email" className={inputCls} value={form.email} onChange={set('email')} /></Field>
      </div>
      <Field label="ที่อยู่"><input className={inputCls} value={form.address} onChange={set('address')} /></Field>

      <div className="grid grid-cols-3 gap-3">
        <Field label="กรุ๊ปเลือด"><input className={inputCls} value={form.bloodType} onChange={set('bloodType')} placeholder="A, B, O, AB" /></Field>
        <Field label="น้ำหนัก (กก.)"><input type="number" step="0.1" className={inputCls} value={form.weight} onChange={set('weight')} /></Field>
        <Field label="ส่วนสูง (ซม.)"><input type="number" step="0.1" className={inputCls} value={form.height} onChange={set('height')} /></Field>
      </div>

      <Field label="สิทธิการรักษา">
        <select className={inputCls} value={form.insurance} onChange={set('insurance')}>
          <option value="">—</option>
          {INSURANCE.map(i => <option key={i} value={i}>{i}</option>)}
        </select>
      </Field>

      <Field label="ประวัติแพ้ยา/สาร (คั่นด้วย ,)"><TagInput value={form.allergies} onChange={v => setV('allergies', v)} placeholder="เช่น Penicillin, Aspirin" /></Field>
      <Field label="โรคประจำตัว (คั่นด้วย ,)"><TagInput value={form.chronic} onChange={v => setV('chronic', v)} placeholder="เช่น เบาหวาน, ไขมัน, หัวใจ" /></Field>

      <div className="pt-3 border-t border-gray-100">
        <p className="text-sm font-medium text-gray-700 mb-2">ผู้ติดต่อกรณีฉุกเฉิน</p>
        <div className="grid grid-cols-2 gap-3">
          <Field label="ชื่อ-นามสกุล"><input className={inputCls} value={form.emergencyName} onChange={set('emergencyName')} /></Field>
          <Field label="ความสัมพันธ์"><input className={inputCls} value={form.emergencyRelation} onChange={set('emergencyRelation')} placeholder="บิดา, มารดา, คู่สมรส..." /></Field>
        </div>
        <div className="mt-3"><Field label="เบอร์โทร"><input className={inputCls} value={form.emergencyPhone} onChange={set('emergencyPhone')} /></Field></div>
      </div>

      <Field label="หมายเหตุ"><textarea rows={2} className={inputCls} value={form.note} onChange={set('note')} /></Field>
    </div>
  )
}

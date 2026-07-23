import { useState, useRef, useEffect } from 'react'
import { Camera, Upload, X, RotateCcw, Eye, EyeOff } from 'lucide-react'
import { useT } from '../lib/i18n'
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
  const { t } = useT()
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
      setErr(t('patientForm.cameraUnsupported'))
      return
    }
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } })
      setStream(s)
    } catch (e) {
      setErr(
        e.name === 'NotAllowedError' ? t('patientForm.cameraDenied')
          : e.name === 'NotFoundError' ? t('patientForm.cameraNotFound')
            : e.name === 'NotReadableError' ? t('patientForm.cameraBusy')
              : t('patientForm.cameraError', { name: e.name || '' })
      )
    }
  }

  function capture() {
    const v = videoRef.current
    if (!v || !v.videoWidth) { setErr(t('patientForm.cameraNotReady')); return }
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
            ? <img src={value} alt={t('patientForm.photoAlt')} />
            : <Camera size={28} />}
      </div>
      <div className="photo__actions">
        {stream ? (
          <>
            <button type="button" onClick={capture} className="btn btn--primary btn--sm"><Camera size={14} /> {t('patientForm.capture')}</button>
            <button type="button" onClick={stop} className="link-btn link-btn--muted">{t('common.cancel')}</button>
          </>
        ) : value ? (
          <>
            <button type="button" onClick={start} className="btn btn--ghost btn--sm"><RotateCcw size={14} /> {t('patientForm.retake')}</button>
            <button type="button" onClick={() => onChange('')} className="link-btn text-danger"><X size={12} /> {t('patientForm.removePhoto')}</button>
          </>
        ) : (
          <>
            <button type="button" onClick={start} className="btn btn--primary btn--sm"><Camera size={14} /> {t('patientForm.openCamera')}</button>
            <label className="btn btn--ghost btn--sm is-clickable">
              <Upload size={14} /> {t('patientForm.upload')}
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
  const { t } = useT()
  const [reveal, setReveal] = useState(false)
  return (
    <div className="input-affix">
      <input
        className="input input--mono"
        inputMode="numeric"
        placeholder={t('patientForm.nationalIdPlaceholder')}
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
      <button type="button" onClick={() => setReveal(r => !r)} title={reveal ? t('patientForm.hide') : t('patientForm.show')} className="input-affix__btn">
        {reveal ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  )
}

// ชุด field คนไข้ทั้งหมด (ไม่รวมปุ่ม submit) — ใช้ร่วมกันระหว่างฟอร์มเพิ่ม/แก้ไข
export function PatientFields({ form, setForm }) {
  const { t } = useT()
  const set = f => e => setForm(p => ({ ...p, [f]: e.target.value }))
  const setV = (f, v) => setForm(p => ({ ...p, [f]: v }))
  return (
    <div>
      {/* ข้อมูลส่วนตัว */}
      <div className="form-section">
        <p className="form-section__title">{t('patientForm.personal')}</p>
        <div className="row row-top gap-16 wrap">
          <PhotoCapture value={form.photo} onChange={v => setV('photo', v)} />
          <div className="form-grid grow">
            <Field label={t('patientForm.title')}>
              <select className="input" value={form.title} onChange={set('title')}>
                <option value="">{t('common.dash')}</option>
                {TITLES.map(v => <option key={v} value={v}>{t(`enum.titles.${v}`)}</option>)}
              </select>
            </Field>
            <Field label={t('patientForm.fullName')}><input required className="input" value={form.name} onChange={set('name')} /></Field>
            <div className="form-grid__wide">
              <Field label={t('patientForm.nationalId')}><NationalIdInput value={form.nationalId} onChange={v => setV('nationalId', v)} /></Field>
            </div>
          </div>
        </div>
        <div className="form-grid form-grid--md3 mt-12">
          <Field label={t('patientForm.gender')}>
            <select className="input" value={form.gender} onChange={set('gender')}>
              <option value="">{t('common.unspecified')}</option>
              {['MALE', 'FEMALE', 'OTHER'].map(g => <option key={g} value={g}>{t(`enum.gender.${g}`)}</option>)}
            </select>
          </Field>
          <Field label={t('patientForm.birthdate')}><input type="date" className="input" value={form.birthdate} onChange={set('birthdate')} /></Field>
          <Field label={t('patientForm.nationality')}><input className="input" value={form.nationality} onChange={set('nationality')} /></Field>
          <Field label={t('patientForm.religion')}><input className="input" value={form.religion} onChange={set('religion')} placeholder={t('patientForm.religionPlaceholder')} /></Field>
          <Field label={t('patientForm.maritalStatus')}>
            <select className="input" value={form.maritalStatus} onChange={set('maritalStatus')}>
              <option value="">{t('common.dash')}</option>
              {MARITAL.map(v => <option key={v} value={v}>{t(`enum.marital.${v}`)}</option>)}
            </select>
          </Field>
          <Field label={t('patientForm.occupation')}><input className="input" value={form.occupation} onChange={set('occupation')} /></Field>
        </div>
      </div>

      {/* ข้อมูลติดต่อ */}
      <div className="form-section">
        <p className="form-section__title">{t('patientForm.contact')}</p>
        <div className="form-grid form-grid--md3">
          <Field label={t('patientForm.phone')}><input className="input" value={form.phone} onChange={set('phone')} /></Field>
          <Field label={t('patientForm.email')}><input type="email" className="input" value={form.email} onChange={set('email')} /></Field>
          <div className="form-grid__wide"><Field label={t('patientForm.address')}><input className="input" value={form.address} onChange={set('address')} /></Field></div>
        </div>
      </div>

      {/* ข้อมูลสุขภาพ */}
      <div className="form-section">
        <p className="form-section__title">{t('patientForm.health')}</p>
        <div className="form-grid form-grid--md3">
          <Field label={t('patientForm.bloodType')}><input className="input" value={form.bloodType} onChange={set('bloodType')} placeholder={t('patientForm.bloodTypePlaceholder')} /></Field>
          <Field label={t('patientForm.weight')}><input type="number" step="0.1" className="input" value={form.weight} onChange={set('weight')} /></Field>
          <Field label={t('patientForm.height')}><input type="number" step="0.1" className="input" value={form.height} onChange={set('height')} /></Field>
          <Field label={t('patientForm.insurance')}>
            <select className="input" value={form.insurance} onChange={set('insurance')}>
              <option value="">{t('common.dash')}</option>
              {INSURANCE.map(v => <option key={v} value={v}>{t(`enum.insurance.${v}`)}</option>)}
            </select>
          </Field>
          <Field label={t('patientForm.allergies')}><TagInput value={form.allergies} onChange={v => setV('allergies', v)} placeholder={t('patientForm.allergiesPlaceholder')} /></Field>
          <Field label={t('patientForm.chronic')}><TagInput value={form.chronic} onChange={v => setV('chronic', v)} placeholder={t('patientForm.chronicPlaceholder')} /></Field>
        </div>
      </div>

      {/* ผู้ติดต่อกรณีฉุกเฉิน */}
      <div className="form-section">
        <p className="form-section__title">{t('patientForm.emergency')}</p>
        <div className="form-grid form-grid--md3">
          <Field label={t('patientForm.emergencyName')}><input className="input" value={form.emergencyName} onChange={set('emergencyName')} /></Field>
          <Field label={t('patientForm.relation')}><input className="input" value={form.emergencyRelation} onChange={set('emergencyRelation')} placeholder={t('patientForm.relationPlaceholder')} /></Field>
          <Field label={t('patientForm.phone')}><input className="input" value={form.emergencyPhone} onChange={set('emergencyPhone')} /></Field>
        </div>
      </div>

      <div className="form-section">
        <Field label={t('patientForm.note')}><textarea rows={2} className="input" value={form.note} onChange={set('note')} /></Field>
      </div>
    </div>
  )
}

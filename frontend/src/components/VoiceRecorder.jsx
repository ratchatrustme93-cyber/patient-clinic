import { createContext, useContext, useState, useRef, useEffect } from 'react'
import { Mic, Square, Minus, X, Copy, Check, Save, ChevronUp } from 'lucide-react'
import api from '../lib/api'

const Ctx = createContext(null)
export const useVoiceRecorder = () => useContext(Ctx)

const fmt = s => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

// Provider — วางไว้เหนือ Router เพื่อให้ widget อยู่รอดตอนเปลี่ยนหน้า
export function VoiceRecorderProvider({ children }) {
  const [session, setSession] = useState(null) // { key, visitId, label, onSaved }
  const [minimized, setMinimized] = useState(false)

  const open = s => {
    if (session) { alert('มีการอัดเสียงที่ยังไม่ได้บันทึกอยู่ — บันทึกหรือปิดก่อนเริ่มใหม่'); return }
    setSession({ key: Date.now(), ...s })
    setMinimized(false)
  }
  const close = () => { setSession(null); setMinimized(false) }

  return (
    <Ctx.Provider value={{ open, active: !!session }}>
      {children}
      {session && (
        <RecorderWidget key={session.key} session={session}
          minimized={minimized} setMinimized={setMinimized} close={close} />
      )}
    </Ctx.Provider>
  )
}

function RecorderWidget({ session, minimized, setMinimized, close }) {
  const [status, setStatus] = useState('recording') // 'recording' | 'stopped'
  const [seconds, setSeconds] = useState(0)
  const [transcript, setTranscript] = useState('')
  const [interim, setInterim] = useState('')
  const [audioUrl, setAudioUrl] = useState(null)
  const [audioB64, setAudioB64] = useState(null)
  const [err, setErr] = useState('')
  const [srMsg, setSrMsg] = useState('') // ข้อความสถานะ/ปัญหาของซับ
  const [listening, setListening] = useState(false)
  const [saving, setSaving] = useState(false)
  const [copied, setCopied] = useState(false)
  const srSupported = !!(window.SpeechRecognition || window.webkitSpeechRecognition)

  const mrRef = useRef(null)
  const streamRef = useRef(null)
  const recRef = useRef(null)
  const chunksRef = useRef([])
  const timerRef = useRef(null)
  const stoppingRef = useRef(false)

  useEffect(() => {
    start()
    return () => cleanup()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function start() {
    setErr('')
    stoppingRef.current = false
    if (!navigator.mediaDevices?.getUserMedia) { setErr('เบราว์เซอร์ไม่รองรับไมโครโฟน (ต้องเป็น https/localhost)'); return }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      const mr = new MediaRecorder(stream)
      mrRef.current = mr
      chunksRef.current = []
      mr.ondataavailable = e => { if (e.data.size) chunksRef.current.push(e.data) }
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        setAudioUrl(URL.createObjectURL(blob))
        const reader = new FileReader()
        reader.onload = () => setAudioB64(reader.result)
        reader.readAsDataURL(blob)
        streamRef.current?.getTracks().forEach(t => t.stop())
      }
      mr.start()
      timerRef.current = setInterval(() => setSeconds(s => s + 1), 1000)
      startSR()
      setStatus('recording')
    } catch (e) {
      setErr(e.name === 'NotAllowedError' ? 'ถูกปฏิเสธสิทธิ์ไมโครโฟน — กดอนุญาตที่แถบ address bar' : `เปิดไมค์ไม่ได้ (${e.name || 'error'})`)
    }
  }

  // ซับเรียลไทม์ด้วย Web Speech API (ภาษาไทย) — ต่อเสียงเป็นข้อความสด
  function startSR() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) { setSrMsg('เบราว์เซอร์นี้ไม่รองรับซับอัตโนมัติ — ใช้ Chrome/Edge (พิมพ์ซับเองได้)'); return }
    const rec = new SR()
    rec.lang = 'th-TH'
    rec.continuous = true
    rec.interimResults = true
    rec.maxAlternatives = 1
    rec.onstart = () => { setListening(true); setSrMsg('') }
    rec.onaudiostart = () => setListening(true)
    rec.onresult = e => {
      let live = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i]
        if (r.isFinal) setTranscript(t => (t ? t + ' ' : '') + r[0].transcript.trim())
        else live += r[0].transcript
      }
      setInterim(live)
    }
    rec.onerror = ev => {
      if (ev.error === 'no-speech' || ev.error === 'aborted') return
      setSrMsg(
        ev.error === 'not-allowed' || ev.error === 'service-not-allowed' ? 'ไมโครโฟนถูกปฏิเสธสิทธิ์ (ซับใช้ไม่ได้)'
          : ev.error === 'audio-capture' ? 'เข้าถึงไมค์ไม่ได้ — อาจถูกโปรแกรมอื่นใช้อยู่'
            : ev.error === 'network' ? 'ซับต้องต่ออินเทอร์เน็ต · บาง browser (เช่น Brave) ปิดฟีเจอร์นี้'
              : `ซับมีปัญหา: ${ev.error}`
      )
    }
    rec.onend = () => {
      setListening(false)
      if (!stoppingRef.current) { try { rec.start() } catch { /* already started */ } }
    }
    recRef.current = rec
    try { rec.start() } catch { /* already started */ }
  }

  function stopRecording() {
    stoppingRef.current = true
    clearInterval(timerRef.current)
    try { recRef.current?.stop() } catch { /* ignore */ }
    setInterim(''); setListening(false)
    if (mrRef.current && mrRef.current.state !== 'inactive') mrRef.current.stop()
    setStatus('stopped')
  }

  function cleanup() {
    stoppingRef.current = true
    clearInterval(timerRef.current)
    try { recRef.current?.stop() } catch { /* ignore */ }
    try { if (mrRef.current && mrRef.current.state !== 'inactive') mrRef.current.stop() } catch { /* ignore */ }
    streamRef.current?.getTracks().forEach(t => t.stop())
  }

  const copy = () => {
    navigator.clipboard?.writeText(transcript || '')
    setCopied(true); setTimeout(() => setCopied(false), 1500)
  }

  async function save() {
    setSaving(true)
    try {
      await api.post('/voice-records', { visitId: session.visitId, audio: audioB64, transcript, durationSec: seconds })
      session.onSaved?.()
      close()
    } catch {
      setErr('บันทึกไม่สำเร็จ — ไฟล์เสียงอาจใหญ่เกินไป')
      setSaving(false)
    }
  }

  const recording = status === 'recording'

  // ── ย่อ (minimized) — แถบเล็กมุมจอ ยังอัดต่อได้ ──
  if (minimized) {
    return (
      <div className="recorder recorder--mini">
        <span className={`dot${recording ? ' is-live' : ''}`} />
        <span className="recorder__timer tiny no-shrink">{fmt(seconds)}</span>
        <span className="tiny muted truncate">{interim || transcript || (recording ? 'กำลังฟัง…' : 'หยุดแล้ว')}</span>
        {recording && (
          <button onClick={stopRecording} title="หยุด" className="round-btn round-btn--stop"><Square size={12} /></button>
        )}
        <button onClick={() => setMinimized(false)} title="ขยาย" className="round-btn"><ChevronUp size={14} /></button>
      </div>
    )
  }

  // ── ขยายเต็ม ──
  return (
    <div className="recorder">
      <div className="recorder__header">
        <span className={`recorder__icon${recording ? ' is-live' : ''}`}><Mic size={16} /></span>
        <div className="grow-min">
          <p className="recorder__title truncate">บันทึกเสียง</p>
          <p className="recorder__subtitle truncate">{session.label}</p>
        </div>
        <button onClick={() => setMinimized(true)} title="ย่อ" className="modal__close"><Minus size={16} /></button>
        <button onClick={() => { if (recording && !confirm('กำลังอัดอยู่ — ปิดแล้วเสียงจะหาย?')) return; close() }} title="ปิด/ทิ้ง" className="modal__close"><X size={16} /></button>
      </div>

      {/* ตัวจับเวลา / สถานะ */}
      <div className="recorder__status">
        <span className={`dot${recording ? ' is-live' : ''}`} />
        <span className="recorder__timer">{fmt(seconds)}</span>
        <span className="tiny muted">{recording ? 'กำลังอัด…' : 'หยุดแล้ว'}</span>
        {recording && srSupported && (
          <span className={`recorder__listening${listening ? ' is-live' : ''}`}>
            <span className={`dot dot--sm dot--green${listening ? ' is-live' : ''}`} />
            {listening ? 'กำลังฟัง' : 'รอเสียง…'}
          </span>
        )}
      </div>

      {err && <div className="recorder__notice tone-red">{err}</div>}
      {srMsg && <div className="recorder__notice tone-amber">⚠️ {srMsg}</div>}

      {/* ซับ (CC) — แก้ไขได้ */}
      <div className="recorder__body">
        <div className="row row-between">
          <span className="tiny muted">ซับ / ข้อความ (แก้ไขได้)</span>
          <button onClick={copy} className="link-btn">
            {copied ? <><Check size={12} /> คัดลอกแล้ว</> : <><Copy size={12} /> คัดลอก</>}
          </button>
        </div>
        <textarea
          value={transcript}
          onChange={e => setTranscript(e.target.value)}
          rows={4}
          placeholder={srSupported ? 'พูดได้เลย ซับจะขึ้นที่นี่…' : 'พิมพ์บันทึกข้อความที่นี่…'}
          className="input input--flat"
        />
        {recording && (
          <p className="recorder__interim">
            {interim || <span className="soft italic">{listening ? 'พูดได้เลย…' : ''}</span>}
          </p>
        )}
        {audioUrl && <audio controls src={audioUrl} className="recorder__audio" />}
      </div>

      {/* ปุ่มสั่งงาน */}
      <div className="recorder__actions">
        {recording ? (
          <button onClick={stopRecording} className="btn btn--critical btn--grow">
            <Square size={14} /> หยุดอัด
          </button>
        ) : (
          <>
            <button onClick={close} className="btn btn--ghost">ทิ้ง</button>
            <button onClick={save} disabled={saving || !audioB64} className="btn btn--primary btn--grow">
              <Save size={14} /> {saving ? 'กำลังบันทึก…' : 'บันทึกเข้าแผนการรักษา'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}

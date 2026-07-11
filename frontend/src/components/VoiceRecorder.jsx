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
    if (!SR) return
    const rec = new SR()
    rec.lang = 'th-TH'
    rec.continuous = true
    rec.interimResults = true
    rec.onresult = e => {
      let live = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i]
        if (r.isFinal) setTranscript(t => (t ? t + ' ' : '') + r[0].transcript.trim())
        else live += r[0].transcript
      }
      setInterim(live)
    }
    rec.onend = () => { if (!stoppingRef.current) { try { rec.start() } catch { /* already started */ } } }
    rec.onerror = () => {}
    recRef.current = rec
    try { rec.start() } catch { /* ignore */ }
  }

  function stopRecording() {
    stoppingRef.current = true
    clearInterval(timerRef.current)
    try { recRef.current?.stop() } catch { /* ignore */ }
    setInterim('')
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

  // ── ย่อ (minimized) — แถบเล็กมุมจอ ยังอัดต่อได้ ──
  if (minimized) {
    return (
      <div className="fixed bottom-4 right-4 z-[60] bg-white rounded-full shadow-2xl ring-1 ring-black/10 flex items-center gap-2 pl-3 pr-2 py-2 max-w-[320px]">
        <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${status === 'recording' ? 'bg-red-500 animate-pulse' : 'bg-gray-400'}`} />
        <span className="text-xs font-mono text-gray-700 flex-shrink-0">{fmt(seconds)}</span>
        <span className="text-xs text-gray-500 truncate min-w-0">{interim || transcript || (status === 'recording' ? 'กำลังฟัง…' : 'หยุดแล้ว')}</span>
        {status === 'recording' && (
          <button onClick={stopRecording} title="หยุด" className="flex-shrink-0 w-7 h-7 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600"><Square size={12} /></button>
        )}
        <button onClick={() => setMinimized(false)} title="ขยาย" className="flex-shrink-0 w-7 h-7 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center hover:bg-gray-200"><ChevronUp size={14} /></button>
      </div>
    )
  }

  // ── ขยายเต็ม ──
  return (
    <div className="fixed bottom-4 right-4 z-[60] w-[min(92vw,380px)] bg-white rounded-2xl shadow-2xl ring-1 ring-black/10 flex flex-col overflow-hidden">
      {/* header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-200">
        <span className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${status === 'recording' ? 'bg-red-50 text-red-500' : 'bg-brand-50 text-brand-600'}`}><Mic size={16} /></span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-gray-800 truncate">บันทึกเสียง</p>
          <p className="text-xs text-gray-500 truncate">{session.label}</p>
        </div>
        <button onClick={() => setMinimized(true)} title="ย่อ" className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg p-1"><Minus size={16} /></button>
        <button onClick={() => { if (status === 'recording' && !confirm('กำลังอัดอยู่ — ปิดแล้วเสียงจะหาย?')) return; close() }} title="ปิด/ทิ้ง" className="text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg p-1"><X size={16} /></button>
      </div>

      {/* timer / status */}
      <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 border-b border-gray-100">
        <span className={`w-2.5 h-2.5 rounded-full ${status === 'recording' ? 'bg-red-500 animate-pulse' : 'bg-gray-400'}`} />
        <span className="text-sm font-mono text-gray-700">{fmt(seconds)}</span>
        <span className="text-xs text-gray-500">{status === 'recording' ? 'กำลังอัด…' : 'หยุดแล้ว'}</span>
        {!srSupported && <span className="ml-auto text-[11px] text-amber-600">เบราว์เซอร์นี้ไม่รองรับซับอัตโนมัติ</span>}
      </div>

      {err && <div className="px-4 py-2 text-xs text-red-600 bg-red-50">{err}</div>}

      {/* transcript (CC) — แก้ไขได้ */}
      <div className="p-4 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500">ซับ / ข้อความ (แก้ไขได้)</span>
          <button onClick={copy} className="text-xs text-brand-600 hover:underline inline-flex items-center gap-1">
            {copied ? <><Check size={12} /> คัดลอกแล้ว</> : <><Copy size={12} /> คัดลอก</>}
          </button>
        </div>
        <textarea
          value={transcript}
          onChange={e => setTranscript(e.target.value)}
          rows={4}
          placeholder={srSupported ? 'พูดได้เลย ซับจะขึ้นที่นี่…' : 'พิมพ์บันทึกข้อความที่นี่…'}
          className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-300 resize-none"
        />
        {status === 'recording' && interim && (
          <p className="text-sm text-gray-400 italic leading-snug">…{interim}</p>
        )}
        {audioUrl && <audio controls src={audioUrl} className="w-full h-9 mt-1" />}
      </div>

      {/* actions */}
      <div className="flex gap-2 px-4 py-3 border-t border-gray-200">
        {status === 'recording' ? (
          <button onClick={stopRecording} className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-red-500 text-white text-sm hover:bg-red-600">
            <Square size={14} /> หยุดอัด
          </button>
        ) : (
          <>
            <button onClick={close} className="px-4 py-2 rounded-lg border border-gray-200 text-gray-600 text-sm hover:bg-gray-50">ทิ้ง</button>
            <button onClick={save} disabled={saving || !audioB64} className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-brand-600 text-white text-sm hover:bg-brand-700 disabled:opacity-50">
              <Save size={14} /> {saving ? 'กำลังบันทึก…' : 'บันทึกเข้าแผนการรักษา'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}

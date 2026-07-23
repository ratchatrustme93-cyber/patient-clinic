import { createContext, useContext, useState, useRef, useEffect } from 'react'
import { Mic, Square, Minus, X, Copy, Check, Save, ChevronUp } from 'lucide-react'
import api from '../lib/api'
import { useT } from '../lib/i18n'

const Ctx = createContext(null)
export const useVoiceRecorder = () => useContext(Ctx)

const fmt = s => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

// Provider — วางไว้เหนือ Router เพื่อให้ widget อยู่รอดตอนเปลี่ยนหน้า
export function VoiceRecorderProvider({ children }) {
  const { t } = useT()
  const [session, setSession] = useState(null) // { key, visitId, label, onSaved }
  const [minimized, setMinimized] = useState(false)

  const open = s => {
    if (session) { alert(t('recorder.busy')); return }
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
  const { t, lang } = useT()
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
    if (!navigator.mediaDevices?.getUserMedia) { setErr(t('recorder.micUnsupported')); return }
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
      setErr(e.name === 'NotAllowedError' ? t('recorder.micDenied') : t('recorder.micError', { name: e.name || 'error' }))
    }
  }

  // ซับเรียลไทม์ด้วย Web Speech API (ภาษาไทย) — ต่อเสียงเป็นข้อความสด
  function startSR() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) { setSrMsg(t('recorder.srUnsupported')); return }
    const rec = new SR()
    rec.lang = lang === 'en' ? 'en-US' : 'th-TH' // ซับตามภาษาที่เลือก
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
        ev.error === 'not-allowed' || ev.error === 'service-not-allowed' ? t('recorder.srDenied')
          : ev.error === 'audio-capture' ? t('recorder.srCapture')
            : ev.error === 'network' ? t('recorder.srNetwork')
              : t('recorder.srError', { error: ev.error })
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
      setErr(t('recorder.saveFailed'))
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
        <span className="tiny muted truncate">{interim || transcript || (recording ? t('recorder.listeningShort') : t('recorder.stopped'))}</span>
        {recording && (
          <button onClick={stopRecording} title={t('recorder.stop')} className="round-btn round-btn--stop"><Square size={12} /></button>
        )}
        <button onClick={() => setMinimized(false)} title={t('recorder.expand')} className="round-btn"><ChevronUp size={14} /></button>
      </div>
    )
  }

  // ── ขยายเต็ม ──
  return (
    <div className="recorder">
      <div className="recorder__header">
        <span className={`recorder__icon${recording ? ' is-live' : ''}`}><Mic size={16} /></span>
        <div className="grow-min">
          <p className="recorder__title truncate">{t('recorder.title')}</p>
          <p className="recorder__subtitle truncate">{session.label}</p>
        </div>
        <button onClick={() => setMinimized(true)} title={t('recorder.minimize')} className="modal__close"><Minus size={16} /></button>
        <button onClick={() => { if (recording && !confirm(t('recorder.closeConfirm'))) return; close() }} title={t('recorder.closeTip')} className="modal__close"><X size={16} /></button>
      </div>

      {/* ตัวจับเวลา / สถานะ */}
      <div className="recorder__status">
        <span className={`dot${recording ? ' is-live' : ''}`} />
        <span className="recorder__timer">{fmt(seconds)}</span>
        <span className="tiny muted">{recording ? t('recorder.recording') : t('recorder.stopped')}</span>
        {recording && srSupported && (
          <span className={`recorder__listening${listening ? ' is-live' : ''}`}>
            <span className={`dot dot--sm dot--green${listening ? ' is-live' : ''}`} />
            {listening ? t('recorder.listening') : t('recorder.waiting')}
          </span>
        )}
      </div>

      {err && <div className="recorder__notice tone-red">{err}</div>}
      {srMsg && <div className="recorder__notice tone-amber">⚠️ {srMsg}</div>}

      {/* ซับ (CC) — แก้ไขได้ */}
      <div className="recorder__body">
        <div className="row row-between">
          <span className="tiny muted">{t('recorder.transcriptLabel')}</span>
          <button onClick={copy} className="link-btn">
            {copied ? <><Check size={12} /> {t('common.copied')}</> : <><Copy size={12} /> {t('common.copy')}</>}
          </button>
        </div>
        <textarea
          value={transcript}
          onChange={e => setTranscript(e.target.value)}
          rows={4}
          placeholder={srSupported ? t('recorder.placeholderSupported') : t('recorder.placeholderUnsupported')}
          className="input input--flat"
        />
        {recording && (
          <p className="recorder__interim">
            {interim || <span className="soft italic">{listening ? t('recorder.speakNow') : ''}</span>}
          </p>
        )}
        {audioUrl && <audio controls src={audioUrl} className="recorder__audio" />}
      </div>

      {/* ปุ่มสั่งงาน */}
      <div className="recorder__actions">
        {recording ? (
          <button onClick={stopRecording} className="btn btn--critical btn--grow">
            <Square size={14} /> {t('recorder.stop')}
          </button>
        ) : (
          <>
            <button onClick={close} className="btn btn--ghost">{t('recorder.discard')}</button>
            <button onClick={save} disabled={saving || !audioB64} className="btn btn--primary btn--grow">
              <Save size={14} /> {saving ? t('recorder.saving') : t('recorder.saveToVisit')}
            </button>
          </>
        )}
      </div>
    </div>
  )
}

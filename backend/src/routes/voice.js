import { Router } from 'express'
import fs from 'fs'
import path from 'path'
import jwt from 'jsonwebtoken'
import prisma from '../lib/prisma.js'
import { auth } from '../middleware/auth.js'
import { msg } from '../lib/messages.js'
import { canAccessPatient } from '../lib/patientAccess.js'

const router = Router()

// โฟลเดอร์เก็บไฟล์เสียงบนดิสก์
const UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'voice')
fs.mkdirSync(UPLOAD_DIR, { recursive: true })
const fileOf = rec => path.join(UPLOAD_DIR, rec.audioFile)

// ── เช็คสิทธิ์: บันทึกเสียงผูกกับ visit → visit ผูกกับคนไข้ ──
// เดิมทุก endpoint เช็คแค่ว่า token ถูกต้อง ไม่ได้เช็คว่าเป็นคนไข้ของตัวเอง
// ทำให้เดา id ไล่ฟังเสียงการรักษาของคนไข้คนอื่นได้
async function loadAllowed(user, recId) {
  const rec = await prisma.voiceRecord.findUnique({
    where: { id: +recId },
    include: { visit: { select: { patientId: true, doctorId: true } } },
  })
  if (!rec) return { code: 404 }
  if (user.role === 'DOCTOR' && rec.visit.doctorId !== user.id) return { code: 403 }
  if (!(await canAccessPatient(user, rec.visit.patientId))) return { code: 403 }
  return { rec }
}

// สร้างบันทึกเสียงผูกกับ visit — รับ base64 แล้วเขียนเป็นไฟล์ (DB เก็บแค่ชื่อไฟล์)
router.post('/', auth, async (req, res) => {
  const { visitId, audio, transcript, durationSec } = req.body
  if (!visitId) return res.status(400).json({ error: msg(req, 'VISIT_ID_REQUIRED') })

  const visit = await prisma.visit.findUnique({
    where: { id: +visitId },
    select: { patientId: true, doctorId: true },
  })
  if (!visit) return res.status(404).json({ error: msg(req, 'VISIT_NOT_FOUND') })
  if (req.user.role === 'DOCTOR' && visit.doctorId !== req.user.id) {
    return res.status(403).json({ error: msg(req, 'VOICE_ADD_FORBIDDEN') })
  }
  if (!(await canAccessPatient(req.user, visit.patientId))) {
    return res.status(403).json({ error: msg(req, 'PATIENT_FORBIDDEN') })
  }

  let audioFile = null
  const m = typeof audio === 'string' && audio.match(/^data:(audio\/[\w-]+);base64,(.+)$/)
  if (m) {
    const ext = m[1].includes('ogg') ? 'ogg' : 'webm'
    audioFile = `v_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`
    fs.writeFileSync(fileOf({ audioFile }), Buffer.from(m[2], 'base64'))
  }

  const rec = await prisma.voiceRecord.create({
    data: { visitId: +visitId, audioFile, transcript: transcript || null, durationSec: +durationSec || 0 },
  })
  res.json(rec)
})

// ── ตั๋วฟังเสียงอายุสั้น ──
// <audio> ใส่ header Authorization ไม่ได้ เลยต้องส่ง token ทาง URL
// เดิมส่ง JWT ตัวจริง (อายุ 7 วัน ใช้ได้ทุก endpoint) ไปโผล่ใน access log กับ browser history
// เปลี่ยนเป็นตั๋วที่ใช้ได้เฉพาะไฟล์นี้ไฟล์เดียว หมดอายุใน 15 นาที
router.get('/:id/ticket', auth, async (req, res) => {
  const { code } = await loadAllowed(req.user, req.params.id)
  if (code) return res.status(code).json({ error: msg(req, code === 404 ? 'VOICE_NOT_FOUND' : 'VOICE_LISTEN_FORBIDDEN') })
  const ticket = jwt.sign({ typ: 'audio', vr: +req.params.id }, process.env.JWT_SECRET, { expiresIn: '15m' })
  res.json({ ticket })
})

// สตรีมไฟล์เสียง · รองรับ Range (seek)
router.get('/:id/audio', async (req, res) => {
  const id = +req.params.id
  let claims
  try { claims = jwt.verify(req.query.t, process.env.JWT_SECRET) } catch { return res.status(401).end() }
  // ตั๋วต้องเป็นชนิด audio และออกให้ไฟล์นี้เท่านั้น — กัน JWT ทั่วไปมาใช้แทน
  if (claims.typ !== 'audio' || claims.vr !== id) return res.status(403).end()

  const rec = await prisma.voiceRecord.findUnique({ where: { id } })
  if (!rec?.audioFile) return res.status(404).end()
  const fp = fileOf(rec)
  if (!fs.existsSync(fp)) return res.status(404).end()

  const type = rec.audioFile.endsWith('ogg') ? 'audio/ogg' : 'audio/webm'
  const size = fs.statSync(fp).size
  const range = req.headers.range
  if (range) {
    const [s, e] = range.replace('bytes=', '').split('-')
    const start = parseInt(s, 10)
    const end = e ? parseInt(e, 10) : size - 1
    res.writeHead(206, {
      'Content-Range': `bytes ${start}-${end}/${size}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': end - start + 1,
      'Content-Type': type,
    })
    fs.createReadStream(fp, { start, end }).pipe(res)
  } else {
    res.writeHead(200, { 'Content-Length': size, 'Content-Type': type, 'Accept-Ranges': 'bytes' })
    fs.createReadStream(fp).pipe(res)
  }
})

// แก้ไขซับ
router.put('/:id', auth, async (req, res) => {
  const { code } = await loadAllowed(req.user, req.params.id)
  if (code) return res.status(code).json({ error: msg(req, code === 404 ? 'VOICE_NOT_FOUND' : 'VOICE_EDIT_FORBIDDEN') })
  const { transcript } = req.body
  res.json(await prisma.voiceRecord.update({ where: { id: +req.params.id }, data: { transcript } }))
})

// ลบ — ลบไฟล์บนดิสก์ด้วย
router.delete('/:id', auth, async (req, res) => {
  const { rec, code } = await loadAllowed(req.user, req.params.id)
  if (code) return res.status(code).json({ error: msg(req, code === 404 ? 'VOICE_NOT_FOUND' : 'VOICE_DELETE_FORBIDDEN') })
  if (rec.audioFile) { try { fs.unlinkSync(fileOf(rec)) } catch { /* ไฟล์อาจถูกลบไปแล้ว */ } }
  await prisma.voiceRecord.delete({ where: { id: rec.id } })
  res.json({ ok: true })
})

export default router

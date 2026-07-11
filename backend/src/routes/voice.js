import { Router } from 'express'
import fs from 'fs'
import path from 'path'
import jwt from 'jsonwebtoken'
import prisma from '../lib/prisma.js'
import { auth } from '../middleware/auth.js'

const router = Router()

// โฟลเดอร์เก็บไฟล์เสียงบนดิสก์
const UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'voice')
fs.mkdirSync(UPLOAD_DIR, { recursive: true })
const fileOf = rec => path.join(UPLOAD_DIR, rec.audioFile)

// สร้างบันทึกเสียงผูกกับ visit — รับ base64 แล้วเขียนเป็นไฟล์ (DB เก็บแค่ชื่อไฟล์)
router.post('/', auth, async (req, res) => {
  const { visitId, audio, transcript, durationSec } = req.body
  if (!visitId) return res.status(400).json({ error: 'visitId required' })

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

// สตรีมไฟล์เสียง — รับ token ทาง query (?t=) เพราะ <audio> ส่ง header ไม่ได้ · รองรับ Range (seek)
router.get('/:id/audio', async (req, res) => {
  const token = req.query.t || (req.headers.authorization || '').split(' ')[1]
  try { jwt.verify(token, process.env.JWT_SECRET) } catch { return res.status(401).end() }

  const rec = await prisma.voiceRecord.findUnique({ where: { id: +req.params.id } })
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
  const { transcript } = req.body
  res.json(await prisma.voiceRecord.update({ where: { id: +req.params.id }, data: { transcript } }))
})

// ลบ — ลบไฟล์บนดิสก์ด้วย
router.delete('/:id', auth, async (req, res) => {
  const rec = await prisma.voiceRecord.findUnique({ where: { id: +req.params.id } })
  if (rec?.audioFile) { try { fs.unlinkSync(fileOf(rec)) } catch { /* ไฟล์อาจถูกลบไปแล้ว */ } }
  await prisma.voiceRecord.delete({ where: { id: +req.params.id } })
  res.json({ ok: true })
})

export default router

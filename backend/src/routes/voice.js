import { Router } from 'express'
import prisma from '../lib/prisma.js'
import { auth } from '../middleware/auth.js'

const router = Router()

// สร้างบันทึกเสียงผูกกับ visit (แผนการรักษา) — ผูกได้หลายอันต่อ visit
router.post('/', auth, async (req, res) => {
  const { visitId, audio, transcript, durationSec } = req.body
  if (!visitId) return res.status(400).json({ error: 'visitId required' })
  const rec = await prisma.voiceRecord.create({
    data: {
      visitId: +visitId,
      audio: audio || null,
      transcript: transcript || null,
      durationSec: +durationSec || 0,
    },
  })
  res.json(rec)
})

// แก้ไขซับ/ข้อความ
router.put('/:id', auth, async (req, res) => {
  const { transcript } = req.body
  res.json(await prisma.voiceRecord.update({
    where: { id: +req.params.id },
    data: { transcript },
  }))
})

router.delete('/:id', auth, async (req, res) => {
  await prisma.voiceRecord.delete({ where: { id: +req.params.id } })
  res.json({ ok: true })
})

export default router

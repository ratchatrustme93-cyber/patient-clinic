import { Router } from 'express'
import prisma from '../lib/prisma.js'
import { auth } from '../middleware/auth.js'

const router = Router()
const num = v => (v === '' || v == null ? null : +v)

const INCLUDE = {
  patient: true,
  doctor: { select: { id: true, name: true, specialty: true } },
  appointment: { include: { service: true, department: true } },
  bill: true,
}

// GET /api/visits?patientId=
router.get('/', auth, async (req, res) => {
  const where = req.query.patientId ? { patientId: +req.query.patientId } : {}
  res.json(await prisma.visit.findMany({ where, include: INCLUDE, orderBy: { visitDate: 'desc' } }))
})

// GET /api/visits/:id — ใบรายงานคนไข้ (patient report)
router.get('/:id', auth, async (req, res) => {
  const visit = await prisma.visit.findUnique({ where: { id: +req.params.id }, include: INCLUDE })
  if (!visit) return res.status(404).json({ error: 'Not found' })
  res.json(visit)
})

router.post('/', auth, async (req, res) => {
  const { patientId, appointmentId, doctorId, chiefComplaint, diagnosis, treatment, note } = req.body
  // ปิดนัดที่ทำ report แล้วก่อน เพื่อให้ response สะท้อนสถานะล่าสุด
  if (appointmentId) {
    await prisma.appointment.update({ where: { id: +appointmentId }, data: { status: 'COMPLETED' } })
  }
  const visit = await prisma.visit.create({
    data: {
      patientId: +patientId,
      appointmentId: num(appointmentId),
      doctorId: num(doctorId),
      chiefComplaint, diagnosis, treatment, note,
    },
    include: INCLUDE,
  })
  res.json(visit)
})

router.put('/:id', auth, async (req, res) => {
  const { doctorId, chiefComplaint, diagnosis, treatment, note } = req.body
  res.json(await prisma.visit.update({
    where: { id: +req.params.id },
    data: { doctorId: num(doctorId), chiefComplaint, diagnosis, treatment, note },
    include: INCLUDE,
  }))
})

export default router

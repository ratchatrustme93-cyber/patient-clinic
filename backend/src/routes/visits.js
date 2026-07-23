import { Router } from 'express'
import prisma from '../lib/prisma.js'
import { auth } from '../middleware/auth.js'
import { msg } from '../lib/messages.js'
import { PATIENT_BRIEF, canAccessPatient } from '../lib/patientAccess.js'

const router = Router()
const num = v => (v === '' || v == null ? null : +v)

const INCLUDE = {
  patient: PATIENT_BRIEF, // เดิม `patient: true` → คืนคนไข้ทั้งแถวติดมากับทุก visit
  doctor: { select: { id: true, name: true, specialty: true } },
  appointment: { include: { service: true, department: true } },
  bill: true,
}

// GET /api/visits?patientId=
router.get('/', auth, async (req, res) => {
  const where = req.query.patientId ? { patientId: +req.query.patientId } : {}
  // หมอเห็นเฉพาะการรักษาของตัวเอง
  if (req.user.role === 'DOCTOR') where.doctorId = req.user.id
  res.json(await prisma.visit.findMany({ where, include: INCLUDE, orderBy: { visitDate: 'desc' } }))
})

// GET /api/visits/:id — ใบรายงานคนไข้ (patient report)
// เดิมไม่มีเช็คสิทธิ์เลย → ใครก็ไล่ id ดูผลวินิจฉัย + ข้อมูลคนไข้ได้ทุกคน
router.get('/:id', auth, async (req, res) => {
  const visit = await prisma.visit.findUnique({ where: { id: +req.params.id }, include: INCLUDE })
  if (!visit) return res.status(404).json({ error: msg(req, 'NOT_FOUND') })
  if (req.user.role === 'DOCTOR' && visit.doctorId !== req.user.id) {
    return res.status(403).json({ error: msg(req, 'VISIT_FORBIDDEN') })
  }
  if (!(await canAccessPatient(req.user, visit.patientId))) {
    return res.status(403).json({ error: msg(req, 'PATIENT_FORBIDDEN') })
  }
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

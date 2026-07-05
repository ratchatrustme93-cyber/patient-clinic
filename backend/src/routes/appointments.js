import { Router } from 'express'
import prisma from '../lib/prisma.js'
import { auth } from '../middleware/auth.js'

const router = Router()
const num = v => (v === '' || v == null ? null : +v)

const INCLUDE = {
  patient: true,
  doctor: { select: { id: true, name: true } },
  assistant: { select: { id: true, name: true } },
  department: true,
  service: true,
  room: true,
  visit: { select: { id: true } },
}

// GET /api/appointments?date=YYYY-MM-DD  |  ?from=&to=  |  ?patientId=
router.get('/', auth, async (req, res) => {
  const { date, from, to, patientId } = req.query
  const where = {}
  if (patientId) where.patientId = +patientId
  if (date) {
    const start = new Date(date), end = new Date(date)
    end.setDate(end.getDate() + 1)
    where.scheduledAt = { gte: start, lt: end }
  } else if (from && to) {
    where.scheduledAt = { gte: new Date(from), lte: new Date(to) }
  }
  res.json(await prisma.appointment.findMany({ where, include: INCLUDE, orderBy: { scheduledAt: 'asc' } }))
})

router.post('/', auth, async (req, res) => {
  const { patientId, doctorId, assistantId, departmentId, serviceId, roomId, scheduledAt, endAt, note } = req.body
  res.json(await prisma.appointment.create({
    data: {
      patientId: +patientId,
      doctorId: num(doctorId), assistantId: num(assistantId),
      departmentId: num(departmentId), serviceId: num(serviceId),
      roomId: num(roomId),
      scheduledAt: new Date(scheduledAt),
      endAt: endAt ? new Date(endAt) : null,
      note,
    },
    include: INCLUDE,
  }))
})

router.put('/:id', auth, async (req, res) => {
  const b = req.body
  res.json(await prisma.appointment.update({
    where: { id: +req.params.id },
    data: {
      doctorId: b.doctorId !== undefined ? num(b.doctorId) : undefined,
      assistantId: b.assistantId !== undefined ? num(b.assistantId) : undefined,
      departmentId: b.departmentId !== undefined ? num(b.departmentId) : undefined,
      serviceId: b.serviceId !== undefined ? num(b.serviceId) : undefined,
      roomId: b.roomId !== undefined ? num(b.roomId) : undefined,
      scheduledAt: b.scheduledAt ? new Date(b.scheduledAt) : undefined,
      status: b.status,
      note: b.note,
    },
    include: INCLUDE,
  }))
})

router.delete('/:id', auth, async (req, res) => {
  await prisma.appointment.update({ where: { id: +req.params.id }, data: { status: 'CANCELLED' } })
  res.json({ ok: true })
})

export default router

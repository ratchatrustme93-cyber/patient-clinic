import { Router } from 'express'
import prisma from '../lib/prisma.js'
import { auth } from '../middleware/auth.js'

const router = Router()

// GET /api/overview — สรุปภาพรวมสำหรับ dashboard / master
router.get('/', auth, async (req, res) => {
  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0)
  const todayEnd = new Date(todayStart); todayEnd.setDate(todayEnd.getDate() + 1)

  // หมอเห็นเฉพาะเคสตัวเอง → scope เฉพาะตัวเลขที่เป็น "เคส"
  const isDoctor = req.user.role === 'DOCTOR'
  const myId = req.user.id
  const apptScope = isDoctor ? { doctorId: myId } : {}
  const visitScope = isDoctor ? { doctorId: myId } : {}
  const patientScope = isDoctor
    ? { OR: [{ appointments: { some: { doctorId: myId } } }, { visits: { some: { doctorId: myId } } }] }
    : {}

  const [
    patients, employees, doctors, assistants,
    apptTotal, apptToday, visits,
    items, materials, services,
    unpaidBills, paidAgg, lowMaterials, todayAppointments, recentBills,
  ] = await Promise.all([
    prisma.patient.count({ where: patientScope }),
    prisma.user.count(),
    prisma.user.count({ where: { role: 'DOCTOR' } }),
    prisma.user.count({ where: { role: 'ASSISTANT' } }),
    prisma.appointment.count({ where: apptScope }),
    prisma.appointment.count({ where: { ...apptScope, scheduledAt: { gte: todayStart, lt: todayEnd } } }),
    prisma.visit.count({ where: visitScope }),
    prisma.item.count(),
    prisma.material.count(),
    prisma.service.count(),
    prisma.bill.count({ where: { status: 'UNPAID' } }),
    prisma.bill.aggregate({ _sum: { total: true }, where: { status: 'PAID' } }),
    prisma.material.findMany({ where: { reorderLevel: { not: null } } }),
    prisma.appointment.findMany({
      where: { ...apptScope, scheduledAt: { gte: todayStart, lt: todayEnd } },
      include: { patient: { select: { hn: true, name: true } }, doctor: { select: { name: true } }, service: true },
      orderBy: { scheduledAt: 'asc' },
    }),
    prisma.bill.findMany({
      include: { patient: { select: { hn: true, name: true } } },
      orderBy: { date: 'desc' }, take: 8,
    }),
  ])

  res.json({
    scoped: isDoctor, // หมอ = เห็นเฉพาะเคสตัวเอง (ซ่อนคลัง/รายได้/บิล)
    counts: {
      patients, employees, doctors, assistants,
      appointments: apptTotal, appointmentsToday: apptToday, visits,
      items: isDoctor ? 0 : items,
      materials: isDoctor ? 0 : materials,
      services: isDoctor ? 0 : services,
      unpaidBills: isDoctor ? 0 : unpaidBills,
    },
    revenuePaid: isDoctor ? 0 : (paidAgg._sum.total || 0),
    lowMaterials: isDoctor ? [] : lowMaterials.filter(m => m.stockQty <= m.reorderLevel),
    todayAppointments,
    recentBills: isDoctor ? [] : recentBills,
  })
})

export default router

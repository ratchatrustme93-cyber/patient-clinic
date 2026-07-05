import { Router } from 'express'
import prisma from '../lib/prisma.js'
import { auth } from '../middleware/auth.js'

const router = Router()

// GET /api/overview — สรุปภาพรวมสำหรับ dashboard / master
router.get('/', auth, async (_req, res) => {
  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0)
  const todayEnd = new Date(todayStart); todayEnd.setDate(todayEnd.getDate() + 1)

  const [
    patients, employees, doctors, assistants,
    apptTotal, apptToday, visits,
    items, materials, services,
    unpaidBills, paidAgg, lowMaterials, todayAppointments, recentBills,
  ] = await Promise.all([
    prisma.patient.count(),
    prisma.user.count(),
    prisma.user.count({ where: { role: 'DOCTOR' } }),
    prisma.user.count({ where: { role: 'ASSISTANT' } }),
    prisma.appointment.count(),
    prisma.appointment.count({ where: { scheduledAt: { gte: todayStart, lt: todayEnd } } }),
    prisma.visit.count(),
    prisma.item.count(),
    prisma.material.count(),
    prisma.service.count(),
    prisma.bill.count({ where: { status: 'UNPAID' } }),
    prisma.bill.aggregate({ _sum: { total: true }, where: { status: 'PAID' } }),
    prisma.material.findMany({ where: { reorderLevel: { not: null } } }),
    prisma.appointment.findMany({
      where: { scheduledAt: { gte: todayStart, lt: todayEnd } },
      include: { patient: { select: { hn: true, name: true } }, doctor: { select: { name: true } }, service: true },
      orderBy: { scheduledAt: 'asc' },
    }),
    prisma.bill.findMany({
      include: { patient: { select: { hn: true, name: true } } },
      orderBy: { date: 'desc' }, take: 8,
    }),
  ])

  res.json({
    counts: {
      patients, employees, doctors, assistants,
      appointments: apptTotal, appointmentsToday: apptToday, visits,
      items, materials, services, unpaidBills,
    },
    revenuePaid: paidAgg._sum.total || 0,
    lowMaterials: lowMaterials.filter(m => m.stockQty <= m.reorderLevel),
    todayAppointments,
    recentBills,
  })
})

export default router

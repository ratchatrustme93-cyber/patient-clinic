import { Router } from 'express'
import prisma from '../lib/prisma.js'
import { nextCode } from '../lib/codes.js'
import { auth } from '../middleware/auth.js'

const router = Router()

// map request body → patient columns (shared by create/update)
function patientData(b) {
  return {
    title: b.title || null,
    name: b.name,
    nationalId: b.nationalId || null,
    photo: b.photo || null,
    gender: b.gender || null,
    birthdate: b.birthdate ? new Date(b.birthdate) : null,
    nationality: b.nationality || null,
    religion: b.religion || null,
    maritalStatus: b.maritalStatus || null,
    occupation: b.occupation || null,
    phone: b.phone || null,
    email: b.email || null,
    address: b.address || null,
    bloodType: b.bloodType || null,
    weight: b.weight ? +b.weight : null,
    height: b.height ? +b.height : null,
    insurance: b.insurance || null,
    allergies: b.allergies || null,
    chronic: b.chronic || null,
    emergencyName: b.emergencyName || null,
    emergencyPhone: b.emergencyPhone || null,
    emergencyRelation: b.emergencyRelation || null,
    note: b.note || null,
  }
}

router.get('/', auth, async (req, res) => {
  const { search } = req.query
  const conds = []
  if (search) conds.push({ OR: [
    { name: { contains: search, mode: 'insensitive' } },
    { hn: { contains: search, mode: 'insensitive' } },
    { phone: { contains: search } },
  ] })
  // หมอเห็นเฉพาะคนไข้ที่ตัวเองมีนัดหรือเคยรักษา
  if (req.user.role === 'DOCTOR') conds.push({ OR: [
    { appointments: { some: { doctorId: req.user.id } } },
    { visits: { some: { doctorId: req.user.id } } },
  ] })
  const where = conds.length ? { AND: conds } : {}
  res.json(await prisma.patient.findMany({ where, orderBy: { id: 'desc' }, omit: { photo: true } }))
})

router.get('/:id', auth, async (req, res) => {
  const patient = await prisma.patient.findUnique({
    where: { id: +req.params.id },
    include: {
      appointments: {
        include: { doctor: { select: { name: true } }, service: true, department: true },
        orderBy: { scheduledAt: 'desc' },
      },
      visits: {
        include: {
          doctor: { select: { name: true } },
          bill: true,
          voiceRecords: { orderBy: { createdAt: 'asc' } },
        },
        orderBy: { visitDate: 'desc' },
      },
      bills: { orderBy: { date: 'desc' } },
    },
  })
  if (!patient) return res.status(404).json({ error: 'Not found' })
  // หมอเปิดได้เฉพาะคนไข้ที่ตัวเองมีนัด/เคยรักษา · และเห็นเฉพาะนัด/การรักษาของตัวเอง
  if (req.user.role === 'DOCTOR') {
    const mine = patient.appointments.some(a => a.doctorId === req.user.id) || patient.visits.some(v => v.doctorId === req.user.id)
    if (!mine) return res.status(403).json({ error: 'ไม่มีสิทธิ์เข้าถึงคนไข้รายนี้' })
    patient.appointments = patient.appointments.filter(a => a.doctorId === req.user.id)
    patient.visits = patient.visits.filter(v => v.doctorId === req.user.id)
  }
  res.json(patient)
})

router.post('/', auth, async (req, res) => {
  const patient = await prisma.patient.create({
    data: { hn: await nextCode('patient', 'HN', 5), ...patientData(req.body) },
  })
  res.json(patient)
})

router.put('/:id', auth, async (req, res) => {
  const patient = await prisma.patient.update({
    where: { id: +req.params.id },
    data: patientData(req.body),
  })
  res.json(patient)
})

export default router

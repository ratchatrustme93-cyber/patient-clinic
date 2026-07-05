import { Router } from 'express'
import prisma from '../lib/prisma.js'
import { nextCode } from '../lib/codes.js'
import { auth } from '../middleware/auth.js'

const router = Router()

router.get('/', auth, async (req, res) => {
  const { search } = req.query
  const where = search
    ? { OR: [
        { name: { contains: search, mode: 'insensitive' } },
        { hn: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
      ] }
    : {}
  res.json(await prisma.patient.findMany({ where, orderBy: { id: 'desc' } }))
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
        include: { doctor: { select: { name: true } }, bill: true },
        orderBy: { visitDate: 'desc' },
      },
      bills: { orderBy: { date: 'desc' } },
    },
  })
  if (!patient) return res.status(404).json({ error: 'Not found' })
  res.json(patient)
})

router.post('/', auth, async (req, res) => {
  const { name, gender, birthdate, phone, email, address, bloodType, allergies, chronic, note } = req.body
  const patient = await prisma.patient.create({
    data: {
      hn: await nextCode('patient', 'HN', 5),
      name, gender: gender || null,
      birthdate: birthdate ? new Date(birthdate) : null,
      phone, email, address, bloodType, allergies, chronic, note,
    },
  })
  res.json(patient)
})

router.put('/:id', auth, async (req, res) => {
  const { name, gender, birthdate, phone, email, address, bloodType, allergies, chronic, note } = req.body
  const patient = await prisma.patient.update({
    where: { id: +req.params.id },
    data: {
      name, gender: gender || null,
      birthdate: birthdate ? new Date(birthdate) : null,
      phone, email, address, bloodType, allergies, chronic, note,
    },
  })
  res.json(patient)
})

export default router

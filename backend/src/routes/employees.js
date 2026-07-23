import { Router } from 'express'
import bcrypt from 'bcryptjs'
import prisma from '../lib/prisma.js'
import { nextCode } from '../lib/codes.js'
import { auth, requireRole } from '../middleware/auth.js'
import { msg } from '../lib/messages.js'

const router = Router()
const SELECT = {
  id: true, code: true, name: true, email: true, role: true, phone: true,
  position: true, specialty: true, licenseNo: true, departmentId: true, active: true,
  department: { select: { id: true, name: true } },
}

// GET /api/employees?role=DOCTOR&active=1
router.get('/', auth, async (req, res) => {
  const { role, active } = req.query
  const where = {}
  if (role) where.role = role
  if (active === '1') where.active = true
  const users = await prisma.user.findMany({ where, select: SELECT, orderBy: { code: 'asc' } })
  res.json(users)
})

router.post('/', auth, requireRole('ADMIN'), async (req, res) => {
  const { name, email, password, role, phone, position, specialty, licenseNo, departmentId } = req.body
  try {
    const user = await prisma.user.create({
      data: {
        code: await nextCode('user', 'EMP'),
        name, email,
        password: await bcrypt.hash(password || 'clinic123', 10),
        role: role || 'EMPLOYEE',
        phone, position, specialty, licenseNo,
        departmentId: departmentId ? +departmentId : null,
      },
      select: SELECT,
    })
    res.json(user)
  } catch (e) {
    res.status(400).json({ error: e.code === 'P2002' ? msg(req, 'EMAIL_TAKEN') : e.message })
  }
})

router.put('/:id', auth, requireRole('ADMIN'), async (req, res) => {
  const { name, role, phone, position, specialty, licenseNo, departmentId, active } = req.body
  const user = await prisma.user.update({
    where: { id: +req.params.id },
    data: {
      name, role, phone, position, specialty, licenseNo, active,
      departmentId: departmentId ? +departmentId : null,
    },
    select: SELECT,
  })
  res.json(user)
})

router.delete('/:id', auth, requireRole('ADMIN'), async (req, res) => {
  await prisma.user.update({ where: { id: +req.params.id }, data: { active: false } })
  res.json({ ok: true })
})

export default router

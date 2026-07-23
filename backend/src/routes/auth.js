import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import prisma from '../lib/prisma.js'
import { nextCode } from '../lib/codes.js'
import { auth } from '../middleware/auth.js'
import { msg } from '../lib/messages.js'

const router = Router()

function sign(user) {
  return jwt.sign({ id: user.id, role: user.role, name: user.name }, process.env.JWT_SECRET, { expiresIn: '7d' })
}

// คนแรกที่สมัคร = MASTER อัตโนมัติ
router.post('/register', async (req, res) => {
  const { name, email, password } = req.body
  try {
    const count = await prisma.user.count()
    const hash = await bcrypt.hash(password, 10)
    const user = await prisma.user.create({
      data: {
        code: await nextCode('user', 'EMP'),
        name, email, password: hash,
        role: count === 0 ? 'MASTER' : 'EMPLOYEE',
      },
    })
    res.json({ token: sign(user), user: pub(user) })
  } catch (e) {
    res.status(400).json({ error: e.code === 'P2002' ? msg(req, 'EMAIL_TAKEN') : e.message })
  }
})

router.post('/login', async (req, res) => {
  const { email, password } = req.body
  const user = await prisma.user.findUnique({ where: { email } })
  if (!user || !user.active) return res.status(401).json({ error: msg(req, 'ACCOUNT_INVALID') })
  const ok = await bcrypt.compare(password, user.password)
  if (!ok) return res.status(401).json({ error: msg(req, 'LOGIN_FAILED') })
  res.json({ token: sign(user), user: pub(user) })
})

router.get('/me', auth, async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.user.id }, include: { department: true } })
  res.json(pub(user))
})

function pub(u) {
  return { id: u.id, code: u.code, name: u.name, email: u.email, role: u.role, position: u.position }
}

export default router

import { Router } from 'express'
import prisma from '../lib/prisma.js'
import { nextCode } from '../lib/codes.js'
import { auth, requireRole } from '../middleware/auth.js'
import { msg } from '../lib/messages.js'

const router = Router()
const admin = [auth, requireRole('ADMIN')]

// ── กติกาการเปิด/ปิดใช้งาน ──
// หน้า "ข้อมูลหลัก" เห็นทุกรายการรวมที่ปิดไว้ (จะได้เปิดกลับได้)
// ส่วน dropdown ที่อื่นส่ง ?activeOnly=1 มา เพื่อไม่ให้เลือกของที่เลิกใช้แล้ว
const activeFilter = req => (req.query.activeOnly === '1' ? { active: true } : {})

// ที่ยังเปิดใช้อยู่ขึ้นก่อนเสมอ แล้วค่อยเรียงตามชื่อ
const ORDER = [{ active: 'desc' }, { name: 'asc' }]

// ── Factory สำหรับ master แบบมีแค่ชื่อ (unit, category, payment-method) ──
function simpleCrud(path, model) {
  router.get(`/${path}`, auth, async (req, res) => {
    res.json(await prisma[model].findMany({ where: activeFilter(req), orderBy: ORDER }))
  })
  router.post(`/${path}`, ...admin, async (req, res) => {
    try {
      res.json(await prisma[model].create({ data: { name: req.body.name } }))
    } catch (e) {
      res.status(400).json({ error: e.code === 'P2002' ? msg(req, 'NAME_TAKEN') : e.message })
    }
  })
  router.put(`/${path}/:id`, ...admin, async (req, res) => {
    const { name, active } = req.body
    res.json(await prisma[model].update({ where: { id: +req.params.id }, data: { name, active } }))
  })
  router.delete(`/${path}/:id`, ...admin, async (req, res) => {
    await prisma[model].delete({ where: { id: +req.params.id } })
    res.json({ ok: true })
  })
}

simpleCrud('units', 'unit')
simpleCrud('categories', 'itemCategory')
simpleCrud('payment-methods', 'paymentMethod')

// ── Rooms (ห้องตรวจ/ห้องหัตถการ) ──
router.get('/rooms', auth, async (req, res) => {
  res.json(await prisma.room.findMany({ where: activeFilter(req), orderBy: [{ active: 'desc' }, { id: 'asc' }] }))
})
router.post('/rooms', ...admin, async (req, res) => {
  const { name, note } = req.body
  res.json(await prisma.room.create({ data: { name, note } }))
})
router.put('/rooms/:id', ...admin, async (req, res) => {
  const { name, note, active } = req.body
  res.json(await prisma.room.update({ where: { id: +req.params.id }, data: { name, note, active } }))
})
router.delete('/rooms/:id', ...admin, async (req, res) => {
  await prisma.room.delete({ where: { id: +req.params.id } })
  res.json({ ok: true })
})

// ── Departments ──
router.get('/departments', auth, async (req, res) => {
  res.json(await prisma.department.findMany({ where: activeFilter(req), orderBy: ORDER }))
})
router.post('/departments', ...admin, async (req, res) => {
  const { name, note } = req.body
  res.json(await prisma.department.create({ data: { name, note } }))
})
router.put('/departments/:id', ...admin, async (req, res) => {
  const { name, note, active } = req.body
  res.json(await prisma.department.update({ where: { id: +req.params.id }, data: { name, note, active } }))
})
router.delete('/departments/:id', ...admin, async (req, res) => {
  await prisma.department.delete({ where: { id: +req.params.id } })
  res.json({ ok: true })
})

// ── Services (รายการบริการ/ค่ารักษา) ──
router.get('/services', auth, async (req, res) => {
  res.json(await prisma.service.findMany({
    where: activeFilter(req),
    include: { department: true },
    orderBy: [{ active: 'desc' }, { code: 'asc' }],
  }))
})
router.post('/services', ...admin, async (req, res) => {
  const { name, price, departmentId } = req.body
  res.json(await prisma.service.create({
    data: {
      code: await nextCode('service', 'SV'),
      name, price: price ? +price : 0,
      departmentId: departmentId ? +departmentId : null,
    },
  }))
})
router.put('/services/:id', ...admin, async (req, res) => {
  const { name, price, departmentId, active } = req.body
  res.json(await prisma.service.update({
    where: { id: +req.params.id },
    data: { name, price: price != null ? +price : undefined, active, departmentId: departmentId ? +departmentId : null },
  }))
})
router.delete('/services/:id', ...admin, async (req, res) => {
  await prisma.service.delete({ where: { id: +req.params.id } })
  res.json({ ok: true })
})

export default router

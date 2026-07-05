import { Router } from 'express'
import prisma from '../lib/prisma.js'
import { nextCode } from '../lib/codes.js'
import { auth, requireRole } from '../middleware/auth.js'

const router = Router()
const num = v => (v === '' || v == null ? null : +v)

router.get('/', auth, async (_req, res) => {
  res.json(await prisma.item.findMany({
    include: { category: true, unit: true },
    orderBy: { code: 'asc' },
  }))
})

router.post('/', auth, requireRole('ADMIN'), async (req, res) => {
  const { name, categoryId, unitId, price, cost, stockQty } = req.body
  res.json(await prisma.item.create({
    data: {
      code: await nextCode('item', 'IT'),
      name,
      categoryId: num(categoryId), unitId: num(unitId),
      price: +price || 0, cost: +cost || 0, stockQty: +stockQty || 0,
    },
    include: { category: true, unit: true },
  }))
})

router.put('/:id', auth, requireRole('ADMIN'), async (req, res) => {
  const { name, categoryId, unitId, price, cost, stockQty, active } = req.body
  res.json(await prisma.item.update({
    where: { id: +req.params.id },
    data: {
      name, active,
      categoryId: num(categoryId), unitId: num(unitId),
      price: num(price) ?? undefined, cost: num(cost) ?? undefined,
      stockQty: stockQty === undefined ? undefined : +stockQty,
    },
    include: { category: true, unit: true },
  }))
})

router.delete('/:id', auth, requireRole('ADMIN'), async (req, res) => {
  await prisma.item.delete({ where: { id: +req.params.id } })
  res.json({ ok: true })
})

export default router

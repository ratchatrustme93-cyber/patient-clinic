import { Router } from 'express'
import prisma from '../lib/prisma.js'
import { nextCode } from '../lib/codes.js'
import { auth, requireRole } from '../middleware/auth.js'

const router = Router()
const num = v => (v === '' || v == null ? null : +v)

router.get('/', auth, async (_req, res) => {
  res.json(await prisma.material.findMany({ include: { unit: true }, orderBy: { code: 'asc' } }))
})

router.post('/', auth, requireRole('ADMIN'), async (req, res) => {
  const { name, unitId, cost, stockQty, reorderLevel } = req.body
  res.json(await prisma.material.create({
    data: {
      code: await nextCode('material', 'MT'),
      name, unitId: num(unitId),
      cost: +cost || 0, stockQty: +stockQty || 0, reorderLevel: num(reorderLevel),
    },
    include: { unit: true },
  }))
})

router.put('/:id', auth, requireRole('ADMIN'), async (req, res) => {
  const { name, unitId, cost, stockQty, reorderLevel, active } = req.body
  res.json(await prisma.material.update({
    where: { id: +req.params.id },
    data: {
      name, active, unitId: num(unitId),
      cost: num(cost) ?? undefined,
      stockQty: stockQty === undefined ? undefined : +stockQty,
      reorderLevel: num(reorderLevel),
    },
    include: { unit: true },
  }))
})

router.delete('/:id', auth, requireRole('ADMIN'), async (req, res) => {
  await prisma.material.delete({ where: { id: +req.params.id } })
  res.json({ ok: true })
})

export default router

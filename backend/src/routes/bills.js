import { Router } from 'express'
import prisma from '../lib/prisma.js'
import { nextCode } from '../lib/codes.js'
import { auth, requireRole } from '../middleware/auth.js'
import { msg } from '../lib/messages.js'
import { PATIENT_BRIEF, canAccessPatient } from '../lib/patientAccess.js'

const router = Router()

function buildItems(items = []) {
  return items
    .filter(it => it.description)
    .map(it => {
      const qty = +it.qty || 1
      const unitPrice = +it.unitPrice || 0
      return {
        kind: it.kind || 'OTHER',
        refId: it.refId ? +it.refId : null,
        description: it.description,
        qty, unitPrice,
        amount: qty * unitPrice,
      }
    })
}

const totals = (items, discount = 0) => {
  const subtotal = items.reduce((s, it) => s + it.amount, 0)
  return { subtotal, total: Math.max(0, subtotal - (+discount || 0)) }
}

// GET /api/bills?status=&patientId=
router.get('/', auth, async (req, res) => {
  const { status, patientId } = req.query
  const where = {}
  if (status) where.status = status
  if (patientId) where.patientId = +patientId
  res.json(await prisma.bill.findMany({
    where,
    include: { patient: { select: { hn: true, name: true } }, paymentMethod: true, _count: { select: { items: true } } },
    orderBy: { date: 'desc' },
  }))
})

router.get('/:id', auth, async (req, res) => {
  const bill = await prisma.bill.findUnique({
    where: { id: +req.params.id },
    include: { patient: PATIENT_BRIEF, paymentMethod: true, items: true, visit: true },
  })
  if (!bill) return res.status(404).json({ error: msg(req, 'NOT_FOUND') })
  if (!(await canAccessPatient(req.user, bill.patientId))) {
    return res.status(403).json({ error: msg(req, 'BILL_FORBIDDEN') })
  }
  res.json(bill)
})

router.post('/', auth, async (req, res) => {
  const { patientId, visitId, discount, note, items } = req.body
  const lines = buildItems(items)
  const { subtotal, total } = totals(lines, discount)
  const bill = await prisma.bill.create({
    data: {
      billNo: await nextCode('bill', 'B', 6),
      patientId: +patientId,
      visitId: visitId ? +visitId : null,
      discount: +discount || 0,
      subtotal, total,
      note,
      items: { create: lines },
    },
    include: { patient: PATIENT_BRIEF, items: true },
  })
  res.json(bill)
})

router.put('/:id', auth, async (req, res) => {
  const id = +req.params.id
  const { discount, note, items } = req.body
  const lines = buildItems(items)
  const { subtotal, total } = totals(lines, discount)
  const bill = await prisma.$transaction(async tx => {
    await tx.billItem.deleteMany({ where: { billId: id } })
    return tx.bill.update({
      where: { id },
      data: { discount: +discount || 0, subtotal, total, note, items: { create: lines } },
      include: { patient: PATIENT_BRIEF, items: true },
    })
  })
  res.json(bill)
})

// ชำระเงิน
router.post('/:id/pay', auth, async (req, res) => {
  const { paymentMethodId } = req.body
  res.json(await prisma.bill.update({
    where: { id: +req.params.id },
    data: { status: 'PAID', paidAt: new Date(), paymentMethodId: paymentMethodId ? +paymentMethodId : null },
    include: { paymentMethod: true },
  }))
})

router.delete('/:id', auth, requireRole('ADMIN'), async (req, res) => {
  await prisma.bill.update({ where: { id: +req.params.id }, data: { status: 'CANCELLED' } })
  res.json({ ok: true })
})

export default router

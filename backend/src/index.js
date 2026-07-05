import 'dotenv/config'
import express from 'express'
import cors from 'cors'

import prisma from './lib/prisma.js'
import authRouter from './routes/auth.js'
import employeesRouter from './routes/employees.js'
import masterRouter from './routes/master.js'
import itemsRouter from './routes/items.js'
import materialsRouter from './routes/materials.js'
import patientsRouter from './routes/patients.js'
import appointmentsRouter from './routes/appointments.js'
import visitsRouter from './routes/visits.js'
import billsRouter from './routes/bills.js'
import overviewRouter from './routes/overview.js'

const app = express()
app.use(cors())
app.use(express.json())

app.use('/api/auth', authRouter)
app.use('/api/employees', employeesRouter)
app.use('/api/master', masterRouter)
app.use('/api/items', itemsRouter)
app.use('/api/materials', materialsRouter)
app.use('/api/patients', patientsRouter)
app.use('/api/appointments', appointmentsRouter)
app.use('/api/visits', visitsRouter)
app.use('/api/bills', billsRouter)
app.use('/api/overview', overviewRouter)

app.get('/api/health', (_req, res) => res.json({ ok: true }))

async function logAdmins() {
  try {
    const admins = await prisma.user.findMany({
      where: { role: { in: ['MASTER', 'ADMIN'] } },
      select: { id: true, code: true, name: true, email: true, role: true },
      orderBy: { id: 'asc' },
    })
    console.log('\n===== MASTER / ADMIN USERS =====')
    if (admins.length === 0) console.log('  (ยังไม่มี — รัน `npm run db:seed`)')
    admins.forEach(a => console.log(`  ${a.role.padEnd(7)} ${a.code}  ${a.name} <${a.email}>`))
    console.log('================================\n')
  } catch (e) {
    console.error('logAdmins error:', e.message)
  }
}

const PORT = process.env.PORT || 3008
app.listen(PORT, async () => {
  console.log(`Patient Clinic API running on :${PORT}`)
  await logAdmins()
})

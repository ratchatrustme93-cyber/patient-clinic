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
import voiceRouter from './routes/voice.js'

const app = express()
app.use(cors())
app.use(express.json({ limit: '50mb' })) // รองรับรูป/เสียง base64

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
app.use('/api/voice-records', voiceRouter)

app.get('/api/health', (_req, res) => res.json({ ok: true }))

// รหัสผ่านเริ่มต้นตาม role (ตั้งใน prisma/seed.js) — DB เก็บเป็น bcrypt hash
const SEED_PW = { MASTER: 'master123', ADMIN: 'admin123', DOCTOR: 'doctor123', ASSISTANT: 'assistant123', EMPLOYEE: 'employee123' }

async function logUsers() {
  try {
    const users = await prisma.user.findMany({
      select: { code: true, name: true, email: true, role: true },
      orderBy: { id: 'asc' },
    })
    console.log('\n╔══════════════════ บัญชีเข้าระบบทั้งหมด (login) ══════════════════╗')
    if (users.length === 0) {
      console.log('  (ยังไม่มี user — รัน `npm run db:seed`)')
    } else {
      users.forEach(u => {
        const cred = `${u.email}  /  ${SEED_PW[u.role] || '(รหัสถูกแก้)'}`
        console.log(`  ${u.role.padEnd(9)} ${cred.padEnd(46)} ${u.name}`)
      })
      console.log(`  ── รวม ${users.length} บัญชี · รหัสอิงตาม seed.js (ถ้าแก้รหัสผ่านหน้าเว็บ ค่าอาจไม่ตรง) ──`)
    }
    console.log('╚══════════════════════════════════════════════════════════════════╝\n')
  } catch (e) {
    console.error('logUsers error:', e.message)
  }
}

const PORT = process.env.PORT || 3008
app.listen(PORT, async () => {
  console.log(`Patient Clinic API running on :${PORT}`)
  await logUsers()
})

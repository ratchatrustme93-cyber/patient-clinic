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

// อนุญาตเฉพาะ origin ของ frontend — กันเว็บอื่นยิง API ตรง ๆ
const ORIGINS = (process.env.CORS_ORIGIN || '').split(',').map(s => s.trim()).filter(Boolean)
app.use(cors({
  origin(origin, cb) {
    // ไม่มี origin = เรียกจาก curl / <audio> / same-origin — ปล่อยผ่าน (auth คุมอีกชั้นอยู่แล้ว)
    // origin แปลกปลอม → ไม่ส่ง header CORS กลับ (เบราว์เซอร์บล็อกเอง) แทนที่จะโยน error เป็น 500
    cb(null, !origin || ORIGINS.includes(origin))
  },
}))

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

// เดิมตรงนี้พิมพ์อีเมล + รหัสผ่าน plaintext ของทุกบัญชีลง console ทุกครั้งที่สตาร์ต
// ซึ่งติดไปกับ log / scrollback / journal — ตัดออก เหลือแค่จำนวนบัญชี
async function logStartup() {
  try {
    const n = await prisma.user.count()
    console.log(n === 0 ? '  (ยังไม่มี user — รัน `npm run db:seed`)' : `  บัญชีเข้าระบบ ${n} บัญชี · รหัสผ่านดูได้ที่ prisma/seed.js`)
  } catch (e) {
    console.error('  ต่อ DB ไม่ได้:', e.message)
  }
}

const PORT = process.env.PORT || 3008
app.listen(PORT, async () => {
  console.log(`Patient Clinic API running on :${PORT}`)
  await logStartup()
})

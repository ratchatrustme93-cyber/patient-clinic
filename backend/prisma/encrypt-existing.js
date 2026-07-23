import 'dotenv/config'
import prisma from '../src/lib/prisma.js'
import { ENCRYPTED_FIELDS } from '../src/lib/encryptedFields.js'

// ── เข้ารหัสข้อมูลเดิมที่ยังเป็น plaintext ──
//
//   ⚠️ สำรอง DB ก่อนรันทุกครั้ง:
//   pg_dump -h localhost -U <user> -d patient_clinic -f backup.sql
//
// วิธีทำงาน: อ่านผ่าน prisma ที่ครอบ extension ไว้ (ค่าเก่า = ปล่อยผ่าน, ค่าที่เข้ารหัสแล้ว = ถอดออกมา)
// แล้วเขียนกลับ (extension เข้ารหัสให้) · encrypt() ข้ามค่าที่ขึ้นต้นด้วย 'v1:' อยู่แล้ว
// จึงรันซ้ำกี่รอบก็ได้ ไม่เข้ารหัสซ้อนกัน

const TARGETS = [
  { model: 'patient', name: 'Patient', label: 'คนไข้' },
  { model: 'visit', name: 'Visit', label: 'การรักษา' },
  { model: 'voiceRecord', name: 'VoiceRecord', label: 'บันทึกเสียง' },
]

async function run() {
  for (const { model, name, label } of TARGETS) {
    const fields = ENCRYPTED_FIELDS[name]
    const rows = await prisma[model].findMany({ select: { id: true, ...Object.fromEntries(fields.map(f => [f, true])) } })

    let touched = 0
    for (const row of rows) {
      const data = {}
      for (const f of fields) if (row[f] != null && row[f] !== '') data[f] = row[f]
      if (!Object.keys(data).length) continue
      await prisma[model].update({ where: { id: row.id }, data })
      touched++
    }
    console.log(`  ${label.padEnd(12)} ${String(touched).padStart(4)} / ${rows.length} แถวที่มีข้อมูลให้เข้ารหัส`)
  }
}

console.log('เริ่มเข้ารหัสข้อมูลเดิม...')
run()
  .then(() => console.log('เสร็จแล้ว · รันซ้ำได้ปลอดภัย ไม่เข้ารหัสซ้อน'))
  .catch(e => { console.error('ล้มเหลว:', e); process.exitCode = 1 })
  .finally(() => prisma.$disconnect())

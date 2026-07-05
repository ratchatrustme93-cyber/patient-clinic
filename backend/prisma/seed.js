import 'dotenv/config'
import bcrypt from 'bcryptjs'
import prisma from '../src/lib/prisma.js'

const TABLES = [
  'BillItem', 'Bill', 'Visit', 'Appointment', 'Patient',
  'Item', 'Material', 'Service', 'User',
  'Department', 'Unit', 'ItemCategory', 'PaymentMethod', 'Room',
]

async function main() {
  console.log('🧹 ล้างฐานข้อมูล...')
  await prisma.$executeRawUnsafe(
    `TRUNCATE TABLE ${TABLES.map(t => `"${t}"`).join(', ')} RESTART IDENTITY CASCADE`
  )

  // ── Master data ──
  const depts = {}
  for (const name of ['อายุรกรรม', 'ทันตกรรม', 'กายภาพบำบัด', 'ผิวหนัง']) {
    depts[name] = await prisma.department.create({ data: { name } })
  }
  const units = {}
  for (const name of ['ชิ้น', 'ขวด', 'กล่อง', 'เม็ด', 'mg']) {
    units[name] = await prisma.unit.create({ data: { name } })
  }
  const cats = {}
  for (const name of ['ยา', 'เวชภัณฑ์', 'อุปกรณ์']) {
    cats[name] = await prisma.itemCategory.create({ data: { name } })
  }
  for (const name of ['เงินสด', 'โอนพร้อมเพย์', 'บัตรเครดิต']) {
    await prisma.paymentMethod.create({ data: { name } })
  }
  const rooms = {}
  for (const name of ['ห้องตรวจ 1', 'ห้องตรวจ 2', 'ห้องหัตถการ', 'ห้องกายภาพ']) {
    rooms[name] = await prisma.room.create({ data: { name } })
  }

  // ── Services ──
  const services = [
    ['ตรวจโรคทั่วไป', 300, 'อายุรกรรม'],
    ['ขูดหินปูน', 800, 'ทันตกรรม'],
    ['กายภาพบำบัด 1 ครั้ง', 500, 'กายภาพบำบัด'],
    ['เอกซเรย์', 400, 'อายุรกรรม'],
  ]
  let sv = 0
  const svcRows = []
  for (const [name, price, dept] of services) {
    svcRows.push(await prisma.service.create({
      data: { code: `SV${String(++sv).padStart(4, '0')}`, name, price, departmentId: depts[dept].id },
    }))
  }

  // ── Users (admin, employee, doctor, assistant) ──
  const pw = async p => bcrypt.hash(p, 10)
  let emp = 0
  const mk = async (data) => prisma.user.create({ data: { code: `EMP${String(++emp).padStart(4, '0')}`, ...data } })
  const master = await mk({ name: 'Super Master', email: 'master@clinic.local', password: await pw('master123'), role: 'MASTER', position: 'เจ้าของระบบ' })
  await mk({ name: 'ผู้ดูแล แอดมิน', email: 'admin@clinic.local', password: await pw('admin123'), role: 'ADMIN', position: 'ผู้จัดการคลินิก' })
  const doctor = await mk({ name: 'นพ. สมชาย ใจดี', email: 'doctor@clinic.local', password: await pw('doctor123'), role: 'DOCTOR', specialty: 'อายุรกรรม', licenseNo: 'ว.12345', departmentId: depts['อายุรกรรม'].id })
  await mk({ name: 'พว. สมหญิง ช่วยงาน', email: 'assistant@clinic.local', password: await pw('assistant123'), role: 'ASSISTANT', position: 'ผู้ช่วยแพทย์', departmentId: depts['อายุรกรรม'].id })
  await mk({ name: 'สมศรี ต้อนรับ', email: 'employee@clinic.local', password: await pw('employee123'), role: 'EMPLOYEE', position: 'เวชระเบียน' })

  // ── Items & materials ──
  let it = 0
  const mkItem = (name, cat, unit, price, cost, stock) => prisma.item.create({
    data: { code: `IT${String(++it).padStart(4, '0')}`, name, categoryId: cats[cat].id, unitId: units[unit].id, price, cost, stockQty: stock },
  })
  await mkItem('พาราเซตามอล 500mg', 'ยา', 'เม็ด', 2, 0.5, 500)
  await mkItem('วิตามินซี', 'ยา', 'เม็ด', 5, 1.5, 300)
  await mkItem('น้ำเกลือล้างแผล', 'เวชภัณฑ์', 'ขวด', 35, 18, 40)

  let mt = 0
  const mkMat = (name, unit, cost, stock, reorder) => prisma.material.create({
    data: { code: `MT${String(++mt).padStart(4, '0')}`, name, unitId: units[unit].id, cost, stockQty: stock, reorderLevel: reorder },
  })
  await mkMat('สำลี', 'กล่อง', 25, 30, 10)
  await mkMat('เข็มฉีดยา', 'ชิ้น', 3, 8, 20)      // ต่ำกว่า reorder → เตือน
  await mkMat('ถุงมือยาง', 'กล่อง', 90, 15, 5)

  // ── Patients ──
  let hn = 0
  const mkPat = (data) => prisma.patient.create({ data: { hn: `HN${String(++hn).padStart(5, '0')}`, ...data } })
  const p1 = await mkPat({ name: 'มานะ อดทน', gender: 'MALE', phone: '0812345678', bloodType: 'O', allergies: 'Penicillin' })
  await mkPat({ name: 'ปิติ ยินดี', gender: 'FEMALE', phone: '0898765432', bloodType: 'A' })
  await mkPat({ name: 'ชูใจ รักเรียน', gender: 'FEMALE', phone: '0655554444', chronic: 'เบาหวาน' })

  // ── Appointment วันนี้ (ตัวอย่างในหลายห้อง) ──
  const at = (h, m = 0) => { const d = new Date(); d.setHours(h, m, 0, 0); return d }
  await prisma.appointment.create({
    data: {
      patientId: p1.id, doctorId: doctor.id, departmentId: depts['อายุรกรรม'].id,
      serviceId: svcRows[0].id, roomId: rooms['ห้องตรวจ 1'].id,
      scheduledAt: at(10), status: 'CONFIRMED', note: 'ตรวจสุขภาพประจำปี',
    },
  })
  const p2 = await prisma.patient.findFirst({ where: { hn: 'HN00002' } })
  await prisma.appointment.create({
    data: {
      patientId: p2.id, doctorId: doctor.id, roomId: rooms['ห้องหัตถการ'].id,
      serviceId: svcRows[1].id, scheduledAt: at(11), status: 'SCHEDULED',
    },
  })

  console.log('✅ Seed สำเร็จ\n')
  console.log('┌─────────────── บัญชีเข้าระบบ (login) ───────────────┐')
  console.log('│  MASTER     master@clinic.local     / master123     │')
  console.log('│  ADMIN      admin@clinic.local      / admin123      │')
  console.log('│  DOCTOR     doctor@clinic.local     / doctor123     │')
  console.log('│  ASSISTANT  assistant@clinic.local  / assistant123  │')
  console.log('│  EMPLOYEE   employee@clinic.local   / employee123   │')
  console.log('└─────────────────────────────────────────────────────┘')
  console.log(`\n👉 MASTER user #${master.id} (${master.code}) — เข้าระบบที่ http://localhost:5175/login`)
}

main()
  .catch(e => { console.error('❌ Seed failed:', e); process.exit(1) })
  .finally(async () => { await prisma.$disconnect() })

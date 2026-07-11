import 'dotenv/config'
import bcrypt from 'bcryptjs'
import prisma from '../src/lib/prisma.js'

const TABLES = [
  'BillItem', 'Bill', 'Visit', 'Appointment', 'Patient',
  'Item', 'Material', 'Service', 'User',
  'Department', 'Unit', 'ItemCategory', 'PaymentMethod', 'Room',
]

// วันนี้/ต่างวัน ณ เวลา h:m  (offsetDays ลบ = อดีต, บวก = อนาคต)
const dayAt = (offsetDays, h, m = 0) => {
  const d = new Date()
  d.setDate(d.getDate() + offsetDays)
  d.setHours(h, m, 0, 0)
  return d
}

async function main() {
  console.log('🧹 ล้างฐานข้อมูล...')
  await prisma.$executeRawUnsafe(
    `TRUNCATE TABLE ${TABLES.map(t => `"${t}"`).join(', ')} RESTART IDENTITY CASCADE`
  )

  // ── Master data ──
  const depts = {}
  for (const name of ['อายุรกรรม', 'ทันตกรรม', 'กายภาพบำบัด', 'ผิวหนัง', 'กุมารเวชกรรม', 'ศัลยกรรมกระดูก']) {
    depts[name] = await prisma.department.create({ data: { name } })
  }
  const units = {}
  for (const name of ['ชิ้น', 'ขวด', 'กล่อง', 'เม็ด', 'หลอด', 'mg']) {
    units[name] = await prisma.unit.create({ data: { name } })
  }
  const cats = {}
  for (const name of ['ยา', 'เวชภัณฑ์', 'อุปกรณ์']) {
    cats[name] = await prisma.itemCategory.create({ data: { name } })
  }
  const pms = {}
  for (const name of ['เงินสด', 'โอนพร้อมเพย์', 'บัตรเครดิต']) {
    pms[name] = await prisma.paymentMethod.create({ data: { name } })
  }
  const rooms = {}
  for (const name of ['ห้องตรวจ 1', 'ห้องตรวจ 2', 'ห้องตรวจ 3', 'ห้องหัตถการ', 'ห้องกายภาพ', 'ห้องทันตกรรม']) {
    rooms[name] = await prisma.room.create({ data: { name } })
  }

  // ── Services ──
  const svc = {}
  let sv = 0
  const services = [
    ['ตรวจโรคทั่วไป', 300, 'อายุรกรรม'],
    ['ตรวจเลือด CBC', 350, 'อายุรกรรม'],
    ['เอกซเรย์ทรวงอก', 400, 'อายุรกรรม'],
    ['ขูดหินปูน', 800, 'ทันตกรรม'],
    ['อุดฟัน', 700, 'ทันตกรรม'],
    ['ถอนฟัน', 600, 'ทันตกรรม'],
    ['ฟอกสีฟัน', 3500, 'ทันตกรรม'],
    ['กายภาพบำบัด 1 ครั้ง', 500, 'กายภาพบำบัด'],
    ['อัลตราซาวด์บำบัด', 400, 'กายภาพบำบัด'],
    ['ตรวจผิวหนัง', 500, 'ผิวหนัง'],
    ['จี้ไฝ/กระ', 800, 'ผิวหนัง'],
    ['ตรวจสุขภาพเด็ก', 350, 'กุมารเวชกรรม'],
    ['ฉีดวัคซีนเด็ก', 900, 'กุมารเวชกรรม'],
    ['ตรวจกระดูกและข้อ', 600, 'ศัลยกรรมกระดูก'],
    ['ใส่เฝือก', 1200, 'ศัลยกรรมกระดูก'],
  ]
  for (const [name, price, dept] of services) {
    svc[name] = await prisma.service.create({
      data: { code: `SV${String(++sv).padStart(4, '0')}`, name, price, departmentId: depts[dept].id },
    })
  }

  // ── Users (บุคลากร) ──
  const pw = async p => bcrypt.hash(p, 10)
  let emp = 0
  const mk = async (data) => prisma.user.create({ data: { code: `EMP${String(++emp).padStart(4, '0')}`, ...data } })

  const master = await mk({ name: 'Super Master', email: 'master@clinic.local', password: await pw('master123'), role: 'MASTER', position: 'เจ้าของระบบ' })
  await mk({ name: 'ผู้ดูแล แอดมิน', email: 'admin@clinic.local', password: await pw('admin123'), role: 'ADMIN', position: 'ผู้จัดการคลินิก' })

  // แพทย์ (หลายแผนก) — คนแรกใช้ล็อกอินสาธิต
  const doc = {}
  doc.somchai = await mk({ name: 'นพ. สมชาย ใจดี', email: 'doctor@clinic.local', password: await pw('doctor123'), role: 'DOCTOR', specialty: 'อายุรกรรม', licenseNo: 'ว.12345', phone: '0810000001', departmentId: depts['อายุรกรรม'].id })
  doc.arunee = await mk({ name: 'พญ. อรุณี แสงทอง', email: 'arunee@clinic.local', password: await pw('doctor123'), role: 'DOCTOR', specialty: 'ผิวหนัง', licenseNo: 'ว.22841', phone: '0810000002', departmentId: depts['ผิวหนัง'].id })
  doc.thana = await mk({ name: 'ทพ. ธนา ยิ้มสวย', email: 'thana@clinic.local', password: await pw('doctor123'), role: 'DOCTOR', specialty: 'ทันตกรรม', licenseNo: 'ท.5521', phone: '0810000003', departmentId: depts['ทันตกรรม'].id })
  doc.wittaya = await mk({ name: 'นพ. วิทยา กระดูกดี', email: 'wittaya@clinic.local', password: await pw('doctor123'), role: 'DOCTOR', specialty: 'ศัลยกรรมกระดูก', licenseNo: 'ว.33112', phone: '0810000004', departmentId: depts['ศัลยกรรมกระดูก'].id })
  doc.kanda = await mk({ name: 'พญ. กานดา เด็กดี', email: 'kanda@clinic.local', password: await pw('doctor123'), role: 'DOCTOR', specialty: 'กุมารเวชกรรม', licenseNo: 'ว.44890', phone: '0810000005', departmentId: depts['กุมารเวชกรรม'].id })
  doc.pakorn = await mk({ name: 'กภ. ปกรณ์ ยืดเส้น', email: 'pakorn@clinic.local', password: await pw('doctor123'), role: 'DOCTOR', specialty: 'กายภาพบำบัด', licenseNo: 'ก.7781', phone: '0810000006', departmentId: depts['กายภาพบำบัด'].id })

  // ผู้ช่วยแพทย์ / พยาบาล
  await mk({ name: 'พว. สมหญิง ช่วยงาน', email: 'assistant@clinic.local', password: await pw('assistant123'), role: 'ASSISTANT', position: 'ผู้ช่วยแพทย์', phone: '0820000001', departmentId: depts['อายุรกรรม'].id })
  const asst2 = await mk({ name: 'พว. ณิชา พยาบาล', email: 'nicha@clinic.local', password: await pw('assistant123'), role: 'ASSISTANT', position: 'พยาบาล', phone: '0820000002', departmentId: depts['ทันตกรรม'].id })
  await mk({ name: 'พว. บุษบา ดูแล', email: 'budsaba@clinic.local', password: await pw('assistant123'), role: 'ASSISTANT', position: 'พยาบาล', phone: '0820000003', departmentId: depts['กุมารเวชกรรม'].id })

  // พนักงานทั่วไป
  await mk({ name: 'สมศรี ต้อนรับ', email: 'employee@clinic.local', password: await pw('employee123'), role: 'EMPLOYEE', position: 'เวชระเบียน', phone: '0830000001' })
  await mk({ name: 'อนงค์ การเงิน', email: 'anong@clinic.local', password: await pw('employee123'), role: 'EMPLOYEE', position: 'แคชเชียร์', phone: '0830000002' })

  // ── Items (ยา/เวชภัณฑ์) & Materials (วัสดุ) ──
  let it = 0
  const mkItem = (name, cat, unit, price, cost, stock) => prisma.item.create({
    data: { code: `IT${String(++it).padStart(4, '0')}`, name, categoryId: cats[cat].id, unitId: units[unit].id, price, cost, stockQty: stock },
  })
  await mkItem('พาราเซตามอล 500mg', 'ยา', 'เม็ด', 2, 0.5, 500)
  await mkItem('วิตามินซี', 'ยา', 'เม็ด', 5, 1.5, 300)
  await mkItem('ยาแก้แพ้ (Loratadine)', 'ยา', 'เม็ด', 4, 1, 250)
  await mkItem('ยาลดกรด', 'ยา', 'เม็ด', 3, 0.8, 180)
  await mkItem('น้ำเกลือล้างแผล', 'เวชภัณฑ์', 'ขวด', 35, 18, 40)
  await mkItem('พลาสเตอร์ยา', 'เวชภัณฑ์', 'กล่อง', 45, 22, 60)
  await mkItem('เครื่องวัดความดัน', 'อุปกรณ์', 'ชิ้น', 1200, 850, 8)

  let mt = 0
  const mkMat = (name, unit, cost, stock, reorder) => prisma.material.create({
    data: { code: `MT${String(++mt).padStart(4, '0')}`, name, unitId: units[unit].id, cost, stockQty: stock, reorderLevel: reorder },
  })
  await mkMat('สำลี', 'กล่อง', 25, 30, 10)
  await mkMat('เข็มฉีดยา', 'ชิ้น', 3, 8, 20)       // ต่ำกว่า reorder → เตือน
  await mkMat('ถุงมือยาง', 'กล่อง', 90, 15, 5)
  await mkMat('ผ้าก๊อซ', 'กล่อง', 40, 4, 10)       // ต่ำกว่า reorder → เตือน
  await mkMat('แอลกอฮอล์ 70%', 'ขวด', 30, 25, 8)
  await mkMat('หน้ากากอนามัย', 'กล่อง', 50, 40, 15)

  // ── Patients (ข้อมูลครบแบบ รพ.) ──
  let hn = 0
  const mkPat = (data) => prisma.patient.create({
    data: {
      hn: `HN${String(++hn).padStart(5, '0')}`,
      nationality: 'ไทย', religion: 'พุทธ', ...data,
      birthdate: data.birthdate ? new Date(data.birthdate) : null,
    },
  })

  const pats = []
  pats.push(await mkPat({ title: 'นาย', name: 'มานะ อดทน', nationalId: '1100200301231', gender: 'MALE', birthdate: '1985-04-12', phone: '0812345678', address: '99/1 ถ.สุขุมวิท กรุงเทพฯ', bloodType: 'O', weight: 72, height: 175, occupation: 'วิศวกร', maritalStatus: 'สมรส', insurance: 'ประกันสังคม', allergies: 'Penicillin', emergencyName: 'สมใจ อดทน', emergencyRelation: 'คู่สมรส', emergencyPhone: '0899990001' }))
  pats.push(await mkPat({ title: 'นางสาว', name: 'ปิติ ยินดี', nationalId: '1409900112345', gender: 'FEMALE', birthdate: '1992-08-01', phone: '0898765432', address: '12 ถ.นิมมาน เชียงใหม่', bloodType: 'A', weight: 55, height: 162, occupation: 'ครู', maritalStatus: 'โสด', insurance: 'เงินสด' }))
  pats.push(await mkPat({ title: 'นางสาว', name: 'ชูใจ รักเรียน', nationalId: '1102003334455', gender: 'FEMALE', birthdate: '2000-02-20', phone: '0655554444', address: '45 ถ.มิตรภาพ ขอนแก่น', bloodType: 'B', weight: 50, height: 158, occupation: 'นักศึกษา', maritalStatus: 'โสด', chronic: 'เบาหวาน' }))
  pats.push(await mkPat({ title: 'นาย', name: 'วีระ กล้าหาญ', nationalId: '3100600778899', gender: 'MALE', birthdate: '1978-11-05', phone: '0811112222', address: '8 ถ.เพชรเกษม กรุงเทพฯ', bloodType: 'AB', weight: 80, height: 170, occupation: 'ตำรวจ', maritalStatus: 'สมรส', insurance: 'ข้าราชการ/รัฐวิสาหกิจ', allergies: 'Aspirin', chronic: 'ความดันโลหิตสูง', emergencyName: 'มาลี กล้าหาญ', emergencyRelation: 'คู่สมรส', emergencyPhone: '0899990004' }))
  pats.push(await mkPat({ title: 'นาง', name: 'สุดา ใจงาม', nationalId: '3200500445566', gender: 'FEMALE', birthdate: '1969-06-30', phone: '0844445555', address: '77 ถ.ราชดำเนิน กรุงเทพฯ', bloodType: 'O', weight: 65, height: 156, occupation: 'ค้าขาย', maritalStatus: 'หม้าย', insurance: 'บัตรทอง (30 บาท)', chronic: 'เบาหวาน, ไขมันในเลือดสูง', emergencyName: 'สมพร ใจงาม', emergencyRelation: 'บุตร', emergencyPhone: '0899990005' }))
  pats.push(await mkPat({ title: 'เด็กชาย', name: 'ต้นกล้า สดใส', nationalId: '1101801122334', gender: 'MALE', birthdate: '2018-03-15', phone: '0866667777', address: '5 ถ.รัชดา กรุงเทพฯ', bloodType: 'A', weight: 22, height: 118, occupation: 'นักเรียน', maritalStatus: 'โสด', emergencyName: 'ใจดี สดใส', emergencyRelation: 'มารดา', emergencyPhone: '0899990006' }))
  pats.push(await mkPat({ title: 'นาย', name: 'กมล มั่นคง', nationalId: '1103300556677', gender: 'MALE', birthdate: '1995-12-12', phone: '0877778888', address: '31 ถ.พระราม 9 กรุงเทพฯ', bloodType: 'B', weight: 68, height: 172, occupation: 'พนักงานบริษัท', maritalStatus: 'โสด', insurance: 'ประกันสังคม' }))
  pats.push(await mkPat({ title: 'นางสาว', name: 'รัตนา พงษ์ไพร', nationalId: '1509900667788', gender: 'FEMALE', birthdate: '1988-09-09', phone: '0888889999', address: '19 ถ.ห้วยแก้ว เชียงใหม่', bloodType: 'O', weight: 58, height: 165, occupation: 'พยาบาล', maritalStatus: 'สมรส', allergies: 'อาหารทะเล' }))
  pats.push(await mkPat({ title: 'นาย', name: 'ประยุทธ์ ทองแท้', nationalId: '3100100889900', gender: 'MALE', birthdate: '1960-01-25', phone: '0899991111', address: '2 ถ.เยาวราช กรุงเทพฯ', bloodType: 'A', weight: 74, height: 168, occupation: 'ข้าราชการบำนาญ', maritalStatus: 'สมรส', insurance: 'ข้าราชการ/รัฐวิสาหกิจ', chronic: 'โรคหัวใจ, ความดันโลหิตสูง', emergencyName: 'ทองดี ทองแท้', emergencyRelation: 'คู่สมรส', emergencyPhone: '0899990009' }))
  pats.push(await mkPat({ title: 'นางสาว', name: 'นภา ฟ้าใส', nationalId: '1104400990011', gender: 'FEMALE', birthdate: '2003-07-07', phone: '0900001111', address: '64 ถ.ลาดพร้าว กรุงเทพฯ', bloodType: 'AB', weight: 52, height: 160, occupation: 'นักศึกษา', maritalStatus: 'โสด' }))

  const P = Object.fromEntries(pats.map((p, i) => [i + 1, p])) // P[1]..P[10]

  // ── นัดหมายวันนี้ (หลายสถานะ/หลายห้อง) ──
  const appt = (data) => prisma.appointment.create({ data })
  await appt({ patientId: P[4].id, doctorId: doc.wittaya.id, departmentId: depts['ศัลยกรรมกระดูก'].id, serviceId: svc['ตรวจกระดูกและข้อ'].id, roomId: rooms['ห้องตรวจ 3'].id, scheduledAt: dayAt(0, 9), endAt: dayAt(0, 9, 30), status: 'COMPLETED' })
  await appt({ patientId: P[1].id, doctorId: doc.somchai.id, departmentId: depts['อายุรกรรม'].id, serviceId: svc['ตรวจโรคทั่วไป'].id, roomId: rooms['ห้องตรวจ 1'].id, scheduledAt: dayAt(0, 10), endAt: dayAt(0, 11), status: 'CONFIRMED', note: 'ตรวจสุขภาพประจำปี' })
  await appt({ patientId: P[2].id, doctorId: doc.thana.id, assistantId: asst2.id, departmentId: depts['ทันตกรรม'].id, serviceId: svc['ขูดหินปูน'].id, roomId: rooms['ห้องทันตกรรม'].id, scheduledAt: dayAt(0, 11), endAt: dayAt(0, 11, 30), status: 'SCHEDULED' })
  await appt({ patientId: P[6].id, doctorId: doc.kanda.id, departmentId: depts['กุมารเวชกรรม'].id, serviceId: svc['ฉีดวัคซีนเด็ก'].id, roomId: rooms['ห้องตรวจ 2'].id, scheduledAt: dayAt(0, 13), endAt: dayAt(0, 13, 30), status: 'ARRIVED' })
  await appt({ patientId: P[5].id, doctorId: doc.somchai.id, departmentId: depts['อายุรกรรม'].id, serviceId: svc['ตรวจโรคทั่วไป'].id, roomId: rooms['ห้องตรวจ 1'].id, scheduledAt: dayAt(0, 14), endAt: dayAt(0, 14, 30), status: 'IN_PROGRESS' })
  await appt({ patientId: P[8].id, doctorId: doc.arunee.id, departmentId: depts['ผิวหนัง'].id, serviceId: svc['ตรวจผิวหนัง'].id, roomId: rooms['ห้องตรวจ 2'].id, scheduledAt: dayAt(0, 15), endAt: dayAt(0, 15, 30), status: 'SCHEDULED' })

  // ── นัดหมายล่วงหน้า ──
  await appt({ patientId: P[1].id, doctorId: doc.somchai.id, departmentId: depts['อายุรกรรม'].id, serviceId: svc['ตรวจเลือด CBC'].id, roomId: rooms['ห้องตรวจ 1'].id, scheduledAt: dayAt(1, 10), endAt: dayAt(1, 10, 30), status: 'SCHEDULED', note: 'ติดตามผลเลือด' })
  await appt({ patientId: P[9].id, doctorId: doc.somchai.id, departmentId: depts['อายุรกรรม'].id, serviceId: svc['ตรวจโรคทั่วไป'].id, roomId: rooms['ห้องตรวจ 1'].id, scheduledAt: dayAt(2, 9, 30), endAt: dayAt(2, 10), status: 'CONFIRMED' })
  await appt({ patientId: P[7].id, doctorId: doc.pakorn.id, departmentId: depts['กายภาพบำบัด'].id, serviceId: svc['กายภาพบำบัด 1 ครั้ง'].id, roomId: rooms['ห้องกายภาพ'].id, scheduledAt: dayAt(3, 13), endAt: dayAt(3, 14), status: 'SCHEDULED' })

  // ── ประวัติการรักษา (visit) + บิล ──
  let billNo = 0
  const createBill = (patientId, visitId, items, { status = 'UNPAID', discount = 0, pm = null, daysAgo = 0 } = {}) => {
    const subtotal = items.reduce((s, i) => s + i.qty * i.unitPrice, 0)
    const total = Math.max(0, subtotal - discount)
    const date = dayAt(-daysAgo, 11)
    return prisma.bill.create({
      data: {
        billNo: `B${String(++billNo).padStart(6, '0')}`,
        patientId, visitId, date, discount, subtotal, total, status,
        paymentMethodId: status === 'PAID' ? pms[pm]?.id : null,
        paidAt: status === 'PAID' ? date : null,
        items: { create: items.map(i => ({ ...i, amount: i.qty * i.unitPrice })) },
      },
    })
  }

  // มานะ (P1) — ตรวจไข้หวัด 7 วันก่อน + บิลจ่ายแล้ว
  const pastAppt1 = await appt({ patientId: P[1].id, doctorId: doc.somchai.id, departmentId: depts['อายุรกรรม'].id, serviceId: svc['ตรวจโรคทั่วไป'].id, roomId: rooms['ห้องตรวจ 1'].id, scheduledAt: dayAt(-7, 10), endAt: dayAt(-7, 10, 30), status: 'COMPLETED' })
  const v1 = await prisma.visit.create({ data: { patientId: P[1].id, doctorId: doc.somchai.id, appointmentId: pastAppt1.id, visitDate: dayAt(-7, 10), chiefComplaint: 'ไข้ ไอ เจ็บคอ 2 วัน', diagnosis: 'ไข้หวัด (Common cold)', treatment: 'ให้ยาลดไข้ พักผ่อน ดื่มน้ำมากๆ', note: 'นัดติดตามถ้าไม่ดีขึ้นใน 3 วัน' } })
  await createBill(P[1].id, v1.id, [
    { kind: 'SERVICE', description: 'ตรวจโรคทั่วไป', qty: 1, unitPrice: 300 },
    { kind: 'ITEM', description: 'พาราเซตามอล 500mg', qty: 10, unitPrice: 2 },
  ], { status: 'PAID', pm: 'เงินสด', daysAgo: 7 })

  // วีระ (P4) — ความดันสูง 14 วันก่อน + บิลจ่ายแล้ว
  const v4 = await prisma.visit.create({ data: { patientId: P[4].id, doctorId: doc.somchai.id, visitDate: dayAt(-14, 9), chiefComplaint: 'ปวดศีรษะ วัดความดันสูง', diagnosis: 'ความดันโลหิตสูง (Hypertension)', treatment: 'ปรับยาลดความดัน แนะนำลดเค็ม ออกกำลังกาย', note: '' } })
  await createBill(P[4].id, v4.id, [
    { kind: 'SERVICE', description: 'ตรวจโรคทั่วไป', qty: 1, unitPrice: 300 },
    { kind: 'SERVICE', description: 'ตรวจเลือด CBC', qty: 1, unitPrice: 350 },
  ], { status: 'PAID', pm: 'โอนพร้อมเพย์', daysAgo: 14 })

  // สุดา (P5) — เบาหวาน 3 วันก่อน + บิลค้างชำระ
  const v5 = await prisma.visit.create({ data: { patientId: P[5].id, doctorId: doc.somchai.id, visitDate: dayAt(-3, 10), chiefComplaint: 'อ่อนเพลีย น้ำตาลสูง', diagnosis: 'เบาหวานควบคุมไม่ดี (DM uncontrolled)', treatment: 'ปรับยาเบาหวาน คุมอาหาร นัดเจาะเลือดซ้ำ', note: '' } })
  await createBill(P[5].id, v5.id, [
    { kind: 'SERVICE', description: 'ตรวจโรคทั่วไป', qty: 1, unitPrice: 300 },
    { kind: 'SERVICE', description: 'ตรวจเลือด CBC', qty: 1, unitPrice: 350 },
    { kind: 'ITEM', description: 'วิตามินซี', qty: 30, unitPrice: 5 },
  ], { status: 'UNPAID', daysAgo: 3 })

  // ประยุทธ์ (P9) — โรคหัวใจ follow-up 30 วันก่อน + บิลจ่ายแล้ว (มีส่วนลด)
  const v9 = await prisma.visit.create({ data: { patientId: P[9].id, doctorId: doc.somchai.id, visitDate: dayAt(-30, 9), chiefComplaint: 'ตรวจติดตามโรคหัวใจ', diagnosis: 'โรคหัวใจ — คงที่', treatment: 'ให้ยาเดิม นัดตรวจ EKG ครั้งหน้า', note: 'ผู้ป่วยสิทธิข้าราชการ' } })
  await createBill(P[9].id, v9.id, [
    { kind: 'SERVICE', description: 'ตรวจโรคทั่วไป', qty: 1, unitPrice: 300 },
    { kind: 'SERVICE', description: 'เอกซเรย์ทรวงอก', qty: 1, unitPrice: 400 },
  ], { status: 'PAID', pm: 'บัตรเครดิต', discount: 100, daysAgo: 30 })

  console.log('✅ Seed สำเร็จ')
  console.log(`   บุคลากร ${emp} คน (แพทย์ 6) · คนไข้ ${hn} คน · บริการ ${sv} รายการ · บิล ${billNo} ใบ\n`)
  console.log('┌─────────────── บัญชีเข้าระบบ (login) ───────────────┐')
  console.log('│  MASTER     master@clinic.local     / master123     │')
  console.log('│  ADMIN      admin@clinic.local      / admin123      │')
  console.log('│  DOCTOR     doctor@clinic.local     / doctor123     │')
  console.log('│  ASSISTANT  assistant@clinic.local  / assistant123  │')
  console.log('│  EMPLOYEE   employee@clinic.local   / employee123   │')
  console.log('└─────────────────────────────────────────────────────┘')
  console.log('   (แพทย์ท่านอื่นใช้รหัส doctor123 เช่นกัน — arunee, thana, wittaya, kanda, pakorn @clinic.local)')
  console.log(`\n👉 MASTER user #${master.id} (${master.code})`)
}

main()
  .catch(e => { console.error('❌ Seed failed:', e); process.exit(1) })
  .finally(async () => { await prisma.$disconnect() })

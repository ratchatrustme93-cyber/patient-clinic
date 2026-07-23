import prisma from './prisma.js'

// ── กฎเดียวของทั้งระบบ: หมอเห็นเฉพาะคนไข้ที่ตัวเองมีนัดหรือเคยรักษา · role อื่นเห็นทั้งหมด ──
// เดิมกฎนี้เขียนอยู่ใน routes/patients.js ที่เดียว ทำให้ route อื่น (visits, bills,
// appointments, voice) หลุดกฎไปหมด · ย้ายมาไว้ตรงนี้เพื่อให้ทุก route ใช้ชุดเดียวกัน

// เงื่อนไข where สำหรับกรองรายชื่อคนไข้ · null = ไม่ต้องกรอง
export function patientScopeFor(user) {
  if (user.role !== 'DOCTOR') return null
  return {
    OR: [
      { appointments: { some: { doctorId: user.id } } },
      { visits: { some: { doctorId: user.id } } },
    ],
  }
}

// เช็คสิทธิ์เข้าถึงคนไข้รายเดียว
export async function canAccessPatient(user, patientId) {
  const scope = patientScopeFor(user)
  if (!scope) return true
  if (!patientId) return false
  const n = await prisma.patient.count({ where: { AND: [{ id: +patientId }, scope] } })
  return n > 0
}

// ฟิลด์คนไข้ขั้นต่ำที่ route อื่นควรดึงไปแสดง
// ⚠️ อย่าใช้ `patient: true` — จะลากเลขบัตร ที่อยู่ ประวัติแพ้ยา ติดออก API ไปด้วย
export const PATIENT_BRIEF = { select: { id: true, hn: true, name: true } }

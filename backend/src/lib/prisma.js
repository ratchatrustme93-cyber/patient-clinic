import { PrismaClient } from '@prisma/client'
import { encrypt, decrypt, isEncrypted, blindIndex, normalizePhone } from './crypto.js'
import { ENCRYPTED_FIELDS, BLIND_INDEXES } from './encryptedFields.js'

const base = new PrismaClient()

const WRITE_OPS = new Set(['create', 'createMany', 'update', 'updateMany', 'upsert'])

// ค่าใน data อาจมาแบบ `phone: '081...'` หรือ `phone: { set: '081...' }`
const readVal = v => (v && typeof v === 'object' && 'set' in v ? v.set : v)
const writeVal = (v, next) => (v && typeof v === 'object' && 'set' in v ? { set: next } : next)

// เข้ารหัสฟิลด์ที่กำหนดไว้ + อัปเดตคอลัมน์ blind index ให้อัตโนมัติ
function encryptRow(model, row) {
  if (!row || typeof row !== 'object') return row
  const fields = ENCRYPTED_FIELDS[model]
  const indexes = BLIND_INDEXES[model] || {}

  for (const [src, idxCol] of Object.entries(indexes)) {
    if (!(src in row)) continue
    const raw = readVal(row[src])
    // ยังไม่เข้ารหัสตอนนี้ จึงคำนวณ index จากค่าจริงได้
    const base = src === 'phone' ? normalizePhone(raw) : raw
    row[idxCol] = blindIndex(base)
  }

  for (const f of fields) {
    if (!(f in row)) continue
    row[f] = writeVal(row[f], encrypt(readVal(row[f])))
  }
  return row
}

function encryptArgs(model, args) {
  if (!ENCRYPTED_FIELDS[model] || !args) return args
  const apply = d => (Array.isArray(d) ? d.forEach(x => encryptRow(model, x)) : encryptRow(model, d))
  if (args.data) apply(args.data)
  if (args.create) apply(args.create)
  if (args.update) apply(args.update)
  return args
}

// ── ถอดรหัสตอนอ่าน ──
// เดินทั้งผลลัพธ์แบบ recursive แล้วถอดทุก string ที่ขึ้นต้นด้วย 'v1:'
//
// ที่ต้องยึด marker แทนที่จะยึด schema เพราะ hook ของ model จะไม่ทำงานกับ include ซ้อน
// เช่น bills.js ดึง patient ซ้อนอยู่ใน bill — ถ้าดักเป็นราย model จะหลุดกรณีพวกนี้หมด
function decryptDeep(value) {
  if (value == null) return value
  if (typeof value === 'string') return isEncrypted(value) ? decrypt(value) : value
  if (Array.isArray(value)) return value.map(decryptDeep)
  // ปล่อย Date / Buffer / Decimal ผ่านไปตามเดิม แตะเฉพาะ object ธรรมดา
  if (typeof value === 'object' && (value.constructor === Object || value.constructor == null)) {
    for (const k of Object.keys(value)) value[k] = decryptDeep(value[k])
  }
  return value
}

const prisma = base.$extends({
  query: {
    $allModels: {
      async $allOperations({ model, operation, args, query }) {
        if (WRITE_OPS.has(operation)) encryptArgs(model, args)
        return decryptDeep(await query(args))
      },
    },
  },
})

export default prisma

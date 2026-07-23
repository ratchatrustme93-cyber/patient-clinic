import crypto from 'crypto'

// ── เข้ารหัสข้อมูลอ่อนไหวของคนไข้ก่อนลง DB ──
//
// ทำไมไม่ใช้ hash: hash เป็นทางเดียว ถอดกลับไม่ได้ ถ้า hash เลขบัตรประชาชน
// หน้าประวัติคนไข้จะไม่มีอะไรให้แสดงอีกเลย · hash เหมาะกับของที่ "ตรวจสอบอย่างเดียว
// ไม่ต้องอ่านคืน" เช่นรหัสผ่าน (ระบบใช้ bcrypt อยู่แล้วใน routes/auth.js)
//
// ใช้ AES-256-GCM เพราะเป็น authenticated encryption — ถ้ามีคนไปแก้ ciphertext
// ในฐานข้อมูล การถอดรหัสจะ error ไม่ใช่คืนค่าขยะออกมาเงียบ ๆ

const PREFIX = 'v1:' // ตัวบอกเวอร์ชัน เผื่อเปลี่ยนวิธี/กุญแจในอนาคต

function keyFrom(name, bytes = 32) {
  const raw = process.env[name]
  if (!raw) throw new Error(`ไม่พบ ${name} ใน .env — ดูตัวอย่างที่ .env.example`)
  const key = Buffer.from(raw, 'base64')
  if (key.length !== bytes) {
    throw new Error(`${name} ต้องยาว ${bytes} ไบต์ (base64) — สร้างด้วย: openssl rand -base64 ${bytes}`)
  }
  return key
}

let _key, _idxKey
const encKey = () => (_key ??= keyFrom('ENCRYPTION_KEY'))
const idxKey = () => (_idxKey ??= keyFrom('BLIND_INDEX_KEY'))

export const isEncrypted = v => typeof v === 'string' && v.startsWith(PREFIX)

// คืนค่าเดิมถ้าเข้ารหัสไว้อยู่แล้ว → เรียกซ้ำกี่ครั้งก็ไม่ซ้อนกัน (migration รันซ้ำได้)
export function encrypt(plain) {
  if (plain == null || plain === '') return plain
  if (isEncrypted(plain)) return plain
  const iv = crypto.randomBytes(12)
  const c = crypto.createCipheriv('aes-256-gcm', encKey(), iv)
  const ct = Buffer.concat([c.update(String(plain), 'utf8'), c.final()])
  return PREFIX + [iv, c.getAuthTag(), ct].map(b => b.toString('base64')).join(':')
}

// ค่าที่ยังไม่ได้เข้ารหัส (ข้อมูลเก่าก่อน migration) จะถูกส่งกลับตามเดิม
export function decrypt(value) {
  if (!isEncrypted(value)) return value
  const [, ivB64, tagB64, ctB64] = value.split(':')
  try {
    const d = crypto.createDecipheriv('aes-256-gcm', encKey(), Buffer.from(ivB64, 'base64'))
    d.setAuthTag(Buffer.from(tagB64, 'base64'))
    return d.update(Buffer.from(ctB64, 'base64'), undefined, 'utf8') + d.final('utf8')
  } catch {
    // กุญแจผิด หรือข้อมูลถูกแก้ — อย่าให้ทั้งหน้าพัง แต่ต้องเห็นใน log
    console.error('[crypto] ถอดรหัสไม่สำเร็จ — ตรวจ ENCRYPTION_KEY ว่าตรงกับตอนที่เข้ารหัสไว้ไหม')
    return null
  }
}

// ── Blind index ──
// ข้อมูลที่เข้ารหัสแล้วค้นหาตรง ๆ ไม่ได้ (ciphertext ต่างกันทุกครั้งเพราะ IV สุ่ม)
// จึงเก็บ HMAC ของค่าไว้อีกคอลัมน์ สำหรับค้นแบบ "ตรงกันเป๊ะ"
// ใช้กุญแจคนละใบกับกุญแจเข้ารหัส เพื่อไม่ให้กุญแจสองงานผูกกัน
export function blindIndex(value) {
  if (value == null || value === '') return null
  return crypto.createHmac('sha256', idxKey()).update(String(value)).digest('hex')
}

// เบอร์โทรเก็บได้หลายรูปแบบ (081-234-5678 / 0812345678) — ตัดเหลือตัวเลขก่อนทำ index
export const normalizePhone = v => (v == null ? null : String(v).replace(/\D/g, '') || null)

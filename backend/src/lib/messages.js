// ── ข้อความจาก API สองภาษา ──
// frontend ส่งภาษาปัจจุบันมาทาง header Accept-Language (ตั้งใน src/lib/api.js)
// ถ้าไม่ส่งมาหรือส่งค่าที่ไม่รู้จัก → ใช้ไทยเป็นค่าเริ่มต้น

const MESSAGES = {
  ACCOUNT_INVALID:   { th: 'บัญชีไม่ถูกต้องหรือถูกปิดใช้งาน', en: 'Account not found or disabled' },
  LOGIN_FAILED:      { th: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง', en: 'Incorrect email or password' },
  EMAIL_TAKEN:       { th: 'อีเมลนี้มีอยู่แล้ว', en: 'That email is already registered' },
  NAME_TAKEN:        { th: 'ชื่อนี้มีอยู่แล้ว', en: 'That name already exists' },
  NO_TOKEN:          { th: 'ไม่พบ token', en: 'No token provided' },
  BAD_TOKEN:         { th: 'token ไม่ถูกต้องหรือหมดอายุ', en: 'Invalid or expired token' },
  FORBIDDEN:         { th: 'ไม่มีสิทธิ์ใช้งานส่วนนี้', en: 'You do not have permission' },
  NOT_FOUND:         { th: 'ไม่พบข้อมูล', en: 'Not found' },

  PATIENT_FORBIDDEN: { th: 'ไม่มีสิทธิ์เข้าถึงคนไข้รายนี้', en: 'You cannot access this patient' },
  PATIENT_EDIT_FORBIDDEN: { th: 'ไม่มีสิทธิ์แก้ไขคนไข้รายนี้', en: 'You cannot edit this patient' },
  VISIT_FORBIDDEN:   { th: 'ไม่มีสิทธิ์เข้าถึงการรักษานี้', en: 'You cannot access this visit' },
  BILL_FORBIDDEN:    { th: 'ไม่มีสิทธิ์เข้าถึงบิลของคนไข้รายนี้', en: 'You cannot access this bill' },
  VISIT_NOT_FOUND:   { th: 'ไม่พบการรักษานี้', en: 'Visit not found' },

  VOICE_NOT_FOUND:   { th: 'ไม่พบบันทึกเสียง', en: 'Voice record not found' },
  VOICE_LISTEN_FORBIDDEN: { th: 'ไม่มีสิทธิ์ฟังบันทึกเสียงนี้', en: 'You cannot play this recording' },
  VOICE_EDIT_FORBIDDEN:   { th: 'ไม่มีสิทธิ์แก้ไขบันทึกเสียงนี้', en: 'You cannot edit this recording' },
  VOICE_DELETE_FORBIDDEN: { th: 'ไม่มีสิทธิ์ลบบันทึกเสียงนี้', en: 'You cannot delete this recording' },
  VOICE_ADD_FORBIDDEN:    { th: 'ไม่มีสิทธิ์เพิ่มบันทึกเสียงในการรักษานี้', en: 'You cannot add a recording to this visit' },

  VISIT_ID_REQUIRED: { th: 'ต้องระบุ visitId', en: 'visitId is required' },
}

export function langOf(req) {
  return String(req?.headers?.['accept-language'] || '').toLowerCase().startsWith('en') ? 'en' : 'th'
}

export function msg(req, code) {
  return MESSAGES[code]?.[langOf(req)] ?? code
}

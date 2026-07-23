// ── ฟิลด์ที่เข้ารหัสก่อนลง DB ──
// เพิ่ม/ลดตรงนี้ที่เดียว แล้วรัน `node prisma/encrypt-existing.js` ให้ข้อมูลเก่าตามทัน
export const ENCRYPTED_FIELDS = {
  Patient: [
    'nationalId', 'phone', 'email', 'address',
    'allergies', 'chronic', 'note',
    'emergencyName', 'emergencyPhone', 'emergencyRelation',
    'photo',
  ],
  Visit: ['chiefComplaint', 'diagnosis', 'treatment', 'note'],
  VoiceRecord: ['transcript'],
}

// ── ที่จงใจไม่เข้ารหัส ──
// hn, name          → ต้องค้นหาแบบบางส่วนและแสดงในทุกหน้า ถ้าเข้ารหัสจะใช้งานไม่ได้
// gender, birthdate, bloodType, weight, height, nationality, religion,
// maritalStatus, occupation, insurance
//                   → ใช้กรอง/แสดงผล และลำพังตัวเองระบุตัวบุคคลไม่ได้
//
// ผลที่ตามมา: ถ้า DB dump หลุด จะยังรู้ว่า "ใครเป็นคนไข้ที่นี่"
// แต่ไม่รู้เลขบัตร ที่อยู่ ประวัติแพ้ยา หรือผลวินิจฉัย

// คู่ blind index: ฟิลด์ต้นทาง → คอลัมน์ที่เก็บ HMAC (ไว้ค้นแบบตรงตัว)
export const BLIND_INDEXES = {
  Patient: {
    phone: 'phoneIdx',
    nationalId: 'nationalIdIdx',
  },
}

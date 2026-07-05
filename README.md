# Patient Clinic — ระบบจัดการคลินิกคนไข้ทั่วไป

โปรเจกต์ใหม่ (แยกจาก `clinic-app` เดิม) — คลินิกทั่วไป ธีม Light medical

**Stack:** React + Vite + Tailwind (frontend :5175) · Express + Prisma 6 + PostgreSQL (backend :3008) · DB `patient_clinic`

## โมดูล

| โมดูล | รายละเอียด |
|---|---|
| Master data | **ห้อง**, แผนก, บริการ/ค่ารักษา, หน่วยนับ, หมวดสินค้า, วิธีชำระเงิน (เมนู "ข้อมูลหลัก") |
| บุคลากร | admin / doctor / doctor assistant / employee + สิทธิ์ **MASTER** (super-admin) แยกแท็บตามบทบาท |
| คนไข้ | ทะเบียนคนไข้ (HN อัตโนมัติ), แพ้ยา, โรคประจำตัว |
| ตารางนัด | ตาราง **ห้อง × เวลา** (08:00–20:00) · **ลาก-วางเพื่อย้ายห้อง/เวลา** · แตะแก้ไข · สร้าง/แก้/ยกเลิก · **เตือนจองห้องซ้อนเวลา** |
| ใบรายงานคนไข้ | บันทึกการรักษา (chief complaint / diagnosis / treatment) พิมพ์ได้ |
| บิล | ออกบิลหลายรายการ + ส่วนลด + ชำระเงิน (พิมพ์ใบเสร็จ) |
| สินค้า / วัสดุ | คลังสินค้าและวัสดุสิ้นเปลือง (เตือนของใกล้หมด) |

### ตารางนัด (Appointment schedule)

- แสดงเป็นตาราง **คอลัมน์ = ห้อง** (+ คอลัมน์ "ยังไม่จัดห้อง") × **แถว = เวลา ทีละ 30 นาที** เห็นชัดว่าห้องไหนมีนัดใคร
- **ลาก-วาง** การ์ดนัด: ข้ามคอลัมน์ = เปลี่ยนห้อง, ข้ามแถว = เปลี่ยนเวลา (บันทึก `roomId` + `scheduledAt` พร้อมกัน) — ใช้ pointer events ลื่นทั้งเมาส์และจอสัมผัส
- **แตะการ์ด** = เปิดแก้ไข (รวมเปลี่ยนสถานะ + ปุ่มยกเลิกนัดในโมดัลเดียว)
- **เตือนจองซ้อน**: ห้องเดียวกัน+ช่วงเวลาเดียวกัน → ช่องขึ้นสีแดง + ⚠️ และถามยืนยันก่อนจองซ้อน (soft — จองซ้อนได้ถ้ายืนยัน)
- เพิ่มห้องได้ทันทีจากปุ่ม **"เพิ่มห้อง"** บนหน้าตาราง หรือจัดการเต็มที่ **ข้อมูลหลัก → ห้อง**

## ติดตั้งและรัน

```bash
# 1) Database
createdb patient_clinic          # หรือ: psql -U postgres -c "CREATE DATABASE patient_clinic"

# 2) Backend
cd backend
npm install
npx prisma generate
npx prisma db push
npm run db:seed                  # ล้างข้อมูล + สร้างบัญชี + ข้อมูลตัวอย่าง
npm run dev                      # http://localhost:3008

# 3) Frontend (อีก terminal)
cd frontend
npm install
npm run dev                      # http://localhost:5175
```

## บัญชีทดสอบ (จาก seed)

| บทบาท | อีเมล | รหัสผ่าน |
|---|---|---|
| MASTER | master@clinic.local | master123 |
| ADMIN | admin@clinic.local | admin123 |
| DOCTOR | doctor@clinic.local | doctor123 |
| ASSISTANT | assistant@clinic.local | assistant123 |
| EMPLOYEE | employee@clinic.local | employee123 |

> คนแรกที่ `POST /api/auth/register` (ตอน DB ว่าง) จะเป็น **MASTER** อัตโนมัติ
> สิทธิ์: MASTER/ADMIN แก้ไขข้อมูลหลัก+บุคลากรได้ · บทบาทอื่นดูได้และทำงานประจำวัน (นัด/คนไข้/บิล)

## หมายเหตุการพัฒนา

- ใช้ `prisma db push` (ไม่ใช่ migrate) ระหว่าง dev — แก้ schema แล้วรัน `npx prisma generate` ก่อน restart
- รหัสอัตโนมัติ: บุคลากร `EMP####`, คนไข้ `HN#####`, บริการ `SV####`, สินค้า `IT####`, วัสดุ `MT####`, บิล `B######`
- `npm run db:seed` = **reset** ข้อมูลทั้งหมด (สร้างบัญชี 5 บทบาท + master data + **4 ห้อง** + คนไข้ + นัดตัวอย่างวันนี้ 2 นัด)

## API หลัก

`/api/auth` · `/api/employees` · `/api/master/{rooms,departments,services,units,categories,payment-methods}` · `/api/patients` · `/api/appointments` · `/api/visits` · `/api/bills` · `/api/items` · `/api/materials` · `/api/overview`

- `PUT /api/appointments/:id` รับ `roomId`, `scheduledAt`, `status` ฯลฯ (ใช้ตอนลาก-วางและแก้ไข) · `DELETE` = ยกเลิก (soft, ตั้งสถานะ CANCELLED)
- การเตือนจองห้องซ้อนเป็นการเช็คฝั่ง frontend (soft warning) — backend ไม่บล็อก

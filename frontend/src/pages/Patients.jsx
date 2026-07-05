import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Plus, ChevronRight } from 'lucide-react'
import api from '../lib/api'
import { PageHeader, Btn, Modal, Field, inputCls, Empty, Badge, TagInput } from '../components/ui'

const GENDER = { MALE: 'ชาย', FEMALE: 'หญิง', OTHER: 'อื่นๆ' }
const EMPTY = { name: '', gender: '', birthdate: '', phone: '', email: '', address: '', bloodType: '', allergies: '', chronic: '', note: '' }

export default function Patients() {
  const nav = useNavigate()
  const [list, setList] = useState([])
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)

  const set = f => e => setForm(p => ({ ...p, [f]: e.target.value }))
  const fetch = () => api.get(`/patients${search ? `?search=${encodeURIComponent(search)}` : ''}`).then(r => setList(r.data))
  useEffect(() => { fetch() }, [search])

  async function save(e) {
    e.preventDefault(); setSaving(true)
    try {
      await api.post('/patients', form)
      setOpen(false); setForm(EMPTY); fetch()
    } finally { setSaving(false) }
  }

  return (
    <div className="p-6 mx-auto max-w-4xl">
      <PageHeader title="คนไข้" subtitle={`${list.length} รายชื่อ`}>
        <Btn onClick={() => { setForm(EMPTY); setOpen(true) }}><Plus size={14} className="inline mr-1" /> เพิ่มคนไข้</Btn>
      </PageHeader>

      <div className="relative mb-4">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input className={inputCls + ' pl-9'} placeholder="ค้นหาชื่อ, HN, เบอร์โทร..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div className="space-y-2">
        {list.map(p => (
          <div key={p.id} onClick={() => nav(`/patients/${p.id}`)}
            className="bg-white rounded-xl p-4 border border-gray-100 flex items-center gap-3 cursor-pointer hover:border-brand-200 transition">
            <div className="w-10 h-10 rounded-full bg-brand-50 flex items-center justify-center text-brand-600 font-semibold text-sm flex-shrink-0">
              {p.name[0]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-800 text-sm">{p.name}</p>
              <p className="text-xs text-gray-400">{p.hn}{p.phone ? ` · ${p.phone}` : ''}{p.gender ? ` · ${GENDER[p.gender]}` : ''}</p>
            </div>
            {p.allergies && <Badge tone="red">แพ้ยา</Badge>}
            <ChevronRight size={16} className="text-gray-300" />
          </div>
        ))}
        {list.length === 0 && <Empty>ไม่พบข้อมูลคนไข้</Empty>}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="เพิ่มคนไข้ใหม่">
        <form onSubmit={save} className="space-y-3">
          <Field label="ชื่อ-นามสกุล *"><input required className={inputCls} value={form.name} onChange={set('name')} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="เพศ">
              <select className={inputCls} value={form.gender} onChange={set('gender')}>
                <option value="">ไม่ระบุ</option>
                <option value="MALE">ชาย</option>
                <option value="FEMALE">หญิง</option>
                <option value="OTHER">อื่นๆ</option>
              </select>
            </Field>
            <Field label="วันเกิด"><input type="date" className={inputCls} value={form.birthdate} onChange={set('birthdate')} /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="เบอร์โทร"><input className={inputCls} value={form.phone} onChange={set('phone')} /></Field>
            <Field label="กรุ๊ปเลือด"><input className={inputCls} value={form.bloodType} onChange={set('bloodType')} placeholder="A, B, O, AB" /></Field>
          </div>
          <Field label="ที่อยู่"><input className={inputCls} value={form.address} onChange={set('address')} /></Field>
          <Field label="ประวัติแพ้ยา/สาร (คั่นด้วย ,)"><TagInput value={form.allergies} onChange={v => setForm(p => ({ ...p, allergies: v }))} placeholder="เช่น Penicillin, Aspirin" /></Field>
          <Field label="โรคประจำตัว (คั่นด้วย ,)"><TagInput value={form.chronic} onChange={v => setForm(p => ({ ...p, chronic: v }))} placeholder="เช่น เบาหวาน, ไขมัน, หัวใจ" /></Field>
          <div className="flex gap-2 pt-2">
            <Btn type="button" variant="ghost" className="flex-1" onClick={() => setOpen(false)}>ยกเลิก</Btn>
            <Btn type="submit" disabled={saving} className="flex-1">{saving ? 'กำลังบันทึก...' : 'บันทึก'}</Btn>
          </div>
        </form>
      </Modal>
    </div>
  )
}

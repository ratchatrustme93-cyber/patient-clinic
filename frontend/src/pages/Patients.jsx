import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Plus, ChevronRight } from 'lucide-react'
import api from '../lib/api'
import { PageHeader, Btn, Modal, Empty, Badge, Card, inputCls } from '../components/ui'
import { PatientFields, EMPTY_PATIENT } from '../components/PatientForm'

const GENDER = { MALE: 'ชาย', FEMALE: 'หญิง', OTHER: 'อื่นๆ' }
const EMPTY = EMPTY_PATIENT

// คำนวณอายุจากวันเกิด · null ถ้าไม่มีข้อมูล
const age = d => {
  if (!d) return null
  const b = new Date(d), n = new Date()
  let a = n.getFullYear() - b.getFullYear()
  const m = n.getMonth() - b.getMonth()
  if (m < 0 || (m === 0 && n.getDate() < b.getDate())) a--
  return a
}

export default function Patients() {
  const nav = useNavigate()
  const [list, setList] = useState([])
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)

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
    <div className="p-6 mx-auto max-w-[1320px]">
      <PageHeader title="คนไข้" subtitle={`${list.length} รายชื่อ`}>
        <Btn onClick={() => { setForm(EMPTY); setOpen(true) }}><Plus size={14} className="inline mr-1" /> เพิ่มคนไข้</Btn>
      </PageHeader>

      <div className="relative mb-4">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
        <input className={inputCls + ' pl-9'} placeholder="ค้นหาชื่อ, HN, เบอร์โทร..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm whitespace-nowrap">
            <thead>
              <tr className="text-left text-gray-500 bg-gray-50 border-b border-gray-200">
                <th className="px-4 py-3 font-medium">HN</th>
                <th className="px-4 py-3 font-medium">ชื่อ-นามสกุล</th>
                <th className="px-4 py-3 font-medium">เพศ</th>
                <th className="px-4 py-3 font-medium text-center">อายุ</th>
                <th className="px-4 py-3 font-medium">เบอร์โทร</th>
                <th className="px-4 py-3 font-medium text-center">กรุ๊ปเลือด</th>
                <th className="px-4 py-3 font-medium">สถานะ</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {list.map(p => (
                <tr key={p.id} onClick={() => nav(`/patients/${p.id}`)}
                  className="border-b border-gray-100 last:border-0 cursor-pointer hover:bg-brand-50/60 transition">
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{p.hn}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <span className="w-8 h-8 rounded-full bg-brand-50 flex items-center justify-center text-brand-600 font-semibold text-xs flex-shrink-0">{p.name[0]}</span>
                      <span className="font-medium text-gray-800">{p.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{GENDER[p.gender] || '—'}</td>
                  <td className="px-4 py-3 text-center text-gray-600">{age(p.birthdate) ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{p.phone || '—'}</td>
                  <td className="px-4 py-3 text-center text-gray-600">{p.bloodType || '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {p.allergies && <Badge tone="red">แพ้ยา</Badge>}
                      {p.chronic && <Badge tone="amber">โรคประจำตัว</Badge>}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right"><ChevronRight size={16} className="text-gray-400 inline" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {list.length === 0 && <Empty>ไม่พบข้อมูลคนไข้</Empty>}
      </Card>

      <Modal open={open} onClose={() => setOpen(false)} title="เพิ่มคนไข้ใหม่" size="xl"
        footer={<>
          <Btn type="button" variant="ghost" onClick={() => setOpen(false)}>ยกเลิก</Btn>
          <Btn type="submit" form="patient-add-form" disabled={saving}>{saving ? 'กำลังบันทึก...' : 'บันทึก'}</Btn>
        </>}>
        <form id="patient-add-form" onSubmit={save}>
          <PatientFields form={form} setForm={setForm} />
        </form>
      </Modal>
    </div>
  )
}

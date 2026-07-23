import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Plus, ChevronRight } from 'lucide-react'
import api from '../lib/api'
import { PageHeader, Btn, Modal, Empty, Badge, Card } from '../components/ui'
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
    <div className="page">
      <PageHeader title="คนไข้" subtitle={`${list.length} รายชื่อ`}>
        <Btn onClick={() => { setForm(EMPTY); setOpen(true) }}><Plus size={14} /> เพิ่มคนไข้</Btn>
      </PageHeader>

      <div className="search mb-16">
        <Search size={16} className="search__icon" />
        <input className="input" placeholder="ค้นหาชื่อ, HN, เบอร์โทร..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <Card className="card--clip">
        <div className="table-wrap">
          <table className="table table--nowrap">
            <thead>
              <tr>
                <th>HN</th>
                <th>ชื่อ-นามสกุล</th>
                <th>เพศ</th>
                <th className="center">อายุ</th>
                <th>เบอร์โทร</th>
                <th className="center">กรุ๊ปเลือด</th>
                <th>สถานะ</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {list.map(p => (
                <tr key={p.id} onClick={() => nav(`/patients/${p.id}`)} className="is-clickable">
                  <td className="mono tiny muted">{p.hn}</td>
                  <td>
                    <div className="cell-person">
                      <span className="avatar avatar--sm">{p.name[0]}</span>
                      <span className="cell-person__name">{p.name}</span>
                    </div>
                  </td>
                  <td>{GENDER[p.gender] || '—'}</td>
                  <td className="center">{age(p.birthdate) ?? '—'}</td>
                  <td>{p.phone || '—'}</td>
                  <td className="center">{p.bloodType || '—'}</td>
                  <td>
                    <div className="row wrap gap-4">
                      {p.allergies && <Badge tone="red">แพ้ยา</Badge>}
                      {p.chronic && <Badge tone="amber">โรคประจำตัว</Badge>}
                    </div>
                  </td>
                  <td className="right soft"><ChevronRight size={16} /></td>
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

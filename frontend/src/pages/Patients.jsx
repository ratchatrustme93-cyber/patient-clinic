import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Plus, ChevronRight } from 'lucide-react'
import api from '../lib/api'
import { useT } from '../lib/i18n'
import { PageHeader, Btn, Modal, Empty, Badge, Card } from '../components/ui'
import { PatientFields, EMPTY_PATIENT } from '../components/PatientForm'

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
  const { t } = useT()
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
      <PageHeader title={t('patients.title')} subtitle={t('patients.count', { n: list.length })}>
        <Btn onClick={() => { setForm(EMPTY); setOpen(true) }}><Plus size={14} /> {t('patients.addPatient')}</Btn>
      </PageHeader>

      <div className="search mb-16">
        <Search size={16} className="search__icon" />
        <input className="input" placeholder={t('patients.searchPlaceholder')} value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <Card className="card--clip">
        <div className="table-wrap">
          <table className="table table--nowrap">
            <thead>
              <tr>
                <th>{t('patients.hn')}</th>
                <th>{t('patients.fullName')}</th>
                <th>{t('patients.gender')}</th>
                <th className="center">{t('patients.age')}</th>
                <th>{t('patients.phone')}</th>
                <th className="center">{t('patients.bloodType')}</th>
                <th>{t('patients.status')}</th>
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
                  <td>{p.gender ? t(`enum.gender.${p.gender}`) : t('common.dash')}</td>
                  <td className="center">{age(p.birthdate) ?? t('common.dash')}</td>
                  <td>{p.phone || t('common.dash')}</td>
                  <td className="center">{p.bloodType || t('common.dash')}</td>
                  <td>
                    <div className="row wrap gap-4">
                      {p.allergies && <Badge tone="red">{t('patients.allergyTag')}</Badge>}
                      {p.chronic && <Badge tone="amber">{t('patients.chronicTag')}</Badge>}
                    </div>
                  </td>
                  <td className="right soft"><ChevronRight size={16} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {list.length === 0 && <Empty>{t('patients.notFound')}</Empty>}
      </Card>

      <Modal open={open} onClose={() => setOpen(false)} title={t('patients.addNew')} size="xl"
        footer={<>
          <Btn type="button" variant="ghost" onClick={() => setOpen(false)}>{t('common.cancel')}</Btn>
          <Btn type="submit" form="patient-add-form" disabled={saving}>{saving ? t('common.saving') : t('common.save')}</Btn>
        </>}>
        <form id="patient-add-form" onSubmit={save}>
          <PatientFields form={form} setForm={setForm} />
        </form>
      </Modal>
    </div>
  )
}

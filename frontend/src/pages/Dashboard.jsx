import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { format } from 'date-fns'
import { th } from 'date-fns/locale'
import {
  Users, Calendar, Stethoscope, HeartHandshake, Package, Boxes,
  Receipt, ClipboardList, Wallet, AlertTriangle,
} from 'lucide-react'
import api from '../lib/api'
import { getUser } from '../lib/auth'
import { PageHeader, StatTile, Card, Empty, Badge } from '../components/ui'

const APPT_STATUS = {
  SCHEDULED: ['นัดไว้', 'gray'], CONFIRMED: ['ยืนยัน', 'blue'], ARRIVED: ['มาถึง', 'brand'],
  IN_PROGRESS: ['กำลังตรวจ', 'purple'], COMPLETED: ['เสร็จ', 'green'],
  CANCELLED: ['ยกเลิก', 'gray'], NO_SHOW: ['ไม่มา', 'red'],
}

export default function Dashboard() {
  const [data, setData] = useState(null)
  const user = getUser()

  useEffect(() => {
    console.log('%c[Patient Clinic] logged-in user:', 'color:#237a7b;font-weight:bold', user)
    api.get('/overview').then(r => setData(r.data))
  }, [])

  if (!data) return <div className="page__loading">กำลังโหลด...</div>
  const c = data.counts
  const scoped = data.scoped // หมอ = เห็นเฉพาะเคสตัวเอง

  return (
    <div className="page">
      <PageHeader title={`สวัสดี, ${user?.name || ''}`} subtitle={scoped ? 'แสดงเฉพาะเคสของคุณ' : format(new Date(), 'EEEE d MMMM yyyy', { locale: th })} />

      <div className="stat-grid stat-grid--4 mb-16">
        <StatTile icon={Calendar} label={scoped ? 'นัดวันนี้ (ของฉัน)' : 'นัดวันนี้'} value={c.appointmentsToday} tone="brand" />
        <StatTile icon={Users} label={scoped ? 'คนไข้ของฉัน' : 'คนไข้ทั้งหมด'} value={c.patients} tone="blue" />
        <StatTile icon={ClipboardList} label={scoped ? 'การรักษาของฉัน' : 'การรักษา (visit)'} value={c.visits} tone="purple" />
        {!scoped && <StatTile icon={Wallet} label="รายรับ (ชำระแล้ว)" value={`฿${data.revenuePaid.toLocaleString()}`} tone="green" />}
        <StatTile icon={Stethoscope} label="แพทย์" value={c.doctors} tone="brand" />
        <StatTile icon={HeartHandshake} label="ผู้ช่วยแพทย์" value={c.assistants} tone="purple" />
        {!scoped && <StatTile icon={Package} label="สินค้า" value={c.items} tone="amber" />}
        {!scoped && <StatTile icon={Boxes} label="วัสดุ" value={c.materials} tone="amber" />}
      </div>

      {!scoped && data.lowMaterials.length > 0 && (
        <div className="alert tone-amber mb-16">
          <AlertTriangle size={16} className="alert__icon" />
          <div>
            <p className="alert__title">วัสดุใกล้หมด {data.lowMaterials.length} รายการ</p>
            <p className="alert__detail">{data.lowMaterials.map(m => `${m.name} (${m.stockQty})`).join(' · ')}</p>
          </div>
        </div>
      )}

      <div className={`dash-grid ${scoped ? '' : 'dash-grid--2'}`}>
        <div>
          <h3 className="section__title mb-8"><Calendar size={14} />{scoped ? 'นัดหมายวันนี้ (ของฉัน)' : 'นัดหมายวันนี้'}</h3>
          <Card pad="sm">
            {data.todayAppointments.length === 0 ? <Empty>ไม่มีนัดวันนี้</Empty> : (
              <div className="list">
                {data.todayAppointments.map(a => {
                  const [label, tone] = APPT_STATUS[a.status] || ['-', 'gray']
                  return (
                    <div key={a.id} className="list__row">
                      <span>
                        {format(new Date(a.scheduledAt), 'HH:mm')}{a.endAt ? `–${format(new Date(a.endAt), 'HH:mm')}` : ''} · {a.patient.name}
                        <span className="muted">{a.service ? ` · ${a.service.name}` : ''}</span>
                      </span>
                      <Badge tone={tone}>{label}</Badge>
                    </div>
                  )
                })}
              </div>
            )}
          </Card>
        </div>

        {!scoped && <div>
          <h3 className="section__title mb-8"><Receipt size={14} />บิลล่าสุด</h3>
          <Card pad="sm">
            {data.recentBills.length === 0 ? <Empty>ยังไม่มีบิล</Empty> : (
              <div className="list">
                {data.recentBills.map(b => (
                  <Link key={b.id} to="/bills" className="list__row">
                    <span>{b.billNo} · {b.patient.name}</span>
                    <span className="row gap-8">
                      <span className="muted">฿{b.total.toLocaleString()}</span>
                      <Badge tone={b.status === 'PAID' ? 'green' : b.status === 'UNPAID' ? 'amber' : 'gray'}>
                        {b.status === 'PAID' ? 'ชำระแล้ว' : b.status === 'UNPAID' ? 'ค้างชำระ' : b.status}
                      </Badge>
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </Card>
        </div>}
      </div>
    </div>
  )
}

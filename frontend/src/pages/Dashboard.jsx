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

  if (!data) return <div className="p-6 text-gray-500 text-sm">กำลังโหลด...</div>
  const c = data.counts

  return (
    <div className="p-6 mx-auto max-w-6xl">
      <PageHeader title={`สวัสดี, ${user?.name || ''}`} subtitle={format(new Date(), 'EEEE d MMMM yyyy', { locale: th })} />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <StatTile icon={Calendar} label="นัดวันนี้" value={c.appointmentsToday} tone="brand" />
        <StatTile icon={Users} label="คนไข้ทั้งหมด" value={c.patients} tone="blue" />
        <StatTile icon={ClipboardList} label="การรักษา (visit)" value={c.visits} tone="purple" />
        <StatTile icon={Wallet} label="รายรับ (ชำระแล้ว)" value={`฿${data.revenuePaid.toLocaleString()}`} tone="green" />
        <StatTile icon={Stethoscope} label="แพทย์" value={c.doctors} tone="brand" />
        <StatTile icon={HeartHandshake} label="ผู้ช่วยแพทย์" value={c.assistants} tone="purple" />
        <StatTile icon={Package} label="สินค้า" value={c.items} tone="amber" />
        <StatTile icon={Boxes} label="วัสดุ" value={c.materials} tone="amber" />
      </div>

      {data.lowMaterials.length > 0 && (
        <div className="mb-6 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 flex items-start gap-2">
          <AlertTriangle size={16} className="text-amber-500 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm text-amber-700 font-medium">วัสดุใกล้หมด {data.lowMaterials.length} รายการ</p>
            <p className="text-xs text-amber-600">{data.lowMaterials.map(m => `${m.name} (${m.stockQty})`).join(' · ')}</p>
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-2"><Calendar size={14} />นัดหมายวันนี้</h3>
          <Card className="p-3">
            {data.todayAppointments.length === 0 ? <Empty>ไม่มีนัดวันนี้</Empty> : (
              <div className="space-y-1.5">
                {data.todayAppointments.map(a => {
                  const [label, tone] = APPT_STATUS[a.status] || ['-', 'gray']
                  return (
                    <div key={a.id} className="flex items-center justify-between text-sm border-b border-gray-50 last:border-0 py-1.5">
                      <span className="text-gray-800">
                        {format(new Date(a.scheduledAt), 'HH:mm')}{a.endAt ? `–${format(new Date(a.endAt), 'HH:mm')}` : ''} · {a.patient.name}
                        <span className="text-gray-500">{a.service ? ` · ${a.service.name}` : ''}</span>
                      </span>
                      <Badge tone={tone}>{label}</Badge>
                    </div>
                  )
                })}
              </div>
            )}
          </Card>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-2"><Receipt size={14} />บิลล่าสุด</h3>
          <Card className="p-3">
            {data.recentBills.length === 0 ? <Empty>ยังไม่มีบิล</Empty> : (
              <div className="space-y-1.5">
                {data.recentBills.map(b => (
                  <Link key={b.id} to="/bills" className="flex items-center justify-between text-sm border-b border-gray-50 last:border-0 py-1.5 hover:text-brand-700">
                    <span className="text-gray-800">{b.billNo} · {b.patient.name}</span>
                    <span className="flex items-center gap-2">
                      <span className="text-gray-600">฿{b.total.toLocaleString()}</span>
                      <Badge tone={b.status === 'PAID' ? 'green' : b.status === 'UNPAID' ? 'amber' : 'gray'}>
                        {b.status === 'PAID' ? 'ชำระแล้ว' : b.status === 'UNPAID' ? 'ค้างชำระ' : b.status}
                      </Badge>
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { format } from 'date-fns'
import {
  Users, Calendar, Stethoscope, HeartHandshake, Package, Boxes,
  Receipt, ClipboardList, Wallet, AlertTriangle,
} from 'lucide-react'
import api from '../lib/api'
import { useT } from '../lib/i18n'
import { getUser } from '../lib/auth'
import { PageHeader, StatTile, Card, Empty, Badge } from '../components/ui'

const APPT_TONE = {
  SCHEDULED: 'gray', CONFIRMED: 'blue', ARRIVED: 'brand',
  IN_PROGRESS: 'purple', COMPLETED: 'green', CANCELLED: 'gray', NO_SHOW: 'red',
}

export default function Dashboard() {
  const [data, setData] = useState(null)
  const { t, dateLocale } = useT()
  const user = getUser()

  useEffect(() => {
    console.log('%c[Patient Clinic] logged-in user:', 'color:#1f7ad6;font-weight:bold', user)
    api.get('/overview').then(r => setData(r.data))
  }, [])

  if (!data) return <div className="page__loading">{t('common.loading')}</div>
  const c = data.counts
  const scoped = data.scoped // หมอ = เห็นเฉพาะเคสตัวเอง
  const money = n => `${t('common.baht')}${n.toLocaleString()}`

  return (
    <div className="page">
      <PageHeader
        title={t('dashboard.greeting', { name: user?.name || '' })}
        subtitle={scoped ? t('dashboard.scopedNote') : format(new Date(), 'EEEE d MMMM yyyy', { locale: dateLocale })}
      />

      <div className="stat-grid stat-grid--4 mb-16">
        <StatTile icon={Calendar} label={t(scoped ? 'dashboard.apptTodayMine' : 'dashboard.apptToday')} value={c.appointmentsToday} tone="brand" />
        <StatTile icon={Users} label={t(scoped ? 'dashboard.patientsMine' : 'dashboard.patientsAll')} value={c.patients} tone="blue" />
        <StatTile icon={ClipboardList} label={t(scoped ? 'dashboard.visitsMine' : 'dashboard.visits')} value={c.visits} tone="purple" />
        {!scoped && <StatTile icon={Wallet} label={t('dashboard.revenuePaid')} value={money(data.revenuePaid)} tone="green" />}
        <StatTile icon={Stethoscope} label={t('dashboard.doctors')} value={c.doctors} tone="brand" />
        <StatTile icon={HeartHandshake} label={t('dashboard.assistants')} value={c.assistants} tone="purple" />
        {!scoped && <StatTile icon={Package} label={t('dashboard.items')} value={c.items} tone="amber" />}
        {!scoped && <StatTile icon={Boxes} label={t('dashboard.materials')} value={c.materials} tone="amber" />}
      </div>

      {!scoped && data.lowMaterials.length > 0 && (
        <div className="alert tone-amber mb-16">
          <AlertTriangle size={16} className="alert__icon" />
          <div>
            <p className="alert__title">{t('dashboard.lowStock', { n: data.lowMaterials.length })}</p>
            <p className="alert__detail">{data.lowMaterials.map(m => `${m.name} (${m.stockQty})`).join(' · ')}</p>
          </div>
        </div>
      )}

      <div className={`dash-grid ${scoped ? '' : 'dash-grid--2'}`}>
        <div>
          <h3 className="section__title mb-8">
            <Calendar size={14} />{t(scoped ? 'dashboard.todayApptMine' : 'dashboard.todayAppt')}
          </h3>
          <Card pad="sm">
            {data.todayAppointments.length === 0 ? <Empty>{t('dashboard.noApptToday')}</Empty> : (
              <div className="list">
                {data.todayAppointments.map(a => (
                  <div key={a.id} className="list__row">
                    <span>
                      {format(new Date(a.scheduledAt), 'HH:mm')}{a.endAt ? `–${format(new Date(a.endAt), 'HH:mm')}` : ''} · {a.patient.name}
                      <span className="muted">{a.service ? ` · ${a.service.name}` : ''}</span>
                    </span>
                    <Badge tone={APPT_TONE[a.status] || 'gray'}>{t(`enum.apptStatus.${a.status}`)}</Badge>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {!scoped && <div>
          <h3 className="section__title mb-8"><Receipt size={14} />{t('dashboard.recentBills')}</h3>
          <Card pad="sm">
            {data.recentBills.length === 0 ? <Empty>{t('dashboard.noBills')}</Empty> : (
              <div className="list">
                {data.recentBills.map(b => (
                  <Link key={b.id} to="/bills" className="list__row">
                    <span>{b.billNo} · {b.patient.name}</span>
                    <span className="row gap-8">
                      <span className="muted">{money(b.total)}</span>
                      <Badge tone={b.status === 'PAID' ? 'green' : b.status === 'UNPAID' ? 'amber' : 'gray'}>
                        {t(`enum.billStatus.${b.status}`)}
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

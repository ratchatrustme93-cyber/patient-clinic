import { useState } from 'react'
import { X } from 'lucide-react'
import { useT } from '../lib/i18n'

// ช่องกรอกหลายค่า คั่นด้วย comma — พิมพ์ "เบาหวาน, ไขมัน, หัวใจ" → เป็นชิป · เก็บเป็น string คั่นด้วย comma
export function TagInput({ value, onChange, placeholder }) {
  const { t } = useT()
  const tags = (value || '').split(',').map(s => s.trim()).filter(Boolean)
  const [input, setInput] = useState('')
  const commit = () => {
    const t = input.trim()
    if (t && !tags.includes(t)) onChange([...tags, t].join(', '))
    setInput('')
  }
  const remove = t => onChange(tags.filter(x => x !== t).join(', '))
  return (
    <div className="taginput">
      {tags.map(t => (
        <span key={t} className="taginput__chip">
          {t}
          <button type="button" onClick={() => remove(t)} className="taginput__remove"><X size={12} /></button>
        </span>
      ))}
      <input
        className="taginput__input"
        value={input}
        placeholder={tags.length ? '' : (placeholder ?? t('patientForm.tagPlaceholder'))}
        onChange={e => {
          const v = e.target.value
          if (v.includes(',')) {
            const parts = v.split(',')
            const last = parts.pop()
            const next = [...tags]
            parts.forEach(p => { const t = p.trim(); if (t && !next.includes(t)) next.push(t) })
            onChange(next.join(', '))
            setInput(last)
          } else setInput(v)
        }}
        onKeyDown={e => {
          if (e.key === 'Enter') { e.preventDefault(); commit() }
          else if (e.key === 'Backspace' && !input && tags.length) remove(tags[tags.length - 1])
        }}
        onBlur={commit}
      />
    </div>
  )
}

export function PageHeader({ title, subtitle, children }) {
  return (
    <div className="page-header">
      <div>
        <h1 className="page-header__title">{title}</h1>
        {subtitle && <p className="page-header__subtitle">{subtitle}</p>}
      </div>
      {children}
    </div>
  )
}

export function Btn({ children, variant = 'primary', className = '', ...props }) {
  return (
    <button {...props} className={`btn btn--${variant} ${className}`.trim()}>
      {children}
    </button>
  )
}

export function Modal({ open, onClose, title, children, footer, wide, size }) {
  if (!open) return null
  const width = size === 'xl' ? 'modal--xl' : wide ? 'modal--wide' : ''
  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div className={`modal ${width}`.trim()} onMouseDown={e => e.stopPropagation()}>
        {/* header — ตรึงไว้ด้านบน */}
        <div className="modal__header">
          <h3 className="modal__title">{title}</h3>
          <button onClick={onClose} className="modal__close"><X size={18} /></button>
        </div>
        {/* body — เลื่อนได้ระหว่าง header กับ footer */}
        <div className="modal__body">{children}</div>
        {/* footer — ตรึงไว้ด้านล่าง */}
        {footer && <div className="modal__footer">{footer}</div>}
      </div>
    </div>
  )
}

export function Field({ label, children }) {
  return (
    <div>
      {label && <label className="field__label">{label}</label>}
      {children}
    </div>
  )
}

export function StatTile({ icon: Icon, label, value, tone = 'brand' }) {
  return (
    <div className={`stat tone-${tone}`}>
      <div className="stat__icon"><Icon size={18} /></div>
      <div>
        <p className="stat__value">{value ?? 0}</p>
        <p className="stat__label">{label}</p>
      </div>
    </div>
  )
}

export function Badge({ children, tone = 'gray' }) {
  return <span className={`badge tone-${tone}`}>{children}</span>
}

export function Empty({ children }) {
  const { t } = useT()
  return <p className="empty">{children ?? t('common.noData')}</p>
}

// pad: none | sm | md | lg
export function Card({ children, className = '', pad = 'none' }) {
  const padCls = pad === 'none' ? '' : `card--pad-${pad}`
  return <div className={`card ${padCls} ${className}`.trim()}>{children}</div>
}

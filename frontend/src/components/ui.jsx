import { useState } from 'react'
import { X } from 'lucide-react'

// ช่องกรอกหลายค่า คั่นด้วย comma — พิมพ์ "เบาหวาน, ไขมัน, หัวใจ" → เป็นชิป · เก็บเป็น string คั่นด้วย comma
export function TagInput({ value, onChange, placeholder = 'เช่น เบาหวาน, ไขมัน' }) {
  const tags = (value || '').split(',').map(s => s.trim()).filter(Boolean)
  const [input, setInput] = useState('')
  const commit = () => {
    const t = input.trim()
    if (t && !tags.includes(t)) onChange([...tags, t].join(', '))
    setInput('')
  }
  const remove = t => onChange(tags.filter(x => x !== t).join(', '))
  return (
    <div className="w-full border border-gray-200 rounded-lg px-2 py-1.5 bg-white flex flex-wrap gap-1 items-center focus-within:ring-2 focus-within:ring-brand-300 focus-within:border-brand-300">
      {tags.map(t => (
        <span key={t} className="inline-flex items-center gap-1 bg-brand-50 text-brand-700 rounded-full pl-2 pr-1 py-0.5 text-xs">
          {t}
          <button type="button" onClick={() => remove(t)} className="hover:text-red-500"><X size={12} /></button>
        </span>
      ))}
      <input
        className="flex-1 min-w-[110px] outline-none text-sm bg-transparent py-0.5"
        value={input}
        placeholder={tags.length ? '' : placeholder}
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

// className มาตรฐานสำหรับ input/select/textarea
export const inputCls =
  'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-300 focus:border-brand-300'

export function PageHeader({ title, subtitle, children }) {
  return (
    <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
      <div>
        <h1 className="text-xl font-semibold text-gray-800">{title}</h1>
        {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </div>
  )
}

export function Btn({ children, variant = 'primary', className = '', ...props }) {
  const styles = {
    primary: 'bg-brand-600 text-white hover:bg-brand-700',
    ghost: 'border border-gray-200 text-gray-600 hover:bg-gray-50',
    danger: 'text-red-500 hover:bg-red-50',
  }
  return (
    <button
      {...props}
      className={`px-4 py-2 rounded-lg text-sm transition-all duration-150 ease-out hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 active:scale-[.96] active:shadow-sm disabled:opacity-50 disabled:translate-y-0 disabled:shadow-none disabled:active:scale-100 ${styles[variant]} ${className}`}
    >
      {children}
    </button>
  )
}

export function Modal({ open, onClose, title, children, footer, wide, size }) {
  if (!open) return null
  const width = size === 'xl' ? 'max-w-5xl' : wide ? 'max-w-2xl' : 'max-w-md'
  return (
    <div className="modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm" onMouseDown={onClose}>
      <div
        className={`modal-panel bg-white rounded-2xl shadow-2xl ring-1 ring-black/5 w-full ${width} max-h-[75vh] flex flex-col`}
        onMouseDown={e => e.stopPropagation()}
      >
        {/* header — stays fixed at top */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-gray-200 flex-shrink-0">
          <h3 className="font-semibold text-gray-800 text-base">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg p-1 transition -mr-1"><X size={18} /></button>
        </div>
        {/* body — scrolls between header and footer */}
        <div className="px-6 py-4 overflow-y-auto">{children}</div>
        {/* footer — stays fixed at bottom */}
        {footer && (
          <div className="px-6 py-3 border-t border-gray-200 flex-shrink-0 flex gap-2 justify-end">{footer}</div>
        )}
      </div>
    </div>
  )
}

export function Field({ label, children }) {
  return (
    <div>
      {label && <label className="text-sm text-gray-600 block mb-1">{label}</label>}
      {children}
    </div>
  )
}

export function StatTile({ icon: Icon, label, value, tone = 'brand' }) {
  const tones = {
    brand: 'text-brand-600 bg-brand-50',
    blue: 'text-blue-600 bg-blue-50',
    green: 'text-green-600 bg-green-50',
    amber: 'text-amber-600 bg-amber-50',
    purple: 'text-purple-600 bg-purple-50',
    gray: 'text-gray-600 bg-gray-100',
  }
  return (
    <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm flex items-center gap-3">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${tones[tone]}`}>
        <Icon size={18} />
      </div>
      <div>
        <p className="text-xl font-semibold text-gray-800 leading-none">{value ?? 0}</p>
        <p className="text-xs text-gray-500 mt-1">{label}</p>
      </div>
    </div>
  )
}

export function Badge({ children, tone = 'gray' }) {
  const tones = {
    gray: 'bg-gray-100 text-gray-600',
    brand: 'bg-brand-100 text-brand-700',
    green: 'bg-green-100 text-green-700',
    amber: 'bg-amber-100 text-amber-700',
    red: 'bg-red-100 text-red-600',
    blue: 'bg-blue-100 text-blue-700',
    purple: 'bg-purple-100 text-purple-700',
  }
  return <span className={`text-xs px-2 py-0.5 rounded-full ${tones[tone]}`}>{children}</span>
}

export function Empty({ children = 'ยังไม่มีข้อมูล' }) {
  return <p className="text-sm text-gray-400 py-10 text-center">{children}</p>
}

export function Card({ children, className = '' }) {
  return <div className={`bg-white rounded-xl border border-gray-200 shadow-sm ${className}`}>{children}</div>
}

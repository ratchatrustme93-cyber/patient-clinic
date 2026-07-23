import { createContext, useContext, useMemo, useState } from 'react'
import { th as thDate, enUS } from 'date-fns/locale'
import th from './locales/th'
import en from './locales/en'

// ── ระบบสองภาษา ไทย/อังกฤษ ──
// เก็บภาษาที่เลือกไว้ใน localStorage · อ่านครั้งแรกใน index.html (กันข้อความกะพริบตอนโหลด)
// แปลเฉพาะตัวระบบ — ชื่อที่ผู้ใช้พิมพ์เอง (แผนก, บริการ, ชื่อคนไข้) แสดงตามที่กรอกไว้

const DICTS = { th, en }
const DATE_LOCALES = { th: thDate, en: enUS }
export const LANGS = [
  { id: 'th', label: 'ไทย', short: 'TH' },
  { id: 'en', label: 'English', short: 'EN' },
]

const KEY = 'pc.lang'
const Ctx = createContext(null)

export function getLang() {
  const v = document.documentElement.lang
  return DICTS[v] ? v : 'th'
}

function applyLang(id) {
  document.documentElement.lang = id
  try { localStorage.setItem(KEY, id) } catch { /* โหมดส่วนตัวอาจเขียนไม่ได้ */ }
}

// หา 'a.b.c' ในพจนานุกรม
function lookup(dict, key) {
  return key.split('.').reduce((o, k) => (o == null ? undefined : o[k]), dict)
}

export function I18nProvider({ children }) {
  const [lang, setLangState] = useState(getLang)

  const value = useMemo(() => {
    const dict = DICTS[lang]
    // t('patients.title') · แทนตัวแปรด้วย t('x.y', { n: 5 }) แล้วเขียน {n} ในข้อความ
    const t = (key, vars) => {
      let s = lookup(dict, key) ?? lookup(DICTS.th, key) ?? key
      if (vars && typeof s === 'string') {
        for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, v)
      }
      return s
    }
    return {
      t,
      lang,
      dateLocale: DATE_LOCALES[lang],
      setLang: id => { applyLang(id); setLangState(id) },
      toggleLang: () => {
        const next = LANGS[(LANGS.findIndex(l => l.id === lang) + 1) % LANGS.length].id
        applyLang(next); setLangState(next)
      },
    }
  }, [lang])

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useT() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useT ต้องอยู่ภายใต้ <I18nProvider>')
  return ctx
}

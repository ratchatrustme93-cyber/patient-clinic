// สลับหน้าตาของแอป · ค่าถูกอ่านครั้งแรกใน index.html (กันจอกะพริบตอนโหลด)
const KEY = 'pc.theme'

export const THEMES = [
  { id: 'default', label: 'สว่างสดใส' },
  { id: 'classic', label: 'คลินิกเดิม (teal)' },
]

export function getTheme() {
  return document.documentElement.dataset.theme || 'default'
}

export function setTheme(id) {
  if (id === 'default') delete document.documentElement.dataset.theme
  else document.documentElement.dataset.theme = id
  try { localStorage.setItem(KEY, id) } catch { /* โหมดส่วนตัวอาจเขียนไม่ได้ */ }
  return id
}

export function nextTheme() {
  const i = THEMES.findIndex(t => t.id === getTheme())
  return setTheme(THEMES[(i + 1) % THEMES.length].id)
}

export const themeLabel = id => THEMES.find(t => t.id === id)?.label || id

import prisma from './prisma.js'

// สร้างรหัสอัตโนมัติแบบเรียงลำดับ เช่น EMP0001, HN0001, B000001
export async function nextCode(model, prefix, width = 4) {
  const count = await prisma[model].count()
  return `${prefix}${String(count + 1).padStart(width, '0')}`
}

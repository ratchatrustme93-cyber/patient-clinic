import jwt from 'jsonwebtoken'

export function auth(req, res, next) {
  const header = req.headers.authorization
  if (!header) return res.status(401).json({ error: 'No token' })
  try {
    req.user = jwt.verify(header.split(' ')[1], process.env.JWT_SECRET)
    next()
  } catch {
    res.status(401).json({ error: 'Invalid token' })
  }
}

// requireRole('MASTER','ADMIN') — MASTER ผ่านได้ทุกอย่างเสมอ
export function requireRole(...roles) {
  return (req, res, next) => {
    if (req.user.role === 'MASTER' || roles.includes(req.user.role)) return next()
    res.status(403).json({ error: 'Forbidden' })
  }
}

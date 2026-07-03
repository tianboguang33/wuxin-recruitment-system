import { Router, type Request, type Response, type NextFunction } from 'express'
import crypto from 'crypto'
import db from '../db.js'

const router = Router()

function generateToken(username: string): string {
  const payload = JSON.stringify({ username, timestamp: Date.now() })
  return Buffer.from(payload).toString('base64')
}

function decodeToken(token: string): { username: string; timestamp: number } | null {
  try {
    const decoded = Buffer.from(token, 'base64').toString('utf-8')
    return JSON.parse(decoded)
  } catch {
    return null
  }
}

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ success: false, error: '未提供认证令牌' })
    return
  }

  const token = authHeader.slice(7)
  const payload = decodeToken(token)
  if (!payload || !payload.username) {
    res.status(401).json({ success: false, error: '无效的认证令牌' })
    return
  }

  const stmt = db.prepare('SELECT id, username FROM admins WHERE username = ?')
  stmt.bind([payload.username])
  const row = stmt.step() ? stmt.getAsObject() : null
  stmt.free()

  if (!row) {
    res.status(401).json({ success: false, error: '用户不存在' })
    return
  }

  ;(req as any).admin = row
  next()
}

router.post('/login', (req: Request, res: Response): void => {
  const { username, password } = req.body

  if (!username || !password) {
    res.status(400).json({ success: false, error: '用户名和密码不能为空' })
    return
  }

  const passwordHash = crypto.createHash('sha256').update(password).digest('hex')

  const stmt = db.prepare('SELECT id, username FROM admins WHERE username = ? AND password_hash = ?')
  stmt.bind([username, passwordHash])
  const row = stmt.step() ? stmt.getAsObject() : null
  stmt.free()

  if (!row) {
    res.status(401).json({ success: false, error: '用户名或密码错误' })
    return
  }

  const token = generateToken(username)

  res.json({
    success: true,
    data: {
      token,
      admin: { username: row.username },
    },
  })
})

router.get('/me', authMiddleware, (req: Request, res: Response): void => {
  const admin = (req as any).admin
  res.json({
    success: true,
    data: { admin: { username: admin.username } },
  })
})

router.post('/logout', (_req: Request, res: Response): void => {
  res.json({ success: true, data: null })
})

export default router

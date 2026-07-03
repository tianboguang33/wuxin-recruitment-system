import { Router, type Request, type Response } from 'express'
import db from '../db.js'
import { authMiddleware } from './auth.js'

const router = Router()

router.get('/', (req: Request, res: Response): void => {
  const { search, category, location, page = '1', limit = '10' } = req.query

  const conditions: string[] = ['1=1']
  const params: any[] = []

  if (search) {
    conditions.push('(title LIKE ? OR department LIKE ? OR description LIKE ?)')
    const like = `%${search}%`
    params.push(like, like, like)
  }

  if (category) {
    conditions.push('category = ?')
    params.push(category)
  }

  if (location) {
    conditions.push('location = ?')
    params.push(location)
  }

  const pageNum = Math.max(1, parseInt(page as string, 10) || 1)
  const limitNum = Math.max(1, Math.min(100, parseInt(limit as string, 10) || 10))
  const offset = (pageNum - 1) * limitNum

  const whereClause = conditions.join(' AND ')

  const countStmt = db.prepare(`SELECT COUNT(*) as total FROM jobs WHERE ${whereClause}`)
  countStmt.bind(params)
  countStmt.step()
  const { total } = countStmt.getAsObject() as { total: number }
  countStmt.free()

  const dataStmt = db.prepare(`SELECT * FROM jobs WHERE ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`)
  dataStmt.bind([...params, limitNum, offset])
  const jobs: any[] = []
  while (dataStmt.step()) {
    jobs.push(dataStmt.getAsObject())
  }
  dataStmt.free()

  res.json({
    success: true,
    data: {
      jobs,
      total,
      page: pageNum,
      limit: limitNum,
    },
  })
})

router.get('/:id', (req: Request, res: Response): void => {
  const { id } = req.params

  const stmt = db.prepare('SELECT * FROM jobs WHERE id = ?')
  stmt.bind([parseInt(id, 10)])
  const row = stmt.step() ? stmt.getAsObject() : null
  stmt.free()

  if (!row) {
    res.status(404).json({ success: false, error: '岗位不存在' })
    return
  }

  res.json({ success: true, data: { job: row } })
})

router.post('/', authMiddleware, (req: Request, res: Response): void => {
  const { title, department, location, category, salaryMin, salaryMax, description, requirements, status } = req.body

  if (!title || !department) {
    res.status(400).json({ success: false, error: '标题和部门不能为空' })
    return
  }

  db.run(
    `INSERT INTO jobs (title, department, location, category, salary_min, salary_max, description, requirements, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      title,
      department,
      location || '北京',
      category || '技术',
      salaryMin || null,
      salaryMax || null,
      description || '',
      requirements || '',
      status || 'active',
    ],
  )

  const rows = db.exec("SELECT MAX(id) as id FROM jobs");
  const id = rows[0]?.values[0]?.[0] as number;
  const stmt = db.prepare('SELECT * FROM jobs WHERE id = ?')
  stmt.bind([id])
  stmt.step()
  const job = stmt.getAsObject()
  stmt.free()

  res.status(201).json({ success: true, data: { job } })
})

router.put('/:id', authMiddleware, (req: Request, res: Response): void => {
  const { id } = req.params
  const { title, department, location, category, salaryMin, salaryMax, description, requirements, status } = req.body

  const checkStmt = db.prepare('SELECT id FROM jobs WHERE id = ?')
  checkStmt.bind([parseInt(id, 10)])
  const exists = checkStmt.step()
  checkStmt.free()

  if (!exists) {
    res.status(404).json({ success: false, error: '岗位不存在' })
    return
  }

  db.run(
    `UPDATE jobs SET title = COALESCE(?, title), department = COALESCE(?, department),
     location = COALESCE(?, location), category = COALESCE(?, category),
     salary_min = COALESCE(?, salary_min), salary_max = COALESCE(?, salary_max),
     description = COALESCE(?, description), requirements = COALESCE(?, requirements),
     status = COALESCE(?, status), updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [
      title || null,
      department || null,
      location || null,
      category || null,
      salaryMin !== undefined ? salaryMin : null,
      salaryMax !== undefined ? salaryMax : null,
      description !== undefined ? description : null,
      requirements !== undefined ? requirements : null,
      status || null,
      parseInt(id, 10),
    ],
  )

  const stmt = db.prepare('SELECT * FROM jobs WHERE id = ?')
  stmt.bind([parseInt(id, 10)])
  stmt.step()
  const job = stmt.getAsObject()
  stmt.free()

  res.json({ success: true, data: { job } })
})

router.delete('/:id', authMiddleware, (req: Request, res: Response): void => {
  const { id } = req.params

  const checkStmt = db.prepare('SELECT id FROM jobs WHERE id = ?')
  checkStmt.bind([parseInt(id, 10)])
  const exists = checkStmt.step()
  checkStmt.free()

  if (!exists) {
    res.status(404).json({ success: false, error: '岗位不存在' })
    return
  }

  db.run('DELETE FROM applications WHERE job_id = ?', [parseInt(id, 10)])
  db.run('DELETE FROM jobs WHERE id = ?', [parseInt(id, 10)])

  res.json({ success: true, data: null })
})

router.patch('/:id/status', authMiddleware, (req: Request, res: Response): void => {
  const { id } = req.params
  const { status } = req.body

  if (!status || !['active', 'closed'].includes(status)) {
    res.status(400).json({ success: false, error: '状态值无效，必须为 active 或 closed' })
    return
  }

  const checkStmt = db.prepare('SELECT id FROM jobs WHERE id = ?')
  checkStmt.bind([parseInt(id, 10)])
  const exists = checkStmt.step()
  checkStmt.free()

  if (!exists) {
    res.status(404).json({ success: false, error: '岗位不存在' })
    return
  }

  db.run('UPDATE jobs SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [status, parseInt(id, 10)])

  const stmt = db.prepare('SELECT * FROM jobs WHERE id = ?')
  stmt.bind([parseInt(id, 10)])
  stmt.step()
  const job = stmt.getAsObject()
  stmt.free()

  res.json({ success: true, data: { job } })
})

export default router

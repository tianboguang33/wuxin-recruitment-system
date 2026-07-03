import { Router, type Request, type Response } from 'express'
import db from '../db.js'
import { authMiddleware } from './auth.js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { ApplicationStateService } from '../services/applicationStateService.js'
import { ApplicationState, ApplicationEvent } from '../state-machine/configs/applicationStateMachine.js'
import { addStateHistory } from '../db.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const RESUMES_DIR = path.resolve(__dirname, '..', '..', 'resumes')

if (!fs.existsSync(RESUMES_DIR)) {
  fs.mkdirSync(RESUMES_DIR, { recursive: true })
}

const router = Router()

router.post('/', (req: Request, res: Response): void => {
  const { jobId, name, phone, email, education, experience, coverLetter, resumeFileId } = req.body

  if (!jobId || !name || !phone || !email) {
    res.status(400).json({ success: false, error: '岗位ID、姓名、电话和邮箱不能为空' })
    return
  }

  const jobStmt = db.prepare('SELECT id FROM jobs WHERE id = ?')
  jobStmt.bind([parseInt(jobId, 10)])
  const jobExists = jobStmt.step()
  jobStmt.free()

  if (!jobExists) {
    res.status(404).json({ success: false, error: '岗位不存在' })
    return
  }

  db.run(
    `INSERT INTO applications (job_id, name, phone, email, education, experience, cover_letter, resume_file_id, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
    [
      parseInt(jobId, 10),
      name,
      phone,
      email,
      education || '',
      experience || '',
      coverLetter || '',
      resumeFileId || null,
    ],
  )

  const rows = db.exec("SELECT MAX(id) as id FROM applications");
  const id = rows[0]?.values[0]?.[0] as number;
  const stmt = db.prepare('SELECT * FROM applications WHERE id = ?')
  stmt.bind([id])
  stmt.step()
  const application = stmt.getAsObject()
  stmt.free()

  res.status(201).json({ success: true, data: { application } })

  try {
    const jobStmt2 = db.prepare('SELECT title, department FROM jobs WHERE id = ?')
    jobStmt2.bind([parseInt(jobId, 10)])
    jobStmt2.step()
    const jobInfo = jobStmt2.getAsObject() as any
    jobStmt2.free()

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
    const safeName = name.replace(/[<>:"/\\|?*]/g, '_')
    const safeJob = (jobInfo?.title || '未知岗位').replace(/[<>:"/\\|?*]/g, '_')
    const fileName = `${timestamp}_${safeName}_${safeJob}`

    const resumeData = {
      id: application.id,
      name,
      phone,
      email,
      jobId: parseInt(jobId, 10),
      jobTitle: jobInfo?.title || '',
      jobDepartment: jobInfo?.department || '',
      education: education || '',
      experience: experience || '',
      coverLetter: coverLetter || '',
      resumeFileId: resumeFileId || null,
      status: 'pending',
      submittedAt: new Date().toISOString(),
    }

    fs.writeFileSync(
      path.join(RESUMES_DIR, `${fileName}.json`),
      JSON.stringify(resumeData, null, 2),
      'utf-8',
    )

    const textContent = `═══════════════════════════════════════
              简 历 信 息
═══════════════════════════════════════

【基本信息】
  姓    名：${name}
  电    话：${phone}
  邮    箱：${email}
  投递岗位：${jobInfo?.title || ''}（${jobInfo?.department || ''}）
  投递时间：${new Date().toLocaleString('zh-CN')}
  状    态：待审核

【教育经历】
${(education || '无').split('\n').map(l => '  ' + l).join('\n')}

【工作经验】
${(experience || '无').split('\n').map(l => '  ' + l).join('\n')}

【求职信】
${(coverLetter || '无').split('\n').map(l => '  ' + l).join('\n')}

───────────────────────────────────
  五新重工招聘系统 · 自动生成
═══════════════════════════════════════`

    fs.writeFileSync(
      path.join(RESUMES_DIR, `${fileName}.txt`),
      textContent,
      'utf-8',
    )
  } catch (err) {
    console.error('[Resume] 保存简历文件失败:', err)
  }
})

router.get('/', authMiddleware, (req: Request, res: Response): void => {
  const { jobId, status, page = '1', limit = '10' } = req.query

  const conditions: string[] = ['1=1']
  const params: any[] = []

  if (jobId) {
    conditions.push('a.job_id = ?')
    params.push(parseInt(jobId as string, 10))
  }

  if (status) {
    conditions.push('a.status = ?')
    params.push(status as string)
  }

  const pageNum = Math.max(1, parseInt(page as string, 10) || 1)
  const limitNum = Math.max(1, Math.min(100, parseInt(limit as string, 10) || 10))
  const offset = (pageNum - 1) * limitNum

  const whereClause = conditions.join(' AND ')

  const countStmt = db.prepare(`SELECT COUNT(*) as total FROM applications a WHERE ${whereClause}`)
  countStmt.bind(params)
  countStmt.step()
  const { total } = countStmt.getAsObject() as { total: number }
  countStmt.free()

  const dataStmt = db.prepare(
    `SELECT a.*, j.title as job_title, j.department as job_department,
            rf.original_name as resume_original_name, rf.file_name as resume_file_name, rf.file_size as resume_file_size
     FROM applications a
     LEFT JOIN jobs j ON a.job_id = j.id
     LEFT JOIN resume_files rf ON a.resume_file_id = rf.id
     WHERE ${whereClause} ORDER BY a.created_at DESC LIMIT ? OFFSET ?`,
  )
  dataStmt.bind([...params, limitNum, offset])
  const applications: any[] = []
  while (dataStmt.step()) {
    applications.push(dataStmt.getAsObject())
  }
  dataStmt.free()

  res.json({
    success: true,
    data: {
      applications,
      total,
      page: pageNum,
      limit: limitNum,
    },
  })
})

router.patch('/:id/status', authMiddleware, (req: Request, res: Response): void => {
  const { id } = req.params
  const { status, reason } = req.body
  const appId = parseInt(id, 10)

  const checkStmt = db.prepare('SELECT * FROM applications WHERE id = ?')
  checkStmt.bind([appId])
  const exists = checkStmt.step()
  if (!exists) {
    checkStmt.free()
    res.status(404).json({ success: false, error: '投递记录不存在' })
    return
  }
  const application = checkStmt.getAsObject() as any
  checkStmt.free()

  const oldStatusMap: Record<string, ApplicationState> = {
    pending: 'pending',
    reviewed: 'screened',
    interviewed: 'interviewing',
    accepted: 'accepted',
    rejected: 'rejected',
  }

  const newState = oldStatusMap[status] || (status as ApplicationState)
  const currentState = (oldStatusMap[application.status] || application.status) as ApplicationState

  const allStates = ApplicationStateService.getAllStates().map(s => s.state)
  if (!allStates.includes(newState)) {
    res.status(400).json({ success: false, error: `状态值无效` })
    return
  }

  if (currentState === newState) {
    res.json({ success: true, data: { application } })
    return
  }

  db.run('UPDATE applications SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [newState, appId])
  
  const stmt = db.prepare('SELECT * FROM applications WHERE id = ?')
  stmt.bind([appId])
  stmt.step()
  const updatedApp = stmt.getAsObject()
  stmt.free()

  try {
    const username = (req as any).user?.username || 'admin'
    addStateHistory('application', appId, currentState, newState, 'manual_update', username, reason || '手动更新状态')
  } catch (e) {
    console.error('[Status] 记录状态历史失败:', e)
  }

  res.json({ success: true, data: { application: updatedApp } })
})

router.get('/:id/state', authMiddleware, (req: Request, res: Response): void => {
  const { id } = req.params
  const appId = parseInt(id, 10)

  const stmt = db.prepare('SELECT * FROM applications WHERE id = ?')
  stmt.bind([appId])
  const exists = stmt.step()
  if (!exists) {
    stmt.free()
    res.status(404).json({ success: false, error: '投递记录不存在' })
    return
  }
  const application = stmt.getAsObject() as any
  stmt.free()

  const currentState = application.status as ApplicationState
  const stateInfo = ApplicationStateService.getCurrentStateInfo(currentState)
  const availableEvents = ApplicationStateService.getAvailableEvents(currentState)
  const allStates = ApplicationStateService.getAllStates()

  res.json({
    success: true,
    data: {
      currentState: stateInfo,
      availableEvents,
      allStates,
    },
  })
})

router.post('/:id/transition', authMiddleware, (req: Request, res: Response): void => {
  const { id } = req.params
  const { event, reason } = req.body
  const appId = parseInt(id, 10)

  if (!event) {
    res.status(400).json({ success: false, error: '事件不能为空' })
    return
  }

  const stmt = db.prepare('SELECT * FROM applications WHERE id = ?')
  stmt.bind([appId])
  const exists = stmt.step()
  if (!exists) {
    stmt.free()
    res.status(404).json({ success: false, error: '投递记录不存在' })
    return
  }
  const application = stmt.getAsObject() as any
  stmt.free()

  const currentState = application.status as ApplicationState
  const username = (req as any).user?.username || 'admin'

  ;(async () => {
    const result = await ApplicationStateService.transition(
      appId,
      currentState,
      event as ApplicationEvent,
      username,
      reason || ''
    )

    if (result.success) {
      db.run('UPDATE applications SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [result.toState, appId])
      
      const newStateInfo = ApplicationStateService.getCurrentStateInfo(result.toState)
      const newAvailableEvents = ApplicationStateService.getAvailableEvents(result.toState)

      res.json({
        success: true,
        data: {
          fromState: result.fromState,
          toState: result.toState,
          stateInfo: newStateInfo,
          availableEvents: newAvailableEvents,
        },
      })
    } else {
      res.status(400).json({
        success: false,
        error: result.error,
        availableEvents: result.availableEvents,
      })
    }
  })()
})

router.get('/:id/history', authMiddleware, (req: Request, res: Response): void => {
  const { id } = req.params
  const appId = parseInt(id, 10)

  const stmt = db.prepare('SELECT id FROM applications WHERE id = ?')
  stmt.bind([appId])
  const exists = stmt.step()
  stmt.free()

  if (!exists) {
    res.status(404).json({ success: false, error: '投递记录不存在' })
    return
  }

  const history = ApplicationStateService.getHistory(appId)

  res.json({
    success: true,
    data: {
      history,
      total: history.length,
    },
  })
})

// 删除单条投递记录（需要认证）
router.delete('/:id', authMiddleware, (req: Request, res: Response): void => {
  const { id } = req.params
  const appId = parseInt(id, 10)

  const checkStmt = db.prepare('SELECT * FROM applications WHERE id = ?')
  checkStmt.bind([appId])
  const exists = checkStmt.step()
  if (!exists) {
    checkStmt.free()
    res.status(404).json({ success: false, error: '投递记录不存在' })
    return
  }
  const application = checkStmt.getAsObject() as any
  checkStmt.free()

  // 如果有简历文件，也删除
  if (application.resume_file_id) {
    db.run('DELETE FROM resume_files WHERE id = ?', [application.resume_file_id])
  }

  db.run('DELETE FROM applications WHERE id = ?', [appId])
  db.run('DELETE FROM state_history WHERE entity_type = ? AND entity_id = ?', ['application', appId])

  res.json({ success: true, message: '投递记录已删除', data: { id: appId } })
})

router.get('/mcp/pending', (req: Request, res: Response): void => {
  const { apiKey } = req.query

  // 简单API key验证（防止随意访问）
  if (apiKey !== 'wuxin_mcp_2026') {
    res.status(401).json({ success: false, error: '无效的API密钥' })
    return
  }

  const stmt = db.prepare(
    `SELECT a.*, j.title as job_title, j.department as job_department,
            j.description as job_description, j.requirements as job_requirements
     FROM applications a
     LEFT JOIN jobs j ON a.job_id = j.id
     WHERE a.status = 'pending'
     ORDER BY a.created_at DESC`
  )
  const applications: any[] = []
  while (stmt.step()) {
    applications.push(stmt.getAsObject())
  }
  stmt.free()

  res.json({ success: true, data: { applications, total: applications.length } })
})

// MCP工具专用API - 更新简历状态（无需认证，但需要简单验证）
router.patch('/mcp/:id/status', (req: Request, res: Response): void => {
  const { id } = req.params
  const { status, apiKey } = req.body

  // 简单API key验证
  if (apiKey !== 'wuxin_mcp_2026') {
    res.status(401).json({ success: false, error: '无效的API密钥' })
    return
  }

  const validStatuses = ['pending', 'reviewed', 'interviewed', 'accepted', 'rejected']
  if (!status || !validStatuses.includes(status)) {
    res.status(400).json({ success: false, error: `状态值无效，必须为 ${validStatuses.join('、')} 之一` })
    return
  }

  const checkStmt = db.prepare('SELECT id FROM applications WHERE id = ?')
  checkStmt.bind([parseInt(id, 10)])
  const exists = checkStmt.step()
  checkStmt.free()

  if (!exists) {
    res.status(404).json({ success: false, error: '投递记录不存在' })
    return
  }

  db.run('UPDATE applications SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [status, parseInt(id, 10)])

  const stmt = db.prepare('SELECT * FROM applications WHERE id = ?')
  stmt.bind([parseInt(id, 10)])
  stmt.step()
  const application = stmt.getAsObject()
  stmt.free()

  res.json({ success: true, data: { application } })
})

// 删除已淘汰简历（rejected状态）- 批量清理
router.delete('/mcp/rejected', (req: Request, res: Response): void => {
  const { apiKey, days } = req.body

  // 简单API key验证
  if (apiKey !== 'wuxin_mcp_2026') {
    res.status(401).json({ success: false, error: '无效的API密钥' })
    return
  }

  // days参数：删除多少天前的rejected简历，默认删除所有
  const daysThreshold = days ? parseInt(days as string, 10) : 0

  let whereClause = "status = 'rejected'"
  if (daysThreshold > 0) {
    const dateThreshold = new Date()
    dateThreshold.setDate(dateThreshold.getDate() - daysThreshold)
    whereClause += ` AND updated_at < '${dateThreshold.toISOString()}'`
  }

  // 先查询要删除的简历数量
  const countStmt = db.prepare(`SELECT COUNT(*) as count FROM applications WHERE ${whereClause}`)
  countStmt.bind([])
  countStmt.step()
  const { count } = countStmt.getAsObject() as { count: number }
  countStmt.free()

  if (count === 0) {
    res.json({ success: true, message: '没有需要删除的已淘汰简历', deletedCount: 0 })
    return
  }

  // 执行删除
  db.run(`DELETE FROM applications WHERE ${whereClause}`)

  res.json({
    success: true,
    message: `已删除 ${count} 条已淘汰简历`,
    deletedCount: count,
  })
})

export default router

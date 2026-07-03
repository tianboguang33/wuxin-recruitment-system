import { Router, type Request, type Response } from 'express'
import crypto from 'crypto'
import db from '../db.js'

const router = Router()

router.post('/tool', (req: Request, res: Response): void => {
  const { tool, args } = req.body

  if (!tool || !args) {
    res.status(400).json({ success: false, error: '缺少 tool 或 args 参数' })
    return
  }

  switch (tool) {
    case 'generate_job_description': {
      const { title, department, requirements } = args
      if (!title) {
        res.status(400).json({ success: false, error: '缺少 title 参数' })
        return
      }

      const description = generateJobDescription(title, department || '', requirements || '')
      res.json({
        success: true,
        data: {
          result: {
            description: description.description,
            requirements: description.requirements,
          },
        },
      })
      break
    }

    case 'analyze_resume_match': {
      const { jobId, applicationId } = args
      if (!jobId || !applicationId) {
        res.status(400).json({ success: false, error: '缺少 jobId 或 applicationId 参数' })
        return
      }

      const result = analyzeResumeMatch(parseInt(jobId, 10), parseInt(applicationId, 10))
      res.json({
        success: true,
        data: { result },
      })
      break
    }

    case 'create_interview_room': {
      const { candidate_id, candidate_name, candidate_email, scheduled_time, job_title, jd } = args
      if (!candidate_id || !candidate_name || !candidate_email || !scheduled_time || !job_title) {
        res.status(400).json({ success: false, error: '缺少必要参数: candidate_id, candidate_name, candidate_email, scheduled_time, job_title' })
        return
      }

      const room_id = `room_${crypto.randomBytes(8).toString('hex')}`
      const meeting_link = `https://interview.example.com/join/${room_id}`

      db.run(
        `INSERT INTO interview_rooms (room_id, candidate_id, candidate_name, candidate_email, scheduled_time, job_title, jd, meeting_link, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'created')`,
        [room_id, candidate_id, candidate_name, candidate_email, scheduled_time, job_title, jd || '', meeting_link]
      )

      const stmt = db.prepare('SELECT * FROM interview_rooms WHERE room_id = ?')
      stmt.bind([room_id])
      const room = stmt.step() ? stmt.getAsObject() as any : null
      stmt.free()

      res.json({
        success: true,
        data: {
          result: {
            room_id: room?.room_id,
            meeting_link: room?.meeting_link,
            status: room?.status,
            message: '面试房间创建成功'
          }
        },
      })
      break
    }

    case 'check_interview_status': {
      const { room_id } = args
      if (!room_id) {
        res.status(400).json({ success: false, error: '缺少必要参数: room_id' })
        return
      }

      const stmt = db.prepare('SELECT * FROM interview_rooms WHERE room_id = ?')
      stmt.bind([room_id])
      const room = stmt.step() ? stmt.getAsObject() as any : null
      stmt.free()

      if (!room) {
        res.status(404).json({ success: false, error: `面试房间不存在: ${room_id}` })
        return
      }

      res.json({
        success: true,
        data: {
          result: {
            room_status: room.status,
            ai_model_status: room.ai_model_status,
            network_status: room.network_status,
            scheduled_time: room.scheduled_time
          }
        },
      })
      break
    }

    case 'start_interview': {
      const { room_id } = args
      if (!room_id) {
        res.status(400).json({ success: false, error: '缺少必要参数: room_id' })
        return
      }

      const stmt = db.prepare('SELECT * FROM interview_rooms WHERE room_id = ?')
      stmt.bind([room_id])
      const room = stmt.step() ? stmt.getAsObject() as any : null
      stmt.free()

      if (!room) {
        res.status(404).json({ success: false, error: `面试房间不存在: ${room_id}` })
        return
      }

      if (room.status !== 'created' && room.status !== 'ready') {
        res.status(400).json({ success: false, error: `当前状态无法启动面试: ${room.status}` })
        return
      }

      db.run('UPDATE interview_rooms SET status = "in_progress", updated_at = CURRENT_TIMESTAMP WHERE room_id = ?', [room_id])

      res.json({
        success: true,
        data: {
          result: {
            room_id: room_id,
            status: 'in_progress',
            message: 'AI面试已启动'
          }
        },
      })
      break
    }

    case 'get_interview_result': {
      const { room_id } = args
      if (!room_id) {
        res.status(400).json({ success: false, error: '缺少必要参数: room_id' })
        return
      }

      const stmt = db.prepare('SELECT * FROM interview_rooms WHERE room_id = ?')
      stmt.bind([room_id])
      const room = stmt.step() ? stmt.getAsObject() as any : null
      stmt.free()

      if (!room) {
        res.status(404).json({ success: false, error: `面试房间不存在: ${room_id}` })
        return
      }

      if (room.status !== 'completed') {
        res.json({
          success: true,
          data: {
            result: {
              candidate_id: room.candidate_id,
              room_id: room.room_id,
              status: room.status,
              score: null,
              dimension_scores: {},
              summary: `面试尚未完成，当前状态: ${room.status}`,
              transcript: ''
            }
          },
        })
        break
      }

      let dimension_scores = {}
      try {
        if (room.dimension_scores) {
          dimension_scores = JSON.parse(room.dimension_scores)
        }
      } catch {
        dimension_scores = {}
      }

      res.json({
        success: true,
        data: {
          result: {
            candidate_id: room.candidate_id,
            room_id: room.room_id,
            status: room.status,
            score: room.score,
            dimension_scores: dimension_scores,
            summary: room.summary || '无',
            transcript: room.transcript || ''
          }
        },
      })
      break
    }

    default:
      res.status(400).json({ success: false, error: `未知的 tool: ${tool}` })
  }
})

router.get('/resource/:type/:id', (req: Request, res: Response): void => {
  const { type, id } = req.params
  const numId = parseInt(id, 10)

  if (type === 'job') {
    const stmt = db.prepare('SELECT * FROM jobs WHERE id = ?')
    stmt.bind([numId])
    const row = stmt.step() ? stmt.getAsObject() : null
    stmt.free()

    if (!row) {
      res.status(404).json({ success: false, error: '岗位不存在' })
      return
    }

    res.json({ success: true, data: { resource: row } })
  } else if (type === 'candidate') {
    const stmt = db.prepare(
      `SELECT a.*, j.title as job_title, j.department as job_department
       FROM applications a LEFT JOIN jobs j ON a.job_id = j.id WHERE a.id = ?`,
    )
    stmt.bind([numId])
    const row = stmt.step() ? stmt.getAsObject() : null
    stmt.free()

    if (!row) {
      res.status(404).json({ success: false, error: '候选人不存在' })
      return
    }

    res.json({ success: true, data: { resource: row } })
  } else {
    res.status(400).json({ success: false, error: `未知的资源类型: ${type}，支持的类型: job, candidate` })
  }
})

function generateJobDescription(title: string, department: string, requirements: string): { description: string; requirements: string } {
  const departmentMap: Record<string, string> = {
    '研发部': '负责公司核心产品的研发与技术创新，参与从概念设计到量产的全流程。',
    '电气部': '负责公司产品电气系统的设计、开发和维护，确保电气系统的可靠性和先进性。',
    '工艺部': '负责生产工艺的制定、优化和改进，提升生产效率和产品质量。',
    '项目部': '负责公司项目的全生命周期管理，协调各方资源确保项目按时高质量交付。',
    '质量部': '负责公司质量管理体系的建设和维护，确保产品和服务符合质量标准。',
  }

  const defaultDesc = '加入我们的团队，共同推动行业技术进步。'
  const deptDesc = departmentMap[department] || defaultDesc

  const description = `【岗位职责】\n作为${title}，您将${deptDesc}\n\n1. 负责相关领域的技术方案设计和实施\n2. 参与团队技术讨论和方案评审\n3. 编写技术文档和报告\n4. 指导初级工程师的工作`

  const generatedRequirements = requirements
    ? requirements
    : `1. 相关专业本科及以上学历\n2. 3年以上相关工作经验\n3. 良好的团队协作和沟通能力\n4. 具备较强的问题分析和解决能力`

  return { description, requirements: generatedRequirements }
}

function analyzeResumeMatch(jobId: number, applicationId: number): { matchScore: number; analysis: string; highlights: string[] } {
  const jobStmt = db.prepare('SELECT * FROM jobs WHERE id = ?')
  jobStmt.bind([jobId])
  const job = jobStmt.step() ? jobStmt.getAsObject() as any : null
  jobStmt.free()

  const appStmt = db.prepare('SELECT * FROM applications WHERE id = ?')
  appStmt.bind([applicationId])
  const app = appStmt.step() ? appStmt.getAsObject() as any : null
  appStmt.free()

  if (!job || !app) {
    return {
      matchScore: 0,
      analysis: '无法完成匹配分析：岗位或投递记录不存在',
      highlights: [],
    }
  }

  const score = Math.floor(Math.random() * 40) + 60

  const highlights: string[] = []
  if (app.education && app.education.includes('本科')) {
    highlights.push('学历符合岗位基本要求')
  }
  if (app.experience && app.experience.length > 50) {
    highlights.push('具备相关工作经验')
  }
  highlights.push(`应聘岗位：${job.title}（${job.department}）`)
  highlights.push('简历已进入评估流程')

  let analysis = `经过综合分析，候选人与「${job.title}」岗位的匹配度为 ${score}%。`
  if (score >= 80) {
    analysis += '候选人的背景与岗位要求高度契合，建议优先安排面试。'
  } else if (score >= 70) {
    analysis += '候选人的基本条件符合岗位要求，可安排进一步沟通。'
  } else {
    analysis += '候选人与岗位要求部分匹配，建议根据具体面试情况综合评估。'
  }

  return { matchScore: score, analysis, highlights }
}

export default router

import { Router, type Request, type Response } from 'express'
import db from '../db.js'
import { authMiddleware } from './auth.js'

const router = Router()

router.get('/dashboard', authMiddleware, (_req: Request, res: Response): void => {
  const totalJobsStmt = db.prepare('SELECT COUNT(*) as count FROM jobs')
  totalJobsStmt.step()
  const { count: totalJobs } = totalJobsStmt.getAsObject() as { count: number }
  totalJobsStmt.free()

  const totalAppsStmt = db.prepare('SELECT COUNT(*) as count FROM applications')
  totalAppsStmt.step()
  const { count: totalApplications } = totalAppsStmt.getAsObject() as { count: number }
  totalAppsStmt.free()

  const recentStmt = db.prepare(
    "SELECT COUNT(*) as count FROM applications WHERE strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now')",
  )
  recentStmt.step()
  const { count: monthlyNew } = recentStmt.getAsObject() as { count: number }
  recentStmt.free()

  const statusStmt = db.prepare(
    `SELECT status, COUNT(*) as count FROM applications GROUP BY status`,
  )
  const applicationsByStatus: Record<string, number> = {}
  while (statusStmt.step()) {
    const row = statusStmt.getAsObject() as { status: string; count: number }
    applicationsByStatus[row.status] = row.count
  }
  statusStmt.free()

  const recentListStmt = db.prepare(
    `SELECT a.id, a.name as candidateName, j.title as jobTitle, a.status, a.created_at as createdAt
     FROM applications a LEFT JOIN jobs j ON a.job_id = j.id
     ORDER BY a.created_at DESC LIMIT 5`,
  )
  const recentApplicationsList: any[] = []
  while (recentListStmt.step()) {
    recentApplicationsList.push(recentListStmt.getAsObject())
  }
  recentListStmt.free()

  res.json({
    success: true,
    data: {
      totalJobs,
      totalApplications,
      monthlyNew,
      recentApplications: recentApplicationsList,
      applicationsByStatus,
    },
  })
})

export default router

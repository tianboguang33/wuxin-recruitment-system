import express, {
  type Request,
  type Response,
  type NextFunction,
} from 'express'
import cors from 'cors'
import path from 'path'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import authRoutes from './routes/auth.js'
import jobsRoutes from './routes/jobs.js'
import applicationsRoutes from './routes/applications.js'
import statsRoutes from './routes/stats.js'
import mcpRoutes from './routes/mcp.js'
import uploadRoutes from './routes/upload.js'
import interviewRoutes from './routes/interview.js'
import maintenanceRoutes from './routes/maintenance.js'
import resumesRoutes from './routes/resumes.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config()

const app: express.Application = express()

app.use(cors())
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

app.use('/api/auth', authRoutes)
app.use('/api/jobs', jobsRoutes)
app.use('/api/applications', applicationsRoutes)
app.use('/api/stats', statsRoutes)
app.use('/api/mcp', mcpRoutes)
app.use('/api/uploads', uploadRoutes)
app.use('/api/interview', interviewRoutes)
app.use('/api/maintenance', maintenanceRoutes)
app.use('/api/resumes', resumesRoutes)

app.use(
  '/api/health',
  (req: Request, res: Response, next: NextFunction): void => {
    res.status(200).json({
      success: true,
      message: 'ok',
    })
  },
)

const distPath = path.resolve(__dirname, '..', 'dist')
app.use(express.static(distPath))

app.get('/TRAE_Competition_Proposal.html', (req: Request, res: Response) => {
  res.sendFile(path.join(distPath, 'TRAE_Competition_Proposal.html'))
})

app.get('*', (req: Request, res: Response) => {
  if (req.path.startsWith('/api')) {
    res.status(404).json({ success: false, error: 'API not found' })
  } else {
    res.sendFile(path.join(distPath, 'index.html'))
  }
})

app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Server error:', error.message)
  res.status(500).json({
    success: false,
    error: 'Server internal error',
  })
})

export default app

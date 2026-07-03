import { Router, type Request, type Response } from 'express'
import multer from 'multer'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'
import db from '../db.js'

const UPLOAD_DIR = path.resolve(process.cwd(), '..', 'generator', '001', 'uploads')

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true })
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || '.pdf'
    const name = `resume_${Date.now()}_${Math.random().toString(36).slice(2, 8)}${ext}`
    cb(null, name)
  },
})

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['.pdf', '.doc', '.docx', '.jpg', '.png', '.txt']
    const ext = path.extname(file.originalname).toLowerCase()
    if (allowed.includes(ext)) {
      cb(null, true)
    } else {
      cb(new Error('不支持的文件格式，仅支持 PDF、Word、图片、TXT'))
    }
  },
})

const router = Router()

router.post('/', (req: Request, res: Response): void => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        res.status(400).json({ success: false, error: err.code === 'LIMIT_FILE_SIZE' ? '文件大小不能超过10MB' : err.message })
        return
      }
      res.status(400).json({ success: false, error: err.message })
      return
    }

    const file = req.file
    if (!file) {
      res.status(400).json({ success: false, error: '请选择要上传的文件' })
      return
    }

    db.run(
      `INSERT INTO resume_files (original_name, file_name, file_size, mime_type)
       VALUES (?, ?, ?, ?)`,
      [file.originalname, file.filename, file.size, file.mimetype],
    )

    const rows = db.exec("SELECT MAX(id) as id FROM resume_files");
    const id = rows[0]?.values[0]?.[0] as number;
    const stmt = db.prepare('SELECT * FROM resume_files WHERE id = ?')
    stmt.bind([id])
    let record = null
    if (stmt.step()) {
      record = stmt.getAsObject()
    }
    stmt.free()

    res.json({
      success: true,
      data: {
        resumeFile: record,
        url: `/api/uploads/${file.filename}`,
      },
    })
  })
})

router.get('/:fileName', (req: Request, res: Response): void => {
  const filePath = path.join(UPLOAD_DIR, req.params.fileName)
  if (!fs.existsSync(filePath)) {
    res.status(404).json({ success: false, error: '文件不存在' })
    return
  }
  res.sendFile(filePath)
})

export default router

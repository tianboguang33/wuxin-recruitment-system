import { Router, type Request, type Response } from 'express'
import fs from 'fs'
import path from 'path'
import db from '../db.js'

const router = Router()

const UPLOAD_DIR = path.resolve(process.cwd(), '..', 'generator', '001', 'uploads')

async function parsePdf(filePath: string): Promise<string> {
  const pdfParseModule = await import('pdf-parse')
  const PDFParse = (pdfParseModule as any).PDFParse
  if (!PDFParse) {
    throw new Error('pdf-parse module import failed - PDFParse not found')
  }
  const pdfParser = new PDFParse()
  const dataBuffer = fs.readFileSync(filePath)
  const data = await pdfParser.parseBuffer(dataBuffer)
  return data.text || ''
}

async function parseDocx(filePath: string): Promise<string> {
  const mammoth = await import('mammoth')
  const result = await mammoth.extractRawText({ path: filePath })
  return result.value || ''
}

async function parseResume(filePath: string): Promise<string> {
  if (!fs.existsSync(filePath)) {
    throw new Error('简历文件不存在')
  }
  
  const ext = path.extname(filePath).toLowerCase()
  switch (ext) {
    case '.pdf':
      return await parsePdf(filePath)
    case '.docx':
      return await parseDocx(filePath)
    case '.doc':
      return await parseDocx(filePath)
    case '.txt':
      return fs.readFileSync(filePath, 'utf-8')
    default:
      throw new Error(`不支持的文件格式: ${ext}`)
  }
}

function calculateMatchScore(resumeText: string, jobRequirements: string): { score: number; dimension_scores: Record<string, number>; highlights: string[]; analysis: string } {
  const text = resumeText.toLowerCase()
  const requirements = jobRequirements.toLowerCase()
  
  const dimension_scores: Record<string, number> = {}
  const highlights: string[] = []
  
  let educationScore = 50
  if (text.includes('本科') || text.includes('学士')) educationScore = 70
  if (text.includes('硕士') || text.includes('研究生')) educationScore = 85
  if (text.includes('博士')) educationScore = 95
  if (text.includes('大专') || text.includes('专科')) educationScore = 40
  if (text.includes('高中')) educationScore = 20
  dimension_scores['学历匹配度'] = educationScore
  
  let experienceScore = 40
  const expMatch = text.match(/(\d+)\s*年\s*(工作)?(经验)?/)
  if (expMatch) {
    const years = parseInt(expMatch[1], 10)
    if (years >= 5) experienceScore = 85
    else if (years >= 3) experienceScore = 70
    else if (years >= 1) experienceScore = 55
  }
  dimension_scores['工作经验'] = experienceScore
  
  let skillScore = 40
  const skills = ['电气', '自动化', 'PLC', '变频器', '伺服', '电机', '控制', '电路', '调试', '维修', '售后', '英文', '英语', '项目管理', 'CAD', 'EPLAN']
  let matchedSkills = 0
  for (const skill of skills) {
    if (text.includes(skill.toLowerCase())) {
      matchedSkills++
    }
  }
  if (matchedSkills >= 5) skillScore = 90
  else if (matchedSkills >= 3) skillScore = 70
  else if (matchedSkills >= 1) skillScore = 50
  dimension_scores['技能匹配度'] = skillScore
  
  let projectScore = 40
  if (text.includes('项目') || text.includes('负责') || text.includes('主导')) {
    projectScore = 60
    if (text.match(/项目.*(经验|经历)/)) projectScore = 75
  }
  dimension_scores['项目经验'] = projectScore
  
  let overallScore = 50
  const total = Object.values(dimension_scores).reduce((a, b) => a + b, 0)
  const avg = total / Object.keys(dimension_scores).length
  overallScore = Math.min(95, Math.max(30, avg))
  dimension_scores['综合评估'] = overallScore
  
  const finalScore = Math.round(
    dimension_scores['学历匹配度'] * 0.2 +
    dimension_scores['工作经验'] * 0.25 +
    dimension_scores['技能匹配度'] * 0.3 +
    dimension_scores['项目经验'] * 0.15 +
    dimension_scores['综合评估'] * 0.1
  )
  
  if (educationScore >= 70) highlights.push('学历符合岗位要求')
  if (experienceScore >= 70) highlights.push('具备丰富的工作经验')
  if (skillScore >= 70) highlights.push('技能匹配度高')
  if (projectScore >= 60) highlights.push('有项目经验')
  if (text.includes('英文') || text.includes('英语') || text.includes('cet') || text.includes('六级') || text.includes('toefl')) {
    highlights.push('具备英语能力，适合国际售后岗位')
  }
  
  let analysis = ''
  if (finalScore >= 80) {
    analysis = '候选人背景与岗位高度匹配，建议优先安排面试。'
  } else if (finalScore >= 60) {
    analysis = '候选人基本条件符合岗位要求，可安排进一步沟通。'
  } else {
    analysis = '候选人与岗位要求有一定差距，建议根据具体情况综合评估。'
  }
  
  return { score: finalScore, dimension_scores, highlights, analysis }
}

router.get('/:id', (req: Request, res: Response): void => {
  const id = parseInt(req.params.id, 10)
  
  const stmt = db.prepare(
    `SELECT a.*, j.title as job_title, j.requirements, j.description, rf.file_name, rf.original_name
     FROM applications a 
     LEFT JOIN jobs j ON a.job_id = j.id
     LEFT JOIN resume_files rf ON a.resume_file_id = rf.id
     WHERE a.id = ?`
  )
  stmt.bind([id])
  const row = stmt.step() ? stmt.getAsObject() as any : null
  stmt.free()
  
  if (!row) {
    res.status(404).json({ success: false, error: '简历不存在' })
    return
  }
  
  res.json({ success: true, data: row })
})

router.post('/:id/evaluate', async (req: Request, res: Response): Promise<void> => {
  const id = parseInt(req.params.id, 10)
  
  try {
    const stmt = db.prepare(
      `SELECT a.*, j.title as job_title, j.requirements, j.description, rf.file_name, rf.original_name
       FROM applications a 
       LEFT JOIN jobs j ON a.job_id = j.id
       LEFT JOIN resume_files rf ON a.resume_file_id = rf.id
       WHERE a.id = ?`
    )
    stmt.bind([id])
    const row = stmt.step() ? stmt.getAsObject() as any : null
    stmt.free()
    
    if (!row) {
      res.status(404).json({ success: false, error: '投递记录不存在' })
      return
    }
    
    if (!row.file_name) {
      res.status(400).json({ success: false, error: '该投递记录没有简历附件' })
      return
    }
    
    const filePath = path.join(UPLOAD_DIR, row.file_name)
    console.log(`[Resume Evaluation] Processing application ${id}, file: ${row.file_name}, path: ${filePath}`)
    
    if (!fs.existsSync(filePath)) {
      res.status(404).json({ success: false, error: `简历文件不存在: ${filePath}` })
      return
    }
    
    const resumeText = await parseResume(filePath)
    console.log(`[Resume Evaluation] Parsed resume text length: ${resumeText.length}`)
    
    if (!resumeText || resumeText.length < 10) {
      res.status(400).json({ success: false, error: '简历内容解析失败或内容过少' })
      return
    }
    
    const jobRequirements = (row.requirements || '') + '\n' + (row.description || '')
    const evaluation = calculateMatchScore(resumeText, jobRequirements)
    console.log(`[Resume Evaluation] Score: ${evaluation.score}, Highlights: ${evaluation.highlights.join(', ')}`)
    
    db.run(
      `UPDATE applications 
       SET screening_score = ?, screening_dimensions = ?, screening_highlights = ?, screening_analysis = ?, screening_summary = ?
       WHERE id = ?`,
      [
        evaluation.score,
        JSON.stringify(evaluation.dimension_scores),
        JSON.stringify(evaluation.highlights),
        evaluation.analysis,
        `简历匹配度 ${evaluation.score}分：${evaluation.highlights.join('；')}`,
        id
      ]
    )
    
    res.json({
      success: true,
      data: {
        id,
        name: row.name,
        job_title: row.job_title,
        score: evaluation.score,
        dimension_scores: evaluation.dimension_scores,
        highlights: evaluation.highlights,
        analysis: evaluation.analysis,
        summary: `简历匹配度 ${evaluation.score}分：${evaluation.highlights.join('；')}`,
        timestamp: new Date().toISOString()
      }
    })
  } catch (error) {
    console.error(`[Resume Evaluation] Error for application ${id}:`, error)
    res.status(500).json({ success: false, error: `简历评估失败: ${(error as Error).message}`, stack: (error as Error).stack })
  }
})

router.get('/:id/evaluation', (req: Request, res: Response): void => {
  const id = parseInt(req.params.id, 10)
  
  const stmt = db.prepare(
    `SELECT a.id, a.name, a.screening_score, a.screening_dimensions, a.screening_highlights, a.screening_analysis, a.screening_summary,
            j.title as job_title, rf.original_name as resume_file_name
     FROM applications a 
     LEFT JOIN jobs j ON a.job_id = j.id
     LEFT JOIN resume_files rf ON a.resume_file_id = rf.id
     WHERE a.id = ?`
  )
  stmt.bind([id])
  const row = stmt.step() ? stmt.getAsObject() as any : null
  stmt.free()
  
  if (!row) {
    res.status(404).json({ success: false, error: '投递记录不存在' })
    return
  }
  
  if (row.screening_score === null || row.screening_score === undefined) {
    res.status(404).json({ success: false, error: '尚未进行简历评估' })
    return
  }
  
  let dimension_scores: Record<string, number> = {}
  try {
    if (row.screening_dimensions) {
      dimension_scores = JSON.parse(row.screening_dimensions)
    }
  } catch {
    dimension_scores = {}
  }
  
  let highlights: string[] = []
  try {
    if (row.screening_highlights) {
      highlights = JSON.parse(row.screening_highlights)
    }
  } catch {
    highlights = []
  }
  
  res.json({
    success: true,
    data: {
      id,
      name: row.name,
      job_title: row.job_title,
      score: row.screening_score,
      dimension_scores,
      highlights,
      analysis: row.screening_analysis,
      summary: row.screening_summary,
      resume_file_name: row.resume_file_name
    }
  })
})

export default router
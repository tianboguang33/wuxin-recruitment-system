import initSqlJs from 'sql.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = path.join(__dirname, 'data', 'wuxin.db');
const RESUMES_DIR = path.join(__dirname, 'resumes');

async function main() {
  const SQL = await initSqlJs();
  
  let dbBuffer = null;
  try {
    dbBuffer = fs.readFileSync(DB_PATH);
    console.log(`加载已有数据库: ${DB_PATH}`);
  } catch {
    console.log('未找到数据库文件，将创建新库');
  }
  
  const db = new SQL.Database(dbBuffer || undefined);
  
  function saveDb() {
    const data = db.export();
    fs.writeFileSync(DB_PATH, Buffer.from(data));
  }
  
  const files = fs.readdirSync(RESUMES_DIR).filter(f => f.endsWith('.json'));
  console.log(`找到 ${files.length} 个简历文件`);
  
  let imported = 0;
  let skipped = 0;
  
  for (const file of files) {
    const filePath = path.join(RESUMES_DIR, file);
    try {
      const resumeData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      
      const checkStmt = db.prepare('SELECT id FROM applications WHERE id = ? OR (name = ? AND email = ? AND job_id = ?)');
      checkStmt.bind([resumeData.id || 0, resumeData.name, resumeData.email, resumeData.jobId]);
      const exists = checkStmt.step();
      checkStmt.free();
      
      if (exists) {
        skipped++;
        console.log(`  跳过 (已存在): ${resumeData.name} - ${resumeData.jobTitle}`);
        continue;
      }
      
      const jobCheckStmt = db.prepare('SELECT id FROM jobs WHERE id = ?');
      jobCheckStmt.bind([resumeData.jobId]);
      const jobExists = jobCheckStmt.step();
      jobCheckStmt.free();
      
      if (!jobExists) {
        console.log(`  跳过 (岗位不存在): ${resumeData.name} - jobId=${resumeData.jobId}`);
        skipped++;
        continue;
      }
      
      db.run(
        `INSERT INTO applications (id, job_id, name, phone, email, education, experience, cover_letter, resume_file_id, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          resumeData.id,
          resumeData.jobId,
          resumeData.name,
          resumeData.phone,
          resumeData.email,
          resumeData.education || '',
          resumeData.experience || '',
          resumeData.coverLetter || '',
          resumeData.resumeFileId || null,
          resumeData.status || 'pending',
          resumeData.submittedAt ? new Date(resumeData.submittedAt).toISOString() : new Date().toISOString(),
          resumeData.submittedAt ? new Date(resumeData.submittedAt).toISOString() : new Date().toISOString(),
        ]
      );
      
      imported++;
      console.log(`  导入成功: ${resumeData.name} - ${resumeData.jobTitle}`);
      
    } catch (err) {
      console.error(`  导入失败 ${file}:`, err.message);
      skipped++;
    }
  }
  
  saveDb();
  
  console.log(`\n导入完成: 成功 ${imported} 条, 跳过 ${skipped} 条`);
  
  const stmt = db.prepare('SELECT COUNT(*) as count FROM applications');
  stmt.step();
  const { count } = stmt.getAsObject();
  stmt.free();
  console.log(`当前数据库中投递记录总数: ${count}`);
  
  const jobsStmt = db.prepare('SELECT id, title, department FROM jobs ORDER BY id');
  const jobs = [];
  while (jobsStmt.step()) {
    jobs.push(jobsStmt.getAsObject());
  }
  jobsStmt.free();
  console.log('\n当前岗位列表:');
  jobs.forEach(j => console.log(`  [${j.id}] ${j.title} - ${j.department}`));
}

main().catch(e => console.error('错误:', e));

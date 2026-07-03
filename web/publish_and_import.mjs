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
  
  console.log('\n===== 步骤1: 发布机械工程师岗位 =====');
  
  const checkJobStmt = db.prepare('SELECT id FROM jobs WHERE title = ? AND department = ?');
  checkJobStmt.bind(['机械工程师（起重机结构设计方向）', '技术研发部']);
  const jobExists = checkJobStmt.step();
  checkJobStmt.free();
  
  if (jobExists) {
    console.log('  机械工程师岗位已存在，跳过');
  } else {
    db.run(
      `INSERT INTO jobs (title, department, location, category, salary_min, salary_max, description, requirements, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        '机械工程师（起重机结构设计方向）',
        '技术研发部',
        '湖南长沙',
        '技术',
        15000,
        30000,
        '【岗位职责】\n1. 主导港口起重机、塔式起重机等产品的金属结构设计，包括主梁、支腿、臂架、门架等核心承载部件的方案设计与详细设计\n2. 负责结构强度、刚度、稳定性计算及有限元分析（FEA），确保产品符合GB/T 3811、GB 50017等国家及行业标准要求\n3. 设计焊接工艺方案，审核焊接图纸，跟踪关键焊接工序的实施，保障产品制造质量\n4. 参与产品研发全流程，从概念设计、方案评审、样机试制到量产交付，解决研发过程中的技术难题\n5. 与工艺、制造、质检等部门密切协作，优化设计方案以提升产品可制造性和成本竞争力',
        '【任职要求】\n1. 本科及以上学历，机械工程、结构工程、船舶与海洋工程、土木工程等相关专业\n2. 3年以上机械结构设计经验，有起重机、港口机械、大型钢结构设计经验者优先\n3. 熟练使用SolidWorks、AutoCAD等设计软件，掌握有限元分析工具（如ANSYS、ABAQUS等）者优先\n4. 熟悉GB/T 3811《起重机设计规范》、GB 50017《钢结构设计标准》等相关规范标准\n5. 了解焊接工艺（如埋弧焊、CO2气体保护焊等）和钢结构制造流程\n6. 具备扎实的力学基础和结构分析能力，能够独立完成复杂结构的设计与校核\n7. 良好的沟通协作能力，能够与跨部门团队高效配合推进项目',
        'active',
      ]
    );
    console.log('  机械工程师岗位发布成功');
  }
  
  const getJobStmt = db.prepare('SELECT id, title, department FROM jobs WHERE title = ?');
  getJobStmt.bind(['机械工程师（起重机结构设计方向）']);
  getJobStmt.step();
  const job = getJobStmt.getAsObject();
  getJobStmt.free();
  console.log(`  当前岗位ID: ${job?.id}`);
  
  console.log('\n===== 步骤2: 导入简历数据 =====');
  
  const files = fs.readdirSync(RESUMES_DIR).filter(f => f.endsWith('.json') && !f.startsWith('parsed_'));
  console.log(`找到 ${files.length} 个简历文件`);
  
  let imported = 0;
  let skipped = 0;
  
  for (const file of files) {
    const filePath = path.join(RESUMES_DIR, file);
    try {
      const resumeData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      
      if (!resumeData.name || !resumeData.email) {
        skipped++;
        console.log(`  跳过 (数据不完整): ${file}`);
        continue;
      }
      
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
      const jobExists2 = jobCheckStmt.step();
      jobCheckStmt.free();
      
      if (!jobExists2) {
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
  
  console.log('\n===== 当前岗位列表 =====');
  const jobsStmt = db.prepare('SELECT id, title, department FROM jobs ORDER BY id');
  while (jobsStmt.step()) {
    const row = jobsStmt.getAsObject();
    console.log(`  [${row.id}] ${row.title} - ${row.department}`);
  }
  jobsStmt.free();
  
  console.log('\n===== 当前简历列表 =====');
  const appsStmt = db.prepare(`SELECT a.id, a.name, a.email, a.status, j.title as job_title, a.created_at
                               FROM applications a LEFT JOIN jobs j ON a.job_id = j.id
                               ORDER BY a.created_at DESC`);
  while (appsStmt.step()) {
    const row = appsStmt.getAsObject();
    console.log(`  [${row.id}] ${row.name} - ${row.job_title} - ${row.status} - ${row.created_at}`);
  }
  appsStmt.free();
}

main().catch(e => console.error('错误:', e));

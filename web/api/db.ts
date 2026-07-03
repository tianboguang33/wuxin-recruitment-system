import initSqlJs from 'sql.js';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = path.resolve(__dirname, '..', '..', 'generator', '001', 'wuxin.db');

const SQL = await initSqlJs();

let dbBuffer: Buffer | null = null;
try {
  dbBuffer = fs.readFileSync(DB_PATH);
  console.error(`[DB] 加载已有数据库: ${DB_PATH} (${(dbBuffer.length / 1024).toFixed(1)}KB)`);
} catch {
  console.error(`[DB] 未找到数据库文件，将创建新库`);
}

const db = new SQL.Database(dbBuffer || undefined);

function saveDb() {
  try {
    const data = db.export();
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(DB_PATH, Buffer.from(data));
  } catch (err) {
    console.error('[DB] 保存数据库失败:', err);
  }
}

const originalRun = db.run.bind(db);
db.run = function (...args: any[]) {
  const result = originalRun(...args);
  saveDb();
  return result;
} as typeof db.run;

db.run('PRAGMA journal_mode=WAL');

const readOnlyDb = new SQL.Database(dbBuffer || undefined);
readOnlyDb.run('PRAGMA query_only=ON');

setInterval(() => {
  try {
    const data = db.export();
    readOnlyDb.close();
    readOnlyDb.db = new SQL.Database(data).db;
    console.log('[DB] Read-only replica refreshed');
  } catch (error) {
    console.error('[DB] Failed to refresh read-only replica:', error);
  }
}, 5000);

db.run(`
  CREATE TABLE IF NOT EXISTS jobs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    department TEXT NOT NULL,
    location TEXT NOT NULL DEFAULT '北京',
    category TEXT NOT NULL DEFAULT '技术',
    salary_min INTEGER,
    salary_max INTEGER,
    description TEXT DEFAULT '',
    requirements TEXT DEFAULT '',
    status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'closed')),
    urgency TEXT DEFAULT 'normal' CHECK(urgency IN ('urgent', 'normal', 'low')),
    published TEXT DEFAULT 'unpublished' CHECK(published IN ('published', 'unpublished')),
    published_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

db.run(`
  CREATE TABLE IF NOT EXISTS applications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    job_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT NOT NULL,
    education TEXT DEFAULT '',
    experience TEXT DEFAULT '',
    cover_letter TEXT DEFAULT '',
    resume_file_id INTEGER DEFAULT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    screening_score INTEGER DEFAULT NULL,
    interview_score INTEGER DEFAULT NULL,
    overall_score INTEGER DEFAULT NULL,
    deleted_at DATETIME DEFAULT NULL,
    interview_time DATETIME DEFAULT NULL,
    room_id TEXT DEFAULT '',
    meeting_link TEXT DEFAULT '',
    transcript TEXT DEFAULT '',
    summary TEXT DEFAULT '',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (job_id) REFERENCES jobs(id)
  )
`);

db.run(`
  CREATE TABLE IF NOT EXISTS resume_files (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    application_id INTEGER DEFAULT NULL,
    original_name TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    mime_type TEXT NOT NULL DEFAULT 'application/pdf',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

db.run(`
  CREATE TABLE IF NOT EXISTS state_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    entity_type TEXT NOT NULL,
    entity_id INTEGER NOT NULL,
    from_state TEXT NOT NULL,
    to_state TEXT NOT NULL,
    event TEXT NOT NULL,
    operator TEXT DEFAULT '',
    reason TEXT DEFAULT '',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

db.run(`
  CREATE INDEX IF NOT EXISTS idx_state_history_entity ON state_history(entity_type, entity_id)
`);

db.run(`
  CREATE TABLE IF NOT EXISTS admins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

db.run(`
  CREATE TABLE IF NOT EXISTS interview_rooms (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    room_id TEXT NOT NULL UNIQUE,
    candidate_id TEXT NOT NULL,
    candidate_name TEXT NOT NULL,
    candidate_email TEXT NOT NULL,
    scheduled_time TEXT NOT NULL,
    job_title TEXT NOT NULL,
    jd TEXT DEFAULT '',
    meeting_link TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'created' CHECK(status IN ('created', 'ready', 'in_progress', 'completed', 'failed', 'cancelled')),
    ai_model_status TEXT NOT NULL DEFAULT 'online',
    network_status TEXT NOT NULL DEFAULT 'normal',
    score INTEGER DEFAULT NULL,
    dimension_scores TEXT DEFAULT '',
    summary TEXT DEFAULT '',
    transcript TEXT DEFAULT '',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

db.run(`
  CREATE TABLE IF NOT EXISTS pending_tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_type TEXT NOT NULL CHECK(task_type IN ('screen', 'invite', 'schedule_interview', 'start_interview', 'evaluate', 'notify', 'db_maintain')),
    application_id INTEGER DEFAULT NULL,
    job_id INTEGER DEFAULT NULL,
    priority INTEGER DEFAULT 0,
    claimed_by TEXT DEFAULT NULL,
    claimed_at DATETIME DEFAULT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (application_id) REFERENCES applications(id),
    FOREIGN KEY (job_id) REFERENCES jobs(id)
  )
`);

db.run(`
  CREATE INDEX IF NOT EXISTS idx_pending_tasks_type_claimed ON pending_tasks(task_type, claimed_by)
`);

db.run(`
  CREATE INDEX IF NOT EXISTS idx_pending_tasks_app ON pending_tasks(application_id)
`);

db.run(`
  CREATE TABLE IF NOT EXISTS outbox (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    application_id INTEGER NOT NULL,
    event_type TEXT NOT NULL CHECK(event_type IN ('invitation', 'confirmation', 'offer', 'rejection', 'timeout', 'reminder')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'sent', 'failed', 'skipped')),
    email TEXT DEFAULT '',
    message_id TEXT DEFAULT '',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    sent_at DATETIME DEFAULT NULL,
    FOREIGN KEY (application_id) REFERENCES applications(id),
    UNIQUE(application_id, event_type)
  )
`);

db.run(`
  CREATE INDEX IF NOT EXISTS idx_outbox_app_event ON outbox(application_id, event_type)
`);

const adminHash = crypto.createHash('sha256').update('admin123').digest('hex');
db.run('INSERT OR IGNORE INTO admins (username, password_hash) VALUES (?, ?)', ['admin', adminHash]);

const existingJobs = db.exec('SELECT COUNT(*) as count FROM jobs');
if (existingJobs.length === 0 || existingJobs[0].values[0][0] === 0) {
  db.run(`
    INSERT INTO jobs (title, department, location, category, salary_min, salary_max, description, requirements, status) VALUES
    ('高级机械工程师', '研发部', '北京', '技术', 25000, 40000, '负责重型机械产品的设计与研发工作，参与新产品开发全流程，包括方案设计、详细设计、样机测试等。', '1. 机械工程及相关专业本科以上学历\n2. 8年以上重型机械设计经验\n3. 熟练使用SolidWorks、AutoCAD等设计软件\n4. 有大型工程项目经验者优先', 'active'),
    ('电气工程师', '电气部', '北京', '技术', 20000, 35000, '负责重型机械设备电气系统的设计与调试，PLC编程，电气原理图绘制。', '1. 电气工程或自动化相关专业本科及以上\n2. 5年以上电气设计经验\n3. 熟悉西门子、三菱等PLC编程\n4. 能适应短期出差', 'active'),
    ('焊接工艺工程师', '工艺部', '唐山', '技术', 15000, 25000, '负责焊接工艺方案的制定与优化，焊接质量控制，焊接工艺评定。', '1. 材料成型或焊接相关专业\n2. 3年以上焊接工艺经验\n3. 持有IWE或CWI证书者优先\n4. 熟悉ISO焊接标准', 'active'),
    ('项目经理', '项目部', '北京', '管理', 20000, 35000, '负责重工项目的全流程管理，包括项目计划、进度控制、资源协调、风险管理等。', '1. 工程管理或相关专业本科以上\n2. 5年以上项目管理经验\n3. 持有PMP证书者优先\n4. 具有良好的沟通协调能力', 'active'),
    ('质量检验员', '质量部', '唐山', '技术', 10000, 18000, '负责原材料、半成品和成品的质量检验工作，编制质检报告，参与质量改进。', '1. 机械或材料相关专业大专以上\n2. 2年以上质检经验\n3. 熟悉各类量具和检测设备\n4. 工作认真负责', 'active'),
    ('液压系统设计师', '研发部', '北京', '技术', 22000, 38000, '负责重型机械液压系统的设计与计算，液压原理图绘制，液压元件选型。', '1. 液压或机械相关专业硕士以上\n2. 5年以上液压系统设计经验\n3. 熟练使用AMESim等仿真软件\n4. 有工程机械液压系统设计经验者优先', 'active')
  `);
}

const oldStatusMap: Record<string, string> = {
  reviewed: 'screened',
  interviewed: 'interviewing',
};

const appsResult = db.exec("SELECT id, status, created_at FROM applications WHERE status IN ('reviewed', 'interviewed')");
if (appsResult.length > 0 && appsResult[0].values.length > 0) {
  console.log('[Migration] Migrating old application statuses...');
  const stmt = db.prepare('UPDATE applications SET status = ? WHERE id = ?');
  for (const row of appsResult[0].values) {
    const id = row[0] as number;
    const oldStatus = row[1] as string;
    const newStatus = oldStatusMap[oldStatus];
    if (newStatus) {
      stmt.bind([newStatus, id]);
      stmt.step();
      stmt.reset();
    }
  }
  stmt.free();
  console.log(`[Migration] Migrated ${appsResult[0].values.length} application statuses`);
}

const allAppsResult = db.exec('SELECT id, status, created_at FROM applications');
if (allAppsResult.length > 0 && allAppsResult[0].values.length > 0) {
  const historyCheck = db.exec('SELECT COUNT(*) as count FROM state_history WHERE entity_type = ?', ['application']);
  const historyCount = historyCheck[0]?.values[0]?.[0] as number;
  if (historyCount === 0) {
    console.log('[Migration] Adding initial state history for existing applications...');
    let added = 0;
    for (const row of allAppsResult[0].values) {
      const id = row[0] as number;
      const status = row[1] as string;
      const createdAt = row[2] as string;
      
      const existingCheck = db.prepare('SELECT id FROM state_history WHERE entity_type = ? AND entity_id = ?');
      existingCheck.bind(['application', id]);
      const hasHistory = existingCheck.step();
      existingCheck.free();
      
      if (!hasHistory) {
        db.run(
          `INSERT INTO state_history (entity_type, entity_id, from_state, to_state, event, operator, reason, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          ['application', id, 'pending', status, 'initial', 'system', '初始状态', createdAt]
        );
        added++;
      }
    }
    console.log(`[Migration] Added initial history for ${added} applications`);
  }
}

export interface StateHistoryRecord {
  id: number;
  entity_type: string;
  entity_id: number;
  from_state: string;
  to_state: string;
  event: string;
  operator: string;
  reason: string;
  created_at: string;
}

export interface OutboxRecord {
  id: number;
  application_id: number;
  event_type: string;
  status: string;
  email: string;
  message_id: string;
  created_at: string;
  sent_at: string;
}

export function addStateHistory(
  entityType: string,
  entityId: number,
  fromState: string,
  toState: string,
  event: string,
  operator: string = '',
  reason: string = ''
): number {
  db.run(
    `INSERT INTO state_history (entity_type, entity_id, from_state, to_state, event, operator, reason)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [entityType, entityId, fromState, toState, event, operator, reason]
  );
  const result = db.exec('SELECT last_insert_rowid() as id');
  return result[0]?.values[0]?.[0] as number;
}

export function getStateHistory(
  entityType: string,
  entityId: number
): StateHistoryRecord[] {
  const stmt = readOnlyDb.prepare(
    `SELECT * FROM state_history WHERE entity_type = ? AND entity_id = ? ORDER BY created_at DESC, id DESC`
  );
  stmt.bind([entityType, entityId]);
  const rows: StateHistoryRecord[] = [];
  while (stmt.step()) {
    const obj = stmt.getAsObject() as unknown as StateHistoryRecord;
    rows.push(obj);
  }
  stmt.free();
  return rows;
}

export function getStateHistoryByEntityIds(
  entityType: string,
  entityIds: number[]
): Record<number, StateHistoryRecord[]> {
  if (entityIds.length === 0) return {};
  const placeholders = entityIds.map(() => '?').join(',');
  const result = readOnlyDb.exec(
    `SELECT * FROM state_history WHERE entity_type = ? AND entity_id IN (${placeholders}) ORDER BY created_at DESC, id DESC`,
    [entityType, ...entityIds]
  );
  const records: Record<number, StateHistoryRecord[]> = {};
  if (result.length === 0) return records;
  const columns = result[0].columns;
  for (const row of result[0].values) {
    const record: Record<string, any> = {};
    columns.forEach((col, i) => {
      record[col] = row[i];
    });
    const entityId = record.entity_id as number;
    if (!records[entityId]) {
      records[entityId] = [];
    }
    records[entityId].push(record as StateHistoryRecord);
  }
  return records;
}

export async function checkEmailSent(applicationId: number, eventType: string): Promise<boolean> {
  const stmt = readOnlyDb.prepare('SELECT id FROM outbox WHERE application_id = ? AND event_type = ?');
  stmt.bind([applicationId, eventType]);
  const exists = stmt.step();
  stmt.free();
  return exists;
}

export async function recordEmailSent(applicationId: number, eventType: string, email: string, messageId: string): Promise<void> {
  try {
    db.run(
      `INSERT OR IGNORE INTO outbox (application_id, event_type, email, message_id, status, sent_at)
       VALUES (?, ?, ?, ?, 'sent', CURRENT_TIMESTAMP)`,
      [applicationId, eventType, email, messageId]
    );
  } catch (error) {
    console.error('[DB] Failed to record email sent:', error);
  }
}

export async function recordEmailPending(applicationId: number, eventType: string, email: string): Promise<void> {
  try {
    db.run(
      `INSERT OR IGNORE INTO outbox (application_id, event_type, email, status)
       VALUES (?, ?, ?, 'pending')`,
      [applicationId, eventType, email]
    );
  } catch (error) {
    console.error('[DB] Failed to record email pending:', error);
  }
}

function cleanup() {
  saveDb();
}
process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

export { readOnlyDb };
export default db;
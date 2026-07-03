import initSqlJs from 'sql.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = path.resolve(__dirname, '..', '..', '..', 'generator', '001', 'wuxin.db');

const SQL = await initSqlJs();

interface Task {
  id: number;
  taskType: string;
  applicationId?: number;
  jobId?: number;
  candidateId?: string;
  payload: string;
  priority: number;
  claimedBy?: string;
  claimedAt?: string;
  createdAt: string;
}

interface QueueStats {
  pendingCount: number;
  claimedCount: number;
  totalCount: number;
}

function loadDb(): typeof SQL.Database {
  let dbBuffer: Buffer | null = null;
  try {
    dbBuffer = fs.readFileSync(DB_PATH);
  } catch {
    console.log('[TaskQueue] Creating new database');
  }
  return new SQL.Database(dbBuffer || undefined);
}

function saveDb(db: typeof SQL.Database): void {
  try {
    const data = db.export();
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(DB_PATH, Buffer.from(data));
  } catch (err) {
    console.error('[TaskQueue] Failed to save database:', err);
  }
}

export class SqliteTaskQueue {
  private db: typeof SQL.Database;
  private emptyPollCount: number = 0;
  private baseInterval: number = 5000;
  private maxInterval: number = 120000;

  constructor() {
    this.db = loadDb();
    this.db.run('PRAGMA journal_mode = WAL');
    this.initTables();
    console.log('[TaskQueue] SQL.js task queue initialized');
  }

  private initTables(): void {
    this.db.run(`
      CREATE TABLE IF NOT EXISTS pending_tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        task_type TEXT NOT NULL CHECK(task_type IN ('screen', 'evaluate', 'notify', 'schedule_interview', 'cleanup', 'generate_jd', 'publish_jd', 'collect_resume', 'parse_resume')),
        application_id INTEGER DEFAULT NULL,
        job_id INTEGER DEFAULT NULL,
        candidate_id TEXT DEFAULT '',
        payload TEXT DEFAULT '',
        priority INTEGER NOT NULL DEFAULT 5,
        claimed_by TEXT DEFAULT '',
        claimed_at DATETIME DEFAULT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (application_id) REFERENCES applications(id),
        FOREIGN KEY (job_id) REFERENCES jobs(id)
      )
    `);

    this.db.run(`
      CREATE INDEX IF NOT EXISTS idx_pending_tasks_type_priority ON pending_tasks(task_type, priority, created_at)
    `);
    this.db.run(`
      CREATE INDEX IF NOT EXISTS idx_pending_tasks_claimed ON pending_tasks(claimed_by, claimed_at)
    `);
    saveDb(this.db);
  }

  async push(taskType: string, payload: any, options?: { applicationId?: number; jobId?: number; candidateId?: string; priority?: number }): Promise<number> {
    this.db.run(
      'INSERT INTO pending_tasks (task_type, application_id, job_id, candidate_id, payload, priority) VALUES (?, ?, ?, ?, ?, ?)',
      [
        taskType,
        options?.applicationId || null,
        options?.jobId || null,
        options?.candidateId || '',
        typeof payload === 'string' ? payload : JSON.stringify(payload),
        options?.priority || 5,
      ]
    );
    saveDb(this.db);
    this.emptyPollCount = 0;

    const result = this.db.exec('SELECT last_insert_rowid() as id');
    return result[0]?.values[0]?.[0] as number;
  }

  async claim(taskType: string, workerId: string): Promise<Task | null> {
    const selectStmt = this.db.prepare(
      'SELECT id FROM pending_tasks WHERE task_type = ? AND claimed_by = "" ORDER BY priority DESC, created_at ASC LIMIT 1'
    );
    selectStmt.bind([taskType]);

    if (!selectStmt.step()) {
      selectStmt.free();
      this.emptyPollCount++;
      return null;
    }

    const row = selectStmt.getAsObject();
    selectStmt.free();
    const taskId = row.id as number;

    this.db.run(
      'UPDATE pending_tasks SET claimed_by = ?, claimed_at = CURRENT_TIMESTAMP WHERE id = ?',
      [workerId, taskId]
    );
    saveDb(this.db);

    const result = this.db.exec('SELECT * FROM pending_tasks WHERE id = ?', [taskId]);
    if (result.length === 0) {
      this.emptyPollCount++;
      return null;
    }

    this.emptyPollCount = 0;
    return this.mapResultToTask(result);
  }

  async claimAny(workerId: string): Promise<Task | null> {
    const selectStmt = this.db.prepare(
      'SELECT id FROM pending_tasks WHERE claimed_by = "" ORDER BY priority DESC, created_at ASC LIMIT 1'
    );

    if (!selectStmt.step()) {
      selectStmt.free();
      this.emptyPollCount++;
      return null;
    }

    const row = selectStmt.getAsObject();
    selectStmt.free();
    const taskId = row.id as number;

    this.db.run(
      'UPDATE pending_tasks SET claimed_by = ?, claimed_at = CURRENT_TIMESTAMP WHERE id = ?',
      [workerId, taskId]
    );
    saveDb(this.db);

    const result = this.db.exec('SELECT * FROM pending_tasks WHERE id = ?', [taskId]);
    if (result.length === 0) {
      this.emptyPollCount++;
      return null;
    }

    this.emptyPollCount = 0;
    return this.mapResultToTask(result);
  }

  async complete(taskId: number): Promise<void> {
    this.db.run('DELETE FROM pending_tasks WHERE id = ?', [taskId]);
    saveDb(this.db);
  }

  async release(taskId: number): Promise<void> {
    this.db.run('UPDATE pending_tasks SET claimed_by = "", claimed_at = NULL WHERE id = ?', [taskId]);
    saveDb(this.db);
  }

  async getPendingCount(taskType?: string): Promise<number> {
    let result;
    if (taskType) {
      result = this.db.exec(
        'SELECT COUNT(*) as count FROM pending_tasks WHERE task_type = ? AND claimed_by = ""',
        [taskType]
      );
    } else {
      result = this.db.exec('SELECT COUNT(*) as count FROM pending_tasks WHERE claimed_by = ""');
    }
    return result[0]?.values[0]?.[0] as number || 0;
  }

  async getClaimedTasks(workerId: string): Promise<Task[]> {
    const result = this.db.exec(
      'SELECT * FROM pending_tasks WHERE claimed_by = ? ORDER BY claimed_at ASC',
      [workerId]
    );
    if (result.length === 0) return [];
    return this.mapResultsToTasks(result);
  }

  async cleanupStaleTasks(timeoutMinutes: number = 30): Promise<number> {
    const result = this.db.run(
      'DELETE FROM pending_tasks WHERE claimed_by != "" AND claimed_at < datetime("now", ?)',
      [`-${timeoutMinutes} minutes`]
    );
    saveDb(this.db);
    return 0;
  }

  async getStats(): Promise<QueueStats> {
    const pendingResult = this.db.exec('SELECT COUNT(*) as count FROM pending_tasks WHERE claimed_by = ""');
    const claimedResult = this.db.exec('SELECT COUNT(*) as count FROM pending_tasks WHERE claimed_by != ""');
    const totalResult = this.db.exec('SELECT COUNT(*) as count FROM pending_tasks');

    return {
      pendingCount: pendingResult[0]?.values[0]?.[0] as number || 0,
      claimedCount: claimedResult[0]?.values[0]?.[0] as number || 0,
      totalCount: totalResult[0]?.values[0]?.[0] as number || 0,
    };
  }

  getNextPollInterval(): number {
    if (this.emptyPollCount === 0) return this.baseInterval;

    const multiplier = Math.pow(2, this.emptyPollCount - 1);
    const interval = this.baseInterval * multiplier;

    return Math.min(interval, this.maxInterval);
  }

  resetPollInterval(): void {
    this.emptyPollCount = 0;
  }

  getEmptyPollCount(): number {
    return this.emptyPollCount;
  }

  setBaseInterval(interval: number): void {
    this.baseInterval = interval;
  }

  setMaxInterval(interval: number): void {
    this.maxInterval = interval;
  }

  private mapResultToTask(result: any[]): Task {
    const columns = result[0].columns;
    const row = result[0].values[0];
    const record: Record<string, any> = {};
    columns.forEach((col, i) => {
      record[col] = row[i];
    });

    return {
      id: record.id,
      taskType: record.task_type,
      applicationId: record.application_id || undefined,
      jobId: record.job_id || undefined,
      candidateId: record.candidate_id || undefined,
      payload: record.payload,
      priority: record.priority,
      claimedBy: record.claimed_by || undefined,
      claimedAt: record.claimed_at || undefined,
      createdAt: record.created_at,
    };
  }

  private mapResultsToTasks(result: any[]): Task[] {
    if (result.length === 0) return [];

    const columns = result[0].columns;
    const tasks: Task[] = [];

    for (const row of result[0].values) {
      const record: Record<string, any> = {};
      columns.forEach((col, i) => {
        record[col] = row[i];
      });

      tasks.push({
        id: record.id,
        taskType: record.task_type,
        applicationId: record.application_id || undefined,
        jobId: record.job_id || undefined,
        candidateId: record.candidate_id || undefined,
        payload: record.payload,
        priority: record.priority,
        claimedBy: record.claimed_by || undefined,
        claimedAt: record.claimed_at || undefined,
        createdAt: record.created_at,
      });
    }

    return tasks;
  }

  close(): void {
    saveDb(this.db);
    this.db.close();
  }
}

export default SqliteTaskQueue;
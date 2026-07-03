import initSqlJs from 'sql.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = path.resolve(__dirname, '..', '..', '..', 'generator', '001', 'wuxin.db');
const BATCH_DELETE_LIMIT = 1000;
const BATCH_DELETE_DELAY = 100;
const MAINTENANCE_START_HOUR = 2;
const MAINTENANCE_END_HOUR = 4;
const BACKUP_RETENTION_DAYS = 7;

const SQL = await initSqlJs();

interface MaintenanceResult {
  success: boolean;
  operation: string;
  message: string;
  affectedRows?: number;
  details?: any;
}

function isInMaintenanceWindow(): boolean {
  const now = new Date();
  const hour = now.getHours();
  return hour >= MAINTENANCE_START_HOUR && hour < MAINTENANCE_END_HOUR;
}

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function loadDb(): typeof SQL.Database {
  let dbBuffer: Buffer | null = null;
  try {
    dbBuffer = fs.readFileSync(DB_PATH);
  } catch {
    console.log('[DbMaintainer] Creating new database');
  }
  const db = new SQL.Database(dbBuffer || undefined);
  db.run('PRAGMA journal_mode = WAL');
  db.run('PRAGMA synchronous = NORMAL');
  return db;
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
    console.error('[DbMaintainer] Failed to save database:', err);
  }
}

export class DbMaintainerService {
  private db: typeof SQL.Database;
  private readonly maintenanceWindow: boolean;

  constructor(forceRun: boolean = false) {
    this.db = loadDb();
    this.maintenanceWindow = forceRun || isInMaintenanceWindow();
    console.log('[DbMaintainer] Database connection initialized');
  }

  async runAllMaintenance(): Promise<MaintenanceResult[]> {
    const results: MaintenanceResult[] = [];

    console.log('[DbMaintainer] Starting maintenance cycle');
    console.log(`[DbMaintainer] Maintenance window: ${this.maintenanceWindow ? 'ACTIVE' : 'INACTIVE'}`);

    results.push(await this.cleanupOrphanTasks());

    if (this.maintenanceWindow) {
      results.push(await this.cleanupExpiredApplications());
      results.push(await this.cleanupExpiredOutbox());
      results.push(await this.cleanupStaleTasks());
      results.push(await this.runWALCheckpoint());
      results.push(await this.runVacuum());
    } else {
      results.push({
        success: true,
        operation: 'cleanup_expired_applications',
        message: 'Skipped - not in maintenance window (2:00-4:00)',
      });
      results.push({
        success: true,
        operation: 'cleanup_expired_outbox',
        message: 'Skipped - not in maintenance window (2:00-4:00)',
      });
      results.push({
        success: true,
        operation: 'cleanup_stale_tasks',
        message: 'Skipped - not in maintenance window (2:00-4:00)',
      });
      results.push({
        success: true,
        operation: 'wal_checkpoint',
        message: 'Skipped - not in maintenance window (2:00-4:00)',
      });
      results.push({
        success: true,
        operation: 'vacuum',
        message: 'Skipped - not in maintenance window (2:00-4:00)',
      });
    }

    results.push(await this.runBackup());

    console.log('[DbMaintainer] Maintenance cycle completed');

    return results;
  }

  async cleanupOrphanTasks(): Promise<MaintenanceResult> {
    try {
      this.db.run(
        `DELETE FROM pending_tasks 
         WHERE application_id IS NOT NULL 
         AND NOT EXISTS (SELECT 1 FROM applications WHERE id = pending_tasks.application_id)`
      );
      saveDb(this.db);

      const result = this.db.exec('SELECT changes() as count');
      const affectedRows = result[0]?.values[0]?.[0] as number || 0;

      return {
        success: true,
        operation: 'cleanup_orphan_tasks',
        message: `Cleaned ${affectedRows} orphan tasks`,
        affectedRows,
      };
    } catch (error) {
      return {
        success: false,
        operation: 'cleanup_orphan_tasks',
        message: `Failed: ${error.message}`,
      };
    }
  }

  async cleanupExpiredApplications(): Promise<MaintenanceResult> {
    if (!this.maintenanceWindow) {
      return {
        success: true,
        operation: 'cleanup_expired_applications',
        message: 'Skipped - not in maintenance window (2:00-4:00)',
      };
    }

    try {
      let deleted = 1;
      let totalDeleted = 0;

      while (deleted > 0) {
        this.db.run(
          `DELETE FROM applications 
           WHERE status IN ('screening_rejected', 'evaluation_failed', 'declined', 'rejected') 
           AND updated_at < datetime('now', '-30 days') 
           LIMIT ${BATCH_DELETE_LIMIT}`
        );
        saveDb(this.db);

        const result = this.db.exec('SELECT changes() as count');
        deleted = result[0]?.values[0]?.[0] as number || 0;
        totalDeleted += deleted;

        if (deleted > 0) {
          await sleep(BATCH_DELETE_DELAY);
        }
      }

      return {
        success: true,
        operation: 'cleanup_expired_applications',
        message: `Cleaned ${totalDeleted} expired applications`,
        affectedRows: totalDeleted,
      };
    } catch (error) {
      return {
        success: false,
        operation: 'cleanup_expired_applications',
        message: `Failed: ${error.message}`,
      };
    }
  }

  async cleanupExpiredOutbox(): Promise<MaintenanceResult> {
    if (!this.maintenanceWindow) {
      return {
        success: true,
        operation: 'cleanup_expired_outbox',
        message: 'Skipped - not in maintenance window (2:00-4:00)',
      };
    }

    try {
      let deleted = 1;
      let totalDeleted = 0;

      while (deleted > 0) {
        this.db.run(
          `DELETE FROM outbox 
           WHERE status = 'sent' 
           AND sent_at < datetime('now', '-90 days') 
           LIMIT ${BATCH_DELETE_LIMIT}`
        );
        saveDb(this.db);

        const result = this.db.exec('SELECT changes() as count');
        deleted = result[0]?.values[0]?.[0] as number || 0;
        totalDeleted += deleted;

        if (deleted > 0) {
          await sleep(BATCH_DELETE_DELAY);
        }
      }

      return {
        success: true,
        operation: 'cleanup_expired_outbox',
        message: `Cleaned ${totalDeleted} expired outbox records`,
        affectedRows: totalDeleted,
      };
    } catch (error) {
      return {
        success: false,
        operation: 'cleanup_expired_outbox',
        message: `Failed: ${error.message}`,
      };
    }
  }

  async cleanupStaleTasks(): Promise<MaintenanceResult> {
    if (!this.maintenanceWindow) {
      return {
        success: true,
        operation: 'cleanup_stale_tasks',
        message: 'Skipped - not in maintenance window (2:00-4:00)',
      };
    }

    try {
      let deleted = 1;
      let totalDeleted = 0;

      while (deleted > 0) {
        this.db.run(
          `DELETE FROM pending_tasks 
           WHERE claimed_by != '' 
           AND claimed_at < datetime('now', '-2 hours') 
           LIMIT ${BATCH_DELETE_LIMIT}`
        );
        saveDb(this.db);

        const result = this.db.exec('SELECT changes() as count');
        deleted = result[0]?.values[0]?.[0] as number || 0;
        totalDeleted += deleted;

        if (deleted > 0) {
          await sleep(BATCH_DELETE_DELAY);
        }
      }

      return {
        success: true,
        operation: 'cleanup_stale_tasks',
        message: `Cleaned ${totalDeleted} stale tasks`,
        affectedRows: totalDeleted,
      };
    } catch (error) {
      return {
        success: false,
        operation: 'cleanup_stale_tasks',
        message: `Failed: ${error.message}`,
      };
    }
  }

  async runWALCheckpoint(): Promise<MaintenanceResult> {
    if (!this.maintenanceWindow) {
      return {
        success: true,
        operation: 'wal_checkpoint',
        message: 'Skipped - not in maintenance window (2:00-4:00)',
      };
    }

    try {
      this.db.run('PRAGMA wal_checkpoint(TRUNCATE)');
      saveDb(this.db);

      const stats = await this.getDBStats();

      return {
        success: true,
        operation: 'wal_checkpoint',
        message: 'WAL checkpoint completed (TRUNCATE mode)',
        details: stats,
      };
    } catch (error) {
      return {
        success: false,
        operation: 'wal_checkpoint',
        message: `Failed: ${error.message}`,
      };
    }
  }

  async runVacuum(): Promise<MaintenanceResult> {
    if (!this.maintenanceWindow) {
      return {
        success: true,
        operation: 'vacuum',
        message: 'Skipped - not in maintenance window (2:00-4:00)',
      };
    }

    try {
      const beforeStats = await this.getDBStats();

      this.db.run('VACUUM');
      saveDb(this.db);

      const afterStats = await this.getDBStats();

      const savedBytes = beforeStats.bytes - afterStats.bytes;

      return {
        success: true,
        operation: 'vacuum',
        message: `VACUUM completed, saved ${savedBytes} bytes`,
        details: {
          before: beforeStats,
          after: afterStats,
          savedBytes,
        },
      };
    } catch (error) {
      return {
        success: false,
        operation: 'vacuum',
        message: `Failed: ${error.message}`,
      };
    }
  }

  async runBackup(): Promise<MaintenanceResult> {
    try {
      const backupDir = path.resolve(__dirname, '..', '..', '..', 'data', 'backups');

      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupPath = `${backupDir}/recruitment_${timestamp}.db`;

      const backupDb = new SQL.Database();
      const tablesResult = this.db.exec(`SELECT name FROM sqlite_master WHERE type='table'`);

      if (tablesResult.length > 0) {
        const tables = tablesResult[0].values.map(row => row[0]);
        for (const table of tables) {
          const dataResult = this.db.exec(`SELECT * FROM ${table}`);
          if (dataResult.length > 0) {
            const columns = dataResult[0].columns;
            const createTableResult = this.db.exec(`SELECT sql FROM sqlite_master WHERE name = '${table}'`);
            if (createTableResult.length > 0) {
              backupDb.run(createTableResult[0].values[0][0]);
            }

            const placeholders = columns.map(() => '?').join(',');
            const insertStmt = backupDb.prepare(`INSERT INTO ${table} VALUES (${placeholders})`);
            for (const row of dataResult[0].values) {
              insertStmt.bind(row);
              insertStmt.step();
              insertStmt.reset();
            }
            insertStmt.free();
          }
        }
      }

      const backupData = backupDb.export();
      fs.writeFileSync(backupPath, Buffer.from(backupData));
      backupDb.close();

      const stats = fs.statSync(backupPath);

      await this.cleanupOldBackups(backupDir);

      return {
        success: true,
        operation: 'backup',
        message: `Backup created: ${backupPath} (${stats.size} bytes)`,
        details: {
          filename: backupPath,
          size: stats.size,
        },
      };
    } catch (error) {
      return {
        success: false,
        operation: 'backup',
        message: `Failed: ${error.message}`,
      };
    }
  }

  private async cleanupOldBackups(backupDir: string): Promise<void> {
    try {
      if (!fs.existsSync(backupDir)) return;

      const files = fs.readdirSync(backupDir);

      for (const file of files) {
        const filePath = `${backupDir}/${file}`;
        const stats = fs.statSync(filePath);
        const ageDays = (Date.now() - stats.mtime.getTime()) / (1000 * 60 * 60 * 24);

        if (ageDays > BACKUP_RETENTION_DAYS) {
          fs.unlinkSync(filePath);
          console.log(`[DbMaintainer] Removed old backup: ${file}`);
        }
      }
    } catch (error) {
      console.error('[DbMaintainer] Failed to cleanup old backups:', error);
    }
  }

  async getDBStats(): Promise<{ pages: number; bytes: number; tables: number }> {
    const pageCountResult = this.db.exec('PRAGMA page_count');
    const pageSizeResult = this.db.exec('PRAGMA page_size');
    const tablesResult = this.db.exec(`SELECT COUNT(*) as count FROM sqlite_master WHERE type='table'`);

    const pages = pageCountResult[0]?.values[0]?.[0] as number || 0;
    const pageSize = pageSizeResult[0]?.values[0]?.[0] as number || 4096;

    return {
      pages,
      bytes: pages * pageSize,
      tables: tablesResult[0]?.values[0]?.[0] as number || 0,
    };
  }

  close(): void {
    saveDb(this.db);
    this.db.close();
  }
}

export default DbMaintainerService;
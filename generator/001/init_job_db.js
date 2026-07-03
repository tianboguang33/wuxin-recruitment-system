const initSqlJs = require('sql.js');
const fs = require('fs');
const crypto = require('crypto');

async function main() {
  const SQL = await initSqlJs();
  const dbPath = 'c:\\Users\\36368\\Desktop\\trae-agent\\web\\data\\wuxin.db';

  let db;
  try {
    const buf = fs.readFileSync(dbPath);
    db = new SQL.Database(buf);
    console.log('已加载数据库, 大小:', buf.length);
  } catch {
    db = new SQL.Database();
    console.log('创建新数据库');
  }

  // 创建表
  db.run(
    'CREATE TABLE IF NOT EXISTS jobs (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, department TEXT NOT NULL, location TEXT NOT NULL DEFAULT "北京", category TEXT NOT NULL DEFAULT "技术", salary_min INTEGER, salary_max INTEGER, description TEXT DEFAULT "", requirements TEXT DEFAULT "", status TEXT NOT NULL DEFAULT "active", created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP)'
  );
  db.run(
    'CREATE TABLE IF NOT EXISTS applications (id INTEGER PRIMARY KEY AUTOINCREMENT, job_id INTEGER NOT NULL, name TEXT NOT NULL, phone TEXT NOT NULL, email TEXT NOT NULL, education TEXT DEFAULT "", experience TEXT DEFAULT "", cover_letter TEXT DEFAULT "", resume_file_id INTEGER DEFAULT NULL, status TEXT NOT NULL DEFAULT "pending", created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (job_id) REFERENCES jobs(id))'
  );
  db.run(
    'CREATE TABLE IF NOT EXISTS resume_files (id INTEGER PRIMARY KEY AUTOINCREMENT, application_id INTEGER DEFAULT NULL, original_name TEXT NOT NULL, file_name TEXT NOT NULL, file_size INTEGER NOT NULL, mime_type TEXT NOT NULL DEFAULT "application/pdf", created_at DATETIME DEFAULT CURRENT_TIMESTAMP)'
  );
  db.run(
    'CREATE TABLE IF NOT EXISTS admins (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT NOT NULL UNIQUE, password_hash TEXT NOT NULL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)'
  );

  // 创建默认管理员
  const hash = crypto.createHash('sha256').update('admin123').digest('hex');
  db.run('INSERT OR IGNORE INTO admins (username, password_hash) VALUES (?, ?)', ['admin', hash]);

  // 检查是否已存在同名岗位
  const checkStmt = db.prepare('SELECT id FROM jobs WHERE title = ? AND department = ?');
  checkStmt.bind(['电气工程师', '电气部']);
  const exists = checkStmt.step();
  checkStmt.free();

  if (!exists) {
    // 插入电气工程师岗位（五新重工）
    db.run(
      'INSERT INTO jobs (title, department, location, category, salary_min, salary_max, description, requirements, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        '电气工程师',
        '电气部',
        '长沙',
        '技术',
        100000,
        180000,
        '【岗位职责】\n1. 负责港口起重机、重型机械设备的电气系统设计与开发\n2. 完成电气原理图、接线图、布局图的设计与绘制\n3. 负责PLC（西门子/三菱等）程序设计、调试与维护\n4. 负责变频器、伺服驱动系统的选型、调试与优化\n5. 参与设备的现场安装调试和技术支持\n6. 编写电气技术文档、操作手册和维护规范',
        '【任职要求】\n1. 本科及以上学历，电气工程、自动化等相关专业\n2. 3年以上电气设计或调试工作经验\n3. 熟练使用AutoCAD、EPLAN等电气设计软件\n4. 精通西门子（S7-1200/1500）、三菱等主流PLC编程与调试\n5. 熟悉变频器、伺服驱动器等工控产品的应用\n6. 了解工业现场总线（Profibus、Profinet、Modbus等）\n7. 具备良好的沟通能力和团队协作精神\n8. 有港口机械、起重机行业经验者优先',
        'active',
      ]
    );
    console.log('电气工程师岗位已成功插入');
  } else {
    console.log('电气工程师岗位已存在，跳过插入');
  }

  // 保存数据库
  const data = db.export();
  fs.writeFileSync(dbPath, Buffer.from(data));
  console.log('数据库已保存到:', dbPath);

  // 查询验证所有岗位
  const stmt = db.prepare('SELECT id, title, department, salary_min, salary_max, location FROM jobs ORDER BY id');
  while (stmt.step()) {
    const row = stmt.getAsObject();
    console.log('  [' + row.id + '] ' + row.title + ' | ' + row.department + ' | ' + row.location + ' | ' + row.salary_min + '-' + row.salary_max);
  }
  stmt.free();
}

main().catch(e => console.error('错误:', e.message));

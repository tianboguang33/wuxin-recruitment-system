import initSqlJs from 'sql.js';
import fs from 'fs';
import crypto from 'crypto';

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

  const hash = crypto.createHash('sha256').update('admin123').digest('hex');
  db.run('INSERT OR IGNORE INTO admins (username, password_hash) VALUES (?, ?)', ['admin', hash]);

  // 检查是否已存在五新重工电气工程师岗位
  const checkStmt1 = db.prepare('SELECT id FROM jobs WHERE title = ? AND department = ?');
  checkStmt1.bind(['电气工程师', '五新重工研究院']);
  const exists1 = checkStmt1.step();
  checkStmt1.free();

  if (!exists1) {
    db.run(
      'INSERT INTO jobs (title, department, location, category, salary_min, salary_max, description, requirements, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        '电气工程师',
        '五新重工研究院',
        '长沙',
        '技术',
        10000,
        18000,
        '【岗位职责】\n1. 负责港口起重机、重型机械设备的电气系统设计与开发\n2. 完成电气原理图、接线图、布局图的设计与绘制\n3. 负责PLC（西门子/三菱等）程序设计、调试与维护\n4. 负责变频器、伺服驱动系统的选型、调试与优化\n5. 参与设备的现场安装调试和技术支持\n6. 编写电气技术文档、操作手册和维护规范',
        '【任职要求】\n1. 本科及以上学历，电气工程、自动化等相关专业\n2. 3年以上电气设计或调试工作经验\n3. 熟练使用AutoCAD、EPLAN等电气设计软件\n4. 精通西门子（S7-1200/1500）、三菱等主流PLC编程与调试\n5. 熟悉变频器、伺服驱动器等工控产品的应用\n6. 了解工业现场总线（Profibus、Profinet、Modbus等）\n7. 具备良好的沟通能力和团队协作精神\n8. 有港口机械、起重机行业经验者优先',
        'active',
      ]
    );
    console.log('五新重工研究院 - 电气工程师岗位已成功插入');
  } else {
    console.log('五新重工研究院 - 电气工程师岗位已存在，跳过插入');
  }

  // 检查是否已存在国际售后服务工程师岗位
  const checkStmt2 = db.prepare('SELECT id FROM jobs WHERE title = ? AND department = ?');
  checkStmt2.bind(['国际售后服务工程师', '国际营销部售后部']);
  const exists2 = checkStmt2.step();
  checkStmt2.free();

  if (!exists2) {
    db.run(
      'INSERT INTO jobs (title, department, location, category, salary_min, salary_max, description, requirements, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        '国际售后服务工程师',
        '国际营销部售后部',
        '湖南长沙（总部），需接受海外出差',
        '技术',
        15000,
        25000,
        '【岗位职责】\n1. 海外客户技术支持 - 安装调试、操作培训、远程/现场技术支持\n2. 设备维护与故障处理 - 巡检维护、故障诊断与维修\n3. 客户培训与赋能 - 提供产品培训、编制英文技术资料\n4. 售后信息反馈与改进 - 收集反馈、推动产品改进\n5. 备件管理与协调 - 协助备件库存管理\n6. 海外展会与推广支持 - 技术讲解与演示\n7. 客户关系维护 - 提升客户满意度\n8. 合规与安全管理 - 确保服务过程合规',
        '【任职要求】\n学历：本科及以上，机械工程/机电一体化相关专业\n经验：3年以上工程机械技术服务经验，海外服务经验优先\n技能：熟悉工程机械结构原理、电气液压故障诊断\n语言：英语CET-6或同等水平，能以英语为工作语言\n驾驶：持C1驾照',
        'active',
      ]
    );
    console.log('国际营销部售后部 - 国际售后服务工程师岗位已成功插入');
  } else {
    console.log('国际营销部售后部 - 国际售后服务工程师岗位已存在，跳过插入');
  }

  // 检查是否已存在AI架构师岗位
  const checkStmt3 = db.prepare('SELECT id FROM jobs WHERE title = ? AND department = ?');
  checkStmt3.bind(['AI架构师', '技术中心/智能研究院']);
  const exists3 = checkStmt3.step();
  checkStmt3.free();

  if (!exists3) {
    db.run(
      'INSERT INTO jobs (title, department, location, category, salary_min, salary_max, description, requirements, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        'AI架构师',
        '技术中心/智能研究院',
        '湖南长沙',
        '技术',
        33000,
        58000,
        '【岗位职责】\n1. AI技术架构设计 - 制定公司整体AI技术战略与架构蓝图，设计统一的AI平台技术栈\n2. 大模型应用落地 - 主导工业领域大模型的选型、微调与应用开发\n3. 工业AI场景攻坚 - 工业视觉检测、设备预测性维护、生产流程优化、供应链智能调度\n4. 算法工程化体系建设 - 建立MLOps规范与流水线，实现模型版本管理、自动化训练、A/B测试\n5. AI平台建设 - 负责公司AI开发平台的选型、搭建与运营\n6. 团队技术指导与人才培养 - 带领算法工程团队，技术选型、代码评审、架构把关\n7. 前沿技术跟踪与创新 - 大模型、多模态、AIGC、边缘AI等前沿技术预研与创新试点\n8. 跨部门协作 - 与研发、生产、销售、售后等业务部门紧密合作，推动AI技术与业务场景深度融合',
        '【任职要求】\n学历：硕士及以上学历，计算机科学、人工智能、机器学习、数学、统计学等相关专业；博士学历优先\n经验：5年以上AI/机器学习相关工作经验，3年以上架构设计经验；制造业或工业互联网领域经验者优先\n技术：精通至少一种主流深度学习框架（PyTorch/TensorFlow），熟悉大模型微调（LoRA/全参数微调）、RAG、Agent等技术；熟悉CV、NLP、时序预测等常用算法\n工程：熟练掌握Python/Java/C++中至少两种语言，具备良好的代码规范与工程化能力；大规模分布式训练、模型压缩与优化、推理服务部署经验\n架构：有完整AI平台或大型AI项目架构设计经验，熟悉云原生架构（Kubernetes/Docker），了解数据湖、特征平台、向量数据库等AI基础设施',
        'active',
      ]
    );
    console.log('技术中心/智能研究院 - AI架构师岗位已成功插入');
  } else {
    console.log('技术中心/智能研究院 - AI架构师岗位已存在，跳过插入');
  }

  // 检查是否已存在嵌入式工程师岗位
  const checkStmt4 = db.prepare('SELECT id FROM jobs WHERE title = ? AND department = ?');
  checkStmt4.bind(['嵌入式工程师', '研发部/电气控制部']);
  const exists4 = checkStmt4.step();
  checkStmt4.free();

  if (!exists4) {
    db.run(
      'INSERT INTO jobs (title, department, location, category, salary_min, salary_max, description, requirements, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        '嵌入式工程师',
        '研发部/电气控制部',
        '湖南长沙',
        '技术',
        15000,
        30000,
        '【岗位职责】\n1. 嵌入式软件开发 - 负责工程机械电控系统的嵌入式软件开发，包括基于ARM/STM32的控制器程序设计、编码与调试\n2. 嵌入式硬件方案设计 - 参与硬件原理图评审、元器件选型、PCB联调及硬件故障排查\n3. CAN总线通信开发 - 负责基于CAN总线（CANopen/SAE J1939等协议）的通信软件开发与多节点系统集成\n4. 实时操作系统开发 - 参与FreeRTOS/μC/OS等实时操作系统下的应用开发，确保系统实时性与可靠性\n5. 控制算法实现 - 负责工程机械控制算法的实现与优化，如起重机力矩限制、混凝土泵送控制、动作协调控制等\n6. 嵌入式Linux开发 - 参与嵌入式Linux系统的裁剪、驱动开发及应用层软件开发（如HMI、数据采集、远程通信等）\n7. 技术文档编写 - 编写设计文档、测试用例及技术规范，配合完成产品型式试验与现场调试\n8. 技术跟踪与优化 - 跟踪行业嵌入式技术发展趋势，持续优化现有产品电控方案，推动技术升级与降本增效',
        '【任职要求】\n学历：本科及以上学历，自动化、电气工程、电子信息、计算机、控制工程等相关专业\n经验：3年以上嵌入式软件开发经验，有工程机械、工业控制、汽车电子等行业背景者优先\n核心技能：熟练掌握C/C++语言，具备良好的编码规范与文档能力\nMCU开发：精通ARM Cortex-M系列（STM32F1/F4/H7等）开发，熟悉GPIO/UART/SPI/I2C/ADC/PWM等外设\n总线协议：熟悉CAN总线原理及应用，有CANopen/SAE J1939/Modbus等协议开发经验\n操作系统：熟悉FreeRTOS/μC/OS-III/RT-Thread等实时操作系统，有多任务开发调试经验\n嵌入式Linux：了解嵌入式Linux系统开发流程，有驱动开发或QT界面开发经验者加分\n硬件能力：能看懂硬件原理图，使用示波器、逻辑分析仪等工具进行软硬件联调',
        'active',
      ]
    );
    console.log('研发部/电气控制部 - 嵌入式工程师岗位已成功插入');
  } else {
    console.log('研发部/电气控制部 - 嵌入式工程师岗位已存在，跳过插入');
  }

  const data = db.export();
  fs.writeFileSync(dbPath, Buffer.from(data));
  console.log('数据库已保存');

  // 验证
  const stmt = db.prepare('SELECT id, title, department, salary_min, salary_max, location FROM jobs ORDER BY id');
  while (stmt.step()) {
    const row = stmt.getAsObject();
    console.log('  [' + row.id + '] ' + row.title + ' | ' + row.department + ' | ' + row.location + ' | ' + row.salary_min + '-' + row.salary_max);
  }
  stmt.free();
}

main().catch(e => console.error('错误:', e.message));

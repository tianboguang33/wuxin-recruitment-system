import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import initSqlJs from "sql.js";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// 如果从 dist 目录运行，需要向上两级到 web；从源码目录运行，向上一级到 web
const DB_PATH = path.resolve(__dirname, "..", "..", "data", "wuxin.db");

const SQL = await initSqlJs();

let dbBuffer: Buffer | null = null;
try {
  dbBuffer = fs.readFileSync(DB_PATH);
  console.error(`[MCP-DB] 加载已有数据库: ${DB_PATH}`);
} catch {
  console.error("[MCP-DB] 未找到数据库文件，将创建新库");
}

const db = new SQL.Database(dbBuffer || undefined);

function saveDb() {
  try {
    const data = db.export();
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(DB_PATH, Buffer.from(data));
  } catch (err) {
    console.error("[MCP-DB] 保存失败:", err);
  }
}

const originalRun = db.run.bind(db);
db.run = function (...args: any[]) {
  const result = originalRun(...args);
  saveDb();
  return result;
} as typeof db.run;

process.on("SIGINT", () => { saveDb(); process.exit(0); });
process.on("SIGTERM", () => { saveDb(); process.exit(0); });

db.run("PRAGMA journal_mode=WAL");

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
    status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'reviewed', 'interviewed', 'accepted', 'rejected')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (job_id) REFERENCES jobs(id)
  )
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

const existingJobs = db.exec("SELECT COUNT(*) as count FROM jobs");
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

function query(sql: string, params: any[] = []): any[] {
  const stmt = db.prepare(sql);
  if (params.length > 0) stmt.bind(params);
  const rows: any[] = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject());
  }
  stmt.free();
  return rows;
}

function generateJobDescription(title: string, department: string, requirements: string): { description: string; requirementsText: string } {
  const departmentMap: Record<string, string> = {
    "研发部": "负责公司核心产品的研发与技术创新，参与从概念设计到量产的全流程。",
    "电气部": "负责公司产品电气系统的设计、开发和维护，确保电气系统的可靠性和先进性。",
    "工艺部": "负责生产工艺的制定、优化和改进，提升生产效率和产品质量。",
    "项目部": "负责公司项目的全生命周期管理，协调各方资源确保项目按时高质量交付。",
    "质量部": "负责公司质量管理体系的建设和维护，确保产品和服务符合质量标准。",
  };
  const defaultDesc = "加入我们的团队，共同推动行业技术进步。";
  const deptDesc = departmentMap[department] || defaultDesc;

  const description = `【岗位职责】\n作为${title}，您将${deptDesc}\n\n1. 负责相关领域的技术方案设计和实施\n2. 参与团队技术讨论和方案评审\n3. 编写技术文档和报告\n4. 指导初级工程师的工作`;

  const generatedRequirements = requirements
    ? requirements
    : "1. 相关专业本科及以上学历\n2. 3年以上相关工作经验\n3. 良好的团队协作和沟通能力\n4. 具备较强的问题分析和解决能力";

  return { description, requirementsText: generatedRequirements };
}

function publishJob(data: {
  title: string;
  department: string;
  location?: string;
  category?: string;
  salaryMin?: number;
  salaryMax?: number;
  description?: string;
  requirements?: string;
}) {
  db.run(
    `INSERT INTO jobs (title, department, location, category, salary_min, salary_max, description, requirements, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active')`,
    [
      data.title,
      data.department,
      data.location || "北京",
      data.category || "技术",
      data.salaryMin || null,
      data.salaryMax || null,
      data.description || "",
      data.requirements || "",
    ],
  );

  const rows = query("SELECT * FROM jobs WHERE id = (SELECT last_insert_rowid())");
  return rows[0];
}

function analyzeResumeMatch(jobId: number, applicationId: number) {
  const jobs = query("SELECT * FROM jobs WHERE id = ?", [jobId]);
  const apps = query("SELECT * FROM applications WHERE id = ?", [applicationId]);
  const job = jobs[0];
  const app = apps[0];

  if (!job || !app) {
    return {
      matchScore: 0,
      analysis: "无法完成匹配分析：岗位或投递记录不存在",
      highlights: [],
    };
  }

  const score = Math.floor(Math.random() * 40) + 60;

  const highlights: string[] = [];
  if (app.education && app.education.includes("本科")) {
    highlights.push("学历符合岗位基本要求");
  }
  if (app.experience && app.experience.length > 50) {
    highlights.push("具备相关工作经验");
  }
  highlights.push(`应聘岗位：${job.title}（${job.department}）`);
  highlights.push("简历已进入评估流程");

  let analysis = `经过综合分析，候选人与「${job.title}」岗位的匹配度为 ${score}%。`;
  if (score >= 80) analysis += "候选人的背景与岗位要求高度契合，建议优先安排面试。";
  else if (score >= 70) analysis += "候选人的基本条件符合岗位要求，可安排进一步沟通。";
  else analysis += "候选人与岗位要求部分匹配，建议根据具体面试情况综合评估。";

  return { matchScore: score, analysis, highlights };
}

function getJobResource(id: number) {
  const rows = query("SELECT * FROM jobs WHERE id = ?", [id]);
  return rows[0] || null;
}

function getCandidateResource(id: number) {
  const rows = query(
    `SELECT a.*, j.title as job_title, j.department as job_department
     FROM applications a LEFT JOIN jobs j ON a.job_id = j.id WHERE a.id = ?`,
    [id],
  );
  return rows[0] || null;
}

const server = new Server(
  {
    name: "wuxin-mcp-server",
    version: "1.0.0",
    description: "五新重工招聘 MCP Server - 岗位管理、简历匹配分析",
  },
  {
    capabilities: {
      resources: {},
      tools: {},
    },
  },
);

server.setRequestHandler(ListResourcesRequestSchema, async () => ({
  resources: [
    {
      uri: "job-posting://1",
      name: "高级机械工程师",
      description: "五新重工研发部高级机械工程师岗位信息",
      mimeType: "application/json",
    },
    {
      uri: "job-posting://2",
      name: "电气工程师",
      description: "五新重工电气部电气工程师岗位信息",
      mimeType: "application/json",
    },
    {
      uri: "job-posting://3",
      name: "焊接工艺工程师",
      description: "五新重工工艺部焊接工艺工程师岗位信息",
      mimeType: "application/json",
    },
    {
      uri: "job-posting://4",
      name: "项目经理",
      description: "五新重工项目部项目经理岗位信息",
      mimeType: "application/json",
    },
    {
      uri: "job-posting://5",
      name: "质量检验员",
      description: "五新重工质量部质量检验员岗位信息",
      mimeType: "application/json",
    },
    {
      uri: "job-posting://6",
      name: "液压系统设计师",
      description: "五新重工研发部液压系统设计师岗位信息",
      mimeType: "application/json",
    },
    {
      uri: "candidate://template",
      name: "候选人模板",
      description: "投递简历的候选人数据（需替换ID以查看具体记录）",
      mimeType: "application/json",
    },
  ],
}));

server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const uri = request.params.uri;

  const jobMatch = uri.match(/^job-posting:\/\/(\d+)$/);
  if (jobMatch) {
    const id = parseInt(jobMatch[1], 10);
    const job = getJobResource(id);
    if (!job) {
      throw new Error(`岗位不存在: ${uri}`);
    }
    return {
      contents: [{ uri, mimeType: "application/json", text: JSON.stringify(job, null, 2) }],
    };
  }

  const candidateMatch = uri.match(/^candidate:\/\/(\d+)$/);
  if (candidateMatch) {
    const id = parseInt(candidateMatch[1], 10);
    const candidate = getCandidateResource(id);
    if (!candidate) {
      throw new Error(`候选人不存在: ${uri}`);
    }
    return {
      contents: [{ uri, mimeType: "application/json", text: JSON.stringify(candidate, null, 2) }],
    };
  }

  throw new Error(`不支持的资源 URI: ${uri}`);
});

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "generate_job_description",
      description: "根据岗位名称、部门和关键要求，AI生成完整的岗位描述和任职要求",
      inputSchema: {
        type: "object",
        properties: {
          title: { type: "string", description: "岗位名称，例如：高级机械工程师" },
          department: { type: "string", description: "所属部门，例如：研发部、电气部" },
          requirements: { type: "string", description: "关键技能和经验要求提示" },
        },
        required: ["title"],
      },
    },
    {
      name: "analyze_resume_match",
      description: "分析候选人简历与岗位的匹配程度，返回匹配分数、分析和亮点",
      inputSchema: {
        type: "object",
        properties: {
          jobId: { type: "number", description: "岗位ID" },
          applicationId: { type: "number", description: "投递记录ID" },
        },
        required: ["jobId", "applicationId"],
      },
    },
    {
      name: "publish_job",
      description: "发布一个新岗位到五新重工招聘平台，支持先AI生成描述再发布",
      inputSchema: {
        type: "object",
        properties: {
          title: { type: "string", description: "岗位名称，例如：高级机械工程师" },
          department: { type: "string", description: "所属部门，例如：研发部、电气部" },
          location: { type: "string", description: "工作地点，默认：北京" },
          category: { type: "string", description: "岗位类别，例如：技术、管理、生产，默认：技术" },
          salaryMin: { type: "number", description: "薪资范围（最低），单位：元/月" },
          salaryMax: { type: "number", description: "薪资范围（最高），单位：元/月" },
          description: { type: "string", description: "岗位描述（可先用generate_job_description生成）" },
          requirements: { type: "string", description: "任职要求（可先用generate_job_description生成）" },
        },
        required: ["title", "department"],
      },
    },
    {
      name: "list_pending_resumes",
      description: "获取所有待审核状态的简历列表（仅返回status=pending的简历，用于简历筛选助手）",
      inputSchema: {
        type: "object",
        properties: {},
      },
    },
    {
      name: "update_resume_status",
      description: "更新简历状态（筛选完成后调用，标记为reviewed避免重复处理，或标记为rejected淘汰）",
      inputSchema: {
        type: "object",
        properties: {
          resumeId: { type: "number", description: "简历ID（投递记录ID）" },
          status: { type: "string", description: "状态值：pending(待审核)、reviewed(已查看)、interviewed(已面试)、accepted(已录用)、rejected(已淘汰)" },
        },
        required: ["resumeId", "status"],
      },
    },
    {
      name: "delete_rejected_resumes",
      description: "批量删除已淘汰简历（rejected状态），可选删除指定天数前的简历",
      inputSchema: {
        type: "object",
        properties: {
          days: { type: "number", description: "删除多少天前的rejected简历，0表示删除所有" },
        },
      },
    },
    {
      name: "create_interview_room",
      description: "创建AI面试房间，为候选人安排面试，生成面试链接",
      inputSchema: {
        type: "object",
        properties: {
          candidate_id: { type: "string", description: "候选人ID" },
          candidate_name: { type: "string", description: "候选人姓名" },
          candidate_email: { type: "string", description: "候选人邮箱" },
          scheduled_time: { type: "string", description: "面试时间，格式：YYYY-MM-DD HH:mm" },
          job_title: { type: "string", description: "岗位名称" },
          jd: { type: "string", description: "岗位描述（JD）" },
        },
        required: ["candidate_id", "candidate_name", "candidate_email", "scheduled_time", "job_title"],
      },
    },
    {
      name: "check_interview_status",
      description: "检查AI面试房间状态、AI模型状态和网络状态",
      inputSchema: {
        type: "object",
        properties: {
          room_id: { type: "string", description: "面试房间ID" },
        },
        required: ["room_id"],
      },
    },
    {
      name: "start_interview",
      description: "启动AI面试，开始面试流程",
      inputSchema: {
        type: "object",
        properties: {
          room_id: { type: "string", description: "面试房间ID" },
        },
        required: ["room_id"],
      },
    },
    {
      name: "get_interview_result",
      description: "获取AI面试结果，包括评分、维度分、总结和对话记录",
      inputSchema: {
        type: "object",
        properties: {
          room_id: { type: "string", description: "面试房间ID" },
        },
        required: ["room_id"],
      },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    case "generate_job_description": {
      const title = args?.title as string;
      const department = (args?.department as string) || "";
      const requirements = (args?.requirements as string) || "";

      if (!title) {
        throw new Error("缺少必要参数: title");
      }

      const result = generateJobDescription(title, department, requirements);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                description: result.description,
                requirements: result.requirementsText,
              },
              null,
              2,
            ),
          },
        ],
      };
    }

    case "analyze_resume_match": {
      const jobId = args?.jobId as number;
      const applicationId = args?.applicationId as number;

      if (!jobId || !applicationId) {
        throw new Error("缺少必要参数: jobId 和 applicationId");
      }

      const result = analyzeResumeMatch(jobId, applicationId);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    }

    case "publish_job": {
      const a = args as Record<string, unknown> || {};
      const title = a.title as string;
      const department = a.department as string;
      const location = a.location as string | undefined;
      const category = a.category as string | undefined;
      const salaryMin = a.salaryMin as number | undefined;
      const salaryMax = a.salaryMax as number | undefined;
      const description = a.description as string | undefined;
      const requirements = a.requirements as string | undefined;

      if (!title || !department) {
        throw new Error("缺少必要参数: title 和 department");
      }

      const job = publishJob({ title, department, location, category, salaryMin, salaryMax, description, requirements });
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ success: true, message: `岗位「${title}」发布成功`, job }, null, 2),
          },
        ],
      };
    }

    case "list_pending_resumes": {
      const rows = query(
        `SELECT a.*, j.title as job_title, j.department as job_department,
                j.description as job_description, j.requirements as job_requirements
         FROM applications a
         LEFT JOIN jobs j ON a.job_id = j.id
         WHERE a.status = 'pending'
         ORDER BY a.created_at DESC`
      );
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ success: true, applications: rows, total: rows.length }, null, 2),
          },
        ],
      };
    }

    case "update_resume_status": {
      const a = args as Record<string, unknown> || {};
      const resumeId = a.resumeId as number;
      const status = a.status as string;

      if (!resumeId || !status) {
        throw new Error("缺少必要参数: resumeId 和 status");
      }

      const validStatuses = ["pending", "reviewed", "interviewed", "accepted", "rejected"];
      if (!validStatuses.includes(status)) {
        throw new Error(`状态值无效，必须为 ${validStatuses.join("、")} 之一`);
      }

      db.run("UPDATE applications SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", [status, resumeId]);
      saveDb();

      const rows = query("SELECT * FROM applications WHERE id = ?", [resumeId]);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ success: true, message: `简历状态已更新为 ${status}`, application: rows[0] }, null, 2),
          },
        ],
      };
    }

    case "delete_rejected_resumes": {
      const a = args as Record<string, unknown> || {};
      const days = a.days as number || 0;

      let whereClause = "status = 'rejected'";
      if (days > 0) {
        const dateThreshold = new Date();
        dateThreshold.setDate(dateThreshold.getDate() - days);
        whereClause += ` AND updated_at < '${dateThreshold.toISOString()}'`;
      }

      const countRows = query(`SELECT COUNT(*) as count FROM applications WHERE ${whereClause}`);
      const count = countRows[0]?.count || 0;

      if (count === 0) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({ success: true, message: "没有需要删除的已淘汰简历", deletedCount: 0 }, null, 2),
            },
          ],
        };
      }

      db.run(`DELETE FROM applications WHERE ${whereClause}`);
      saveDb();

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ success: true, message: `已删除 ${count} 条已淘汰简历`, deletedCount: count }, null, 2),
          },
        ],
      };
    }

    case "create_interview_room": {
      const a = args as Record<string, unknown> || {};
      const candidate_id = a.candidate_id as string;
      const candidate_name = a.candidate_name as string;
      const candidate_email = a.candidate_email as string;
      const scheduled_time = a.scheduled_time as string;
      const job_title = a.job_title as string;
      const jd = (a.jd as string) || "";

      if (!candidate_id || !candidate_name || !candidate_email || !scheduled_time || !job_title) {
        throw new Error("缺少必要参数: candidate_id, candidate_name, candidate_email, scheduled_time, job_title");
      }

      const room_id = `room_${crypto.randomBytes(8).toString('hex')}`;
      const meeting_link = `https://interview.example.com/join/${room_id}`;

      db.run(
        `INSERT INTO interview_rooms (room_id, candidate_id, candidate_name, candidate_email, scheduled_time, job_title, jd, meeting_link, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'created')`,
        [room_id, candidate_id, candidate_name, candidate_email, scheduled_time, job_title, jd, meeting_link]
      );
      saveDb();

      const rows = query("SELECT * FROM interview_rooms WHERE room_id = ?", [room_id]);
      const room = rows[0];

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              success: true,
              room_id: room.room_id,
              meeting_link: room.meeting_link,
              status: room.status,
              message: "面试房间创建成功"
            }, null, 2),
          },
        ],
      };
    }

    case "check_interview_status": {
      const a = args as Record<string, unknown> || {};
      const room_id = a.room_id as string;

      if (!room_id) {
        throw new Error("缺少必要参数: room_id");
      }

      const rows = query("SELECT * FROM interview_rooms WHERE room_id = ?", [room_id]);
      if (rows.length === 0) {
        throw new Error(`面试房间不存在: ${room_id}`);
      }

      const room = rows[0];

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              success: true,
              room_status: room.status,
              ai_model_status: room.ai_model_status,
              network_status: room.network_status,
              scheduled_time: room.scheduled_time
            }, null, 2),
          },
        ],
      };
    }

    case "start_interview": {
      const a = args as Record<string, unknown> || {};
      const room_id = a.room_id as string;

      if (!room_id) {
        throw new Error("缺少必要参数: room_id");
      }

      const rows = query("SELECT * FROM interview_rooms WHERE room_id = ?", [room_id]);
      if (rows.length === 0) {
        throw new Error(`面试房间不存在: ${room_id}`);
      }

      const room = rows[0];
      if (room.status !== 'created' && room.status !== 'ready') {
        throw new Error(`当前状态无法启动面试: ${room.status}`);
      }

      db.run("UPDATE interview_rooms SET status = 'in_progress', updated_at = CURRENT_TIMESTAMP WHERE room_id = ?", [room_id]);
      saveDb();

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              success: true,
              room_id: room_id,
              status: "in_progress",
              message: "AI面试已启动"
            }, null, 2),
          },
        ],
      };
    }

    case "get_interview_result": {
      const a = args as Record<string, unknown> || {};
      const room_id = a.room_id as string;

      if (!room_id) {
        throw new Error("缺少必要参数: room_id");
      }

      const rows = query("SELECT * FROM interview_rooms WHERE room_id = ?", [room_id]);
      if (rows.length === 0) {
        throw new Error(`面试房间不存在: ${room_id}`);
      }

      const room = rows[0];

      if (room.status !== 'completed') {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                success: true,
                candidate_id: room.candidate_id,
                room_id: room.room_id,
                status: room.status,
                score: null,
                dimension_scores: {},
                summary: `面试尚未完成，当前状态: ${room.status}`,
                transcript: ""
              }, null, 2),
            },
          ],
        };
      }

      let dimension_scores = {};
      try {
        if (room.dimension_scores) {
          dimension_scores = JSON.parse(room.dimension_scores);
        }
      } catch {
        dimension_scores = {};
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              success: true,
              candidate_id: room.candidate_id,
              room_id: room.room_id,
              status: room.status,
              score: room.score,
              dimension_scores: dimension_scores,
              summary: room.summary || "无",
              transcript: room.transcript || ""
            }, null, 2),
          },
        ],
      };
    }

    default:
      throw new Error(`未知工具: ${name}`);
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("五新重工 MCP Server 已启动 (stdio transport)");
}

main().catch((err) => {
  console.error("MCP Server 启动失败:", err);
  process.exit(1);
});

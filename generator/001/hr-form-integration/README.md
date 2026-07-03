# HR Form Service 项目整理文档

## 项目概述

HR Form Service 是一个基于 Flask 的候选人面试时间选择表单系统，用于五新重工智能招聘系统的面试安排环节。

---

## 核心文件结构

### 1. Flask 表单服务 (源路径: `table/hr-form-service/`)

```
hr-form-service/
├── app.py                    # Flask 主应用（API + 页面路由）
├── config.py                 # 配置文件（含外网穿透URL）
├── models.py                 # 数据模型（候选人JSON存储）
├── static/
│   └── style.css             # 表单样式（现代化UI设计）
├── templates/
│   └── form.html             # 表单页面（候选人时间选择）
├── requirements.txt          # Python依赖
├── .env                      # 环境变量配置
├── .env.example              # 环境变量模板
├── candidates.json           # 候选人数据存储
├── candidates.db             # SQLite数据库（可选）
├── init_db.py                # 数据库初始化脚本
├── mcp_server.py             # MCP服务封装（自动启动Flask+Cloudflare）
├── start_with_data.py        # 启动脚本
└── test_fix.py               # 测试脚本
```

### 2. 代理服务器配置 (源路径: `web/server-proxy.cjs`)

```
server-proxy.cjs              # Node.js HTTP代理服务器
                              # 同时代理：
                              # - React前端 (dist目录)
                              # - Express后端 (API_PORT=3001)
                              # - Flask表单服务 (FORM_PORT=5000)
```

### 3. 外网穿透配置 (`tunnel-config/`)

```
tunnel-config/
├── start-tunnel.bat          # Windows 启动脚本
└── start-tunnel.sh           # Linux/Mac 启动脚本
```

**使用方法**：
```bash
# Windows
start-tunnel.bat

# Linux/Mac
chmod +x start-tunnel.sh
./start-tunnel.sh
```

启动后会输出外网链接，格式如：`https://xxx-xxx-xxx-xxx.trycloudflare.com`

### 4. 人事机器人 Skill (`hr-boot-skill/`)

```
hr-boot-skill/
└── SKILL.md                  # hr-boot 调用指南
                              # 包含：
                              # - MCP 工具调用方式
                              # - 面试邀请发送流程
                              # - 状态机流转说明
                              # - 错误处理方案
```

**核心职责**：
- 发送面试邀请邮件（含时间选择表单链接）
- 轮询确认候选人时间
- 通知面试机器人创建房间

---

## MCP 工具说明

`mcp_server.py` 提供以下 MCP 工具，供 AI 智能体调用：

| 工具名 | 说明 |
|--------|------|
| `create_candidate` | 创建候选人记录，生成表单链接 |
| `list_candidates` | 查询候选人列表（按状态筛选） |
| `get_candidate` | 获取单个候选人完整信息 |
| `update_candidate_status` | 更新候选人状态（confirmed/expired） |
| `system_status` | 检查Flask、Cloudflare隧道、外网链接状态 |
| `restart_tunnel` | 重启Cloudflare隧道，刷新外网链接 |

**自动启动流程**：
MCP Server 启动时会自动：
1. 启动 Flask 服务（端口5000）
2. 启动 Cloudflare 隧道（获取外网链接）
3. 验证外网链接可访问

---

## API 端点

### Flask 表单服务 API

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/candidates/create` | POST | 创建候选人记录，返回表单链接 |
| `/api/candidates` | GET | 获取候选人列表 |
| `/api/candidate/<id>` | GET | 获取单个候选人信息 |
| `/api/candidates/update` | POST | 更新候选人状态 |
| `/form?candidate_id=<id>` | GET | 表单页面展示 |
| `/submit` | POST | 表单提交处理 |

### 代理路由规则

| 路径模式 | 代理目标 | 端口 |
|----------|----------|------|
| `/form`, `/submit`, `/static/` | Flask | 5000 |
| `/api/candidates/*` | Flask | 5000 |
| `/api/*` | Express | 3001 |
| 其他路径 | React前端 | dist目录 |

---

## 状态机集成

表单提交后触发状态转换：

```
screened → invitation_sent → room_created → interviewing
```

- `invitation_sent`: hr-boot发送面试邀请邮件
- `room_created`: 面试机器人创建面试房间
- `interviewing`: 定时任务在面试时间前5分钟启动面试

---

## 使用流程

1. **hr-boot发送邀请**
   - 调用 `POST /api/candidates/create` 创建候选人
   - 获取表单链接发送给候选人

2. **候选人填写表单**
   - 访问外网链接：`https://xxx.trycloudflare.com/form?candidate_id=xxx`
   - 选择面试时间、填写补充信息
   - 提交表单

3. **面试机器人创建房间**
   - hr-boot轮询获取已确认候选人
   - 调用 `prepare_interview` 创建面试房间

4. **定时任务启动面试**
   - 面试时间前5分钟自动启动

---

## 关键配置说明

### Flask 配置 (config.py)

```python
PORT = 5000                   # Flask服务端口
API_BASE_URL = 'https://...' # 外网穿透地址
DATABASE_PATH = 'candidates.json' # 数据存储路径
```

### 代理服务器 (server-proxy.cjs)

```javascript
const API_PORT = 3001;        // Express后端
const FORM_PORT = 5000;       // Flask表单服务
const FRONTEND_PORT = 5173;   // 前端代理入口
```

---

## 启动顺序

```bash
# 1. 启动Express后端
cd web && npm run dev:api

# 2. 启动Flask表单服务
cd table/hr-form-service && python app.py

# 3. 启动前端代理
cd web && node server-proxy.cjs

# 4. 启动外网穿透（可选）
cloudflared tunnel --url http://127.0.0.1:5173
```

---

## 前端界面特点

- 品牌头部：五新重工logo + 名称
- 现代化UI：渐变背景、圆润卡片、动画效果
- 青色主题按钮：`linear-gradient(135deg, #0891b2 0%, #0e7490 100%)`
- 成功动画：SVG图标 + 缩放动画
- 移动端适配：响应式设计

---

## 源文件位置

| 类型 | 实际路径 |
|------|----------|
| Flask服务 | `c:\Users\36368\Desktop\trae-agent\table\hr-form-service\` |
| 代理配置 | `c:\Users\36368\Desktop\trae-agent\web\server-proxy.cjs` |
| 状态机 | `c:\Users\36368\Desktop\trae-agent\web\api\state-machine\` |
| 面试钩子 | `c:\Users\36368\Desktop\trae-agent\web\api\services\interviewerService.ts` |

---

## 更新日志

- 2026-06-29: 完成前端界面优化，与招聘门户风格统一
- 2026-06-29: 修复代理服务器路由规则
- 2026-06-29: 配置Cloudflare Tunnel外网穿透
- 2026-06-30: 整理项目结构文档
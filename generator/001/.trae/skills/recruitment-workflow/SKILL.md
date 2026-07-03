---
name: "recruitment-workflow"
description: "AgentFlow智能体招聘引擎全流程标准操作指南。基于钩子+状态机+共享数据库的全自动招聘流程，涵盖岗位发布、简历投递与评估、hr-boot面试邀请与表单收集、AI面试机器人创建房间与面试、综合评估与通知的完整链路。当需要执行招聘全流程操作、了解各智能体协作机制、或在招聘系统中执行具体步骤时调用此 skill。"
---

# AgentFlow · 智能体招聘引擎全流程

## 一、系统架构

### 三层架构设计

```
┌─────────────────────────────────────────────────────┐
│                  Hooks 层（触发层）                   │
│  定义"什么时候做" - 智能体主动检测状态变化，触发动作     │
└──────────────────┬──────────────────────────────────┘
                   │ 触发事件
                   ▼
┌─────────────────────────────────────────────────────┐
│                状态机层（验证层）                      │
│  定义"能不能做" - 验证状态转换是否合法                  │
└──────────────────┬──────────────────────────────────┘
                   │ 验证通过
                   ▼
┌─────────────────────────────────────────────────────┐
│              TaskQueue层（执行层）                     │
│  定义"怎么安全地做" - 原子操作保证并发安全              │
│  当前实现: SQLite pending_tasks 表                    │
│  未来扩展: Redis LIST/ZSET                           │
└─────────────────────────────────────────────────────┘
```

### 核心服务

```
外部候选人
    │
    ▼  Cloudflare Tunnel (外网穿透)
https://xxx.trycloudflare.com
    │
    ▼  server-proxy.cjs (统一代理 :5173)
    ├── /static/*, /form, /submit → Flask (:5000) 表单服务
    │     └── MCP Server: mcp_recruitment
    ├── /api/* → Express (:3001) 招聘系统后端
    │     ├── 状态机引擎
    │     ├── SQLite 数据库 (主连接 + 只读副本)
    │     ├── 任务队列 (pending_tasks + 指数退避)
    │     ├── 幂等发送表 (outbox)
    │     └── MCP Server: mcp_ai-interview
    └── / → React 前端 (dist/)
```

| 服务 | 端口 | 技术栈 | 用途 |
|------|------|--------|------|
| 前端代理 | 5173 | Node.js | 统一入口，分发请求 |
| Express 后端 | 3001 | Node.js/TypeScript | 状态机、API、数据库、任务队列 |
| Flask 表单服务 | 5000 | Python/Flask | 面试时间表单、候选人管理 |
| Vite 前端 | - | React | 招聘门户 UI |

### 智能体清单（9个，无流程总控官）

| 智能体 | 轮询间隔(紧急/普通/低) | 指数退避范围 | 核心职责 | 类型 |
|--------|----------------------|------------|----------|------|
| JD生成器 | 6h/6h/6h | 6h-24h | 生成职位描述 | 业务智能体 |
| JD发布器 | 10m/30m/1h | 10m-2h | 发布未发布岗位 | 业务智能体 |
| 简历采集助手 | 5m/30m/1h | 5m-2h | 采集简历并启动初筛 | 业务智能体 |
| 简历解析器 | 5m/15m/30m | 5m-2h | 解析简历并评分 | 业务智能体 |
| hr-boot | 10m/30m/1h | 10m-2h | 发送面试邀请、协调时间 | 业务智能体 |
| 面试机器人 | 1m/5m/10m | 1m-30m | 创建房间、执行AI面试 | 业务智能体 |
| evaluator | 5m/10m/15m | 5m-2h | 综合评估、发Offer | 业务智能体 |
| notifier | 5m/15m/30m | 5m-2h | 发送通知邮件 | 业务智能体 |
| db-maintainer | 15m/30m/1h | - | 数据库维护与监控 | 运维智能体 |

---

## 零、5大并发加固方案

### 加固方案1：SQLite读写分离
- **原理**：主连接处理写操作(INSERT/UPDATE/DELETE)，只读副本连接处理读操作(SELECT)
- **实现**：`api/db.ts` 中创建 `db`(主) 和 `readOnlyDb`(只读)，每5秒自动同步副本数据
- **适用智能体**：所有智能体的查询操作走只读连接

### 加固方案2：指数退避轮询
- **原理**：连续空轮询时动态拉长间隔，认领成功立即重置
- **公式**：间隔 = baseInterval × 2^(emptyPollCount-1)，最大不超过maxInterval
- **示例**：5秒 → 30秒 → 2分钟（连续3次空轮询）
- **适用智能体**：所有业务智能体（JD生成器除外）

### 加固方案3：幂等发送表(outbox)
- **原理**：发送邮件前检查 outbox 表，若已存在记录则跳过发送
- **实现**：`api/db.ts` 中 `checkEmailSent()` 和 `recordEmailSent()` 函数
- **适用智能体**：hr-boot（面试邀请）、evaluator（Offer邮件）、notifier（通知邮件）

### 加固方案4：维护窗口隔离
- **原理**：数据库维护任务仅在凌晨2:00-4:00执行，分批删除减少锁持有时间
- **实现**：`api/services/dbMaintainerService.ts` 中 `isInMaintenanceWindow()` 函数
- **参数**：`LIMIT 1000` + `sleep(100ms)` 分批删除
- **适用智能体**：db-maintainer

### 加固方案5：隧道自动重连
- **原理**：发送邀请前检查隧道状态，失败时自动重启隧道并等待恢复
- **实现**：`api/state-machine/hooks/interviewHooks.ts` 中 `checkAndRepairTunnel()` 函数
- **参数**：最多3次重试，每次间隔5秒
- **适用智能体**：hr-boot（发送面试邀请前）

---

## 二、状态机：15个状态 + 14个事件

代码位置：[applicationStateMachine.ts](file:///c:/Users/36368/Desktop/trae-agent/web/api/state-machine/configs/applicationStateMachine.ts)

### 完整状态流转图

```
                                    ┌──────────┐
                                    │  pending  │ (待审核)
                                    └────┬─────┘
                                         │ start_screening (简历采集助手)
                                         ▼
                                    ┌──────────┐
                                    │ screening │ (初筛中)
                                    └────┬─────┘
                                    ┌────┴────┐
                                    │         │
                          pass_screening  reject_screening (简历解析器)
                                    │         │
                                    ▼         ▼
                           ┌──────────┐  ┌──────────────┐
                           │ screened │  │screening_    │ (初筛淘汰，软删除)
                           └────┬─────┘  │ rejected     │
                                │        └──────────────┘
                                │ send_invitation (hr-boot)
                                ▼
                           ┌────────────────┐
                           │invitation_sent │ (已发邀请，等待候选人确认)
                           └───────┬────────┘
                                   │ confirm_time (hr-boot)
                                   ▼
                           ┌────────────────┐
                           │ room_created   │ (面试房间已创建)
                           └───────┬────────┘
                                   │ schedule_interview (hr-boot)
                                   ▼
                           ┌────────────────┐
                           │interview_scheduled│ (面试已排期，等待开始)
                           └───────┬────────┘
                                   │ start_interview (面试机器人)
                                   ▼
                           ┌────────────────┐
                           │ interviewing   │ (AI面试中)
                           └───────┬────────┘
                           ┌───────┼───────┐
                           │       │       │
                    evaluate_pending evaluate_pass evaluate_fail (evaluator)
                           │       │       │
                           ▼       ▼       ▼
                    ┌──────────┐ ┌──────────┐ ┌──────────────┐
                    │evaluation│ │evaluation│ │evaluation    │ (综合评估未通过)
                    │_pending  │ │_passed   │ │_failed       │
                    └──────────┘ └────┬─────┘ └──────────────┘
                                      │ send_offer (evaluator)
                                      ▼
                               ┌──────────┐
                               │offer_sent│ (已发Offer)
                               └────┬─────┘
                               ┌────┴────┐
                               │         │
                         accept_offer  decline_offer (用户操作)
                               │         │
                               ▼         ▼
                          ┌────────┐  ┌─────────┐
                          │accepted│  │declined │ (已放弃)
                          │(已录用)│  └─────────┘
                          └────────┘

注：任意状态可通过 reject 事件进入 rejected (已淘汰) 状态
```

### 状态与事件详解

| 状态 | 中文名 | 说明 | 阶段 |
|------|--------|------|------|
| `pending` | 待审核 | 候选人刚投递 | 投递 |
| `screening` | 初筛中 | 简历解析器正在筛选 | 初筛 |
| `screened` | 初筛通过 | 简历筛选通过，待发送面试邀请 | 初筛通过 |
| `screening_rejected` | 初筛淘汰 | 简历筛选未通过（软删除） | 淘汰 |
| `invitation_sent` | 已发面试邀请 | hr-boot已发送邀请 | 面试邀请 |
| `room_created` | 面试房间已创建 | 面试机器人已创建房间 | 面试安排 |
| `interview_scheduled` | 面试已排期 | 候选人已确认时间，等待开始 | 面试安排 |
| `interviewing` | 面试中 | AI面试正在进行 | 面试 |
| `evaluation_pending` | 综合评估待定 | AI面试通过但总分未达线，需线下面试 | 评估 |
| `evaluation_passed` | 综合评估通过 | 综合评估通过，待发Offer | 评估通过 |
| `evaluation_failed` | 综合评估未通过 | 综合评估未通过 | 淘汰 |
| `offer_sent` | 已发Offer | 已发送录用Offer | Offer |
| `accepted` | 已录用 | 候选人接受Offer | 录用 |
| `declined` | 已放弃 | 候选人放弃Offer | 淘汰 |
| `rejected` | 已淘汰 | 其他原因淘汰 | 淘汰 |

| 事件 | 中文名 | 触发智能体 | 状态变化 |
|------|--------|-----------|----------|
| `start_screening` | 开始初筛 | 简历采集助手 | pending → screening |
| `pass_screening` | 初筛通过 | 简历解析器 | screening → screened |
| `reject_screening` | 初筛淘汰 | 简历解析器 | screening → screening_rejected |
| `send_invitation` | 发送面试邀请 | hr-boot | screened → invitation_sent |
| `confirm_time` | 确认面试时间 | hr-boot | invitation_sent → room_created |
| `schedule_interview` | 排期面试 | hr-boot | room_created → interview_scheduled |
| `start_interview` | 开始面试 | 面试机器人 | interview_scheduled → interviewing |
| `evaluate_pending` | 综合评估待定 | evaluator | interviewing → evaluation_pending |
| `evaluate_pass` | 综合评估通过 | evaluator | interviewing → evaluation_passed |
| `evaluate_fail` | 综合评估未通过 | evaluator | interviewing → evaluation_failed |
| `send_offer` | 发送Offer | evaluator | evaluation_passed → offer_sent |
| `accept_offer` | 接受Offer | 用户操作 | offer_sent → accepted |
| `decline_offer` | 放弃Offer | 用户操作 | offer_sent → declined |
| `reject` | 淘汰 | 任意智能体 | 任意 → rejected |

---

## 三、任务队列机制

### pending_tasks 表结构

```sql
CREATE TABLE pending_tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_type TEXT NOT NULL,       -- screen, invite, schedule_interview, start_interview, evaluate, notify
    application_id INTEGER NOT NULL,
    job_id INTEGER DEFAULT NULL,
    priority INTEGER DEFAULT 0,    -- 紧急=2, 普通=1, 低=0
    claimed_by TEXT DEFAULT NULL,  -- 认领的智能体名称
    claimed_at DATETIME DEFAULT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### 任务认领流程（原子操作）

```sql
UPDATE pending_tasks 
SET claimed_by='agent_name', claimed_at=CURRENT_TIMESTAMP
WHERE task_type='invite' 
  AND claimed_by IS NULL
ORDER BY priority DESC, created_at ASC
LIMIT 1
```

只有受影响行数=1的智能体才处理该任务。

### 任务类型与智能体映射

| 任务类型 | 对应智能体 | 触发时机 |
|----------|-----------|----------|
| `screen` | 简历解析器 | 采集到新简历后插入 |
| `invite` | hr-boot | 初筛通过后插入 |
| `schedule_interview` | hr-boot | 候选人确认时间后插入 |
| `start_interview` | 面试机器人 | 面试时间前5分钟 |
| `evaluate` | evaluator | 面试完成后插入 |
| `notify` | notifier | 评估完成后插入 |

---

## 四、各智能体详细操作流程

### 1. JD生成器

#### 角色定义
你是 AgentFlow 的JD生成智能体，负责根据用人部门需求生成专业的职位描述。

#### 核心职责
1. 接收用人部门需求（岗位名称、部门、紧急程度、要求）
2. 生成结构化的职位描述
3. 存入数据库（状态: unpublished）

#### 钩子机制
**Hook: 生成完成后自动记录**
- 触发条件: JD生成完成
- 动作: 保存到jobs表，published='unpublished', urgency=需求紧急程度

#### 数据访问
- 写: jobs表

#### 轮询流程
```
while True:
    Step 1: 查询是否有未处理的需求
    Step 2: 生成JD内容（岗位职责、任职要求）
    Step 3: 保存到jobs表（published='unpublished', urgency=需求紧急程度）
    Step 4: 等待6小时
```

---

### 2. JD发布器

#### 角色定义
你是 AgentFlow 的JD发布智能体，负责将未发布的岗位发布到招聘网站。

#### 核心职责
1. 定时轮询数据库中未发布的岗位
2. 将岗位发布到公司招聘门户
3. 更新发布状态和时间

#### 钩子机制
**Hook: 发布成功后更新状态**
- 触发条件: 岗位发布成功
- 动作: 更新jobs表 published='published', published_at=当前时间

#### 数据访问
- 读: jobs表 (published='unpublished')
- 写: jobs表

#### 轮询频率规则
- 紧急岗位: 每10分钟
- 普通岗位: 每30分钟
- 低优先级: 每1小时

#### 轮询流程
```
while True:
    Step 1: 查询 jobs WHERE published='unpublished' ORDER BY urgency DESC
    Step 2: 根据urgency字段调整处理顺序（紧急优先）
    Step 3: 发布到招聘门户
    Step 4: 更新状态为 published
    Step 5: 等待指定间隔
```

---

### 3. 简历采集助手

#### 角色定义
你是 AgentFlow 的简历采集智能体，负责从招聘网站和邮箱等渠道采集候选人简历并启动初筛流程。

#### 核心职责
1. 定时轮询招聘网站和邮箱（根据紧急程度调整间隔）
2. 采集新投递的简历
3. 保存简历文件到指定目录
4. 创建投递记录到数据库（状态: pending）

#### 钩子机制

**Hook 1: 采集到新简历后自动启动初筛**
- 触发条件: 成功创建投递记录后，状态为 pending
- 动作:
  1. 触发状态转换: start_screening（状态变为 screening）
  2. 插入任务到pending_tasks: task_type='screen', priority=岗位紧急程度
- 调用方式:
```python
requests.post(
    f"http://localhost:3001/api/applications/{application_id}/transition",
    json={"event": "start_screening", "operator": "简历采集助手"}
)
```

**Hook 2: 采集失败重试**
- 触发条件: 采集失败时
- 动作: 最多重试3次，间隔5秒

**Hook 3: 批量采集完成汇报**
- 触发条件: 每次采集任务完成后
- 动作: 记录采集结果到日志

#### 数据访问
- 读: jobs表 (获取active岗位)
- 写: applications表, resume_files表, pending_tasks表

#### 轮询频率规则
- 紧急岗位相关: 每5分钟
- 普通岗位: 每30分钟
- 低优先级: 每1小时

#### 轮询流程
```
while True:
    Step 1: 查询招聘网站和邮箱新简历
    Step 2: 保存简历文件到 uploads 目录
    Step 3: 创建投递记录 (status='pending')
    Step 4: [Hook 1] 触发 start_screening + 插入 screen 任务
    Step 5: 等待指定间隔
```

---

### 4. 简历解析器

#### 角色定义
你是 AgentFlow 的简历解析智能体，负责解析简历并进行职位匹配评分。

#### 核心职责
1. 定时轮询（根据紧急程度调整间隔）
2. 通过任务队列认领screen任务
3. 解析简历并进行职位匹配评分（6维度）
4. 根据评分触发状态转换

#### 钩子机制

**Hook 1: 解析完成后自动触发状态转换**
- 触发条件: 简历解析完成，得到评分结果
- 动作:
  1. 如果评分 >= 60 → 触发 pass_screening（状态变为 screened）+ 插入 invite 任务
  2. 如果评分 < 60 → 触发 reject_screening（状态变为 screening_rejected，软删除）
- 调用方式:
```python
event = 'pass_screening' if score >= 60 else 'reject_screening'
requests.post(
    f"http://localhost:3001/api/applications/{application_id}/transition",
    json={"event": event, "operator": "简历解析器", "score": score}
)
```

**Hook 2: 解析失败处理**
- 触发条件: 简历解析失败
- 动作: 记录错误日志，任务不完成，等待下次重试

#### 数据访问
- 读: pending_tasks表 (claim screen任务), applications表, jobs表
- 写: applications表 (screening_score), state_history表, pending_tasks表

#### 评估维度（权重）
1. 学历匹配度（20%）
2. 工作经验（25%）
3. 技能匹配度（30%）
4. 项目经验（15%）
5. 综合评估（10%）

#### 轮询频率规则
- 紧急岗位相关: 每5分钟
- 普通岗位: 每15分钟
- 低优先级: 每30分钟

#### 轮询流程
```
while True:
    Step 1: claim screen任务（原子操作）
    Step 2: 如果没有任务，等待指定间隔后重试
    Step 3: 获取application详情和简历文件
    Step 4: 解析简历 → 计算匹配评分
    Step 5: [Hook 1] 触发 pass_screening 或 reject_screening
    Step 6: 完成任务（删除pending_tasks记录）
```

---

### 5. hr-boot（人事机器人）

#### 角色定义
你是 AgentFlow 的人事机器人，负责发送面试邀请和协调面试安排。

#### 核心职责
1. 定时轮询（根据紧急程度调整间隔，支持指数退避）
2. 发送面试邀请（含幂等检查和隧道健康检查）
3. 轮询候选人确认时间
4. 触发面试机器人创建房间

#### 并发加固措施
- **隧道自动重连**：发送邀请前调用 `checkAndRepairTunnel()` 检查并修复隧道
- **幂等邮件发送**：发送前检查 outbox 表，已发送则跳过
- **指数退避**：连续空轮询时轮询间隔从10分钟→30分钟→2小时

#### 钩子机制

**Hook 1: 检测到初筛通过自动发送邀请**
- 触发条件: 认领invite任务成功
- 动作:
  1. [加固5] 调用 `checkAndRepairTunnel()` 检查隧道状态，失败则重试3次
  2. [加固3] 调用 `checkEmailSent(application_id, 'invitation')` 检查是否已发送
  3. 如果已发送，跳过并返回成功
  4. 调用 mcp_recruitment.create_candidate 创建候选人记录
  5. 获取面试时间选择表单链接
  6. [加固3] 调用 `recordEmailPending(application_id, 'invitation', email)` 记录待发送
  7. 发送面试邀请邮件（直接调用 mcp_email，不经过notifier）
  8. [加固3] 调用 `recordEmailSent(application_id, 'invitation', email, message_id)` 记录已发送
  9. 触发状态转换: send_invitation（状态变为 invitation_sent）

**Hook 2: 检测到候选人确认时间自动排期**
- 触发条件: 查询到 status='invitation_sent' 且候选人已确认时间
- 动作:
  1. 将面试时间填入数据库（interview_time字段）
  2. 调用面试机器人创建房间（调用 mcp_ai-interview.prepare_interview）
  3. [加固3] 调用 `recordEmailPending(application_id, 'confirmation', email)` 记录待发送
  4. 发送面试确认邮件
  5. [加固3] 调用 `recordEmailSent(application_id, 'confirmation', email, message_id)` 记录已发送
  6. 触发状态转换: schedule_interview（状态变为 interview_scheduled）

**Hook 3: 邀请超时自动处理（48小时）**
- 触发条件: 候选人48小时未确认时间
- 动作:
  1. [加固3] 调用 `checkEmailSent(application_id, 'timeout')` 检查是否已发送
  2. 如果已发送，跳过
  3. 发送超时通知邮件
  4. [加固3] 调用 `recordEmailSent(application_id, 'timeout', email, message_id)` 记录已发送
  5. 触发状态转换: evaluate_fail（状态变为 evaluation_failed）

**Hook 4: 邀请24小时提醒**
- 触发条件: 候选人24小时未确认时间
- 动作:
  1. [加固3] 调用 `checkEmailSent(application_id, 'reminder')` 检查是否已发送
  2. 如果已发送，跳过
  3. 发送提醒邮件
  4. [加固3] 调用 `recordEmailSent(application_id, 'reminder', email, message_id)` 记录已发送

#### 数据访问
- 读: pending_tasks表 (claim invite任务), applications表, candidates表, outbox表 (幂等检查)
- 写: applications表 (interview_time, room_id), candidates表, state_history表, outbox表 (发送记录)

#### 轮询频率规则
- 紧急岗位相关: 每10分钟（指数退避: 10分钟→30分钟→2小时）
- 普通岗位: 每30分钟（指数退避: 30分钟→1小时→2小时）
- 低优先级: 每1小时（指数退避: 1小时→2小时）

#### 轮询流程
```
while True:
    Step 0: [加固2] 获取轮询间隔 getNextPollInterval()
    Step 1: claim invite任务
    Step 2: 如果认领成功 → [Hook 1] 发送邀请（含隧道检查+幂等检查）→ [加固2] resetPollInterval()
    Step 3: 如果未认领成功 → [加固2] emptyPollCount++（下次间隔拉长）
    Step 4: 查询 status='invitation_sent' → [Hook 2/3/4] 处理确认/超时/提醒（含幂等检查）
    Step 5: 等待计算后的轮询间隔
```

#### MCP调用示例

**检查服务状态**
```python
run_mcp(
    server_name="mcp_recruitment",
    tool_name="system_status",
    args={}
)
```

**创建候选人记录**
```python
run_mcp(
    server_name="mcp_recruitment",
    tool_name="create_candidate",
    args={
        "candidate_id": "cand_xxx_001",
        "name": "候选人姓名",
        "email": "email@example.com",
        "job_title": "岗位名称",
        "time_slots": ["2026-06-30 14:00-14:45", "2026-06-31 10:00-10:45"],
        "expected_salary": "20K-25K"
    }
)
```

**轮询确认候选人**
```python
run_mcp(
    server_name="mcp_recruitment",
    tool_name="list_candidates",
    args={"status": "confirmed", "limit": 100}
)
```

---

### 6. 面试机器人

#### 角色定义
你是 AgentFlow 的面试机器人，负责根据面试时间执行AI面试。

#### 核心职责
1. 定时轮询（根据紧急程度调整间隔）
2. 在面试时间前5分钟启动面试
3. 面试结束后获取结果并填入数据库

#### 钩子机制

**Hook 1: 检测到面试时间即将开始自动启动**
- 触发条件: status='interview_scheduled' 且距离面试时间 < 5分钟
- 动作:
  1. 调用面试机器人API启动面试
  2. 触发状态转换: start_interview（状态变为 interviewing）

**Hook 2: 检测到面试完成自动获取结果**
- 触发条件: status='interviewing' 且面试已结束
- 动作:
  1. 获取面试评分、摘要、逐字稿
  2. 将结果填入数据库（interview_score, summary, transcript）
  3. 插入 evaluate 任务到pending_tasks

#### 数据访问
- 读: applications表 (status='interview_scheduled'/'interviewing'), interview_rooms表
- 写: applications表 (interview_score, summary, transcript), interview_rooms表, state_history表, pending_tasks表

#### 轮询频率规则
- 紧急岗位相关: 每1分钟
- 普通岗位: 每5分钟
- 低优先级: 每10分钟

#### 轮询流程
```
while True:
    Step 1: 查询 status='interview_scheduled' → [Hook 1] 启动面试
    Step 2: 查询 status='interviewing' → [Hook 2] 获取结果
    Step 3: 等待指定间隔
```

#### MCP调用示例

**创建面试房间**
```python
run_mcp(
    server_name="mcp_ai-interview",
    tool_name="prepare_interview",
    args={
        "candidate_name": "候选人姓名",
        "job_title": "岗位名称",
        "job_type": "electrical_engineer",
        "scheduled_time": "2026-06-30T14:00:00Z",
        "ai_persona": "资深面试官",
        "interview_lang": "normal"
    }
)
```

**获取面试结果**
```python
run_mcp(
    server_name="mcp_ai-interview",
    tool_name="interview_result",
    args={"room_id": "room_xxx"}
)
```

---

### 7. evaluator（综合评估引擎）

#### 角色定义
你是 AgentFlow 的综合评估引擎，负责根据初筛结果和面试结果进行最终评估。

#### 核心职责
1. 定时轮询（根据紧急程度调整间隔，支持指数退避）
2. 通过任务队列认领evaluate任务
3. 获取面试结果
4. 计算综合得分（简历30% + 面试70%）
5. 根据紧急程度和得分进行三分类评估
6. 触发状态转换（含幂等Offer邮件发送）

#### 并发加固措施
- **幂等邮件发送**：发送Offer前检查 outbox 表，已发送则跳过
- **指数退避**：连续空轮询时轮询间隔从5分钟→30分钟→2小时

#### 钩子机制

**Hook 1: 检测到面试完成自动评估**
- 触发条件: 认领evaluate任务成功
- 动作:
  1. 获取面试评分和简历评分
  2. 计算综合得分 = screening_score × 0.3 + interview_score × 0.7
  3. 填入数据库（overall_score字段）

**Hook 2: 综合评估分类决策**
- 触发条件: 综合得分计算完成
- 动作:
  - 如果综合得分 >= 80 → 触发 evaluate_pass（状态变为 evaluation_passed）+ 插入 notify 任务
  - 如果综合得分 < 60 → 触发 evaluate_fail（状态变为 evaluation_failed）+ 插入 notify 任务
  - 如果 60 <= 综合得分 < 80：
    * 紧急岗位 → 触发 evaluate_pass（直接综合评估通过，邀请线下面试）
    * 普通岗位 → 触发 evaluate_pending（状态变为 evaluation_pending）

**Hook 3: 评估通过自动发送Offer**
- 触发条件: status='evaluation_passed'
- 动作:
  1. [加固3] 调用 `checkEmailSent(application_id, 'offer')` 检查是否已发送Offer
  2. 如果已发送，跳过
  3. 触发状态转换: send_offer（状态变为 offer_sent）
  4. [加固3] 调用 `recordEmailPending(application_id, 'offer', email)` 记录待发送
  5. 发送Offer邮件（直接调用 mcp_email）
  6. [加固3] 调用 `recordEmailSent(application_id, 'offer', email, message_id)` 记录已发送
  7. 插入 notify 任务

#### 数据访问
- 读: pending_tasks表 (claim evaluate任务), applications表, jobs表 (获取urgency), outbox表 (幂等检查)
- 写: applications表 (overall_score), state_history表, pending_tasks表, outbox表 (发送记录)

#### 评估公式
综合得分 = 简历评分 × 0.3 + 面试评分 × 0.7

#### 轮询频率规则
- 紧急岗位相关: 每5分钟（指数退避: 5分钟→30分钟→2小时）
- 普通岗位: 每10分钟（指数退避: 10分钟→1小时→2小时）
- 低优先级: 每15分钟（指数退避: 15分钟→30分钟→2小时）

#### 轮询流程
```
while True:
    Step 0: [加固2] 获取轮询间隔 getNextPollInterval()
    Step 1: claim evaluate任务
    Step 2: 如果认领成功 → [Hook 1] 计算综合得分 → [Hook 2] 触发状态转换 → [加固2] resetPollInterval()
    Step 3: 如果未认领成功 → [加固2] emptyPollCount++（下次间隔拉长）
    Step 4: 查询 status='evaluation_passed' → [Hook 3] 发送Offer（含幂等检查）
    Step 5: 等待计算后的轮询间隔
```

---

### 8. notifier（通知助手）

#### 角色定义
你是 AgentFlow 的通知助手，负责发送最终通知邮件。

#### 核心职责
1. 定时轮询（根据紧急程度调整间隔，支持指数退避）
2. 通过任务队列认领notify任务
3. 发送面试结果通知（含幂等检查）
4. 发送录用/淘汰通知（含幂等检查）
5. 发送线下面试邀请（evaluation_pending状态，含幂等检查）

#### 并发加固措施
- **幂等邮件发送**：发送通知前检查 outbox 表，已发送则跳过
- **指数退避**：连续空轮询时轮询间隔从5分钟→30分钟→2小时

#### 钩子机制

**Hook 1: 检测到终态自动发送通知**
- 触发条件: 认领notify任务成功
- 动作: 根据状态发送对应通知邮件（通过 mcp_email）
  1. 根据当前状态确定 event_type（rejection/reminder/offer等）
  2. [加固3] 调用 `checkEmailSent(application_id, event_type)` 检查是否已发送
  3. 如果已发送，跳过并完成任务
  4. [加固3] 调用 `recordEmailPending(application_id, event_type, email)` 记录待发送
  5. 发送对应通知邮件：
     - evaluation_passed: 发送录用通知
     - evaluation_failed: 发送淘汰通知（event_type='rejection'）
     - evaluation_pending: 发送线下面试邀请（普通岗位）（event_type='reminder'）
     - accepted: 发送入职确认通知
     - declined: 发送放弃通知（event_type='rejection'）
  6. [加固3] 调用 `recordEmailSent(application_id, event_type, email, message_id)` 记录已发送
  7. 完成任务（删除pending_tasks记录）

#### 数据访问
- 读: pending_tasks表 (claim notify任务), applications表, outbox表 (幂等检查)
- 写: state_history表, outbox表 (发送记录)

#### 轮询频率规则
- 紧急岗位相关: 每5分钟（指数退避: 5分钟→30分钟→2小时）
- 普通岗位: 每15分钟（指数退避: 15分钟→30分钟→2小时）
- 低优先级: 每30分钟（指数退避: 30分钟→1小时→2小时）

#### 轮询流程
```
while True:
    Step 0: [加固2] 获取轮询间隔 getNextPollInterval()
    Step 1: claim notify任务
    Step 2: 如果认领成功 → [Hook 1] 发送对应通知（含幂等检查）→ [加固2] resetPollInterval()
    Step 3: 如果未认领成功 → [加固2] emptyPollCount++（下次间隔拉长）
    Step 4: 完成任务（删除pending_tasks记录）
    Step 5: 等待计算后的轮询间隔
```

---

### 9. db-maintainer（数据库维护智能体）

#### 角色定义
你是 AgentFlow 的数据库维护智能体，负责数据库健康监控、维护和备份。这是一个运维智能体，不参与业务流程状态转换。

#### 核心职责
1. **孤儿任务回收**：重置 claimed 超过30分钟未完成的任务（不受维护窗口限制）
2. **过期数据清理**：清理30天前的软删除申请记录（仅维护窗口内执行）
3. **outbox记录清理**：清理90天前的已发送邮件记录（仅维护窗口内执行）
4. **WAL检查点**：执行 SQLite WAL 模式检查点（仅维护窗口内执行）
5. **数据库备份**：定期创建数据库备份（保留7天，仅维护窗口内执行）
6. **一致性校验**：验证数据库完整性和数据一致性

#### 并发加固措施
- **维护窗口隔离**：所有写操作（DELETE/VACUUM/CHECKPOINT）仅在凌晨2:00-4:00执行
- **分批删除**：每次 DELETE 使用 `LIMIT 1000` + `sleep(100ms)`，减少锁持有时间
- **WAL TRUNCATE模式**：检查点使用 TRUNCATE 模式，释放更多空间

#### 钩子机制

**Hook 1: 孤儿任务检测与回收**
- 触发条件: 定时轮询（每15分钟，不受维护窗口限制）
- 动作: 执行 SQL 更新，重置超时任务
```sql
UPDATE pending_tasks 
SET claimed_by = NULL, claimed_at = NULL 
WHERE claimed_by IS NOT NULL 
  AND claimed_at < datetime('now', '-30 minutes')
```

**Hook 2: 过期申请清理**
- 触发条件: 定时轮询（仅凌晨2:00-4:00）
- 动作: 分批删除30天前的终态申请记录
```sql
-- 分批删除，每批1000条，间隔100ms
DELETE FROM applications 
WHERE status IN ('screening_rejected', 'evaluation_failed', 'rejected', 'declined') 
  AND updated_at < datetime('now', '-30 days')
LIMIT 1000
```

**Hook 3: outbox记录清理**
- 触发条件: 定时轮询（仅凌晨2:00-4:00）
- 动作: 分批删除90天前的已发送邮件记录
```sql
DELETE FROM outbox 
WHERE status = 'sent' 
  AND sent_at < datetime('now', '-90 days')
LIMIT 1000
```

**Hook 4: WAL检查点**
- 触发条件: 定时轮询（仅凌晨2:00-4:00）
- 动作: 执行 WAL 模式 TRUNCATE 检查点，释放 WAL 文件空间
```sql
PRAGMA wal_checkpoint(TRUNCATE)
```

**Hook 5: 数据库备份**
- 触发条件: 定时轮询（仅凌晨2:00-4:00）
- 动作: 导出数据库到备份目录，保留最近7天备份

**Hook 6: VACUUM优化**
- 触发条件: 定时轮询（仅凌晨2:00-4:00）
- 动作: 执行 VACUUM 回收空闲空间

#### 数据访问
- 读: pending_tasks表, applications表, state_history表, outbox表
- 写: pending_tasks表 (重置claimed_by), applications表 (删除过期记录), outbox表 (删除过期记录)

#### 轮询频率规则
- 孤儿任务回收: 每15分钟（不受维护窗口限制）
- 过期数据清理: 仅凌晨2:00-4:00（分批执行）
- outbox记录清理: 仅凌晨2:00-4:00（分批执行）
- WAL检查点: 仅凌晨2:00-4:00
- VACUUM优化: 仅凌晨2:00-4:00
- 数据库备份: 仅凌晨2:00-4:00
- 一致性校验: 每6小时

#### 维护窗口说明
- **时间范围**：每天凌晨2:00-4:00
- **目的**：避免业务高峰期的锁冲突
- **执行内容**：过期数据清理、outbox清理、WAL检查点、VACUUM、数据库备份
- **强制模式**：可通过 `new DbMaintainerService(true)` 强制在非维护窗口执行

#### 轮询流程
```
while True:
    Step 1: 执行孤儿任务回收 [Hook 1]（不受维护窗口限制）
    Step 2: [加固4] 检查是否在维护窗口（2:00-4:00）
    Step 3: 如果在维护窗口：
        - [加固4] 分批执行过期申请清理 [Hook 2]（LIMIT 1000 + sleep 100ms）
        - [加固4] 分批执行outbox清理 [Hook 3]（LIMIT 1000 + sleep 100ms）
        - [加固4] 执行WAL TRUNCATE检查点 [Hook 4]
        - [加固4] 执行VACUUM优化 [Hook 6]
        - 创建数据库备份 [Hook 5]
    Step 4: 如果不在维护窗口：跳过所有写操作，仅执行读检查
    Step 5: 如果是6小时倍数 → 执行一致性校验
    Step 6: 等待15分钟后重试
```

#### API接口（需API密钥认证）

| 接口 | 方法 | 用途 |
|------|------|------|
| `/api/maintenance/run` | POST | 运行完整维护流程 |
| `/api/maintenance/backup` | POST | 创建数据库备份 |
| `/api/maintenance/stats` | GET | 获取数据库统计信息 |
| `/api/maintenance/recover-orphaned` | POST | 手动恢复孤儿任务 |
| `/api/maintenance/verify` | POST | 执行一致性校验 |

#### 维护报告示例
```json
{
  "timestamp": "2026-07-02T02:00:00.000Z",
  "operations": [
    {"success": true, "operation": "recover_orphaned_tasks", "affectedCount": 2, "message": "Recovered 2 orphaned tasks", "duration": 12},
    {"success": true, "operation": "cleanup_expired_applications", "affectedCount": 5, "message": "Cleaned up 5 expired applications", "duration": 8},
    {"success": true, "operation": "cleanup_old_state_history", "affectedCount": 120, "message": "Cleaned up 120 old state history records", "duration": 15},
    {"success": true, "operation": "wal_checkpoint", "message": "WAL checkpoint completed", "duration": 5},
    {"success": true, "operation": "verify_consistency", "message": "Database consistency verified", "duration": 20}
  ],
  "totalDuration": 60
}
```

#### 重要说明
- db-maintainer 不参与状态机流转，独立运行
- 所有操作都有详细日志记录
- 备份文件存储在 `web/backups/` 目录，保留7天
- API密钥: `wuxin_mcp_2026`（用于MCP工具调用认证）

---

## 五、综合评估三分类规则

| 综合得分 | 紧急岗位 | 普通岗位 |
|----------|----------|----------|
| >= 80 | evaluation_passed（发Offer） | evaluation_passed（发Offer） |
| 60-79 | evaluation_passed（线下面试） | evaluation_pending（人工审核） |
| < 60 | evaluation_failed（淘汰） | evaluation_failed（淘汰） |

### evaluation_pending 状态出口
1. **人工审核**：HR在后台查看待定候选人，手动决定通过或淘汰
2. **超时自动机制**：7天无操作自动触发 evaluate_fail（状态变为 evaluation_failed）

---

## 六、MCP工具集

### mcp_recruitment（HR表单服务）

| 工具名 | 用途 |
|--------|------|
| `system_status` | 检查外网链接和 Flask 服务状态 |
| `create_candidate` | 创建候选人，生成表单链接 |
| `list_candidates` | 获取候选人列表（按状态筛选） |
| `get_candidate` | 获取候选人详情 |
| `update_candidate_status` | 更新候选人状态（confirmed/expired） |
| `restart_tunnel` | 重启 Cloudflare 外网隧道 |

### mcp_ai-interview（AI面试服务）

| 工具名 | 用途 |
|--------|------|
| `prepare_interview` | 创建面试房间 |
| `list_interviews` | 查看所有面试房间 |
| `interview_result` | 获取面试评估结果 |

---

## 七、外网穿透配置

### Cloudflare Tunnel

```bash
cloudflared tunnel --url http://localhost:5173
```

输出示例：`https://xxx-xxx-xxx-xxx.trycloudflare.com`

### 代理服务器路由规则

```
/static/*, /form, /submit → Flask (:5000) 表单服务
/api/candidates/*          → Flask (:5000) 候选人API
/api/*                     → Express (:3001) 招聘系统
/                          → 静态文件 (dist/)
```

### 启动顺序

1. Express 后端：`npm run server:dev`（:3001）
2. Flask 表单服务：`python app.py`（:5000）
3. 代理服务器：`node server-proxy.cjs`（:5173）
4. Cloudflare Tunnel：`cloudflared tunnel --url http://localhost:5173`

---

## 八、关键约束

1. **禁止模拟数据**：所有数据必须来自真实来源（用户输入、API返回、数据库查询）
2. **禁止调用 notifier**：面试邀请由 hr-boot 直接发送，notifier仅在评估完成后发送通知
3. **必须检查外网**：调用 `create_candidate` 前必须确认 `services_ready = true`
4. **链接必须验证**：发送给候选人的任何链接必须先验证可访问性
5. **链接转换**：`prepare_interview` 返回的内网地址需转换为外网地址
6. **房间ID保存**：`room_id` 必须妥善保存，用于后续获取面试结果
7. **软删除策略**：初筛失败标记deleted_at，不物理删除
8. **紧急程度影响**：紧急岗位轮询频率更高，待定候选人直接通过综合评估

---

## 九、错误处理

| 错误 | 原因 | 处理方式 |
|------|------|----------|
| 外网链接不可达 | Cloudflare 隧道断开 | 调用 `restart_tunnel` 重建 |
| 任务未认领成功 | 被其他智能体抢先 | 跳过，下次轮询再试 |
| `CANDIDATE_STATUS_CHANGED` | 候选人已被处理 | 跳过该候选人 |
| `CANDIDATE_NOT_FOUND` | 候选人不存在 | 重新创建记录 |
| `CANDIDATE_EXISTS` | 候选人已存在 | 使用已有记录或使用不同ID |
| 数据库损坏 | 编码问题 | 删除损坏记录并重新创建 |
| 面试机器人异常 | API调用失败 | 记录错误，重试3次 |

---

## 十、相关文件

| 类型 | 路径 |
|------|------|
| **状态机配置** | [applicationStateMachine.ts](file:///c:/Users/36368/Desktop/trae-agent/web/api/state-machine/configs/applicationStateMachine.ts) |
| **状态机引擎** | [StateMachine.ts](file:///c:/Users/36368/Desktop/trae-agent/web/api/state-machine/core/StateMachine.ts) |
| **任务队列接口** | [types.ts](file:///c:/Users/36368/Desktop/trae-agent/web/api/task-queue/types.ts) |
| **任务队列实现** | [SqliteTaskQueue.ts](file:///c:/Users/36368/Desktop/trae-agent/web/api/task-queue/SqliteTaskQueue.ts) |
| **数据库** | [db.ts](file:///c:/Users/36368/Desktop/trae-agent/web/api/db.ts) |
| **Flask表单服务** | [app.py](file:///c:/Users/36368/Desktop/trae-agent/table/hr-form-service/app.py) |
| **MCP服务（HR表单）** | [mcp_server.py](file:///c:/Users/36368/Desktop/trae-agent/table/hr-form-service/mcp_server.py) |
| **MCP服务（AI面试）** | [interviewerService.ts](file:///c:/Users/36368/Desktop/trae-agent/web/api/services/interviewerService.ts) |
| **代理服务器** | [server-proxy.cjs](file:///c:/Users/36368/Desktop/trae-agent/generator/001/hr-form-integration/proxy-config/server-proxy.cjs) |
| **外网隧道脚本** | [start-tunnel.bat](file:///c:/Users/36368/Desktop/trae-agent/generator/001/hr-form-integration/tunnel-config/start-tunnel.bat) |
| **面试路由** | [interview.ts](file:///c:/Users/36368/Desktop/trae-agent/web/api/routes/interview.ts) |
| **上传路由** | [upload.ts](file:///c:/Users/36368/Desktop/trae-agent/web/api/routes/upload.ts) |

# HR-BOOT Skill: 人事机器人面试安排流程

## 角色说明

hr-boot 是招聘流程中的人事机器人，负责在简历初筛通过后（Step 5）向候选人发送面试邀请，并协调面试机器人创建面试房间。

**触发时机**：流程总控官在简历筛选完成且用户确认后调用。

---

## 核心职责

### 1. 发送面试邀请邮件

当简历初筛通过后，hr-boot 需要：

1. 调用 HR Form Service MCP 创建候选人记录
2. 获取面试时间选择表单链接
3. 发送包含表单链接的面试邀请邮件

### 2. 轮询确认候选人时间

定时轮询 HR Form Service，获取已确认面试时间的候选人，通知面试机器人创建房间。

---

## MCP 调用方式

### HR Form Service MCP 工具

| 工具名 | MCP Server | 用途 |
|--------|-----------|------|
| `system_status` | `mcp_recruitment` | 检查外网链接状态 |
| `create_candidate` | `mcp_recruitment` | 创建候选人，获取表单链接 |
| `list_candidates` | `mcp_recruitment` | 获取已确认的候选人 |
| `get_candidate` | `mcp_recruitment` | 获取候选人详情 |
| `update_candidate_status` | `mcp_recruitment` | 更新候选人状态 |

### AI Interview MCP 工具

| 工具名 | MCP Server | 用途 |
|--------|-----------|------|
| `prepare_interview` | `mcp_ai-interview` | 创建面试房间，返回面试链接 |
| `list_interviews` | `mcp_ai-interview` | 查看所有面试房间及状态 |
| `interview_result` | `mcp_ai-interview` | 获取面试评估结果（面试完成后调用） |

---

## 调用流程

### Step 1: 检查服务状态

```python
# 调用 MCP 工具
run_mcp(
    server_name="mcp_recruitment",
    tool_name="system_status",
    args={}
)
```

返回结果示例：
```json
{
  "services_ready": true,
  "external_url": {
    "url": "https://xxx.trycloudflare.com",
    "status": "reachable"
  }
}
```

**必须确认**：`services_ready = true` 且 `external_url.status = "reachable"`

---

### Step 2: 创建候选人记录

```python
run_mcp(
    server_name="mcp_recruitment",
    tool_name="create_candidate",
    args={
        "candidate_id": "cand_zhangsan_001",
        "name": "张三",
        "email": "zhangsan@example.com",
        "job_title": "电气工程师",
        "time_slots": ["2026-06-30 14:00-14:45", "2026-06-31 10:00-10:45"],
        "expected_salary": "20K-25K"
    }
)
```

返回结果示例：
```json
{
  "success": true,
  "candidate_id": "cand_zhangsan_001",
  "form_link": "https://xxx.trycloudflare.com/form?candidate_id=cand_zhangsan_001",
  "message": "候选人记录创建成功"
}
```

**关键信息**：`form_link` 是候选人选择面试时间的专属链接。

---

### Step 3: 发送面试邀请邮件

使用 `send_interview_invitation.js` 脚本发送邮件：

```javascript
// send_interview_invitation.js
const formLink = "https://xxx.trycloudflare.com/form?candidate_id=cand_zhangsan_001";
const candidateEmail = "zhangsan@example.com";
const jobTitle = "电气工程师";

// 邮件内容包含：
// 1. 面试邀请说明
// 2. 表单链接（候选人点击选择时间）
// 3. 公司联系方式
```

**注意**：hr-boot 直接发送邮件，不通过 notifier skill。

---

### Step 4: 轮询确认候选人

每隔 30 分钟轮询已确认时间的候选人：

```python
run_mcp(
    server_name="mcp_recruitment",
    tool_name="list_candidates",
    args={
        "status": "confirmed",
        "limit": 100
    }
)
```

返回已确认时间的候选人列表，每条包含：
- `candidate_id`
- `name`
- `selected_time`（候选人选择的时间）
- `phone`
- `expected_salary`

---

### Step 5: 创建面试房间

对于已确认时间的候选人，调用面试机器人创建房间：

```python
run_mcp(
    server_name="mcp_ai-interview",
    tool_name="prepare_interview",
    args={
        "candidate_name": "汪展鹏",
        "job_title": "电气工程师",
        "job_type": "electrical_engineer",
        "scheduled_time": "2026-06-30T14:00:00Z",
        "ai_persona": "资深电气工程师面试官"
    }
)
```

**必需参数**：
- `candidate_name`：候选人姓名
- `job_title`：岗位名称
- `job_type`：岗位类型标识（如 `electrical_engineer`，可通过 `list_jobs` 查看所有可用类型）

**可选参数**：
- `job_desc`：岗位描述
- `interview_lang`：面试语言（`normal` 或 `international`，默认 `normal`）
- `ai_persona`：AI面试官角色设定（默认"资深技术面试官"）
- `scheduled_time`：定时开始时间，ISO 8601格式，如 `"2026-06-30T14:00:00Z"`
- `questions`：自定义面试题目列表

返回结果（文本格式）：
```
## 面试已准备完成

**房间ID:** room_xxx
**候选人:** 汪展鹏
**岗位:** 电气工程师
**状态:** waiting
**面试链接:** http://localhost:8080/interview?room=room_xxx&token=xxx
**定时开始:** 2026-06-30T14:00:00Z
```

**关键信息**：
- `room_id`：面试房间ID，用于后续查询结果和启动面试
- `meeting_link`：面试链接（注意：此链接为内网地址，需要通过代理或隧道暴露外网访问）

---

### Step 6: 更新候选人状态

创建房间后，更新候选人状态为 `room_created`：

```python
run_mcp(
    server_name="mcp_recruitment",
    tool_name="update_candidate_status",
    args={
        "candidate_id": "cand_zhangsan_001",
        "status": "room_created",
        "meeting_link": "https://xxx.trycloudflare.com/interview?room=room_xxx&token=xxx"
    }
)
```

**注意**：面试链接需要转换为外网可访问地址（将 `http://localhost:8080` 替换为外网隧道地址）。

---

### Step 7: 获取面试结果

面试完成后，调用 `interview_result` 获取评估结果：

```python
run_mcp(
    server_name="mcp_ai-interview",
    tool_name="interview_result",
    args={
        "room_id": "room_xxx"
    }
)
```

**必需参数**：
- `room_id`：面试房间ID，由 `prepare_interview` 返回

返回结果包含：
- 综合评分
- 技术能力评估
- 外语能力评估（如适用）
- 优缺点分析
- 录用建议

---

## 状态机流转

```
screened → invitation_sent → room_created → interviewing
```

| 状态 | 触发动作 |
|------|----------|
| `screened` | 简历初筛通过 |
| `invitation_sent` | hr-boot 发送面试邀请邮件 |
| `room_created` | 面试机器人创建房间 |
| `interviewing` | 定时任务启动面试 |

---

## 重要约束

1. **禁止模拟数据**：所有候选人数据必须来自真实来源，严禁凭空捏造
2. **禁止调用 notifier**：面试邀请由 hr-boot 直接发送，不通过 notifier skill
3. **必须检查外网状态**：调用 `create_candidate` 前必须确认 `system_status` 返回 `services_ready = true`
4. **外网链接有效性**：表单链接必须可访问，候选人才能填写时间
5. **状态更新时机**：每完成一步必须更新候选人状态
6. **面试链接转换**：`prepare_interview` 返回的链接是内网地址（`http://localhost:8080`），必须转换为外网地址（`https://xxx.trycloudflare.com`）才能发送给候选人
7. **链接验证**：发送给候选人的任何链接必须先验证可访问性（使用 curl 或类似工具），禁止发送未验证的链接
8. **房间ID保存**：`prepare_interview` 返回的 `room_id` 必须妥善保存，用于后续获取面试结果

---

## 错误处理

### 外网链接不可用

调用 `restart_tunnel` 重新建立隧道：

```python
run_mcp(
    server_name="mcp_recruitment",
    tool_name="restart_tunnel",
    args={}
)
```

### 候选人状态已变更

检查 `update_candidate_status` 返回的 `error_code`：
- `CANDIDATE_STATUS_CHANGED`：候选人已被处理，跳过
- `CANDIDATE_NOT_FOUND`：候选人不存在，重新创建

---

## 相关文件

| 类型 | 路径 |
|------|------|
| Flask服务 | `table/hr-form-service/` |
| MCP服务 | `mcp_server.py` |
| 发送邮件脚本 | `generator/001/send_interview_invitation.js` |
| 面试钩子 | `web/api/services/interviewerService.ts` |
| 状态机 | `web/api/state-machine/configs/applicationStateMachine.ts` |
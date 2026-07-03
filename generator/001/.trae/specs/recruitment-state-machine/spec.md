# 招聘系统状态机 - Product Requirement Document

## Overview
- **Summary**: 在五新重工招聘系统中引入轻量级自研状态机框架，首先应用于简历投递流程，实现状态流转校验、历史记录追踪、自动触发动作和前端可视化展示，后续可扩展到岗位招聘和面试流程。
- **Purpose**: 解决当前状态管理分散、缺乏校验、无法追溯的问题，提升招聘流程的规范性和可审计性。
- **Target Users**: HR管理员、招聘负责人、面试官

## Goals
- 建立统一的状态机框架，支持多个业务流程复用
- 实现简历投递全流程的状态化管理（投递→初筛→面试→录用/淘汰）
- 所有状态变更自动记录历史，支持审计追溯
- 关键状态节点自动触发通知等业务动作
- 前端提供可视化的流程进度展示
- 状态机框架易于扩展到岗位招聘、面试等其他流程

## Non-Goals (Out of Scope)
- 不引入XState等第三方状态机库
- 不实现复杂的层级状态、并行状态等高级特性
- 不提供可视化的状态机编辑器（流程配置由代码定义）
- 本次迭代只实现简历投递流程，岗位招聘和面试流程留待后续扩展
- 不实现工作流引擎级别的复杂功能（如会签、跳转、回退到任意节点）

## Background & Context

### 现有状态
当前招聘系统（[web/](file:///c:/Users/36368/Desktop/trae-agent/web/)）中状态管理存在以下问题：

1. **状态定义分散**：
   - 岗位状态在 [db.ts](file:///c:/Users/36368/Desktop/trae-agent/web/api/db.ts#L57) 中定义：`active` / `closed`
   - 投递状态在 [db.ts](file:///c:/Users/36368/Desktop/trae-agent/web/api/db.ts#L74) 中定义：`pending` / `reviewed` / `interviewed` / `accepted` / `rejected`

2. **缺乏流转校验**：
   - [applications.ts](file:///c:/Users/36368/Desktop/trae-agent/web/api/routes/applications.ts#L184-L213) 中的状态更新接口允许直接设置任意状态
   - 无法防止非法跳转（如直接从 pending 跳到 accepted）

3. **无历史记录**：
   - 状态变更直接覆盖，无法查看变更历史
   - 不知道是谁、在什么时间、因为什么原因变更了状态

4. **无自动动作**：
   - 状态变更后需要手动触发后续操作
   - 容易遗漏（如发送面试通知、录用通知等）

### 技术栈
- 后端：Node.js + Express + TypeScript
- 前端：React + TypeScript
- 数据库：sql.js (SQLite)
- 状态管理：Zustand

## Functional Requirements

### 状态机核心框架
- **FR-1**: 提供通用状态机类，支持定义状态、事件、转换规则
- **FR-2**: 支持进入/离开状态时的副作用（actions）
- **FR-3**: 提供状态转换合法性校验，非法转换返回明确错误
- **FR-4**: 支持自定义状态转换的条件守卫（guards）

### 状态历史记录
- **FR-5**: 每次状态变更自动记录历史（变更前状态、变更后状态、操作人、时间、原因）
- **FR-6**: 提供查询状态历史的API接口
- **FR-7**: 数据库新增 `state_history` 表存储历史记录

### 简历投递流程状态机
- **FR-8**: 定义简历投递的完整状态机配置
  - 状态：pending（待审核）、screening（初筛中）、screened（初筛通过）、screening_rejected（初筛淘汰）、interviewing（面试中）、interview_passed（面试通过）、interview_failed（面试未通过）、offer_sent（已发Offer）、accepted（已接受）、declined（已放弃）、rejected（已淘汰）
  - 转换规则：见状态流转图
- **FR-9**: 替换原有的简单状态字段，使用状态机进行流转控制
- **FR-10**: 关键状态自动触发动作（发送邮件通知、更新关联数据等）

### 前端可视化
- **FR-11**: 简历详情页展示状态流程进度条
- **FR-12**: 展示当前状态和可执行的操作按钮
- **FR-13**: 展示状态变更历史时间线
- **FR-14**: 状态变更操作需要填写原因

### API接口
- **FR-15**: 获取当前状态和可执行操作列表
- **FR-16**: 执行状态转换（触发事件）
- **FR-17**: 获取状态历史记录
- **FR-18**: 批量获取多个实体的当前状态

## Non-Functional Requirements
- **NFR-1**: 状态转换校验性能 < 10ms（不包含数据库操作）
- **NFR-2**: 状态机框架代码零外部依赖
- **NFR-3**: 状态历史记录不可篡改（只增不删）
- **NFR-4**: 前端状态进度组件响应式更新
- **NFR-5**: 代码结构清晰，易于新增业务流程的状态机

## Constraints
- **Technical**: 
  - 必须使用TypeScript实现
  - 不能引入第三方状态机库
  - 兼容现有sql.js数据库
  - 保持与现有API的向后兼容（旧接口可继续使用）
- **Business**:
  - 优先实现简历投递流程
  - 需保留现有数据，平滑迁移
- **Dependencies**:
  - 依赖现有邮件通知能力（notifier）
  - 依赖现有认证中间件

## Assumptions
- 状态机配置由代码定义，不需要后台配置界面
- 所有状态变更都需要操作人信息（通过认证中间件获取）
- 状态历史只用于追溯，不支持回滚（如需回退需定义专门的回退事件）
- 简历投递流程的状态定义在本次设计中确定，后续调整再扩展

## 状态流转设计

### 简历投递状态机

```
                    ┌─────────────────┐
                    │     pending     │  待审核
                    └────────┬────────┘
                             │ start_screening
                             ▼
                    ┌─────────────────┐
                    │    screening    │  初筛中
                    └────────┬────────┘
              pass_screening │
             ┌───────────────┴───────────────┐
             ▼                               ▼
    ┌─────────────────┐            ┌─────────────────┐
    │    screened     │            │screening_rejected│ 初筛淘汰
    │   初筛通过      │            └─────────────────┘
    └────────┬────────┘
             │ start_interview
             ▼
    ┌─────────────────┐
    │   interviewing  │  面试中
    └────────┬────────┘
    pass_interview │
       ┌──────────┴──────────┐
       ▼                     ▼
┌─────────────┐      ┌───────────────┐
│interview_   │      │interview_     │ 面试未通过
│passed       │      │failed         │
│ 面试通过     │      └───────────────┘
└──────┬──────┘
       │ send_offer
       ▼
┌─────────────┐
│ offer_sent  │  已发Offer
└──────┬──────┘
  accept │
    ┌────┴────┐
    ▼         ▼
┌────────┐ ┌────────┐
│accepted│ │declined│
│ 已录用 │ │ 已放弃 │
└────────┘ └────────┘
```

**终态**：screening_rejected、interview_failed、accepted、declined、rejected

**状态说明**：

| 状态 | 标识 | 说明 |
|------|------|------|
| 待审核 | pending | 候选人刚投递，HR尚未查看 |
| 初筛中 | screening | HR正在进行简历筛选 |
| 初筛通过 | screened | 简历筛选通过，待安排面试 |
| 初筛淘汰 | screening_rejected | 简历筛选未通过 |
| 面试中 | interviewing | 已安排面试，等待面试结果 |
| 面试通过 | interview_passed | 面试评估通过 |
| 面试未通过 | interview_failed | 面试评估未通过 |
| 已发Offer | offer_sent | 已发送录用Offer |
| 已录用 | accepted | 候选人接受Offer |
| 已放弃 | declined | 候选人放弃Offer |
| 已淘汰 | rejected | 其他原因淘汰 |

## Acceptance Criteria

### AC-1: 状态机核心框架
- **Given**: 已定义好状态和转换规则的状态机配置
- **When**: 触发一个合法的状态转换事件
- **Then**: 状态正确变更，返回新状态和转换信息
- **Verification**: `programmatic`

### AC-2: 非法转换拦截
- **Given**: 状态机处于某个状态
- **When**: 触发一个当前状态不支持的事件
- **Then**: 转换被拒绝，返回明确的错误信息（当前状态、不支持的事件、支持的事件列表）
- **Verification**: `programmatic`

### AC-3: 状态历史记录
- **Given**: 一个投递记录发生状态变更
- **When**: 查询该投递的状态历史
- **Then**: 返回完整的历史记录，包含每次变更的时间、前后状态、操作人、原因
- **Verification**: `programmatic`

### AC-4: 自动动作触发
- **Given**: 状态机配置了进入某个状态时的自动动作
- **When**: 状态转换进入该状态
- **Then**: 自动动作被执行（如发送邮件通知）
- **Verification**: `programmatic`

### AC-5: 前端状态进度展示
- **Given**: 打开简历详情页
- **When**: 页面加载完成
- **Then**: 显示完整的状态流程进度条，高亮当前状态，已完成状态有标记
- **Verification**: `human-judgment`

### AC-6: 前端状态操作
- **Given**: 用户有权限且当前状态支持某操作
- **When**: 用户点击操作按钮并填写原因确认
- **Then**: 状态正确流转，进度条更新，历史记录新增一条
- **Verification**: `human-judgment`

### AC-7: 历史记录时间线
- **Given**: 有多次状态变更的投递记录
- **When**: 查看状态历史
- **Then**: 以时间线形式展示所有变更，包含时间、操作人、前后状态、原因
- **Verification**: `human-judgment`

### AC-8: 向后兼容
- **Given**: 旧版本的API调用方式
- **When**: 使用旧接口更新状态
- **Then**: 仍然可以工作（内部通过状态机流转），不破坏现有功能
- **Verification**: `programmatic`

## Open Questions
- [ ] 状态变更时是否需要同时支持"跳过"某些状态的快捷操作（管理员权限）？
- [ ] 初筛和面试是否需要支持多轮（如一面、二面、HR面）？
- [ ] 状态历史记录是否需要支持导出？
- [ ] 是否需要状态超时自动处理（如面试后7天未更新自动标记）？

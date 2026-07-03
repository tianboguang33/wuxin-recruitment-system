# 状态机钩子系统 - 产品需求文档

## Overview
- **Summary**: 在现有状态机框架中引入生命周期钩子机制，实现招聘流程的完全自动化，包括自动初筛、自动安排面试、自动评分、自动发送通知等环节。
- **Purpose**: 解决当前招聘流程需要人工干预的问题，实现从简历投递到最终录用的全流程自动化。
- **Target Users**: HR管理员、招聘系统维护人员

## Goals
- 在状态机中引入生命周期钩子机制（onStateEnter/onStateExit/onTransition）
- 实现新简历投递后的自动初筛流程（调用MCP评估工具）
- 实现初筛通过后的自动面试安排（调用AI面试系统）
- 实现面试结束后的自动评分和Offer流程
- 实现各环节的自动邮件通知
- 提供钩子配置的可扩展性，支持自定义业务逻辑

## Non-Goals (Out of Scope)
- 不修改现有状态机核心逻辑（StateMachine类）
- 不新增前端界面，仅扩展后端能力
- 不实现人工审核环节（完全自动模式）
- 不涉及面试内容的AI生成（使用现有面试系统）

## Background & Context
- 当前状态机已实现11个状态和10个事件的转换规则
- 已有MCP工具：简历评估（mcp_recruitment）、AI面试（mcp_ai-interview）、邮件发送（mcp_email）
- 现有状态机的actions仅支持简单的console.log，缺乏实际业务能力
- 用户需求：简历采集助手后的所有流程自动完成

## Functional Requirements
- **FR-1**: 状态机支持注册生命周期钩子（onStateEnter/onStateExit/onTransition）
- **FR-2**: 新简历投递（pending状态）时自动触发初筛流程
- **FR-3**: 初筛通过（screened状态）时自动创建面试房间并发送邀请
- **FR-4**: 面试结束后自动获取评分并更新状态
- **FR-5**: 面试通过（interview_passed状态）时自动发送Offer
- **FR-6**: 各状态变更时自动发送邮件通知候选人
- **FR-7**: 钩子支持配置条件（如评分阈值）
- **FR-8**: 钩子执行失败时记录日志并继续流程
- **FR-9**: 新增"待确认面试"状态（interview_pending），支持面试邀请后等待候选人确认
- **FR-10**: 面试邀请超时机制：48小时未确认自动取消，24小时发送提醒邮件
- **FR-11**: 简历采集监控机制：定时检查采集状态，长时间无新简历发送邮件告警
- **FR-12**: 失败重试机制：简历采集和MCP调用失败时自动重试（最多3次）

## Non-Functional Requirements
- **NFR-1**: 钩子执行异步进行，不阻塞状态转换主流程
- **NFR-2**: 钩子执行失败不影响状态转换结果
- **NFR-3**: 钩子系统支持动态注册和注销
- **NFR-4**: 钩子执行日志可追溯

## Constraints
- **Technical**: 使用现有MCP工具接口，不修改外部服务
- **Business**: 完全自动模式，无需人工确认
- **Dependencies**: 依赖mcp_recruitment、mcp_ai-interview、mcp_email三个MCP服务

## Assumptions
- 简历评估工具（evaluate_resume）返回评分结果可用于判断是否通过初筛
- AI面试系统（prepare_interview）返回面试链接可用于通知候选人
- 邮件系统（send_email）可正常发送邮件通知
- 面试系统（interview_result）可获取面试评分

## Acceptance Criteria

### AC-1: 钩子注册机制
- **Given**: 状态机已初始化
- **When**: 调用钩子注册方法
- **Then**: 钩子成功注册并在对应事件触发时执行
- **Verification**: `programmatic`

### AC-2: 自动初筛流程
- **Given**: 新简历投递成功，状态为pending
- **When**: 触发start_screening事件
- **Then**: 自动调用简历评估工具，根据评分决定pass_screening或reject_screening
- **Verification**: `programmatic`

### AC-3: 自动安排面试
- **Given**: 简历初筛通过，状态为screened
- **When**: 触发start_interview事件
- **Then**: 自动调用prepare_interview创建面试房间，并发送面试邀请邮件
- **Verification**: `programmatic`

### AC-4: 自动面试评分
- **Given**: 面试已完成
- **When**: 系统检测到面试结束
- **Then**: 自动调用interview_result获取评分，更新状态为interview_passed或interview_failed
- **Verification**: `programmatic`

### AC-5: 自动发送Offer
- **Given**: 面试通过，状态为interview_passed
- **When**: 触发send_offer事件
- **Then**: 自动发送Offer邮件给候选人
- **Verification**: `programmatic`

### AC-6: 自动邮件通知
- **Given**: 状态发生变更
- **When**: 状态转换完成
- **Then**: 根据状态变更类型自动发送相应邮件通知
- **Verification**: `human-judgment`

### AC-7: 钩子执行失败处理
- **Given**: 钩子执行过程中发生错误
- **When**: 钩子执行异常
- **Then**: 记录错误日志，状态转换不受影响
- **Verification**: `programmatic`

### AC-8: 待确认面试状态
- **Given**: 初筛通过，触发start_interview事件
- **When**: 发送面试邀请后
- **Then**: 状态转换为interview_pending，等待候选人确认
- **Verification**: `programmatic`

### AC-9: 面试邀请超时机制
- **Given**: 状态为interview_pending
- **When**: 超过48小时未确认
- **Then**: 自动转换为interview_failed状态，发送超时通知邮件
- **Verification**: `programmatic`

### AC-10: 面试邀请提醒
- **Given**: 状态为interview_pending
- **When**: 超过24小时未确认
- **Then**: 自动发送提醒邮件给候选人
- **Verification**: `programmatic`

### AC-11: 简历采集监控
- **Given**: 系统运行中
- **When**: 超过24小时无新简历投递
- **Then**: 发送告警邮件通知HR
- **Verification**: `programmatic`

### AC-12: 失败重试机制
- **Given**: MCP调用失败
- **When**: 调用发生错误
- **Then**: 自动重试最多3次，间隔5秒递增
- **Verification**: `programmatic`

## Open Questions
- [ ] 简历评估的阈值设定（多少分算通过？）
- [ ] 面试系统的定时开始时间如何设置？
- [ ] 邮件模板的内容和格式要求？
- [ ] 告警邮件的接收人是谁？
- [ ] 简历采集失败的告警阈值是多少？
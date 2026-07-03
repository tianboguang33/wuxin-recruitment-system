# 状态机钩子系统 - 实现计划

## [ ] Task 1: 扩展状态机类型定义
- **Priority**: high
- **Depends On**: None
- **Description**: 
  - 在types.ts中添加钩子类型定义（Hook, HookType, HookConfig）
  - 定义钩子执行上下文接口
- **Acceptance Criteria Addressed**: AC-1
- **Test Requirements**:
  - `programmatic` TR-1.1: 类型定义通过TypeScript编译检查
  - `programmatic` TR-1.2: 钩子接口支持onStateEnter/onStateExit/onTransition三种类型

## [ ] Task 2: 扩展状态机配置和核心类
- **Priority**: high
- **Depends On**: Task 1
- **Description**: 
  - 扩展StateMachineConfig接口，添加hooks字段
  - 修改StateMachine类，在状态转换过程中触发钩子
  - 钩子执行采用异步方式，不阻塞主流程
- **Acceptance Criteria Addressed**: AC-1, AC-7
- **Test Requirements**:
  - `programmatic` TR-2.1: 状态转换时正确触发对应钩子
  - `programmatic` TR-2.2: 钩子执行失败不影响状态转换
  - `programmatic` TR-2.3: 钩子执行日志正确记录

## [ ] Task 3: 实现钩子管理器服务
- **Priority**: high
- **Depends On**: Task 2
- **Description**: 
  - 创建HookManager服务类
  - 提供钩子注册、注销、执行方法
  - 支持条件钩子（根据评分阈值决定是否执行）
- **Acceptance Criteria Addressed**: AC-1, AC-7
- **Test Requirements**:
  - `programmatic` TR-3.1: 钩子可以动态注册和注销
  - `programmatic` TR-3.2: 条件钩子根据条件正确执行或跳过
  - `programmatic` TR-3.3: 钩子执行顺序正确

## [ ] Task 4: 实现自动初筛钩子
- **Priority**: high
- **Depends On**: Task 3
- **Description**: 
  - 实现autoScreening钩子，在pending→screening转换后执行
  - 调用mcp_recruitment的evaluate_resume评估简历
  - 根据评分阈值（如≥60分）决定触发pass_screening或reject_screening
- **Acceptance Criteria Addressed**: AC-2
- **Test Requirements**:
  - `programmatic` TR-4.1: 初筛钩子正确调用简历评估工具
  - `programmatic` TR-4.2: 评分≥阈值时自动触发pass_screening
  - `programmatic` TR-4.3: 评分<阈值时自动触发reject_screening

## [ ] Task 5: 扩展状态机配置 - 新增待确认面试状态
- **Priority**: high
- **Depends On**: Task 2
- **Description**: 
  - 在applicationStateMachine.ts中新增interview_pending状态
  - 修改转换规则：screened→interview_pending→interviewing
  - 添加超时事件：interview_timeout（48小时）、interview_reminder（24小时）
- **Acceptance Criteria Addressed**: AC-8, AC-9, AC-10
- **Test Requirements**:
  - `programmatic` TR-5.1: 新增状态通过TypeScript编译检查
  - `programmatic` TR-5.2: 状态转换规则正确：screened→interview_pending→interviewing
  - `programmatic` TR-5.3: interview_pending状态支持超时转换

## [ ] Task 6: 实现自动安排面试钩子
- **Priority**: high
- **Depends On**: Task 5
- **Description**: 
  - 实现autoScheduleInterview钩子，在screened→interview_pending转换后执行
  - 调用mcp_ai-interview的prepare_interview创建面试房间
  - 获取面试链接并发送面试邀请邮件
  - 记录邀请时间用于超时判断
- **Acceptance Criteria Addressed**: AC-3, AC-6, AC-8
- **Test Requirements**:
  - `programmatic` TR-6.1: 面试钩子正确调用prepare_interview
  - `programmatic` TR-6.2: 面试链接正确获取并存储
  - `programmatic` TR-6.3: 邀请时间正确记录
  - `human-judgment` TR-6.4: 面试邀请邮件内容正确

## [ ] Task 7: 实现自动邮件通知钩子
- **Priority**: medium
- **Depends On**: Task 3
- **Description**: 
  - 实现emailNotification钩子，在状态转换时发送邮件
  - 支持多种邮件模板：简历收到、初筛通过、面试邀请、面试结果、Offer
  - 调用mcp_email的send_email发送邮件
- **Acceptance Criteria Addressed**: AC-6
- **Test Requirements**:
  - `programmatic` TR-6.1: 邮件钩子正确调用send_email
  - `human-judgment` TR-6.2: 邮件内容格式正确、信息完整
  - `programmatic` TR-6.3: 邮件发送失败不影响状态转换

## [ ] Task 8: 实现面试邀请超时机制
- **Priority**: high
- **Depends On**: Task 6
- **Description**: 
  - 实现定时任务，每小时检查interview_pending状态的记录
  - 超过24小时未确认：发送提醒邮件
  - 超过48小时未确认：自动转换为interview_failed状态，发送超时通知
- **Acceptance Criteria Addressed**: AC-9, AC-10
- **Test Requirements**:
  - `programmatic` TR-8.1: 超时检查定时任务正确执行（每小时）
  - `programmatic` TR-8.2: 24小时后正确发送提醒邮件
  - `programmatic` TR-8.3: 48小时后正确转换为interview_failed

## [ ] Task 9: 实现简历采集监控机制
- **Priority**: medium
- **Depends On**: Task 3
- **Description**: 
  - 实现定时任务，每6小时检查是否有新简历
  - 超过24小时无新简历：发送告警邮件通知HR
  - 实现失败重试机制：MCP调用失败自动重试最多3次
- **Acceptance Criteria Addressed**: AC-11, AC-12
- **Test Requirements**:
  - `programmatic` TR-9.1: 监控定时任务正确执行（每6小时）
  - `programmatic` TR-9.2: 超过24小时无新简历时发送告警
  - `programmatic` TR-9.3: MCP调用失败时自动重试最多3次

## [ ] Task 10: 集成测试和验证
- **Priority**: medium
- **Depends On**: Tasks 4-9
- **Description**: 
  - 端到端测试完整自动流程：pending→screening→screened→interview_pending→interviewing→interview_passed→offer_sent→accepted
  - 测试边界情况：初筛失败、面试超时、面试失败、钩子执行异常、简历采集失败
  - 验证日志记录完整性
- **Acceptance Criteria Addressed**: AC-1, AC-2, AC-3, AC-4, AC-5, AC-6, AC-7, AC-8, AC-9, AC-10, AC-11, AC-12
- **Test Requirements**:
  - `programmatic` TR-10.1: 完整流程自动流转成功
  - `programmatic` TR-10.2: 初筛失败流程正确处理
  - `programmatic` TR-10.3: 面试超时流程正确处理
  - `programmatic` TR-10.4: 面试失败流程正确处理
  - `programmatic` TR-10.5: 钩子异常不影响流程
  - `programmatic` TR-10.6: 简历采集监控正常工作

## Notes
- 所有MCP调用使用run_mcp工具，严格按照MCP协议调用
- 钩子执行采用异步方式，使用try-catch包裹，确保异常不影响主流程
- 钩子执行日志使用console.log记录，便于排查问题
- 评分阈值可配置，默认设为60分
- 面试邀请超时时间：24小时提醒，48小时自动取消
- 简历采集告警阈值：24小时无新简历
- MCP调用重试次数：最多3次，间隔5秒递增
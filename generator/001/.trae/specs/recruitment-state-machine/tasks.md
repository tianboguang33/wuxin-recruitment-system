# 招聘系统状态机 - The Implementation Plan (Decomposed and Prioritized Task List)

## [ ] Task 1: 实现状态机核心框架
- **Priority**: high
- **Depends On**: None
- **Description**: 
  - 创建 `api/state-machine/` 目录
  - 实现 `StateMachine` 类：状态定义、事件、转换规则、守卫条件
  - 实现 `StateMachineConfig` 类型定义
  - 支持进入/离开状态时的回调动作（onEnter/onExit）
  - 提供 `canTransition`、`transition`、`getAvailableEvents` 等核心方法
- **Acceptance Criteria Addressed**: AC-1, AC-2, AC-8
- **Test Requirements**:
  - `programmatic` TR-1.1: 正常状态转换返回正确的新状态
  - `programmatic` TR-1.2: 非法转换抛出明确错误（包含当前状态、事件、可用事件列表）
  - `programmatic` TR-1.3: getAvailableEvents 返回当前状态可用的所有事件
  - `programmatic` TR-1.4: onEnter/onExit 回调在正确时机被调用
  - `programmatic` TR-1.5: 守卫条件（guard）为 false 时阻止转换
- **Notes**: 纯TypeScript实现，零依赖

## [ ] Task 2: 数据库新增状态历史表
- **Priority**: high
- **Depends On**: None
- **Description**: 
  - 在 [db.ts](file:///c:/Users/36368/Desktop/trae-agent/web/api/db.ts) 中新增 `state_history` 表
  - 字段：id、entity_type（如application/job/interview）、entity_id、from_state、to_state、event、operator、reason、created_at
  - 提供状态历史的增删改查辅助函数
  - 历史记录只增不删，确保不可篡改
- **Acceptance Criteria Addressed**: AC-3
- **Test Requirements**:
  - `programmatic` TR-2.1: state_history 表创建成功
  - `programmatic` TR-2.2: 状态变更后自动插入历史记录
  - `programmatic` TR-2.3: 按entity_type和entity_id查询历史记录，按时间倒序
  - `programmatic` TR-2.4: 历史记录包含所有必要字段（前后状态、操作人、原因、时间）
- **Notes**: sql.js数据库，表结构在db.ts初始化时创建

## [ ] Task 3: 定义简历投递状态机配置
- **Priority**: high
- **Depends On**: Task 1, Task 2
- **Description**: 
  - 创建 `api/state-machine/configs/applicationStateMachine.ts`
  - 定义简历投递的11个状态和转换事件
  - 配置每个状态的显示名称、描述、分类（进行中/通过/淘汰）
  - 配置关键状态的自动动作（发送邮件通知等）
  - 配置状态顺序，用于前端进度条展示
- **Acceptance Criteria Addressed**: AC-1, AC-4
- **Test Requirements**:
  - `programmatic` TR-3.1: 状态机配置包含所有定义的状态和事件
  - `programmatic` TR-3.2: 转换规则正确，非法路径不可达
  - `programmatic` TR-3.3: 初始状态为 pending
  - `programmatic` TR-3.4: 终态（screening_rejected、interview_failed、accepted、declined、rejected）无可用事件
- **Notes**: 状态定义参考 spec.md 中的状态流转图

## [ ] Task 4: 后端状态机服务层封装
- **Priority**: high
- **Depends On**: Task 3
- **Description**: 
  - 创建 `api/services/stateMachineService.ts`
  - 封装状态机实例创建、状态转换、历史记录写入
  - 提供 `getState`、`getAvailableEvents`、`transition`、`getHistory` 等方法
  - 集成操作人信息（从认证中间件获取）
  - 集成自动动作执行
- **Acceptance Criteria Addressed**: AC-1, AC-2, AC-3, AC-4
- **Test Requirements**:
  - `programmatic` TR-4.1: getState 返回当前状态和状态元数据
  - `programmatic` TR-4.2: getAvailableEvents 返回可用事件列表（含显示名称）
  - `programmatic` TR-4.3: transition 成功后状态更新并写入历史记录
  - `programmatic` TR-4.4: transition 失败时返回明确错误信息
  - `programmatic` TR-4.5: getHistory 返回完整的历史记录列表
- **Notes**: 服务层与具体业务解耦，通过entity_type区分

## [ ] Task 5: 改造投递API接口接入状态机
- **Priority**: high
- **Depends On**: Task 4
- **Description**: 
  - 修改 [applications.ts](file:///c:/Users/36368/Desktop/trae-agent/web/api/routes/applications.ts)
  - 新增 `GET /api/applications/:id/state` - 获取当前状态和可用操作
  - 新增 `POST /api/applications/:id/transition` - 执行状态转换
  - 新增 `GET /api/applications/:id/history` - 获取状态历史
  - 改造 `PATCH /api/applications/:id/status` - 内部通过状态机流转，保持向后兼容
  - 新投递时初始化状态为 pending
- **Acceptance Criteria Addressed**: AC-1, AC-2, AC-3, AC-8
- **Test Requirements**:
  - `programmatic` TR-5.1: 新建投递初始状态为 pending
  - `programmatic` TR-5.2: GET /state 返回当前状态和可用事件
  - `programmatic` TR-5.3: POST /transition 正确执行状态转换
  - `programmatic` TR-5.4: POST /transition 非法转换返回400和错误信息
  - `programmatic` TR-5.5: GET /history 返回完整历史记录
  - `programmatic` TR-5.6: PATCH /status 旧接口仍然可用，内部走状态机
- **Notes**: 保持向后兼容，旧接口不破坏现有功能

## [ ] Task 6: 前端状态进度条组件
- **Priority**: high
- **Depends On**: Task 5
- **Description**: 
  - 创建 `src/components/StateProgress.tsx` 组件
  - 展示状态流程进度条（横向步骤条）
  - 高亮当前状态，已完成状态打勾
  - 支持响应式布局
  - 根据状态分类显示不同颜色（进行中-蓝色、通过-绿色、淘汰-红色）
- **Acceptance Criteria Addressed**: AC-5
- **Test Requirements**:
  - `human-judgement` TR-6.1: 进度条显示所有状态节点，顺序正确
  - `human-judgement` TR-6.2: 当前状态高亮显示，视觉上突出
  - `human-judgement` TR-6.3: 已完成状态有勾选标记
  - `human-judgement` TR-6.4: 不同类型状态颜色区分明显
  - `human-judgement` TR-6.5: 移动端适配良好
- **Notes**: 使用 Tailwind CSS，可参考现有组件风格

## [ ] Task 7: 前端状态操作和历史记录
- **Priority**: high
- **Depends On**: Task 6
- **Description**: 
  - 创建 `src/components/StateActions.tsx` - 状态操作按钮组
  - 创建 `src/components/StateHistory.tsx` - 状态历史时间线
  - 状态变更弹窗（确认+填写原因）
  - 集成到简历详情页 [Applications.tsx](file:///c:/Users/36368/Desktop/trae-agent/web/src/pages/admin/Applications.tsx) 或新建详情页
  - 操作后刷新状态和历史
- **Acceptance Criteria Addressed**: AC-6, AC-7
- **Test Requirements**:
  - `human-judgement` TR-7.1: 操作按钮只显示当前状态可用的操作
  - `human-judgement` TR-7.2: 点击操作弹出确认框，必须填写原因
  - `human-judgement` TR-7.3: 操作成功后进度条和状态自动更新
  - `human-judgement` TR-7.4: 历史记录以时间线形式展示，信息完整
  - `human-judgement` TR-7.5: 操作失败有明确错误提示
- **Notes**: 与现有管理后台风格统一

## [ ] Task 8: 数据迁移和向后兼容
- **Priority**: medium
- **Depends On**: Task 5
- **Description**: 
  - 编写数据迁移脚本，将现有 applications 的 status 字段映射到新状态机
  - pending → pending
  - reviewed → screened
  - interviewed → interviewing
  - accepted → accepted
  - rejected → rejected
  - 为现有数据补充初始历史记录
- **Acceptance Criteria Addressed**: AC-8
- **Test Requirements**:
  - `programmatic` TR-8.1: 现有数据正确映射到新状态
  - `programmatic` TR-8.2: 每条现有记录都有对应的初始历史
  - `programmatic` TR-8.3: 旧API调用仍然正常工作
- **Notes**: 迁移脚本可重复执行，幂等设计

## [ ] Task 9: 集成测试和文档
- **Priority**: medium
- **Depends On**: Task 7, Task 8
- **Description**: 
  - 端到端测试完整的简历投递流程
  - 测试各种状态转换路径
  - 测试边界情况（非法转换、终态操作等）
  - 编写状态机使用说明文档
  - 说明如何扩展到其他业务流程
- **Acceptance Criteria Addressed**: AC-1 到 AC-8
- **Test Requirements**:
  - `programmatic` TR-9.1: 完整正向流程（pending→screening→screened→interviewing→interview_passed→offer_sent→accepted）全部通过
  - `programmatic` TR-9.2: 淘汰分支（screening_rejected、interview_failed）正常工作
  - `human-judgement` TR-9.3: 文档清晰说明状态机的使用方法和扩展方式
- **Notes**: 优先保证核心流程正确

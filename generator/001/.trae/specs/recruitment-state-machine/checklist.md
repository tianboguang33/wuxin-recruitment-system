# 招聘系统状态机 - Verification Checklist

## 核心框架验证

- [ ] StateMachine 类能正确实现，支持状态定义、事件、转换规则
- [ ] 状态转换校验正确，非法转换被拦截并返回明确错误
- [ ] 支持 onEnter / onExit 回调，在正确时机触发
- [ ] 支持守卫条件（guard），条件不满足时阻止转换
- [ ] getAvailableEvents 返回当前状态可用的所有事件
- [ ] 状态机零外部依赖
- [ ] 状态转换性能 < 10ms（纯内存操作）

## 数据库验证

- [ ] state_history 表创建成功，包含所有必要字段
- [ ] 状态变更时自动写入历史记录
- [ ] 历史记录包含：entity_type, entity_id, from_state, to_state, event, operator, reason, created_at
- [ ] 历史记录只增不删，不可篡改
- [ ] 按 entity_type + entity_id 查询历史记录，按时间倒序排列
- [ ] 与现有 applications 表结构兼容，不破坏现有数据

## 简历投递状态机验证

- [ ] 状态机配置包含 11 个状态：pending, screening, screened, screening_rejected, interviewing, interview_passed, interview_failed, offer_sent, accepted, declined, rejected
- [ ] 初始状态为 pending
- [ ] 终态（screening_rejected, interview_failed, accepted, declined, rejected）无可用事件
- [ ] 状态转换规则正确，与 spec.md 中的状态流转图一致
- [ ] 关键状态自动触发自动动作（如发送邮件通知）
- [ ] 状态元数据完整（显示名称、描述、分类）

## API 接口验证

- [ ] GET /api/applications/:id/state 返回当前状态和可用操作
- [ ] POST /api/applications/:id/transition 执行状态转换
- [ ] GET /api/applications/:id/history 返回状态历史记录
- [ ] PATCH /api/applications/:id/status 旧接口仍然可用（向后兼容）
- [ ] 非法转换返回 400 状态码和明确的错误信息
- [ ] 所有接口需要认证才能访问
- [ ] 操作人信息正确记录到历史记录中

## 前端验证

- [ ] 状态进度条组件显示所有状态节点
- [ ] 当前状态高亮显示
- [ ] 已完成状态有勾选标记
- [ ] 不同类型状态颜色区分（进行中-蓝色、通过-绿色、淘汰-红色）
- [ ] 操作按钮只显示当前状态可用的操作
- [ ] 状态变更需要填写原因
- [ ] 状态变更后进度条自动更新
- [ ] 历史记录以时间线形式展示
- [ ] 历史记录包含时间、操作人、前后状态、原因
- [ ] 响应式布局，移动端适配良好

## 数据迁移验证

- [ ] 现有 applications 表中旧状态值正确映射到新状态
- [ ] 每条现有记录都有对应的初始历史记录
- [ ] 迁移脚本幂等，可重复执行
- [ ] 迁移后数据一致性

## 集成测试验证

- [ ] 正向流程：pending → screening → screened → interviewing → interview_passed → offer_sent → accepted 全部通过
- [ ] 初筛淘汰分支：pending → screening → screening_rejected 正常工作
- [ ] 面试淘汰分支：screened → interviewing → interview_failed 正常工作
- [ ] 放弃分支：offer_sent → declined 正常工作
- [ ] 非法转换被正确拦截
- [ ] 边界情况处理正确（终态无可用事件、初始状态正确等

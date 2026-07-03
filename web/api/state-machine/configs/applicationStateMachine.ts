import { StateMachineConfig } from '../types.js';

export type ApplicationState =
  | 'pending'
  | 'screening'
  | 'screened'
  | 'screening_rejected'
  | 'invitation_sent'
  | 'room_created'
  | 'interview_scheduled'
  | 'interviewing'
  | 'evaluation_pending'
  | 'evaluation_passed'
  | 'evaluation_failed'
  | 'offer_sent'
  | 'accepted'
  | 'declined'
  | 'rejected';

export type ApplicationEvent =
  | 'start_screening'
  | 'pass_screening'
  | 'reject_screening'
  | 'send_invitation'
  | 'confirm_time'
  | 'schedule_interview'
  | 'start_interview'
  | 'evaluate_pending'
  | 'evaluate_pass'
  | 'evaluate_fail'
  | 'send_offer'
  | 'accept_offer'
  | 'decline_offer'
  | 'reject';

export interface ApplicationContext {
  applicationId: number;
  candidateName?: string;
  jobId?: number;
  jobTitle?: string;
  operator?: string;
  reason?: string;
}

export const applicationStateMachineConfig: StateMachineConfig<
  ApplicationState,
  ApplicationEvent,
  ApplicationContext
> = {
  id: 'application',
  initial: 'pending',
  states: {
    pending: {
      name: '待审核',
      description: '候选人刚投递，HR尚未查看',
      category: 'initial',
      order: 1,
    },
    screening: {
      name: '初筛中',
      description: 'HR正在进行简历筛选',
      category: 'progress',
      order: 2,
    },
    screened: {
      name: '初筛通过',
      description: '简历筛选通过，待发送面试邀请',
      category: 'progress',
      order: 3,
    },
    screening_rejected: {
      name: '初筛淘汰',
      description: '简历筛选未通过',
      category: 'failed',
      order: 14,
    },
    invitation_sent: {
      name: '已发面试邀请',
      description: 'hr-boot已发送面试邀请，等待候选人确认时间',
      category: 'progress',
      order: 4,
    },
    room_created: {
      name: '面试房间已创建',
      description: '面试机器人已创建房间，等待面试时间',
      category: 'progress',
      order: 5,
    },
    interview_scheduled: {
      name: '面试已排期',
      description: '候选人已确认面试时间，等待面试开始',
      category: 'progress',
      order: 6,
    },
    interviewing: {
      name: '面试中',
      description: 'AI面试正在进行',
      category: 'progress',
      order: 7,
    },
    evaluation_pending: {
      name: '综合评估待定',
      description: 'AI面试通过但总分未达线，需人工审核或线下面试',
      category: 'progress',
      order: 8,
    },
    evaluation_passed: {
      name: '综合评估通过',
      description: '综合评估通过，待发Offer',
      category: 'progress',
      order: 9,
    },
    evaluation_failed: {
      name: '综合评估未通过',
      description: '综合评估未通过，已淘汰',
      category: 'failed',
      order: 16,
    },
    offer_sent: {
      name: '已发Offer',
      description: '已发送录用Offer',
      category: 'progress',
      order: 8,
    },
    accepted: {
      name: '已录用',
      description: '候选人接受Offer',
      category: 'success',
      order: 9,
    },
    declined: {
      name: '已放弃',
      description: '候选人放弃Offer',
      category: 'failed',
      order: 16,
    },
    rejected: {
      name: '已淘汰',
      description: '其他原因淘汰',
      category: 'failed',
      order: 17,
    },
  },
  transitions: [
    // 初筛流程
    { from: 'pending', to: 'screening', event: 'start_screening' },
    { from: 'screening', to: 'screened', event: 'pass_screening' },
    { from: 'screening', to: 'screening_rejected', event: 'reject_screening' },

    // 面试邀请流程 (hr-boot -> 面试机器人)
    { from: 'screened', to: 'invitation_sent', event: 'send_invitation' },
    { from: 'invitation_sent', to: 'room_created', event: 'confirm_time' },
    { from: 'room_created', to: 'interview_scheduled', event: 'schedule_interview' },
    { from: 'interview_scheduled', to: 'interviewing', event: 'start_interview' },

    // 综合评估流程 (evaluator统一评估)
    { from: 'interviewing', to: 'evaluation_pending', event: 'evaluate_pending' },
    { from: 'interviewing', to: 'evaluation_passed', event: 'evaluate_pass' },
    { from: 'interviewing', to: 'evaluation_failed', event: 'evaluate_fail' },

    // Offer流程
    { from: 'evaluation_passed', to: 'offer_sent', event: 'send_offer' },
    { from: 'offer_sent', to: 'accepted', event: 'accept_offer' },
    { from: 'offer_sent', to: 'declined', event: 'decline_offer' },

    // 任意状态可淘汰
    {
      from: ['pending', 'screening', 'screened', 'invitation_sent', 'room_created', 'interview_scheduled', 'interviewing', 'evaluation_pending', 'evaluation_passed', 'offer_sent'],
      to: 'rejected',
      event: 'reject',
    },
  ],
  actions: {
    screening_rejected: {
      onEnter: async (ctx, fromState, event) => {
        console.log(`[ApplicationSM] Candidate ${ctx.candidateName} rejected at screening stage`);
      },
    },
    evaluation_pending: {
      onEnter: async (ctx, fromState, event) => {
        console.log(`[ApplicationSM] Candidate ${ctx.candidateName} is pending evaluation`);
      },
    },
    evaluation_passed: {
      onEnter: async (ctx, fromState, event) => {
        console.log(`[ApplicationSM] Candidate ${ctx.candidateName} passed evaluation`);
      },
    },
    evaluation_failed: {
      onEnter: async (ctx, fromState, event) => {
        console.log(`[ApplicationSM] Candidate ${ctx.candidateName} failed evaluation`);
      },
    },
    offer_sent: {
      onEnter: async (ctx, fromState, event) => {
        console.log(`[ApplicationSM] Offer sent to candidate ${ctx.candidateName}`);
      },
    },
    accepted: {
      onEnter: async (ctx, fromState, event) => {
        console.log(`[ApplicationSM] Candidate ${ctx.candidateName} accepted offer`);
      },
    },
    declined: {
      onEnter: async (ctx, fromState, event) => {
        console.log(`[ApplicationSM] Candidate ${ctx.candidateName} declined offer`);
      },
    },
  },
};

export const applicationEventLabels: Record<ApplicationEvent, string> = {
  start_screening: '开始初筛',
  pass_screening: '初筛通过',
  reject_screening: '初筛淘汰',
  send_invitation: '发送面试邀请',
  confirm_time: '确认面试时间',
  schedule_interview: '排期面试',
  start_interview: '开始面试',
  evaluate_pending: '综合评估待定',
  evaluate_pass: '综合评估通过',
  evaluate_fail: '综合评估未通过',
  send_offer: '发送Offer',
  accept_offer: '接受Offer',
  decline_offer: '放弃Offer',
  reject: '淘汰',
};

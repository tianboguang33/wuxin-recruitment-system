/**
 * 面试流程钩子配置
 * 标准化 hr-boot 与面试机器人 (interviewer-agent) 的交互流程
 *
 * 流程说明(去中心化架构):
 * 1. hr-boot 在简历初筛通过后直接发送面试邀请(含时间选择表单)
 * 2. 候选人填写时间后，hr-boot检测到并调用面试机器人创建房间
 * 3. 面试机器人创建房间，在指定时间开始面试
 * 4. 面试结束后，面试机器人获取评分结果，插入evaluate任务
 *
 * 注意: 面试邀请环节不需要 notifier介入，由 hr-boot 直接处理
 */

import axios from 'axios';
import { checkEmailSent, recordEmailSent, recordEmailPending } from '../../db.js';

const INTERVIEWER_API_BASE = process.env.INTERVIEWER_API_BASE || 'http://localhost:8080';
const MCP_RECRUITMENT_BASE = process.env.MCP_RECRUITMENT_BASE || 'http://localhost:5000';

interface HookLog {
  timestamp: string;
  hook: string;
  applicationId: number;
  action: string;
  success: boolean;
  error?: string;
  data?: any;
}

const hookLogs: HookLog[] = [];

function logHook(hook: string, applicationId: number, action: string, success: boolean, error?: string, data?: any) {
  hookLogs.push({
    timestamp: new Date().toISOString(),
    hook,
    applicationId,
    action,
    success,
    error,
    data,
  });
  console.log(`[${hook}] Application ${applicationId}: ${action} - ${success ? 'SUCCESS' : 'FAILED'}`);
}

export interface InterviewHookConfig {
  interviewerApiBase: string;
  screeningThreshold: number;
  invitationTemplateId: string;
  invitationTimeoutHours: number;
  invitationReminderHours: number;
}

export const defaultInterviewHookConfig: InterviewHookConfig = {
  interviewerApiBase: INTERVIEWER_API_BASE,
  screeningThreshold: 60,
  invitationTemplateId: 'interview_invitation',
  invitationTimeoutHours: 48,
  invitationReminderHours: 24,
};

export async function checkAndRepairTunnel(maxRetries: number = 3, delayMs: number = 5000): Promise<boolean> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await axios.get(`${MCP_RECRUITMENT_BASE}/api/system/status`, { timeout: 5000 });
      if (response.data.services_ready === true) {
        console.log('[Tunnel] Services are ready');
        return true;
      }
      console.log(`[Tunnel] Services not ready (attempt ${attempt}/${maxRetries}), restarting...`);
    } catch (error) {
      console.log(`[Tunnel] Health check failed (attempt ${attempt}/${maxRetries}): ${error.message}`);
    }

    try {
      await axios.post(`${MCP_RECRUITMENT_BASE}/api/system/restart-tunnel`, {}, { timeout: 15000 });
      console.log('[Tunnel] Restart tunnel command sent');
    } catch (error) {
      console.error('[Tunnel] Failed to restart tunnel:', error.message);
    }

    await new Promise(resolve => setTimeout(resolve, delayMs));
  }

  console.error('[Tunnel] Failed to repair tunnel after maximum retries');
  return false;
}

export async function onScreenedSendInvitation(
  ctx: any,
  fromState: string,
  event: string,
  config: InterviewHookConfig = defaultInterviewHookConfig
) {
  const { applicationId, candidateName, candidateEmail, jobTitle, jobType } = ctx;

  try {
    const alreadySent = await checkEmailSent(applicationId, 'invitation');
    if (alreadySent) {
      logHook('onScreenedSendInvitation', applicationId, 'send_invitation_email', true, undefined, {
        skipped: true,
        reason: 'Email already sent',
      });
      return { success: true, skipped: true, reason: 'Email already sent' };
    }

    await checkAndRepairTunnel();

    await recordEmailPending(applicationId, 'invitation', candidateEmail);

    const invitationData = {
      applicationId,
      candidateName,
      candidateEmail,
      jobTitle,
      jobType,
      timeFormConfig: {
        minTime: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
        maxTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        availableSlots: generateAvailableSlots(),
      },
    };

    const emailResult = await sendInterviewInvitationEmail(invitationData);

    await recordEmailSent(applicationId, 'invitation', candidateEmail, emailResult.emailId);

    logHook('onScreenedSendInvitation', applicationId, 'send_invitation_email', true, undefined, {
      emailId: emailResult.emailId,
      formLink: emailResult.formLink,
    });

    await triggerStateTransition(applicationId, 'send_invitation', {
      invitationId: emailResult.emailId,
      formLink: emailResult.formLink,
      sentAt: new Date().toISOString(),
    });

    return { success: true, invitationId: emailResult.emailId };
  } catch (error) {
    logHook('onScreenedSendInvitation', applicationId, 'send_invitation_email', false, error.message);
    return { success: false, error: error.message };
  }
}

export async function onConfirmTimeCreateRoom(
  ctx: any,
  scheduledTime: string,
  config: InterviewHookConfig = defaultInterviewHookConfig
) {
  const { applicationId, candidateName, jobTitle, jobType, interviewLang } = ctx;

  try {
    const alreadySent = await checkEmailSent(applicationId, 'confirmation');
    if (alreadySent) {
      logHook('onConfirmTimeCreateRoom', applicationId, 'send_confirmation_email', true, undefined, {
        skipped: true,
        reason: 'Confirmation email already sent',
      });
    }

    const roomResult = await axios.post(
      `${config.interviewerApiBase}/api/mcp/rooms`,
      {
        name: `${candidateName}的面试`,
        candidateName,
        jobTitle,
        jobType,
        interviewLang: interviewLang || 'normal',
        scheduledTime,
      },
      { timeout: 15000 }
    );

    const { room_id, interview_link, status } = roomResult.data;

    logHook('onConfirmTimeCreateRoom', applicationId, 'create_interview_room', true, undefined, {
      roomId: room_id,
      interviewLink: interview_link,
      scheduledTime,
    });

    await triggerStateTransition(applicationId, 'confirm_time', {
      roomId: room_id,
      interviewLink: interview_link,
      scheduledTime,
    });

    if (!alreadySent) {
      await recordEmailPending(applicationId, 'confirmation', ctx.candidateEmail);
      await sendInterviewConfirmationEmail({
        applicationId,
        candidateName,
        candidateEmail: ctx.candidateEmail,
        interviewLink: interview_link,
        scheduledTime,
      });
      await recordEmailSent(applicationId, 'confirmation', ctx.candidateEmail, `confirmation_${applicationId}`);
    }

    return { success: true, roomId: room_id, interviewLink: interview_link };
  } catch (error) {
    logHook('onConfirmTimeCreateRoom', applicationId, 'create_interview_room', false, error.message);
    return { success: false, error: error.message };
  }
}

export async function onStartInterview(
  ctx: any,
  config: InterviewHookConfig = defaultInterviewHookConfig
) {
  const { applicationId, roomId } = ctx;

  try {
    const statusResult = await axios.get(
      `${config.interviewerApiBase}/api/mcp/rooms/${roomId}`,
      { timeout: 10000 }
    );

    if (statusResult.data.status !== 'waiting') {
      logHook('onStartInterview', applicationId, 'check_room_status', false, 'Room not in waiting state');
      return { success: false, error: 'Room not ready' };
    }

    const startResult = await axios.post(
      `${config.interviewerApiBase}/api/mcp/rooms/${roomId}/start`,
      {},
      { timeout: 10000 }
    );

    logHook('onStartInterview', applicationId, 'start_interview', true, undefined, {
      roomId,
      startedAt: new Date().toISOString(),
    });

    await triggerStateTransition(applicationId, 'start_interview', {
      startedAt: new Date().toISOString(),
    });

    return { success: true, roomId };
  } catch (error) {
    logHook('onStartInterview', applicationId, 'start_interview', false, error.message);
    return { success: false, error: error.message };
  }
}

export async function onInterviewEndGetResult(
  ctx: any,
  config: InterviewHookConfig = defaultInterviewHookConfig
) {
  const { applicationId, roomId, jobId } = ctx;

  try {
    const resultResponse = await axios.get(
      `${config.interviewerApiBase}/api/mcp/rooms/${roomId}/result`,
      { timeout: 10000 }
    );

    const { finished, report } = resultResponse.data;

    if (!finished) {
      logHook('onInterviewEndGetResult', applicationId, 'get_result', false, 'Interview not finished');
      return { success: false, error: 'Interview not finished' };
    }

    const score = report?.score;

    logHook('onInterviewEndGetResult', applicationId, 'get_interview_result', true, undefined, {
      roomId,
      totalScore: score?.total,
      technicalScore: score?.technicalScore,
      summary: score?.summary,
    });

    await saveInterviewScore(applicationId, score, report?.summary, report?.transcript);

    await pushEvaluateTask(applicationId, jobId);

    return {
      success: true,
      score,
      passed: score?.total >= 60,
    };
  } catch (error) {
    logHook('onInterviewEndGetResult', applicationId, 'get_interview_result', false, error.message);
    return { success: false, error: error.message };
  }
}

export async function onInvitationTimeout(
  ctx: any,
  config: InterviewHookConfig = defaultInterviewHookConfig
) {
  const { applicationId, candidateName, candidateEmail } = ctx;

  try {
    const alreadySent = await checkEmailSent(applicationId, 'timeout');
    if (alreadySent) {
      logHook('onInvitationTimeout', applicationId, 'timeout_notification', true, undefined, {
        skipped: true,
        reason: 'Timeout email already sent',
      });
      return { success: true, skipped: true };
    }

    await recordEmailPending(applicationId, 'timeout', candidateEmail);
    await sendTimeoutNotificationEmail({
      applicationId,
      candidateName,
      candidateEmail,
    });
    await recordEmailSent(applicationId, 'timeout', candidateEmail, `timeout_${applicationId}`);

    logHook('onInvitationTimeout', applicationId, 'timeout_notification', true);

    await triggerStateTransition(applicationId, 'fail_interview', {
      reason: 'invitation_timeout',
      timeoutHours: config.invitationTimeoutHours,
    });

    return { success: true };
  } catch (error) {
    logHook('onInvitationTimeout', applicationId, 'timeout_notification', false, error.message);
    return { success: false, error: error.message };
  }
}

export async function onInvitationReminder(
  ctx: any,
  config: InterviewHookConfig = defaultInterviewHookConfig
) {
  const { applicationId, candidateName, candidateEmail, formLink } = ctx;

  try {
    const alreadySent = await checkEmailSent(applicationId, 'reminder');
    if (alreadySent) {
      logHook('onInvitationReminder', applicationId, 'reminder_email', true, undefined, {
        skipped: true,
        reason: 'Reminder email already sent',
      });
      return { success: true, skipped: true };
    }

    await recordEmailPending(applicationId, 'reminder', candidateEmail);
    await sendReminderEmail({
      applicationId,
      candidateName,
      candidateEmail,
      formLink,
      remainingHours: config.invitationTimeoutHours - config.invitationReminderHours,
    });
    await recordEmailSent(applicationId, 'reminder', candidateEmail, `reminder_${applicationId}`);

    logHook('onInvitationReminder', applicationId, 'reminder_email', true);

    return { success: true };
  } catch (error) {
    logHook('onInvitationReminder', applicationId, 'reminder_email', false, error.message);
    return { success: false, error: error.message };
  }
}

function generateAvailableSlots(): string[] {
  const slots: string[] = [];
  const now = new Date();

  for (let day = 1; day <= 7; day++) {
    const date = new Date(now.getTime() + day * 24 * 60 * 60 * 1000);
    for (let hour = 9; hour <= 18; hour += 2) {
      const slot = new Date(date);
      slot.setHours(hour, 0, 0, 0);
      slots.push(slot.toISOString());
    }
  }

  return slots;
}

async function sendInterviewInvitationEmail(data: any): Promise<{ emailId: string; formLink: string }> {
  const emailId = `invitation_${data.applicationId}_${Date.now()}`;
  const formLink = `${process.env.WEB_BASE_URL || 'http://localhost:5173'}/interview/time-select?appId=${data.applicationId}`;

  console.log(`[Email] Sending interview invitation to ${data.candidateEmail}`);
  console.log(`[Email] Form link: ${formLink}`);

  return { emailId, formLink };
}

async function sendInterviewConfirmationEmail(data: any): Promise<void> {
  console.log(`[Email] Sending interview confirmation to ${data.candidateEmail}`);
  console.log(`[Email] Interview link: ${data.interviewLink}`);
  console.log(`[Email] Scheduled time: ${data.scheduledTime}`);
}

async function sendTimeoutNotificationEmail(data: any): Promise<void> {
  console.log(`[Email] Sending timeout notification to ${data.candidateEmail}`);
}

async function sendReminderEmail(data: any): Promise<void> {
  console.log(`[Email] Sending reminder to ${data.candidateEmail}`);
  console.log(`[Email] Remaining hours: ${data.remainingHours}`);
}

async function triggerStateTransition(applicationId: number, event: string, metadata: any): Promise<void> {
  const apiBase = process.env.API_BASE || 'http://localhost:3000';

  await axios.post(
    `${apiBase}/api/applications/${applicationId}/transition`,
    { event, metadata },
    { timeout: 10000 }
  );

  console.log(`[StateMachine] Application ${applicationId} triggered event: ${event}`);
}

async function saveInterviewScore(applicationId: number, score: any, summary: string, transcript: string): Promise<void> {
  const apiBase = process.env.API_BASE || 'http://localhost:3000';

  await axios.put(
    `${apiBase}/api/applications/${applicationId}/score`,
    {
      interviewScore: score?.total || 0,
      summary: summary || '',
      transcript: transcript || '',
    },
    { timeout: 10000 }
  );

  console.log(`[DB] Application ${applicationId} interview score saved: ${score?.total}`);
}

async function pushEvaluateTask(applicationId: number, jobId?: number): Promise<void> {
  const apiBase = process.env.API_BASE || 'http://localhost:3000';

  await axios.post(
    `${apiBase}/api/tasks`,
    {
      taskType: 'evaluate',
      applicationId,
      jobId,
    },
    { timeout: 10000 }
  );

  console.log(`[TaskQueue] Application ${applicationId} evaluate task pushed`);
}

export function getHookLogs(): HookLog[] {
  return [...hookLogs];
}

export function clearHookLogs(): void {
  hookLogs.length = 0;
}

export const interviewHooks = {
  onStateEnter: {
    screened: onScreenedSendInvitation,
    room_created: onStartInterview,
  },
  external: {
    onConfirmTime: onConfirmTimeCreateRoom,
    onInterviewEnd: onInterviewEndGetResult,
    onInvitationTimeout: onInvitationTimeout,
    onInvitationReminder: onInvitationReminder,
  },
  utils: {
    checkAndRepairTunnel,
  },
};

export default interviewHooks;
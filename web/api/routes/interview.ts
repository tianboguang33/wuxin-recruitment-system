/**
 * 面试时间确认路由
 * 处理候选人提交的面试时间选择表单
 *
 * 流程:
 * 1. 候选人收到hr-boot发送的面试邀请邮件
 * 2. 点击链接进入时间选择页面
 * 3. 选择面试时间后提交到此接口
 * 4. 系统调用面试机器人创建房间
 */

import { Router, Request, Response } from 'express';
import db from '../db.js';
import { interviewerService } from '../services/interviewerService.js';
import { onConfirmTimeCreateRoom } from '../state-machine/hooks/interviewHooks.js';

const router = Router();

/**
 * POST /api/interview/time-confirm
 * 候选人确认面试时间
 *
 * 请求体:
 * {
 *   applicationId: number,    // 投递记录ID
 *   scheduledTime: string,    // ISO 8601格式的面试时间
 *   candidateEmail?: string   // 候选人邮箱(用于验证)
 * }
 *
 * 返回:
 * {
 *   success: boolean,
 *   roomId?: string,          // 面试房间ID
 *   interviewLink?: string,   // 面试链接
 *   scheduledTime?: string    // 确认的时间
 * }
 */
router.post('/time-confirm', async (req: Request, res: Response): Promise<void> => {
  try {
    const { applicationId, scheduledTime, candidateEmail } = req.body;

    // 1. 参数验证
    if (!applicationId || !scheduledTime) {
      res.status(400).json({
        success: false,
        error: '缺少必要参数: applicationId, scheduledTime',
      });
      return;
    }

    // 2. 验证时间格式
    const scheduledDate = new Date(scheduledTime);
    if (isNaN(scheduledDate.getTime())) {
      res.status(400).json({
        success: false,
        error: '时间格式无效，请使用ISO 8601格式',
      });
      return;
    }

    // 3. 验证时间范围(必须在未来)
    if (scheduledDate <= new Date()) {
      res.status(400).json({
        success: false,
        error: '面试时间必须在未来',
      });
      return;
    }

    // 4. 查询投递记录
    const stmt = db.prepare(`
      SELECT a.*, j.title as job_title, j.type as job_type
      FROM applications a
      JOIN jobs j ON a.job_id = j.id
      WHERE a.id = ?
    `);
    stmt.bind([applicationId]);
    stmt.step();
    const application = stmt.getAsObject() as any;
    stmt.free();

    if (!application) {
      res.status(404).json({
        success: false,
        error: '投递记录不存在',
      });
      return;
    }

    // 5. 验证状态(必须是invitation_sent)
    if (application.status !== 'invitation_sent') {
      res.status(400).json({
        success: false,
        error: `当前状态不允许确认时间: ${application.status}`,
        currentStatus: application.status,
      });
      return;
    }

    // 6. 可选验证: 邮箱匹配
    if (candidateEmail && application.email !== candidateEmail) {
      res.status(403).json({
        success: false,
        error: '邮箱验证失败',
      });
      return;
    }

    // 7. 准备上下文数据
    const ctx = {
      applicationId,
      candidateName: application.name,
      candidateEmail: application.email,
      jobTitle: application.job_title,
      jobType: application.job_type || 'normal',
      interviewLang: 'normal',
    };

    // 8. 调用钩子创建面试房间
    const result = await onConfirmTimeCreateRoom(ctx, scheduledTime);

    if (!result.success) {
      res.status(500).json({
        success: false,
        error: result.error || '创建面试房间失败',
      });
      return;
    }

    // 9. 返回成功结果
    res.json({
      success: true,
      roomId: result.roomId,
      interviewLink: result.interviewLink,
      scheduledTime,
      candidateName: application.candidate_name,
      jobTitle: application.job_title,
    });

  } catch (error) {
    console.error('[Interview] Time confirm error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '服务器内部错误',
    });
  }
});

/**
 * GET /api/interview/time-select/:applicationId
 * 获取时间选择页面所需数据
 *
 * 返回:
 * {
 *   success: boolean,
 *   application?: {
 *     id: number,
 *     candidateName: string,
 *     jobTitle: string,
 *     status: string,
 *     invitationSentAt: string,
 *     availableSlots: string[]
 *   }
 * }
 */
router.get('/time-select/:applicationId', (req: Request, res: Response): void => {
  try {
    const { applicationId } = req.params;
    const id = parseInt(applicationId, 10);

    if (!id) {
      res.status(400).json({
        success: false,
        error: '无效的投递记录ID',
      });
      return;
    }

    // 查询投递记录
    const stmt = db.prepare(`
      SELECT a.*, j.title as job_title
      FROM applications a
      JOIN jobs j ON a.job_id = j.id
      WHERE a.id = ?
    `);
    stmt.bind([id]);
    stmt.step();
    const application = stmt.getAsObject() as any;
    stmt.free();

    if (!application) {
      res.status(404).json({
        success: false,
        error: '投递记录不存在',
      });
      return;
    }

    // 查询最近的面试邀请历史记录
    const historyStmt = db.prepare(`
      SELECT created_at
      FROM state_history
      WHERE entity_type = 'application'
        AND entity_id = ?
        AND event = 'send_invitation'
      ORDER BY created_at DESC
      LIMIT 1
    `);
    historyStmt.bind([id]);
    historyStmt.step();
    const history = historyStmt.getAsObject() as any;
    historyStmt.free();

    // 生成可用时段
    const availableSlots = generateAvailableSlots();

    res.json({
      success: true,
      application: {
        id: application.id,
        candidateName: application.name,
        jobTitle: application.job_title,
        status: application.status,
        invitationSentAt: history?.created_at || null,
        availableSlots,
      },
    });

  } catch (error) {
    console.error('[Interview] Get time-select data error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '服务器内部错误',
    });
  }
});

/**
 * GET /api/interview/rooms
 * 列出面试房间(管理员接口)
 *
 * 查询参数:
 * - status: 按状态筛选 (waiting | interviewing | paused | finished)
 */
router.get('/rooms', async (req: Request, res: Response): Promise<void> => {
  try {
    const { status } = req.query as { status?: 'waiting' | 'interviewing' | 'paused' | 'finished' };

    const rooms = await interviewerService.listRooms(status);

    res.json({
      success: true,
      rooms,
      total: rooms.length,
    });

  } catch (error) {
    console.error('[Interview] List rooms error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '获取房间列表失败',
    });
  }
});

/**
 * GET /api/interview/rooms/:roomId
 * 获取面试房间详情
 */
router.get('/rooms/:roomId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { roomId } = req.params;

    const room = await interviewerService.getRoom(roomId);

    res.json({
      success: true,
      room,
    });

  } catch (error) {
    console.error('[Interview] Get room error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '获取房间详情失败',
    });
  }
});

/**
 * GET /api/interview/rooms/:roomId/result
 * 获取面试评估结果
 */
router.get('/rooms/:roomId/result', async (req: Request, res: Response): Promise<void> => {
  try {
    const { roomId } = req.params;

    const result = await interviewerService.getResult(roomId);

    res.json({
      success: true,
      ...result,
    });

  } catch (error) {
    console.error('[Interview] Get result error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '获取面试结果失败',
    });
  }
});

/**
 * POST /api/interview/rooms/:roomId/start
 * 启动面试(管理员接口)
 */
router.post('/rooms/:roomId/start', async (req: Request, res: Response): Promise<void> => {
  try {
    const { roomId } = req.params;

    const result = await interviewerService.startInterview(roomId);

    res.json({
      success: true,
      ...result,
    });

  } catch (error) {
    console.error('[Interview] Start room error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '启动面试失败',
    });
  }
});

/**
 * POST /api/interview/rooms/:roomId/end
 * 结束面试(管理员接口)
 */
router.post('/rooms/:roomId/end', async (req: Request, res: Response): Promise<void> => {
  try {
    const { roomId } = req.params;

    const result = await interviewerService.endInterview(roomId);

    res.json({
      success: true,
      ...result,
    });

  } catch (error) {
    console.error('[Interview] End room error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '结束面试失败',
    });
  }
});

// ========== 辅助函数 ==========

/**
 * 生成可用面试时段
 */
function generateAvailableSlots(): string[] {
  const slots: string[] = [];
  const now = new Date();

  // 生成未来7天的可用时段(每天9:00-18:00，每2小时一个时段)
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

export default router;
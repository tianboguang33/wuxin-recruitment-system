/**
 * 面试机器人交互服务层
 * 封装面试机器人 (interviewer-agent) 的MCP调用逻辑
 *
 * 职责:
 * 1. 提供hr-boot调用面试机器人的标准化接口
 * 2. 处理面试房间的创建、启动、结束
 * 3. 获取面试评分结果
 * 4. 管理岗位题库
 */

import axios from 'axios';

// 面试机器人API配置
const INTERVIEWER_API_BASE = process.env.INTERVIEWER_API_BASE || 'http://localhost:8080';

// 类型定义
export interface InterviewRoom {
  room_id: string;
  name: string;
  candidate_name: string;
  job_title: string;
  job_type: string;
  interview_lang: 'normal' | 'international';
  status: 'waiting' | 'interviewing' | 'paused' | 'finished';
  scheduled_time?: string;
  interview_link: string;
  created_at: string;
}

export interface InterviewResult {
  finished: boolean;
  status: string;
  report?: {
    candidate: {
      name: string;
    };
    job: {
      title: string;
      type: string;
    };
    interview: {
      duration: string;
      language: string;
    };
    score: {
      total: number;
      technicalScore?: string;
      languageScore?: string;
      experienceScore?: string;
      strengths?: string;
      weaknesses?: string;
      summary?: string;
      advice?: string;
    };
  };
}

export interface JobConfig {
  job_type: string;
  name: string;
  desc?: string;
  lang: 'normal' | 'international';
  questions_cn?: string[];
  questions_en?: string[];
}

/**
 * 面试机器人服务类
 */
export class InterviewerService {
  private apiBase: string;
  private timeout: number;

  constructor(apiBase?: string, timeout = 15000) {
    this.apiBase = apiBase || INTERVIEWER_API_BASE;
    this.timeout = timeout;
  }

  /**
   * 创建面试房间
   * 对应 MCP 工具: prepare_interview
   *
   * @param params 房间创建参数
   * @returns 房间信息(包含room_id和interview_link)
   */
  async createRoom(params: {
    candidateName: string;
    jobTitle: string;
    jobType: string;
    jobDesc?: string;
    interviewLang?: 'normal' | 'international';
    scheduledTime?: string;
    questions?: string[];
  }): Promise<InterviewRoom> {
    const payload = {
      name: `${params.candidateName}的面试`,
      candidateName: params.candidateName,
      jobTitle: params.jobTitle,
      jobType: params.jobType,
      jobDesc: params.jobDesc || '',
      interviewLang: params.interviewLang || 'normal',
      scheduledTime: params.scheduledTime,
      questions: params.questions,
    };

    const response = await axios.post(
      `${this.apiBase}/api/mcp/rooms`,
      payload,
      {
        timeout: this.timeout,
        headers: { 'Content-Type': 'application/json' },
      }
    );

    return response.data;
  }

  /**
   * 启动面试
   * 在面试时间前5分钟调用
   *
   * @param roomId 房间ID
   * @returns 启动结果
   */
  async startInterview(roomId: string): Promise<{ status: string }> {
    const response = await axios.post(
      `${this.apiBase}/api/mcp/rooms/${roomId}/start`,
      {},
      { timeout: this.timeout }
    );

    return response.data;
  }

  /**
   * 结束面试
   * 手动结束面试(用于测试或特殊情况)
   *
   * @param roomId 房间ID
   * @returns 结束结果
   */
  async endInterview(roomId: string): Promise<{ status: string }> {
    const response = await axios.post(
      `${this.apiBase}/api/mcp/rooms/${roomId}/end`,
      {},
      { timeout: this.timeout }
    );

    return response.data;
  }

  /**
   * 获取面试结果
   * 对应 MCP 工具: interview_result
   *
   * @param roomId 房间ID
   * @returns 面试评分结果
   */
  async getResult(roomId: string): Promise<InterviewResult> {
    const response = await axios.get(
      `${this.apiBase}/api/mcp/rooms/${roomId}/result`,
      { timeout: this.timeout }
    );

    return response.data;
  }

  /**
   * 获取房间信息
   *
   * @param roomId 房间ID
   * @returns 房间详情
   */
  async getRoom(roomId: string): Promise<InterviewRoom> {
    const response = await axios.get(
      `${this.apiBase}/api/mcp/rooms/${roomId}`,
      { timeout: this.timeout }
    );

    return response.data;
  }

  /**
   * 列出所有面试房间
   * 对应 MCP 工具: list_interviews
   *
   * @param status 按状态筛选(可选)
   * @returns 房间列表
   */
  async listRooms(status?: 'waiting' | 'interviewing' | 'paused' | 'finished'): Promise<InterviewRoom[]> {
    const response = await axios.get(
      `${this.apiBase}/api/mcp/rooms`,
      {
        timeout: this.timeout,
        params: status ? { status } : undefined,
      }
    );

    return response.data.rooms || [];
  }

  /**
   * 添加/更新岗位
   * 对应 MCP 工具: add_job
   *
   * @param job 岗位配置
   * @returns 操作结果
   */
  async addJob(job: JobConfig): Promise<{
    status: 'created' | 'updated';
    job_type: string;
    name: string;
    question_cn_count: number;
    question_en_count: number;
  }> {
    const response = await axios.post(
      `${this.apiBase}/api/mcp/jobs`,
      job,
      {
        timeout: this.timeout,
        headers: { 'Content-Type': 'application/json' },
      }
    );

    return response.data;
  }

  /**
   * 删除岗位
   * 对应 MCP 工具: delete_job
   *
   * @param jobType 岗位类型标识
   * @returns 操作结果
   */
  async deleteJob(jobType: string): Promise<{ status: string }> {
    const response = await axios.delete(
      `${this.apiBase}/api/mcp/jobs/${jobType}`,
      { timeout: this.timeout }
    );

    return response.data;
  }

  /**
   * 列出所有岗位
   * 对应 MCP 工具: list_jobs
   *
   * @returns 岗位列表
   */
  async listJobs(): Promise<JobConfig[]> {
    const response = await axios.get(
      `${this.apiBase}/api/mcp/jobs`,
      { timeout: this.timeout }
    );

    return response.data.jobs || [];
  }

  /**
   * 获取隧道URL(用于外部访问)
   *
   * @returns 隧道URL
   */
  async getTunnelUrl(): Promise<{ tunnel_url: string | null }> {
    const response = await axios.get(
      `${this.apiBase}/api/mcp/tunnel`,
      { timeout: this.timeout }
    );

    return response.data;
  }

  /**
   * 检查面试是否已完成
   *
   * @param roomId 房间ID
   * @returns 是否已完成
   */
  async isInterviewFinished(roomId: string): Promise<boolean> {
    const room = await this.getRoom(roomId);
    return room.status === 'finished';
  }

  /**
   * 等待面试完成并获取结果
   * 用于轮询等待面试结束
   *
   * @param roomId 房间ID
   * @param maxWaitMinutes 最大等待时间(分钟)
   * @param pollIntervalSeconds 轮询间隔(秒)
   * @returns 面试结果
   */
  async waitForResult(
    roomId: string,
    maxWaitMinutes = 60,
    pollIntervalSeconds = 30
  ): Promise<InterviewResult> {
    const maxWaitMs = maxWaitMinutes * 60 * 1000;
    const pollIntervalMs = pollIntervalSeconds * 1000;
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitMs) {
      const result = await this.getResult(roomId);

      if (result.finished && result.report?.score) {
        return result;
      }

      // 等待下一次轮询
      await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
    }

    throw new Error(`Interview not finished within ${maxWaitMinutes} minutes`);
  }
}

// 导出默认实例
export const interviewerService = new InterviewerService();

// 导出工厂函数(用于自定义配置)
export function createInterviewerService(apiBase?: string, timeout?: number): InterviewerService {
  return new InterviewerService(apiBase, timeout);
}

export default interviewerService;
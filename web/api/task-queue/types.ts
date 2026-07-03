export type TaskType = 'screen' | 'invite' | 'schedule_interview' | 'start_interview' | 'evaluate' | 'notify' | 'db_maintain';

export interface Task {
  id: number;
  task_type: TaskType;
  application_id: number;
  job_id?: number;
  priority: number;
  claimed_by?: string;
  claimed_at?: string;
  created_at: string;
}

export interface ITaskQueue {
  push(task: Omit<Task, 'id' | 'created_at'>): Promise<number>;
  
  claim(taskType: TaskType, agentName: string): Promise<Task | null>;
  
  complete(taskId: number): Promise<void>;
  
  listPending(taskType?: TaskType): Promise<Task[]>;
  
  count(taskType?: TaskType): Promise<number>;
  
  removeByApplication(applicationId: number): Promise<void>;
}

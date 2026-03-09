export type ReminderType =
  | 'project_25'
  | 'project_50'
  | 'project_75'
  | 'project_deadline'
  | 'project_overdue'
  | 'task_25'
  | 'task_50'
  | 'task_75'
  | 'task_deadline'
  | 'task_overdue';

export interface ReminderJobPayload {
  studentId: string;
  projectId?: string;
  taskId?: string;
  itemType: 'project' | 'task';
  itemName: string;
  reminderType: ReminderType;
  reminderPercentage: number;
  deadlineDate: string;
  deadlineTime?: string;
  scheduledFor: string;
}

export const NOTIFICATION_QUEUE_NAME = 'projects-tasks-notifications';

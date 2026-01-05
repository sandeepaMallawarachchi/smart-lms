import mongoose, { Schema, Document } from 'mongoose';

interface ITaskProgress {
  mainTaskId?: string;
  mainTaskTitle?: string;
  subtasks?: Array<{
    id: string;
    title: string;
    completed: boolean;
  }>;
  completed: boolean;
  totalTasks?: number;
  completedCount?: number;
}

export interface INotification extends Document {
  studentId: string;
  projectId?: string;
  taskId?: string;
  type: 'project_reminder' | 'task_reminder' | 'deadline_warning' | 'overdue' | 'progress_update';
  reminderPercentage?: number;
  title: string;
  message: string;
  description: string;
  taskProgress?: ITaskProgress[];
  isRead: boolean;
  isSent: boolean;
  sentAt?: Date;
  scheduledFor: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface IScheduledReminder extends Document {
  studentId: string;
  projectId?: string;
  taskId?: string;
  reminderType: 'project_25' | 'project_50' | 'project_75' | 'project_deadline' | 'task_25' | 'task_50' | 'task_75' | 'task_deadline';
  reminderPercentage: number;
  deadlineDate: Date;
  isProcessed: boolean;
  scheduledFor: Date;
  createdAt: Date;
  updatedAt: Date;
}

const taskProgressSchema = new Schema(
  {
    mainTaskId: String,
    mainTaskTitle: String,
    subtasks: [
      {
        id: String,
        title: String,
        completed: { type: Boolean, default: false },
      },
    ],
    completed: { type: Boolean, default: false },
    totalTasks: Number,
    completedCount: Number,
  },
  { _id: false }
);

const notificationSchema = new Schema<INotification>(
  {
    studentId: {
      type: String,
      required: true,
      index: true,
    },
    projectId: {
      type: String,
      index: true,
    },
    taskId: {
      type: String,
      index: true,
    },
    type: {
      type: String,
      enum: ['project_reminder', 'task_reminder', 'deadline_warning', 'overdue', 'progress_update'],
      required: true,
    },
    reminderPercentage: Number,
    title: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    taskProgress: [taskProgressSchema],
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
    isSent: {
      type: Boolean,
      default: false,
    },
    sentAt: Date,
    scheduledFor: {
      type: Date,
      required: true,
      index: true,
    },
  },
  { timestamps: true }
);

const scheduledReminderSchema = new Schema<IScheduledReminder>(
  {
    studentId: {
      type: String,
      required: true,
      index: true,
    },
    projectId: {
      type: String,
      index: true,
    },
    taskId: {
      type: String,
      index: true,
    },
    reminderType: {
      type: String,
      enum: ['project_25', 'project_50', 'project_75', 'project_deadline', 'task_25', 'task_50', 'task_75', 'task_deadline'],
      required: true,
    },
    reminderPercentage: {
      type: Number,
      required: true,
    },
    deadlineDate: {
      type: Date,
      required: true,
    },
    isProcessed: {
      type: Boolean,
      default: false,
      index: true,
    },
    scheduledFor: {
      type: Date,
      required: true,
      index: true,
    },
  },
  { timestamps: true }
);

export const Notification =
  mongoose.models.Notification || mongoose.model<INotification>('Notification', notificationSchema);
export const ScheduledReminder =
  mongoose.models.ScheduledReminder || mongoose.model<IScheduledReminder>('ScheduledReminder', scheduledReminderSchema);
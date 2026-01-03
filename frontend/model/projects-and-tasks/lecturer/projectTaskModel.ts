// /models/projects-and-tasks/lecturer/projectTaskModel.ts

import mongoose, { Schema, Document } from 'mongoose';

// Subtask interface
interface ISubtask {
  id: string;
  title: string;
  description?: string;
}

// Main Task interface (with nested subtasks)
interface IMainTask {
  id: string;
  title: string;
  description?: string;
  subtasks?: ISubtask[];
}

// Project Model
export interface IProject extends Document {
  courseId: string;
  lecturerId: string;
  projectName: string;
  description: { html: string; text: string };
  projectType: 'group' | 'individual';
  deadlineDate: string;
  deadlineTime: string;
  specialNotes?: { html: string; text: string };
  templateDocuments: Array<{ url: string; name: string; fileSize: number }>;
  otherDocuments: Array<{ url: string; name: string; fileSize: number }>;
  images: Array<{ url: string; name: string; fileSize: number }>;
  mainTasks: IMainTask[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ITask extends Document {
  courseId: string;
  lecturerId: string;
  taskName: string;
  description: { html: string; text: string };
  deadlineDate?: string;
  deadlineTime?: string;
  specialNotes?: { html: string; text: string };
  templateDocuments: Array<{ url: string; name: string; fileSize: number }>;
  otherDocuments: Array<{ url: string; name: string; fileSize: number }>;
  images: Array<{ url: string; name: string; fileSize: number }>;
  subtasks: ISubtask[];
  createdAt: Date;
  updatedAt: Date;
}

// Subtask Schema (for reusability)
const subtaskSchema = new Schema<ISubtask>(
  {
    id: String,
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: [200, 'Subtask title cannot exceed 200 characters'],
    },
    description: String,
  },
  { _id: false }
);

// Main Task Schema (with nested subtasks)
const mainTaskSchema = new Schema<IMainTask>(
  {
    id: String,
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: [200, 'Main task title cannot exceed 200 characters'],
    },
    description: String,
    subtasks: [subtaskSchema],
  },
  { _id: false }
);

// Document Schema (for template, other, images)
const documentSchema = new Schema(
  {
    url: String,
    name: String,
    fileSize: Number,
  },
  { _id: false }
);

// Project Schema
const projectSchema = new Schema<IProject>(
  {
    courseId: {
      type: String,
      required: [true, 'Course ID is required'],
      index: true,
    },
    lecturerId: {
      type: String,
      required: [true, 'Lecturer ID is required'],
      index: true,
    },
    projectName: {
      type: String,
      required: [true, 'Project name is required'],
      trim: true,
      maxlength: [200, 'Project name cannot exceed 200 characters'],
    },
    description: {
      html: { type: String, default: '' },
      text: { type: String, default: '' },
    },
    projectType: {
      type: String,
      enum: ['group', 'individual'],
      required: [true, 'Project type is required'],
    },
    deadlineDate: {
      type: String,
      required: [true, 'Deadline date is required'],
    },
    deadlineTime: {
      type: String,
      default: '23:59',
    },
    specialNotes: {
      html: { type: String, default: '' },
      text: { type: String, default: '' },
    },
    templateDocuments: [documentSchema],
    otherDocuments: [documentSchema],
    images: [documentSchema],
    mainTasks: [mainTaskSchema],
  },
  { timestamps: true }
);

// Task Schema
const taskSchema = new Schema<ITask>(
  {
    courseId: {
      type: String,
      required: [true, 'Course ID is required'],
      index: true,
    },
    lecturerId: {
      type: String,
      required: [true, 'Lecturer ID is required'],
      index: true,
    },
    taskName: {
      type: String,
      required: [true, 'Task name is required'],
      trim: true,
      maxlength: [200, 'Task name cannot exceed 200 characters'],
    },
    description: {
      html: { type: String, default: '' },
      text: { type: String, default: '' },
    },
    deadlineDate: {
      type: String,
      default: '',
    },
    deadlineTime: {
      type: String,
      default: '23:59',
    },
    specialNotes: {
      html: { type: String, default: '' },
      text: { type: String, default: '' },
    },
    templateDocuments: [documentSchema],
    otherDocuments: [documentSchema],
    images: [documentSchema],
    subtasks: [subtaskSchema],
  },
  { timestamps: true }
);

// Create or get models
export const Project =
  mongoose.models.Project || mongoose.model<IProject>('Project', projectSchema);
export const Task = mongoose.models.Task || mongoose.model<ITask>('Task', taskSchema);
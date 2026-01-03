// /models/projects-and-tasks/lecturer/projectTaskModel.ts

import mongoose, { Schema, Document } from 'mongoose';

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
  mainTasks: Array<{
    id: string;
    title: string;
    description?: string;
    subtasks?: Array<{
      id: string;
      title: string;
      description?: string;
    }>;
  }>;
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
  subtasks: Array<{
    id: string;
    title: string;
    description?: string;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

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
    templateDocuments: [
      {
        url: String,
        name: String,
        fileSize: Number,
      },
    ],
    otherDocuments: [
      {
        url: String,
        name: String,
        fileSize: Number,
      },
    ],
    images: [
      {
        url: String,
        name: String,
        fileSize: Number,
      },
    ],
    mainTasks: [
      {
        id: String,
        title: String,
        description: String,
        subtasks: [
          {
            id: String,
            title: String,
            description: String,
          },
        ],
      },
    ],
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
    templateDocuments: [
      {
        url: String,
        name: String,
        fileSize: Number,
      },
    ],
    otherDocuments: [
      {
        url: String,
        name: String,
        fileSize: Number,
      },
    ],
    images: [
      {
        url: String,
        name: String,
        fileSize: Number,
      },
    ],
    subtasks: [
      {
        id: String,
        title: String,
        description: String,
      },
    ],
  },
  { timestamps: true }
);

// Create or get models
export const Project =
  mongoose.models.Project || mongoose.model<IProject>('Project', projectSchema);
export const Task = mongoose.models.Task || mongoose.model<ITask>('Task', taskSchema);
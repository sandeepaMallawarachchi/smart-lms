// /model/projects-and-tasks/lecturer/TaskTemplate.ts

import mongoose, { Schema, Document } from 'mongoose';

interface RichTextContent {
  html: string;
  text: string;
}

interface Subtask {
  order: number;
  title: string;
  description: string;
}

export interface ITaskTemplate extends Document {
  course: mongoose.Types.ObjectId;
  lecturer: mongoose.Types.ObjectId;
  
  // Basic Info
  taskName: string;
  description: RichTextContent;
  
  // Template Details
  specialNotes: RichTextContent;
  notifications: {
    order: number;
    message: string;
    scheduledFor?: Date;
  }[];
  
  // Media & Documents
  images: string[]; // S3 URLs
  documents: {
    order: number;
    name: string;
    url: string; // S3 URL
    type: 'document' | 'template';
  }[];
  
  // Deadline & Marking
  deadlineDate: Date;
  deadlineTime: string; // HH:mm format
  markingDescription: RichTextContent;
  totalMarks?: number;
  
  // Subtasks Only (no main tasks)
  subtasks: Subtask[];
  
  // Metadata
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const RichTextSchema = new Schema(
  {
    html: { type: String, default: '' },
    text: { type: String, default: '' },
  },
  { _id: false }
);

const SubtaskSchema = new Schema(
  {
    order: { type: Number, required: true },
    title: { type: String, required: true },
    description: { type: String, default: '' },
  },
  { _id: false }
);

const TaskTemplateSchema = new Schema<ITaskTemplate>(
  {
    course: {
      type: Schema.Types.ObjectId,
      ref: 'Course',
      required: true,
      index: true,
    },
    lecturer: {
      type: Schema.Types.ObjectId,
      ref: 'Lecturer',
      required: true,
      index: true,
    },
    
    // Basic Info
    taskName: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: RichTextSchema,
      default: { html: '', text: '' },
    },
    
    // Template Details
    specialNotes: {
      type: RichTextSchema,
      default: { html: '', text: '' },
    },
    notifications: [
      {
        order: { type: Number, required: true },
        message: { type: String, required: true },
        scheduledFor: { type: Date },
      },
    ],
    
    // Media & Documents
    images: [
      {
        type: String,
      },
    ],
    documents: [
      {
        order: { type: Number, required: true },
        name: { type: String, required: true },
        url: { type: String, required: true },
        type: {
          type: String,
          enum: ['document', 'template'],
          default: 'document',
        },
      },
    ],
    
    // Deadline & Marking
    deadlineDate: {
      type: Date,
      required: true,
    },
    deadlineTime: {
      type: String,
      default: '23:59', // HH:mm format
    },
    markingDescription: {
      type: RichTextSchema,
      default: { html: '', text: '' },
    },
    totalMarks: {
      type: Number,
      min: 0,
      max: 1000,
    },
    
    // Subtasks Only
    subtasks: {
      type: [SubtaskSchema],
      default: [],
    },
    
    // Metadata
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient queries
TaskTemplateSchema.index({ course: 1, lecturer: 1 });
TaskTemplateSchema.index({ course: 1, isActive: 1 });
TaskTemplateSchema.index({ createdAt: -1 });

export default mongoose.models.TaskTemplate ||
  mongoose.model<ITaskTemplate>('TaskTemplate', TaskTemplateSchema);
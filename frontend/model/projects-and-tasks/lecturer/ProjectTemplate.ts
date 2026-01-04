// /model/projects-and-tasks/lecturer/ProjectTemplate.ts

import mongoose, { Schema, Document } from 'mongoose';

interface RichTextContent {
  html: string;
  text: string;
}

interface MainTask {
  order: number;
  title: string;
  description: RichTextContent;
  subtasks: {
    order: number;
    title: string;
    description: string;
  }[];
}

export interface IProjectTemplate extends Document {
  course: mongoose.Types.ObjectId;
  lecturer: mongoose.Types.ObjectId;
  
  // Basic Info
  projectName: string;
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
  
  // Tasks
  mainTasks: MainTask[];
  isSingleTaskTemplate: boolean;
  subtasks: {
    order: number;
    title: string;
    description: string;
  }[];
  
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

const MainTaskSchema = new Schema(
  {
    order: { type: Number, required: true },
    title: { type: String, required: true },
    description: RichTextSchema,
    subtasks: [
      {
        order: { type: Number, required: true },
        title: { type: String, required: true },
        description: { type: String, default: '' },
      },
    ],
  },
  { _id: false }
);

const ProjectTemplateSchema = new Schema<IProjectTemplate>(
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
    projectName: {
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
    
    // Tasks
    mainTasks: {
      type: [MainTaskSchema],
      default: [],
    },
    isSingleTaskTemplate: {
      type: Boolean,
      default: false,
    },
    subtasks: [
      {
        order: { type: Number, required: true },
        title: { type: String, required: true },
        description: { type: String, default: '' },
      },
    ],
    
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
ProjectTemplateSchema.index({ course: 1, lecturer: 1 });
ProjectTemplateSchema.index({ course: 1, isActive: 1 });
ProjectTemplateSchema.index({ createdAt: -1 });

export default mongoose.models.ProjectTemplate ||
  mongoose.model<IProjectTemplate>('ProjectTemplate', ProjectTemplateSchema);
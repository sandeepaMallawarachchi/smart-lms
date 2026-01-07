import mongoose, { Schema, Document } from 'mongoose';

interface ISubtask {
  id: string;
  title: string;
  description?: string;
  completed?: boolean;
}

interface IMainTask {
  id: string;
  title: string;
  description?: string;
  subtasks?: ISubtask[];
  completed?: boolean;
}

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

export interface IStudentProjectProgress extends Document {
  studentId: string;
  projectId: string;
  status: 'todo' | 'inprogress' | 'done';
  mainTasks: IMainTask[];
  createdAt: Date;
  updatedAt: Date;
}

export interface IStudentTaskProgress extends Document {
  studentId: string;
  taskId: string;
  status: 'todo' | 'inprogress' | 'done';
  subtasks: ISubtask[];
  createdAt: Date;
  updatedAt: Date;
}

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
    completed: {
      type: Boolean,
      default: false,
    },
  },
  { _id: false }
);

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
    completed: {
      type: Boolean,
      default: false,
    },
  },
  { _id: false }
);

const documentSchema = new Schema(
  {
    url: String,
    name: String,
    fileSize: Number,
  },
  { _id: false }
);

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

const studentProjectProgressSchema = new Schema<IStudentProjectProgress>(
  {
    studentId: {
      type: String,
      required: true,
      index: true,
    },
    projectId: {
      type: String,
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['todo', 'inprogress', 'done'],
      default: 'todo',
    },
    mainTasks: [mainTaskSchema],
  },
  { timestamps: true }
);

const studentTaskProgressSchema = new Schema<IStudentTaskProgress>(
  {
    studentId: {
      type: String,
      required: true,
      index: true,
    },
    taskId: {
      type: String,
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['todo', 'inprogress', 'done'],
      default: 'todo',
    },
    subtasks: [subtaskSchema],
  },
  { timestamps: true }
);

export const Project =
  mongoose.models.Project || mongoose.model<IProject>('Project', projectSchema);
export const Task = mongoose.models.Task || mongoose.model<ITask>('Task', taskSchema);
export const StudentProjectProgress =
  mongoose.models.StudentProjectProgress || mongoose.model<IStudentProjectProgress>('StudentProjectProgress', studentProjectProgressSchema);
export const StudentTaskProgress =
  mongoose.models.StudentTaskProgress || mongoose.model<IStudentTaskProgress>('StudentTaskProgress', studentTaskProgressSchema);
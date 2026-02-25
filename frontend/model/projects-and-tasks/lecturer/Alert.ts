import mongoose, { Document, Schema } from 'mongoose';

export type AlertLevel = 'low' | 'medium' | 'high';
export type AlertTargetMode = 'student' | 'students' | 'group' | 'filter';
export type AlertFilterType = 'all_students' | 'at_risk' | 'low_activity';

export interface IAlert extends Document {
  courseId: string;
  lecturerId: string;
  level: AlertLevel;
  message: string;
  targetMode: AlertTargetMode;
  filterType?: AlertFilterType;
  groupId?: string;
  recipientStudentIds: string[];
  createdAt: Date;
  updatedAt: Date;
}

const alertSchema = new Schema<IAlert>(
  {
    courseId: {
      type: String,
      required: true,
      index: true,
    },
    lecturerId: {
      type: String,
      required: true,
      index: true,
    },
    level: {
      type: String,
      enum: ['low', 'medium', 'high'],
      required: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: [1000, 'Alert message cannot exceed 1000 characters'],
    },
    targetMode: {
      type: String,
      enum: ['student', 'students', 'group', 'filter'],
      required: true,
    },
    filterType: {
      type: String,
      enum: ['all_students', 'at_risk', 'low_activity'],
      default: undefined,
    },
    groupId: {
      type: String,
      default: undefined,
    },
    recipientStudentIds: [
      {
        type: String,
        required: true,
      },
    ],
  },
  { timestamps: true }
);

export default mongoose.models.ProjectTaskAlert ||
  mongoose.model<IAlert>('ProjectTaskAlert', alertSchema);

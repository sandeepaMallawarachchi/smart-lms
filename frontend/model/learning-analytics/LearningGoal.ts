import mongoose, { Schema, Document } from 'mongoose';

export interface ILearningGoal extends Document {
  studentId: mongoose.Types.ObjectId;
  title: string;
  description: string;
  category: 'academic' | 'skill' | 'project' | 'career' | 'personal';
  targetDate: Date;
  priority: 'low' | 'medium' | 'high';
  status: 'active' | 'completed' | 'overdue' | 'cancelled';
  progress: number;
  milestones: Array<{
    id: string;
    title: string;
    completed: boolean;
    completedAt?: Date;
  }>;
  tags: string[];
  courseId?: mongoose.Types.ObjectId;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const LearningGoalSchema: Schema<ILearningGoal> = new Schema(
  {
    studentId: {
      type: Schema.Types.ObjectId,
      ref: 'Student',
      required: [true, 'Student ID is required'],
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Goal title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    description: {
      type: String,
      required: [true, 'Goal description is required'],
      trim: true,
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      enum: ['academic', 'skill', 'project', 'career', 'personal'],
      default: 'academic',
    },
    targetDate: {
      type: Date,
      required: [true, 'Target date is required'],
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium',
    },
    status: {
      type: String,
      enum: ['active', 'completed', 'overdue', 'cancelled'],
      default: 'active',
      index: true,
    },
    progress: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    milestones: [
      {
        id: { type: String, required: true },
        title: { type: String, required: true, maxlength: 200 },
        completed: { type: Boolean, default: false },
        completedAt: { type: Date },
      },
    ],
    tags: [
      {
        type: String,
        trim: true,
        maxlength: 50,
      },
    ],
    courseId: {
      type: Schema.Types.ObjectId,
      ref: 'Course',
    },
    completedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
    collection: 'learninggoals',
  }
);

LearningGoalSchema.index({ studentId: 1, status: 1 });
LearningGoalSchema.index({ studentId: 1, targetDate: 1 });
LearningGoalSchema.index({ studentId: 1, category: 1 });

LearningGoalSchema.pre('save', function () {
  if (this.progress === 100 && this.status !== 'completed' && this.status !== 'cancelled') {
    this.status = 'completed';
    this.completedAt = new Date();
  }

  if (
    this.targetDate < new Date() &&
    this.status === 'active' &&
    this.progress < 100
  ) {
    this.status = 'overdue';
  }
});

export default mongoose.models.LearningGoal ||
  mongoose.model<ILearningGoal>('LearningGoal', LearningGoalSchema);
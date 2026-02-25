import mongoose, { Document, Schema } from 'mongoose';

export interface ICourseGroup extends Document {
  courseId: string;
  groupName: string;
  studentIds: string[];
  createdBy: string;
  isArchived: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const courseGroupSchema = new Schema<ICourseGroup>(
  {
    courseId: {
      type: String,
      required: [true, 'Course ID is required'],
      index: true,
      trim: true,
    },
    groupName: {
      type: String,
      required: [true, 'Group name is required'],
      trim: true,
      maxlength: [80, 'Group name cannot exceed 80 characters'],
    },
    studentIds: [
      {
        type: String,
        required: true,
        trim: true,
      },
    ],
    createdBy: {
      type: String,
      required: [true, 'Creator ID is required'],
      trim: true,
    },
    isArchived: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  { timestamps: true }
);

courseGroupSchema.index({ courseId: 1, groupName: 1 }, { unique: true });

export default mongoose.models.CourseGroup ||
  mongoose.model<ICourseGroup>('CourseGroup', courseGroupSchema);

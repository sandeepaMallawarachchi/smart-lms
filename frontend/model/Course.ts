import mongoose, { Document, Schema } from 'mongoose';

export interface ICourse extends Document {
  courseName: string;
  credits: number;
  year: number;
  semester: number;
  lecturerInCharge: mongoose.Types.ObjectId;
  lecturers: mongoose.Types.ObjectId[];
  isArchived: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const courseSchema = new Schema<ICourse>(
  {
    courseName: {
      type: String,
      required: true,
      trim: true,
    },
    credits: {
      type: Number,
      required: true,
      min: 1,
      max: 10,
    },
    year: {
      type: Number,
      required: true,
      min: 1,
      max: 4,
    },
    semester: {
      type: Number,
      required: true,
      enum: [1, 2],
    },
    lecturerInCharge: {
      type: Schema.Types.ObjectId,
      ref: 'Lecturer',
      required: true,
    },
    lecturers: [{
      type: Schema.Types.ObjectId,
      ref: 'Lecturer',
    }],
    isArchived: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.Course || mongoose.model<ICourse>('Course', courseSchema);
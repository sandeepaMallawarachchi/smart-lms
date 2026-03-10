import mongoose, { Schema, Document } from 'mongoose';

export interface ISubmissionNotification extends Document {
  studentId: string;
  submissionId: string;
  type: 'grade_submitted' | 'annotation_added' | 'feedback_updated';
  title: string;
  message: string;
  /** Optional link for the student to navigate to */
  link: string;
  isRead: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const submissionNotificationSchema = new Schema<ISubmissionNotification>(
  {
    studentId: { type: String, required: true, index: true },
    submissionId: { type: String, required: true, index: true },
    type: {
      type: String,
      enum: ['grade_submitted', 'annotation_added', 'feedback_updated'],
      required: true,
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    link: { type: String, required: true },
    isRead: { type: Boolean, default: false, index: true },
  },
  { timestamps: true },
);

submissionNotificationSchema.index({ studentId: 1, isRead: 1 });

export default mongoose.models.SubmissionNotification ??
  mongoose.model<ISubmissionNotification>('SubmissionNotification', submissionNotificationSchema);

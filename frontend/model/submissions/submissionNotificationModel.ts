import mongoose, { Schema, Document } from 'mongoose';

export interface ISubmissionNotification extends Document {
  recipientId: string;
  submissionId: string;
  type: 'grade_submitted' | 'annotation_added' | 'feedback_updated' | 'submission_submitted';
  title: string;
  message: string;
  link: string;
  isRead: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const submissionNotificationSchema = new Schema<ISubmissionNotification>(
  {
    recipientId: { type: String, required: true, index: true },
    submissionId: { type: String, required: true, index: true },
    type: {
      type: String,
      enum: ['grade_submitted', 'annotation_added', 'feedback_updated', 'submission_submitted'],
      required: true,
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    link: { type: String, required: true },
    isRead: { type: Boolean, default: false, index: true },
  },
  { timestamps: true },
);

submissionNotificationSchema.index({ recipientId: 1, isRead: 1 });

export default mongoose.models.SubmissionNotification ??
  mongoose.model<ISubmissionNotification>('SubmissionNotification', submissionNotificationSchema);

import mongoose, { Schema, Document } from 'mongoose';

export interface IAnnotation extends Document {
  submissionId: string;
  versionId: string;
  questionId: string;
  lecturerId: string;
  start: number;
  end: number;
  selectedText: string;
  comment: string;
  createdAt: Date;
  updatedAt: Date;
}

const annotationSchema = new Schema<IAnnotation>(
  {
    submissionId: { type: String, required: true, index: true },
    versionId: { type: String, required: true, index: true },
    questionId: { type: String, required: true, index: true },
    lecturerId: { type: String, required: true },
    start: { type: Number, required: true },
    end: { type: Number, required: true },
    selectedText: { type: String, required: true },
    comment: { type: String, required: true },
  },
  { timestamps: true },
);

annotationSchema.index({ versionId: 1, questionId: 1 });

export default mongoose.models.LecturerAnnotation ??
  mongoose.model<IAnnotation>('LecturerAnnotation', annotationSchema);

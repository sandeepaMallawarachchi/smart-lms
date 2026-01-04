import mongoose, { Schema, Document } from 'mongoose';

export interface IPrediction extends Document {
  studentId: mongoose.Types.ObjectId;
  studentIdNumber: string;
  
  // Input Features
  inputData: {
    total_clicks: number;
    avg_clicks_per_day: number;
    clicks_std: number;
    max_clicks_single_day: number;
    days_active: number;
    study_span_days: number;
    engagement_regularity: number;
    pre_course_clicks: number;
    avg_score: number;
    score_std: number;
    min_score: number;
    max_score: number;
    completion_rate: number;
    first_score: number;
    score_improvement: number;
    avg_days_early: number;
    timing_consistency: number;
    worst_delay: number;
    late_submission_count: number;
    num_of_prev_attempts: number;
    studied_credits: number;
    early_registration: number;
    withdrew: number;
    gender: string;
    age_band: string;
    highest_education: string;
    disability: string;
  };
  
  // Prediction Results
  prediction: {
    at_risk: boolean;
    confidence: number;
    risk_level: string;
    risk_probability: number;
    risk_factors: string[];
  };
  
  // Recommendations
  recommendations: {
    explanation: string;
    motivation: string;
    action_steps: string[];
    model: string;
    source: string;
    generated_at: string;
  };
  
  // Metadata
  apiTimestamp: string;
  semester: string;
  academicYear: string;
  specialization: string;
  
  createdAt: Date;
  updatedAt: Date;
}

const PredictionSchema: Schema<IPrediction> = new Schema(
  {
    studentId: {
      type: Schema.Types.ObjectId,
      ref: 'Student',
      required: [true, 'Student ID is required'],
      index: true,
    },
    studentIdNumber: {
      type: String,
      required: [true, 'Student ID number is required'],
      index: true,
    },
    inputData: {
      total_clicks: { type: Number, required: true },
      avg_clicks_per_day: { type: Number, required: true },
      clicks_std: { type: Number, required: true },
      max_clicks_single_day: { type: Number, required: true },
      days_active: { type: Number, required: true },
      study_span_days: { type: Number, required: true },
      engagement_regularity: { type: Number, required: true },
      pre_course_clicks: { type: Number, required: true },
      avg_score: { type: Number, required: true },
      score_std: { type: Number, required: true },
      min_score: { type: Number, required: true },
      max_score: { type: Number, required: true },
      completion_rate: { type: Number, required: true },
      first_score: { type: Number, required: true },
      score_improvement: { type: Number, required: true },
      avg_days_early: { type: Number, required: true },
      timing_consistency: { type: Number, required: true },
      worst_delay: { type: Number, required: true },
      late_submission_count: { type: Number, required: true },
      num_of_prev_attempts: { type: Number, required: true },
      studied_credits: { type: Number, required: true },
      early_registration: { type: Number, required: true },
      withdrew: { type: Number, required: true },
      gender: { type: String, required: true },
      age_band: { type: String, required: true },
      highest_education: { type: String, required: true },
      disability: { type: String, required: true },
    },
    prediction: {
      at_risk: { type: Boolean, required: true },
      confidence: { type: Number, required: true },
      risk_level: { 
        type: String, 
        required: true,
        enum: ['low', 'medium', 'high'],
      },
      risk_probability: { type: Number, required: true },
      risk_factors: [{ type: String }],
    },
    recommendations: {
      explanation: { type: String, required: true },
      motivation: { type: String, required: true },
      action_steps: [{ type: String, required: true }],
      model: { type: String, required: true },
      source: { type: String, required: true },
      generated_at: { type: String, required: true },
    },
    apiTimestamp: {
      type: String,
      required: true,
    },
    semester: {
      type: String,
      required: true,
    },
    academicYear: {
      type: String,
      required: true,
    },
    specialization: {
      type: String,
      required: true,
    },
  },
  { 
    timestamps: true,
    collection: 'predictions',
  }
);

// Index for efficient queries
PredictionSchema.index({ studentId: 1, createdAt: -1 });
PredictionSchema.index({ studentIdNumber: 1, createdAt: -1 });
PredictionSchema.index({ 'prediction.risk_level': 1 });
PredictionSchema.index({ 'prediction.at_risk': 1 });

export default mongoose.models.Prediction || mongoose.model<IPrediction>('Prediction', PredictionSchema);
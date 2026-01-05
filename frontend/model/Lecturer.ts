import mongoose, { Schema, Document } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface ILecturer extends Document {
  name: string;
  email: string;
  password: string;
  gender: 'male' | 'female' | 'other';
  dateOfBirth: Date;
  position: 'lecture' | 'instructure' | 'lic';
  userRole: 'lecture';
  isVerified: boolean;
  verificationToken?: string;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(password: string): Promise<boolean>;
}

const LecturerSchema: Schema<ILecturer> = new Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide a lecturer name'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [50, 'Name cannot exceed 50 characters'],
    },
    email: {
      type: String,
      required: [true, 'Please provide an email'],
      unique: true,
      lowercase: true,
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        'Please provide a valid email',
      ],
    },
    password: {
      type: String,
      required: [true, 'Please provide a password'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false,
    },
    gender: {
      type: String,
      enum: ['male', 'female', 'other'],
      required: [true, 'Please specify your gender'],
    },
    dateOfBirth: {
      type: Date,
      required: [true, 'Please provide your date of birth'],
    },
    position: {
      type: String,
      enum: ['lecture', 'instructure', 'lic'],
      required: [true, 'Please specify your position'],
    },
    userRole: {
      type: String,
      enum: ['lecture'],
      default: 'lecture',
    },
    isVerified: {
      type: Boolean,
      default: true,
    },
    verificationToken: {
      type: String,
      select: false,
    },
  },
  { timestamps: true }
);

// Hash password before saving
LecturerSchema.pre<ILecturer>('save', async function () {
  if (!this.isModified('password')) {
    return;
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Method to compare password
LecturerSchema.methods.comparePassword = async function (enteredPassword: string) {
  return await bcrypt.compare(enteredPassword, this.password);
};

export default mongoose.models.Lecturer || mongoose.model<ILecturer>('Lecturer', LecturerSchema);
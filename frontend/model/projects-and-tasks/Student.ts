import mongoose, { Schema, Document } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IStudent extends Document {
  studentIdNumber: string;
  name: string;
  email: string;
  password: string;
  gender: 'male' | 'female' | 'other';
  dateOfBirth: Date;
  address: string;
  nicNumber: string;
  userRole: 'student';
  isVerified: boolean;
  verificationToken?: string;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(password: string): Promise<boolean>;
}

const StudentSchema: Schema<IStudent> = new Schema(
  {
    studentIdNumber: {
      type: String,
      required: [true, 'Please provide a student ID number'],
      unique: true,
      lowercase: true,
      match: [/^[A-Za-z0-9]+$/, 'Student ID can only contain letters and numbers'],
    },
    name: {
      type: String,
      required: [true, 'Please provide a student name'],
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
    address: {
      type: String,
      required: [true, 'Please provide your address'],
      trim: true,
    },
    nicNumber: {
      type: String,
      required: [true, 'Please provide your NIC number'],
      unique: true,
      match: [/^[A-Za-z0-9]+$/, 'NIC number can only contain letters and numbers'],
    },
    userRole: {
      type: String,
      enum: ['student'],
      default: 'student',
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    verificationToken: {
      type: String,
      select: false,
    },
  },
  { timestamps: true }
);

// Hash password before saving
StudentSchema.pre<IStudent>('save', async function () {
  if (!this.isModified('password')) {
    return;
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Method to compare password
StudentSchema.methods.comparePassword = async function (enteredPassword: string) {
  return await bcrypt.compare(enteredPassword, this.password);
};

export default mongoose.models.Student || mongoose.model<IStudent>('Student', StudentSchema);
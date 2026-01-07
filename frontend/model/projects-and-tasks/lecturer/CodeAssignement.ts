import mongoose, { Schema, Document, Model } from 'mongoose'
import { Assignment, TestCase, Options } from '@/types/types' 

interface ICodeAssignment extends Omit<Assignment, 'testCases' | 'options'>, Document {
  projectType: string 
  options: Options
  testCases: TestCase[]
  createdAt: Date
  updatedAt: Date
}

const OptionsSchema = new Schema<Options>({
  autoComplete: { type: Boolean, default: false },
  externalCopyPaste: { type: Boolean, default: false },
  internalCopyPaste: { type: Boolean, default: true },
  analytics: { type: Boolean, default: true },
}, { _id: false }) 

const TestCaseSchema = new Schema<TestCase>({
  id: { type: Number, required: true }, 
  input: { type: String, required: true },
  expectedOutput: { type: String, required: true },
  isHidden: { type: Boolean, default: false },
}, { _id: false }) 

const CodeAssignmentSchema = new Schema<ICodeAssignment>(
  {
    courseId: { 
      type: String, 
      required: true,
      index: true 
    },
    lecturerId: { 
      type: String, 
      required: true,
      index: true 
    },
    projectType: { 
      type: String, 
      default: 'code',
      required: true 
    },
    language: { 
      type: String, 
      required: true 
    },
    question: { 
      type: String, 
      required: true 
    },
    deadlineDate: { 
      type: String, 
      required: true 
    },
    deadlineTime: { 
      type: String, 
      required: true 
    },
    options: { 
      type: OptionsSchema, 
      required: true 
    },
  },
  {
    timestamps: true,
  }
)

const CodeAssignment: Model<ICodeAssignment> = 
  mongoose.models.CodeAssignment || 
  mongoose.model<ICodeAssignment>('CodeAssignment', CodeAssignmentSchema)

export { CodeAssignment }
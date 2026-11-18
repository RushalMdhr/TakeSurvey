import mongoose from 'mongoose';

const optionSchema = new mongoose.Schema(
  {
    optionId: { type: String, required: true }, // e.g. "q1_yes"
    label: { type: String, required: true }     // e.g. "Yes"
  },
  { _id: false }
);

const questionSchema = new mongoose.Schema(
  {
    questionId: { type: String, required: true }, // e.g. "q1"
    type: {
      type: String,
      required: true,
      enum: ['text', 'single_choice', 'multi_choice', 'rating']
    },
    label: { type: String, required: true },
    required: { type: Boolean, default: false },
    options: [optionSchema], // used by single_choice / multi_choice
    dependsOn: {
      questionId: { type: String },
      optionId: { type: String }
    },
    position: { type: Number, required: true }
  },
  { _id: false }
);

const surveySchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    slug: { type: String, required: true, unique: true, index: true },
    status: {
      type: String,
      enum: ['draft', 'published', 'closed'],
      default: 'draft'
    },
    questions: [questionSchema],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
      required: true
    },
    publishedAt: { type: Date }
  },
  { timestamps: true }
);

export default mongoose.model('Survey', surveySchema);
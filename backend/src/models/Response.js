import mongoose from 'mongoose';

const answerSchema = new mongoose.Schema(
  {
    questionId: { type: String, required: true },
    type: {
      type: String,
      required: true,
      enum: ['text', 'single_choice', 'multi_choice', 'rating']
    },
    // value shape depends on type:
    //   text          -> String
    //   single_choice -> String (optionId)
    //   multi_choice  -> [String] (optionIds)
    //   rating        -> Number (1-5)
    value: { type: mongoose.Schema.Types.Mixed, required: true }
  },
  { _id: false }
);

const responseSchema = new mongoose.Schema(
  {
    surveyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Survey',
      required: true,
      index: true
    },
    answers: [answerSchema],
    status: {
      type: String,
      enum: ['partial', 'complete'],
      default: 'complete'
    },
    submittedAt: { type: Date, default: Date.now },
    meta: {
      ipHash: { type: String },
      userAgent: { type: String }
    }
  },
  { timestamps: true }
);

responseSchema.index({ surveyId: 1, submittedAt: -1 });

export default mongoose.model('Response', responseSchema);
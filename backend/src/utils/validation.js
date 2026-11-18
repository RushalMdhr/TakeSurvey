import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  name: z.string().min(1).optional()
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

const surveyFields = {
  title: z.string().trim().min(1, 'Title is required').max(120),
  description: z.string().trim().max(2000).optional()
};

export const createSurveySchema = z.object(surveyFields).strict();

export const updateSurveySchema = z
  .object(surveyFields)
  .partial()
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided'
  });

const questionTypes = ['text', 'single_choice', 'multi_choice', 'rating'];
const choiceTypes = ['single_choice', 'multi_choice'];

const questionDependencySchema = z.object({
  questionId: z.string().trim().min(1).max(100),
  optionId: z.string().trim().min(1).max(100)
}).strict();

const createOptionSchema = z.object({
  label: z.string().trim().min(1).max(200)
}).strict();

const updateOptionSchema = z.object({
  optionId: z.string().trim().min(1).max(100).optional(),
  label: z.string().trim().min(1).max(200)
}).strict();

export const createQuestionSchema = z.object({
  type: z.enum(questionTypes),
  label: z.string().trim().min(1).max(500),
  required: z.boolean().default(false),
  options: z.array(createOptionSchema).max(100).optional(),
  dependsOn: questionDependencySchema.optional()
}).strict().superRefine((data, ctx) => {
  const options = data.options || [];
  if (choiceTypes.includes(data.type) && options.length < 2) {
    ctx.addIssue({
      code: 'custom',
      path: ['options'],
      message: 'Choice questions require at least two options'
    });
  }
  if (!choiceTypes.includes(data.type) && options.length > 0) {
    ctx.addIssue({
      code: 'custom',
      path: ['options'],
      message: 'Only choice questions can have options'
    });
  }
});

export const updateQuestionSchema = z.object({
  type: z.enum(questionTypes).optional(),
  label: z.string().trim().min(1).max(500).optional(),
  required: z.boolean().optional(),
  options: z.array(updateOptionSchema).max(100).optional(),
  dependsOn: z.union([questionDependencySchema, z.null()]).optional()
}).strict().refine((data) => Object.keys(data).length > 0, {
  message: 'At least one field must be provided'
});

export const reorderQuestionsSchema = z.object({
  questionIds: z.array(z.string().trim().min(1).max(100))
}).strict();

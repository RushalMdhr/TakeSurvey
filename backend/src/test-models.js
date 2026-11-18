import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { connectDB } from './config/db.js';
import Admin from './models/Admin.js';
import Survey from './models/Survey.js';
import Response from './models/Response.js';

dotenv.config();

await connectDB();

// create admin
const admin = await Admin.create({
  email: `test${Date.now()}@x.com`,
  password: 'password123',
  name: 'Test Admin'
});
console.log('✅ Admin:', admin.email, '| password hidden:', admin.password === undefined);

// create survey
const survey = await Survey.create({
  title: 'Demo',
  slug: `demo-${Date.now()}`,
  createdBy: admin._id,
  questions: [
    {
      questionId: 'q1',
      type: 'single_choice',
      label: 'Enjoyed?',
      required: true,
      options: [
        { optionId: 'q1_yes', label: 'Yes' },
        { optionId: 'q1_no', label: 'No' }
      ],
      position: 0
    },
    {
      questionId: 'q2',
      type: 'rating',
      label: 'Rate venue',
      required: true,
      position: 1,
      dependsOn: { questionId: 'q1', optionId: 'q1_yes' }
    }
  ]
});
console.log('✅ Survey:', survey.slug);

// create response
const response = await Response.create({
  surveyId: survey._id,
  answers: [
    { questionId: 'q1', type: 'single_choice', value: 'q1_yes' },
    { questionId: 'q2', type: 'rating', value: 4 }
  ]
});
console.log('✅ Response:', response._id);

// verify password compare
const found = await Admin.findById(admin._id).select('+password');
console.log('✅ Password matches:', await found.comparePassword('password123'));

await mongoose.disconnect();
process.exit(0);
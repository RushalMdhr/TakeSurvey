# Survey Flow – Dynamic Survey Builder

A full-stack survey management application that allows administrators to create and manage dynamic surveys, share them through public links, collect responses, and analyze submitted data.

**Live Demo:** https://survey-flow-delta.vercel.app/

## Features

### Admin Dashboard
- Admin registration and login.
- JWT-based authentication.
- Create, edit, publish, and manage surveys.
- Add, remove, and reorder questions.
- Support multiple question types:
  - Text input
  - Single-choice (radio buttons)
  - Multiple-choice (checkboxes)
  - Rating (1–5)
- Mark questions as required.
- Configure conditional questions based on previous answers.
- Close a published survey after it receives responses.
- Rate-limit administrator login and registration attempts.

### Public Survey Interface
- Access surveys through unique public URLs.
- Dynamically render questions based on the survey schema.
- Display conditional questions when their conditions are satisfied.
- Validate required fields and submitted answers.
- Submit responses without requiring user registration.
- Rate-limit public response submissions to reduce spam.

### Analytics Dashboard
- View total survey responses.
- Analyze multiple-choice answer distributions.
- Calculate average ratings.
- Review submitted text answers.

## Technology Stack

| Layer | Technology |
|---|---|
| Frontend | React, JavaScript |
| Styling | Tailwind CSS |
| Backend | Node.js, Express.js |
| Database | MongoDB, Mongoose |
| Authentication | JWT, bcryptjs |
| Validation | Zod |
| Deployment | Vercel (frontend), Render (backend) |

## Project Structure

```text
TakeSurvey/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── utils/
│   │   └── server.js
│   ├── test/
│   └── package.json
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── api/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── App.jsx
│   │   ├── index.css
│   │   └── main.jsx
│   └── package.json
└── README.md
```

## Getting Started

### Prerequisites

- Node.js (LTS recommended)
- npm
- MongoDB (local installation or MongoDB Atlas)
- Git

### 1. Clone the repository

```bash
git clone https://github.com/RushalMdhr/TakeSurvey.git
cd TakeSurvey
```

### 2. Backend Setup

```bash
cd backend
npm install
```

Create a `.env` file inside the backend directory:

```env
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/survey_app
JWT_SECRET=your_long_random_secret
JWT_EXPIRES_IN=7d
CLIENT_URL=http://localhost:5173
NODE_ENV=development
```

Replace the MongoDB URI and JWT secret with your own configuration.

Start the backend development server:

```bash
npm run dev
```

The backend should now be running at:

`http://localhost:5000`

### 3. Frontend Setup

Open another terminal:

```bash
cd frontend
npm install
```

Create a `.env` file inside the frontend directory:

```env
VITE_API_URL=http://localhost:5000/api
```

Start the frontend:

```bash
npm run dev
```

Open the local URL displayed by Vite, usually:

`http://localhost:5173`

### 4. Production Build

Build the frontend:

```bash
npm run build
```

For production deployment, configure the frontend and backend environment variables separately and use a production MongoDB connection:

- **Vercel:** `VITE_API_URL=https://surveyflow-s69a.onrender.com/api`
- **Render:** `CLIENT_URL=https://survey-flow-delta.vercel.app`

Also set `MONGO_URI` and a secure `JWT_SECRET` on Render.

## Architecture Decisions

### 1. Survey Schema

A survey contains its basic information, a unique public slug, publication status, and an ordered array of questions embedded in the survey document.

The question order is maintained explicitly rather than relying on creation timestamps.

This lets administrators reorder questions without changing their labels, options, or IDs.

Survey status can be draft, published, or closed.

### 2. Embedded Question Schema

Each embedded question has a stable question ID, type, label, required flag, and position. Choice questions also store their options, and conditional questions can store a dependency on an earlier question.

The position field provides predictable ordering and allows the survey builder to reorder questions.

### 3. Conditional Logic

Conditional questions use a dependency containing:

- The ID of the question they depend on.
- The expected answer or option that triggers their visibility.

For the initial implementation, conditional logic supports a simple dependency on a previous question.

Questions with dependencies must appear after their parent questions in the survey order.

This keeps the evaluation of conditions predictable and avoids unnecessary complexity.

### 4. Response Storage

Survey responses are stored separately from survey definitions.

Each response contains a collection of answers associated with question IDs.

Conceptually:

```json
{
  "surveyId": "survey_id",
  "answers": [
    {
      "questionId": "question_id_1",
      "type": "single_choice",
      "value": "option_id"
    },
    {
      "questionId": "question_id_2",
      "type": "multi_choice",
      "value": ["option_id_1", "option_id_2"]
    }
  ],
  "status": "complete"
}
```

This separation allows multiple users to submit responses without modifying the original survey schema.

### 5. Analytics

Analytics use completed responses only. The backend counts them, groups choice selections, calculates rating averages, and paginates text answers; conditional-question stats include only responses where the question was shown.

### 6. Authentication

Administrator authentication uses JWT for session authorization and bcryptjs for password hashing.

Public survey access does not require administrator authentication.

## Assumptions and Trade-offs

- **Simple conditional logic:** The initial implementation supports a single-question dependency rather than a complex rule engine with nested AND/OR conditions.
- **Explicit question ordering:** Each embedded question has a position, which provides predictable rendering and reordering.
- **Separate response storage:** Responses are kept independent of survey definitions to support multiple submissions and analytics.
- **Public survey access:** Anyone with a published survey link can access and submit the survey.
- **Basic analytics:** Analytics focus on response counts, choice distributions, rating averages, and text-answer review rather than advanced statistical analysis.
- **Authentication scope:** Authentication is designed for administrators. Public respondents do not need accounts.
- **Survey editing:** Questions can only be changed while a survey is a draft. Publishing or closing a survey locks its question structure; its title and description can still be updated.

## Future Improvements

- Survey versioning to preserve historical question structures.
- Save partially completed responses.
- More advanced conditional rules.
- CAPTCHA and shared rate-limit storage for multi-instance deployments.
- Export analytics to CSV.
- More detailed response visualizations.

## Author

Developed as a full-stack engineering technical assessment.

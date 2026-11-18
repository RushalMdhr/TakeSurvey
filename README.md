# TakeSurvey

TakeSurvey lets admins create surveys and questions, publish them for public responses, and review basic analytics.

## Protected admin API

All `/api/surveys` routes require `Authorization: Bearer <token>`.
Analytics routes also require the admin Bearer token and only return surveys owned by that admin.

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/api/analytics/surveys/:surveyId` | Response totals and per-question aggregates |
| `GET` | `/api/analytics/surveys/:surveyId/questions/:questionId/text?page=1&limit=20` | Paginated text answers |

Analytics include option counts and percentages for choice questions, a 1–5 distribution and average for ratings, and shown/answered/unanswered counts. Multi-choice percentages are calculated per respondent and may sum to more than 100%. Text answers are returned separately in pages of up to 100.

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/api/surveys/:surveyId/questions` | List questions in display order |
| `POST` | `/api/surveys/:surveyId/questions` | Add a question |
| `GET` | `/api/surveys/:surveyId/questions/:questionId` | Get a question |
| `PATCH` | `/api/surveys/:surveyId/questions/:questionId` | Update a question |
| `DELETE` | `/api/surveys/:surveyId/questions/:questionId` | Delete a question |
| `PATCH` | `/api/surveys/:surveyId/questions/reorder` | Reorder all questions |
| `POST` | `/api/surveys/:surveyId/publish` | Publish and return the public link |

Questions support `text`, `single_choice`, `multi_choice`, and `rating` types. Choice questions require at least two unique options. A question may depend on an option from an earlier choice question. Reordering cannot place a dependent question before its condition. Question changes are limited to draft surveys; a question used by another question's condition cannot be deleted.

To reorder, send every question ID exactly once:

```json
{
  "questionIds": ["q_...", "q_..."]
}
```

Publishing requires at least one question. The publish response includes `publicPath` (for example, `/s/my-survey`) and `publicUrl`; the latter uses `CLIENT_URL` or the request origin as its base.

Public surveys are available without authentication:

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/api/public/surveys/:slug` | Retrieve a published survey |
| `POST` | `/api/public/surveys/:slug/responses` | Submit a response |

The public form URL is `/s/:slug`. Submit responses as `{"answers":[{"questionId":"...","value":"..."}]}`. Choice answers use option IDs, multi-choice answers use arrays of option IDs, and ratings are integers from 1 to 5. Required answers and conditional visibility are validated by the API.
